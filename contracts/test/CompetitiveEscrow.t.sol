// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CompetitiveEscrow} from "../src/CompetitiveEscrow.sol";
import {MockUSDT} from "../src/MockUSDT.sol";

contract CompetitiveEscrowTest is Test {
    MockUSDT internal usdt;
    CompetitiveEscrow internal escrow;

    address internal owner = makeAddr("owner");
    address internal commission = makeAddr("commission");
    address internal host = makeAddr("host");
    address internal joiner = makeAddr("joiner");
    address internal winner = makeAddr("winner");

    bytes32 internal roomKey = keccak256("room-1");

    function setUp() public {
        usdt = new MockUSDT();
        escrow = new CompetitiveEscrow(address(usdt), commission, owner);

        usdt.mint(host, 1_000_000);
        usdt.mint(joiner, 1_000_000);
        vm.prank(host);
        usdt.approve(address(escrow), type(uint256).max);
        vm.prank(joiner);
        usdt.approve(address(escrow), type(uint256).max);
    }

    function test_host_and_joiner_then_settle() public {
        vm.prank(host);
        escrow.deposit(roomKey);

        vm.prank(joiner);
        escrow.joinDeposit(roomKey);

        assertEq(usdt.balanceOf(address(escrow)), escrow.ENTRY_FEE() * 2);
        assertTrue(escrow.hasPaid(roomKey, host));
        assertTrue(escrow.hasPaid(roomKey, joiner));

        (, , , uint256 poolTotal, uint256 commissionTotal) = escrow.rooms(roomKey);
        assertEq(poolTotal, escrow.POOL_SHARE_PER_PLAYER() * 2);
        assertEq(commissionTotal, escrow.COMMISSION_SHARE_PER_PLAYER() * 2);

        vm.prank(owner);
        escrow.lock(roomKey);

        uint256 commissionBefore = commissionTotal;
        vm.prank(owner);
        escrow.settle(roomKey, winner);

        assertEq(usdt.balanceOf(winner), escrow.POOL_SHARE_PER_PLAYER() * 2);
        // Commission remains in the contract until withdraw
        assertEq(usdt.balanceOf(address(escrow)), commissionBefore);

        vm.prank(owner);
        escrow.withdrawCommission(commissionBefore);
        assertEq(usdt.balanceOf(commission), commissionBefore);
        assertEq(usdt.balanceOf(address(escrow)), 0);
    }

    function test_refund_all_depositors() public {
        vm.prank(host);
        escrow.deposit(roomKey);
        vm.prank(joiner);
        escrow.joinDeposit(roomKey);

        vm.prank(host);
        escrow.refund(roomKey);

        assertEq(usdt.balanceOf(host), 1_000_000);
        assertEq(usdt.balanceOf(joiner), 1_000_000);
        assertEq(usdt.balanceOf(address(escrow)), 0);
    }

    function test_joiner_cannot_double_pay() public {
        vm.prank(host);
        escrow.deposit(roomKey);
        vm.prank(joiner);
        escrow.joinDeposit(roomKey);

        vm.prank(joiner);
        vm.expectRevert(CompetitiveEscrow.AlreadyPaid.selector);
        escrow.joinDeposit(roomKey);
    }

    function test_refund_after_lock_reverts() public {
        vm.prank(host);
        escrow.deposit(roomKey);

        vm.prank(owner);
        escrow.lock(roomKey);

        vm.prank(host);
        vm.expectRevert(CompetitiveEscrow.InvalidStatus.selector);
        escrow.refund(roomKey);
    }
}
