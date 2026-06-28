// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {BrutusRegistryV3, BrutusCombatRewardsV3} from "../src/BrutusGameV3.sol";
import {MockERC20} from "./MockERC20.sol";

contract BrutusGameV3Test is Test {
    MockERC20 token;
    BrutusRegistryV3 registry;
    BrutusCombatRewardsV3 rewards;

    address payable vault = payable(address(0xA011));
    address operator = address(0x0A0A);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        token = new MockERC20();
        registry = new BrutusRegistryV3(address(token), vault, 0.01 ether, operator);
        rewards = new BrutusCombatRewardsV3(address(token), 10_000 ether, 0.001 ether, operator, 0.0002 ether);
        token.mint(alice, 100_000 ether);
        token.mint(bob, 5_000 ether);
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(operator, 1 ether);
    }

    function testExtraBrutePaymentSendsAllBnbToVaultAndBurnsNothing() public {
        uint256 vaultBefore = vault.balance;
        uint256 burnBefore = registry.BURN_ADDRESS().balance;

        vm.prank(alice);
        uint256 bruteId = registry.createExtraBrute{value: 0.01 ether}(bytes32("extra"));

        assertEq(bruteId, 1);
        assertEq(vault.balance, vaultBefore + 0.01 ether);
        assertEq(registry.BURN_ADDRESS().balance, burnBefore);
        assertEq(registry.extraBrutePrice(alice), 0.02 ether);
    }

    function testOnlyWinnerWithTenKTokensCanClaimCombatReward() public {
        rewards.depositRewards{value: 1 ether}();
        bytes32 fightId = keccak256("fight-1");

        vm.prank(operator);
        rewards.recordCombatWin(fightId, alice);

        vm.prank(bob);
        vm.expectRevert(bytes("not winner"));
        rewards.claimCombatReward(fightId);

        uint256 before = alice.balance;
        vm.prank(alice);
        rewards.claimCombatReward(fightId);
        assertEq(alice.balance, before + 0.001 ether);

        vm.prank(alice);
        vm.expectRevert(bytes("already claimed"));
        rewards.claimCombatReward(fightId);
    }

    function testWinnerWithoutTenKTokensCannotClaim() public {
        rewards.depositRewards{value: 1 ether}();
        bytes32 fightId = keccak256("fight-2");

        vm.prank(operator);
        rewards.recordCombatWin(fightId, bob);

        vm.prank(bob);
        vm.expectRevert(bytes("needs 10000 tokens"));
        rewards.claimCombatReward(fightId);
    }

    function testRecordCombatWinRefundsOperatorGasFromRewardExcess() public {
        rewards.depositRewards{value: 1 ether}();
        bytes32 fightId = keccak256("fight-refund");
        uint256 contractBefore = address(rewards).balance;

        vm.txGasPrice(3 gwei);
        vm.prank(operator);
        rewards.recordCombatWin(fightId, alice);

        uint256 refunded = rewards.totalOperatorGasRefunded();
        assertGt(refunded, 0);
        assertLe(refunded, rewards.maxOperatorGasRefundWei());
        assertEq(address(rewards).balance, contractBefore - refunded);
        assertEq(rewards.fightWinner(fightId), alice);
    }

    function testRecordCombatWinDoesNotRefundReservedClaimAmount() public {
        rewards.depositRewards{value: 0.001 ether}();
        bytes32 fightId = keccak256("fight-no-refund");

        vm.txGasPrice(3 gwei);
        vm.prank(operator);
        rewards.recordCombatWin(fightId, alice);

        assertEq(rewards.totalOperatorGasRefunded(), 0);
        assertEq(address(rewards).balance, 0.001 ether);
        assertEq(rewards.fightWinner(fightId), alice);
    }

    function testOperatorCanUpdateGasRefundCap() public {
        vm.prank(operator);
        rewards.setMaxOperatorGasRefundWei(0.0005 ether);
        assertEq(rewards.maxOperatorGasRefundWei(), 0.0005 ether);

        vm.prank(alice);
        vm.expectRevert(bytes("only operator"));
        rewards.setMaxOperatorGasRefundWei(0.0001 ether);
    }
}
