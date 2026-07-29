// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PartyEscrow} from "../src/PartyEscrow.sol";
import {MockUSDT} from "../src/MockUSDT.sol";

contract PartyEscrowTest is Test {
    MockUSDT internal usdt;
    PartyEscrow internal escrow;

    address internal owner = makeAddr("owner");
    address internal commission = makeAddr("commission");
    address internal host = makeAddr("host");
    address internal player = makeAddr("player");
    address internal winner = makeAddr("winner");

    bytes32 internal roomKey = keccak256("party-room-1");

    function setUp() public {
        usdt = new MockUSDT();
        escrow = new PartyEscrow(address(usdt), commission, owner);

        usdt.mint(host, 1_000_000_000);
        usdt.mint(player, 1_000_000_000);
        vm.prank(host);
        usdt.approve(address(escrow), type(uint256).max);
        vm.prank(player);
        usdt.approve(address(escrow), type(uint256).max);
    }

    function test_quote_fee_10_percent_and_cap() public view {
        (uint256 fee1, uint256 total1) = escrow.quoteFee(1_000_000); // $1
        assertEq(fee1, 100_000); // $0.10
        assertEq(total1, 1_100_000);

        (uint256 fee100, uint256 total100) = escrow.quoteFee(100_000_000); // $100
        assertEq(fee100, 10_000_000); // capped at $10
        assertEq(total100, 110_000_000);

        (uint256 fee200, ) = escrow.quoteFee(200_000_000); // $200 → still $10 cap
        assertEq(fee200, 10_000_000);
    }

    function test_open_contribute_multi_then_settle() public {
        vm.prank(host);
        escrow.open(roomKey);

        vm.prank(host);
        escrow.contribute(roomKey, 1_000_000); // $1 → fee $0.10

        vm.prank(player);
        escrow.contribute(roomKey, 1_000_000);
        vm.prank(player);
        escrow.contribute(roomKey, 2_000_000); // $2 → fee $0.20

        (, , uint256 poolTotal, uint256 commissionTotal) = escrow.rooms(roomKey);
        assertEq(poolTotal, 4_000_000);
        assertEq(commissionTotal, 400_000);
        assertEq(escrow.poolContributed(roomKey, player), 3_000_000);

        vm.prank(owner);
        escrow.lock(roomKey);

        vm.prank(owner);
        escrow.settle(roomKey, winner);

        assertEq(usdt.balanceOf(winner), 4_000_000);
        assertEq(usdt.balanceOf(address(escrow)), 400_000);

        vm.prank(owner);
        escrow.withdrawCommission(400_000);
        assertEq(usdt.balanceOf(commission), 400_000);
    }

    function test_refund_pool_only_keeps_commission() public {
        vm.prank(host);
        escrow.open(roomKey);
        vm.prank(host);
        escrow.contribute(roomKey, 1_000_000);
        vm.prank(player);
        escrow.contribute(roomKey, 1_000_000);

        uint256 hostBefore = usdt.balanceOf(host);
        uint256 playerBefore = usdt.balanceOf(player);

        vm.prank(host);
        escrow.refund(roomKey);

        assertEq(usdt.balanceOf(host), hostBefore + 1_000_000);
        assertEq(usdt.balanceOf(player), playerBefore + 1_000_000);
        // 0.10 + 0.10 commission remains
        assertEq(usdt.balanceOf(address(escrow)), 200_000);
    }

    function test_full_refund_returns_pool_and_fee() public {
        vm.prank(host);
        escrow.open(roomKey);
        vm.prank(player);
        escrow.contribute(roomKey, 1_000_000); // pays 1.10

        uint256 playerBefore = usdt.balanceOf(player);

        vm.prank(host);
        escrow.fullRefund(roomKey);

        assertEq(usdt.balanceOf(player), playerBefore + 1_100_000);
        assertEq(usdt.balanceOf(address(escrow)), 0);
    }

    function test_withdraw_contribution_pool_only_keeps_fee() public {
        vm.prank(host);
        escrow.open(roomKey);
        vm.prank(player);
        escrow.contribute(roomKey, 1_000_000); // pays 1.10

        uint256 playerBefore = usdt.balanceOf(player);

        vm.prank(player);
        escrow.withdrawContribution(roomKey);

        assertEq(usdt.balanceOf(player), playerBefore + 1_000_000);
        assertEq(usdt.balanceOf(address(escrow)), 100_000);
        assertEq(escrow.poolContributed(roomKey, player), 0);
        assertEq(escrow.feeContributed(roomKey, player), 0);

        (, , uint256 poolTotal, uint256 commissionTotal) = escrow.rooms(roomKey);
        assertEq(poolTotal, 0);
        assertEq(commissionTotal, 100_000);
    }

    function test_kick_refund_returns_pool_and_fee() public {
        vm.prank(host);
        escrow.open(roomKey);
        vm.prank(player);
        escrow.contribute(roomKey, 1_000_000); // pays 1.10
        vm.prank(host);
        escrow.contribute(roomKey, 2_000_000); // host stays in pot

        uint256 playerBefore = usdt.balanceOf(player);

        vm.prank(host);
        escrow.kickRefund(roomKey, player);

        assertEq(usdt.balanceOf(player), playerBefore + 1_100_000);
        assertEq(escrow.poolContributed(roomKey, player), 0);
        assertEq(escrow.feeContributed(roomKey, player), 0);

        (, , uint256 poolTotal, uint256 commissionTotal) = escrow.rooms(roomKey);
        assertEq(poolTotal, 2_000_000);
        assertEq(commissionTotal, 200_000); // host fee only
        assertEq(usdt.balanceOf(address(escrow)), 2_200_000);
    }

    function test_kick_refund_unpaid_is_noop() public {
        vm.prank(host);
        escrow.open(roomKey);

        vm.prank(host);
        escrow.kickRefund(roomKey, player);

        (, , uint256 poolTotal, uint256 commissionTotal) = escrow.rooms(roomKey);
        assertEq(poolTotal, 0);
        assertEq(commissionTotal, 0);
    }

    function test_kick_host_reverts() public {
        vm.prank(host);
        escrow.open(roomKey);

        vm.prank(host);
        vm.expectRevert(PartyEscrow.CannotKickHost.selector);
        escrow.kickRefund(roomKey, host);
    }

    function test_withdraw_with_nothing_reverts() public {
        vm.prank(host);
        escrow.open(roomKey);

        vm.prank(player);
        vm.expectRevert(PartyEscrow.NothingToWithdraw.selector);
        escrow.withdrawContribution(roomKey);
    }

    function test_contribute_below_min_reverts() public {
        vm.prank(host);
        escrow.open(roomKey);

        vm.prank(player);
        vm.expectRevert(PartyEscrow.AmountTooSmall.selector);
        escrow.contribute(roomKey, 9_999);
    }

    function test_lock_with_zero_pool_reverts() public {
        vm.prank(host);
        escrow.open(roomKey);

        vm.prank(owner);
        vm.expectRevert(PartyEscrow.InvalidStatus.selector);
        escrow.lock(roomKey);
    }

    function test_refund_after_lock_reverts() public {
        vm.prank(host);
        escrow.open(roomKey);
        vm.prank(host);
        escrow.contribute(roomKey, 1_000_000);

        vm.prank(owner);
        escrow.lock(roomKey);

        vm.prank(host);
        vm.expectRevert(PartyEscrow.InvalidStatus.selector);
        escrow.refund(roomKey);
    }

    function test_withdraw_after_lock_reverts() public {
        vm.prank(host);
        escrow.open(roomKey);
        vm.prank(player);
        escrow.contribute(roomKey, 1_000_000);

        vm.prank(owner);
        escrow.lock(roomKey);

        vm.prank(player);
        vm.expectRevert(PartyEscrow.RoomNotOpen.selector);
        escrow.withdrawContribution(roomKey);
    }

    function test_purchase_adds_to_treasury() public {
        bytes32 offerId = keccak256("koin_50");
        uint256 amount = 500_000; // 0.5 USDT

        vm.prank(player);
        escrow.purchase(offerId, amount);

        assertEq(escrow.treasuryBalance(), amount);
        assertEq(usdt.balanceOf(address(escrow)), amount);

        vm.prank(owner);
        escrow.withdrawCommission(amount);
        assertEq(usdt.balanceOf(commission), amount);
        assertEq(usdt.balanceOf(address(escrow)), 0);
    }

    function test_purchase_zero_reverts() public {
        vm.prank(player);
        vm.expectRevert(PartyEscrow.AmountTooSmall.selector);
        escrow.purchase(keccak256("koin_50"), 0);
    }
}
