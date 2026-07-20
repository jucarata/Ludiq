// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title CompetitiveEscrow
/// @notice Multi-player competitive room escrow on Celo.
///         Each player deposits 0.20 (0.15 pool + 0.05 commission held until settle).
///         Host opens the room; joiners call joinDeposit. Full refunds while Funded.
contract CompetitiveEscrow {
    uint256 public constant ENTRY_FEE = 200_000; // 0.20 (6 decimals)
    uint256 public constant POOL_SHARE_PER_PLAYER = 150_000; // 0.15
    uint256 public constant COMMISSION_SHARE_PER_PLAYER = 50_000; // 0.05
    uint256 public constant MAX_PLAYERS = 4;

    enum RoomStatus {
        None,
        Funded,
        Locked,
        Settled,
        Refunded
    }

    struct Room {
        address host;
        RoomStatus status;
        uint8 playerCount;
        uint256 poolTotal;
        uint256 commissionTotal;
    }

    IERC20 public immutable usdt;
    address public immutable commissionWallet;
    address public owner;

    mapping(bytes32 => Room) public rooms;
    mapping(bytes32 => mapping(address => bool)) public hasPaid;
    mapping(bytes32 => address[]) private _depositors;

    event Deposited(bytes32 indexed roomKey, address indexed player, uint256 amount);
    event Refunded(bytes32 indexed roomKey, address indexed player, uint256 amount);
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
    error AlreadyPaid();
    error RoomFull();
    error TransferFailed();

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

    function depositors(bytes32 roomKey) external view returns (address[] memory) {
        return _depositors[roomKey];
    }

    /// @notice Host opens a competitive room and pays ENTRY_FEE.
    function deposit(bytes32 roomKey) external {
        Room storage room = rooms[roomKey];
        if (room.status != RoomStatus.None) revert RoomAlreadyExists();

        _pullEntry(msg.sender);

        room.host = msg.sender;
        room.status = RoomStatus.Funded;
        room.playerCount = 1;
        room.poolTotal = POOL_SHARE_PER_PLAYER;
        room.commissionTotal = COMMISSION_SHARE_PER_PLAYER;

        hasPaid[roomKey][msg.sender] = true;
        _depositors[roomKey].push(msg.sender);

        emit Deposited(roomKey, msg.sender, ENTRY_FEE);
    }

    /// @notice Joiner pays ENTRY_FEE into an existing Funded room.
    function joinDeposit(bytes32 roomKey) external {
        Room storage room = rooms[roomKey];
        if (room.status != RoomStatus.Funded) revert RoomNotOpen();
        if (hasPaid[roomKey][msg.sender]) revert AlreadyPaid();
        if (room.playerCount >= MAX_PLAYERS) revert RoomFull();

        _pullEntry(msg.sender);

        unchecked {
            room.playerCount += 1;
            room.poolTotal += POOL_SHARE_PER_PLAYER;
            room.commissionTotal += COMMISSION_SHARE_PER_PLAYER;
        }

        hasPaid[roomKey][msg.sender] = true;
        _depositors[roomKey].push(msg.sender);

        emit Deposited(roomKey, msg.sender, ENTRY_FEE);
    }

    /// @notice Host refunds every depositor their full ENTRY_FEE. Caller pays gas.
    function refund(bytes32 roomKey) external {
        Room storage room = rooms[roomKey];
        if (room.status != RoomStatus.Funded) revert InvalidStatus();
        if (msg.sender != room.host) revert NotHost();

        room.status = RoomStatus.Refunded;

        address[] storage paid = _depositors[roomKey];
        uint256 len = paid.length;
        for (uint256 i = 0; i < len; ) {
            address player = paid[i];
            if (!usdt.transfer(player, ENTRY_FEE)) revert TransferFailed();
            emit Refunded(roomKey, player, ENTRY_FEE);
            unchecked {
                ++i;
            }
        }
    }

    /// @notice Backend locks the pot when the game starts (blocks refund / new joins).
    function lock(bytes32 roomKey) external onlyOwner {
        Room storage room = rooms[roomKey];
        if (room.status != RoomStatus.Funded) revert InvalidStatus();

        room.status = RoomStatus.Locked;
        emit Locked(roomKey);
    }

    /// @notice Pays accumulated pool to winner; commission stays in contract for owner withdraw.
    function settle(bytes32 roomKey, address winner) external onlyOwner {
        if (winner == address(0)) revert ZeroAddress();

        Room storage room = rooms[roomKey];
        if (room.status != RoomStatus.Locked) revert InvalidStatus();

        uint256 poolAmount = room.poolTotal;
        uint256 commissionAmount = room.commissionTotal;

        room.status = RoomStatus.Settled;
        room.poolTotal = 0;
        // commissionTotal left as accounting; tokens stay here until withdrawCommission

        if (!usdt.transfer(winner, poolAmount)) revert TransferFailed();

        emit Settled(roomKey, winner, poolAmount, commissionAmount);
    }

    /// @notice Owner pulls accrued commission balance out of the escrow.
    function withdrawCommission(uint256 amount) external onlyOwner {
        if (amount == 0) revert TransferFailed();
        if (!usdt.transfer(commissionWallet, amount)) revert TransferFailed();
    }

    function _pullEntry(address from) internal {
        if (!usdt.transferFrom(from, address(this), ENTRY_FEE)) {
            revert TransferFailed();
        }
    }
}
