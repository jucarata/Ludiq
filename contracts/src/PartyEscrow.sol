// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title PartyEscrow
/// @notice Voluntary party-room escrow on Celo.
///         Anyone may contribute any pool amount while the room is Open.
///         Fee = min(10% of pool amount, $10 USDT). Multiple contributions per wallet allowed.
///         Host can kickRefund (pool+fee) a single player; contributors can withdrawContribution
///         (pool only, fee stays). Host refunds pool-only on room close; fullRefund on error path.
contract PartyEscrow {
    uint256 public constant FEE_BPS = 1000; // 10%
    uint256 public constant FEE_CAP = 10_000_000; // 10.00 USDT (6 decimals)
    uint256 public constant MIN_POOL_AMOUNT = 10_000; // 0.01 USDT

    enum RoomStatus {
        None,
        Open,
        Locked,
        Settled,
        Refunded
    }

    struct Room {
        address host;
        RoomStatus status;
        uint256 poolTotal;
        uint256 commissionTotal;
    }

    IERC20 public immutable usdt;
    address public immutable commissionWallet;
    address public owner;

    mapping(bytes32 => Room) public rooms;
    mapping(bytes32 => mapping(address => uint256)) public poolContributed;
    mapping(bytes32 => mapping(address => uint256)) public feeContributed;
    mapping(bytes32 => address[]) private _contributors;

    event Opened(bytes32 indexed roomKey, address indexed host);
    event Contributed(
        bytes32 indexed roomKey,
        address indexed player,
        uint256 poolAmount,
        uint256 feeAmount,
        uint256 totalPaid
    );
    event Refunded(bytes32 indexed roomKey, address indexed player, uint256 amount);
    event KickRefunded(
        bytes32 indexed roomKey,
        address indexed player,
        uint256 poolAmount,
        uint256 feeAmount,
        uint256 total
    );
    event Withdrawn(bytes32 indexed roomKey, address indexed player, uint256 poolAmount);
    event Locked(bytes32 indexed roomKey);
    event Settled(
        bytes32 indexed roomKey,
        address indexed winner,
        uint256 poolAmount,
        uint256 commissionAmount
    );
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error ZeroAddress();
    error NotOwner();
    error NotHost();
    error InvalidStatus();
    error RoomAlreadyExists();
    error RoomNotOpen();
    error AmountTooSmall();
    error TransferFailed();
    error NothingToWithdraw();
    error CannotKickHost();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address usdt_, address commissionWallet_, address owner_) {
        if (usdt_ == address(0) || commissionWallet_ == address(0) || owner_ == address(0)) {
            revert ZeroAddress();
        }
        usdt = IERC20(usdt_);
        commissionWallet = commissionWallet_;
        owner = owner_;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address previous = owner;
        owner = newOwner;
        emit OwnershipTransferred(previous, newOwner);
    }

    function contributors(bytes32 roomKey) external view returns (address[] memory) {
        return _contributors[roomKey];
    }

    /// @notice Preview fee and total charge for a desired pool contribution.
    function quoteFee(uint256 poolAmount) public pure returns (uint256 fee, uint256 total) {
        fee = _calcFee(poolAmount);
        total = poolAmount + fee;
    }

    /// @notice Host opens a party room with no required deposit.
    function open(bytes32 roomKey) external {
        Room storage room = rooms[roomKey];
        if (room.status != RoomStatus.None) revert RoomAlreadyExists();

        room.host = msg.sender;
        room.status = RoomStatus.Open;

        emit Opened(roomKey, msg.sender);
    }

    /// @notice Contribute `poolAmount` to the pot; caller pays poolAmount + fee.
    function contribute(bytes32 roomKey, uint256 poolAmount) external {
        if (poolAmount < MIN_POOL_AMOUNT) revert AmountTooSmall();

        Room storage room = rooms[roomKey];
        if (room.status != RoomStatus.Open) revert RoomNotOpen();

        uint256 fee = _calcFee(poolAmount);
        uint256 total = poolAmount + fee;

        if (!usdt.transferFrom(msg.sender, address(this), total)) {
            revert TransferFailed();
        }

        if (poolContributed[roomKey][msg.sender] == 0 && feeContributed[roomKey][msg.sender] == 0) {
            _contributors[roomKey].push(msg.sender);
        }

        unchecked {
            poolContributed[roomKey][msg.sender] += poolAmount;
            feeContributed[roomKey][msg.sender] += fee;
            room.poolTotal += poolAmount;
            room.commissionTotal += fee;
        }

        emit Contributed(roomKey, msg.sender, poolAmount, fee, total);
    }

    /// @notice Contributor withdraws their pool share only. Fee stays with the app. Caller pays gas.
    function withdrawContribution(bytes32 roomKey) external {
        Room storage room = rooms[roomKey];
        if (room.status != RoomStatus.Open) revert RoomNotOpen();

        uint256 poolAmt = poolContributed[roomKey][msg.sender];
        if (poolAmt == 0) revert NothingToWithdraw();

        // Clear fee accounting for this wallet (commission already in room.commissionTotal).
        feeContributed[roomKey][msg.sender] = 0;
        poolContributed[roomKey][msg.sender] = 0;
        room.poolTotal -= poolAmt;

        if (!usdt.transfer(msg.sender, poolAmt)) revert TransferFailed();

        emit Withdrawn(roomKey, msg.sender, poolAmt);
    }

    /// @notice Host returns pool + fee to a single player (kick path). Host pays gas.
    function kickRefund(bytes32 roomKey, address player) external {
        if (player == address(0)) revert ZeroAddress();

        Room storage room = rooms[roomKey];
        if (room.status != RoomStatus.Open) revert InvalidStatus();
        if (msg.sender != room.host) revert NotHost();
        if (player == room.host) revert CannotKickHost();

        uint256 poolAmt = poolContributed[roomKey][player];
        uint256 feeAmt = feeContributed[roomKey][player];
        uint256 total = poolAmt + feeAmt;

        poolContributed[roomKey][player] = 0;
        feeContributed[roomKey][player] = 0;

        if (poolAmt > 0) {
            room.poolTotal -= poolAmt;
        }
        if (feeAmt > 0) {
            room.commissionTotal -= feeAmt;
        }

        if (total > 0) {
            if (!usdt.transfer(player, total)) revert TransferFailed();
            emit KickRefunded(roomKey, player, poolAmt, feeAmt, total);
        }
    }

    /// @notice Host refunds each contributor their pool share only. Commission stays.
    function refund(bytes32 roomKey) external {
        Room storage room = rooms[roomKey];
        if (room.status != RoomStatus.Open) revert InvalidStatus();
        if (msg.sender != room.host) revert NotHost();

        room.status = RoomStatus.Refunded;

        address[] storage paid = _contributors[roomKey];
        uint256 len = paid.length;
        for (uint256 i = 0; i < len; ) {
            address player = paid[i];
            uint256 poolAmt = poolContributed[roomKey][player];
            if (poolAmt > 0) {
                poolContributed[roomKey][player] = 0;
                if (!usdt.transfer(player, poolAmt)) revert TransferFailed();
                emit Refunded(roomKey, player, poolAmt);
            }
            unchecked {
                ++i;
            }
        }

        room.poolTotal = 0;
        // commissionTotal left as accounting; tokens stay until withdrawCommission
    }

    /// @notice Host refunds pool + fee to each contributor (error / failed-start path).
    function fullRefund(bytes32 roomKey) external {
        Room storage room = rooms[roomKey];
        if (room.status != RoomStatus.Open) revert InvalidStatus();
        if (msg.sender != room.host) revert NotHost();

        room.status = RoomStatus.Refunded;

        address[] storage paid = _contributors[roomKey];
        uint256 len = paid.length;
        for (uint256 i = 0; i < len; ) {
            address player = paid[i];
            uint256 poolAmt = poolContributed[roomKey][player];
            uint256 feeAmt = feeContributed[roomKey][player];
            uint256 total = poolAmt + feeAmt;
            poolContributed[roomKey][player] = 0;
            feeContributed[roomKey][player] = 0;
            if (total > 0) {
                if (!usdt.transfer(player, total)) revert TransferFailed();
                emit Refunded(roomKey, player, total);
            }
            unchecked {
                ++i;
            }
        }

        room.poolTotal = 0;
        room.commissionTotal = 0;
    }

    /// @notice Backend locks the pot when the game starts (blocks refund / new contributions).
    function lock(bytes32 roomKey) external onlyOwner {
        Room storage room = rooms[roomKey];
        if (room.status != RoomStatus.Open) revert InvalidStatus();
        if (room.poolTotal == 0) revert InvalidStatus();

        room.status = RoomStatus.Locked;
        emit Locked(roomKey);
    }

    /// @notice Pays accumulated pool to winner; commission stays for owner withdraw.
    function settle(bytes32 roomKey, address winner) external onlyOwner {
        if (winner == address(0)) revert ZeroAddress();

        Room storage room = rooms[roomKey];
        if (room.status != RoomStatus.Locked) revert InvalidStatus();

        uint256 poolAmount = room.poolTotal;
        uint256 commissionAmount = room.commissionTotal;

        room.status = RoomStatus.Settled;
        room.poolTotal = 0;

        if (!usdt.transfer(winner, poolAmount)) revert TransferFailed();

        emit Settled(roomKey, winner, poolAmount, commissionAmount);
    }

    /// @notice Owner pulls accrued commission balance out of the escrow.
    function withdrawCommission(uint256 amount) external onlyOwner {
        if (amount == 0) revert TransferFailed();
        if (!usdt.transfer(commissionWallet, amount)) revert TransferFailed();
    }

    function _calcFee(uint256 poolAmount) internal pure returns (uint256 fee) {
        fee = (poolAmount * FEE_BPS) / 10_000;
        if (fee > FEE_CAP) {
            fee = FEE_CAP;
        }
    }
}
