// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {BrutusRegistryV2, BrutusDailyActionsV2, BrutusCombatRewardsV2, BrutusArenaEscrowV2} from "../src/BrutusGameV2.sol";
import {MockERC20} from "./MockERC20.sol";

contract BrutusGameV2Test is Test {
    MockERC20 token;
    BrutusRegistryV2 registry;
    BrutusDailyActionsV2 daily;
    BrutusCombatRewardsV2 rewards;
    address payable vault = payable(address(0xA011));
    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    uint256 resolverPk = 0xBEEF;
    address resolver;

    function setUp() public {
        token = new MockERC20();
        registry = new BrutusRegistryV2(address(token), vault, 0.01 ether, address(this));
        daily = new BrutusDailyActionsV2(address(registry));
        rewards = new BrutusCombatRewardsV2(address(token), address(registry), 10_000 ether, 0.001 ether, address(this));
        resolver = vm.addr(resolverPk);
        token.mint(alice, 100_000 ether);
        token.mint(bob, 5_000 ether);
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
    }

    function testMaxThreeBaseAndExtraCostsBnbSplitToVaultAndBurn() public {
        vm.startPrank(alice);
        registry.createBaseBrute(bytes32("a"));
        registry.createBaseBrute(bytes32("b"));
        registry.createBaseBrute(bytes32("c"));
        vm.expectRevert(bytes("base brute limit reached"));
        registry.createBaseBrute(bytes32("d"));
        uint256 vaultBefore = vault.balance;
        uint256 burnBefore = registry.BURN_ADDRESS().balance;
        uint256 bruteId = registry.createExtraBrute{value: 0.01 ether}(bytes32("d"));
        vm.stopPrank();
        assertEq(bruteId, 4);
        assertEq(vault.balance, vaultBefore + 0.005 ether);
        assertEq(registry.BURN_ADDRESS().balance, burnBefore + 0.005 ether);
        assertEq(registry.extraBrutePrice(alice), 0.02 ether);
    }

    function testDailyActionsStillLimitedToThree() public {
        vm.prank(alice);
        uint256 bruteId = registry.createBaseBrute(bytes32("a"));
        vm.startPrank(alice);
        daily.useDailyAction(bruteId);
        daily.useDailyAction(bruteId);
        daily.useDailyAction(bruteId);
        vm.expectRevert(bytes("daily actions exhausted"));
        daily.useDailyAction(bruteId);
        vm.stopPrank();
    }

    function testOnlyWinnerWithTenKTokensCanClaimCombatReward() public {
        vm.prank(alice);
        uint256 aliceBrute = registry.createBaseBrute(bytes32("a"));
        vm.prank(bob);
        registry.createBaseBrute(bytes32("b"));
        vm.deal(address(this), 1 ether);
        rewards.depositRewards{value: 1 ether}();
        bytes32 fightId = keccak256("fight-1");
        rewards.recordCombatWin(fightId, alice, aliceBrute);

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
        vm.prank(bob);
        uint256 bobBrute = registry.createBaseBrute(bytes32("b"));
        vm.deal(address(this), 1 ether);
        rewards.depositRewards{value: 1 ether}();
        bytes32 fightId = keccak256("fight-2");
        rewards.recordCombatWin(fightId, bob, bobBrute);
        vm.prank(bob);
        vm.expectRevert(bytes("needs 10000 tokens"));
        rewards.claimCombatReward(fightId);
    }

    function testPaidOneVOneWinnerTakesLoserStake() public {
        vm.prank(alice);
        uint256 a = registry.createBaseBrute(bytes32("a"));
        vm.prank(bob);
        uint256 b = registry.createBaseBrute(bytes32("b"));
        address feeReceiver = address(0xFEE);
        BrutusArenaEscrowV2 arena = new BrutusArenaEscrowV2(address(registry), resolver, feeReceiver, 0);
        vm.prank(alice);
        uint256 challengeId = arena.createChallenge{value: 0.01 ether}(a, address(0), 0.01 ether);
        vm.prank(bob);
        arena.acceptChallenge{value: 0.01 ether}(challengeId, b);
        bytes32 fightHash = keccak256("fight-log");
        bytes32 digest = keccak256(abi.encodePacked(address(arena), block.chainid, challengeId, b, fightHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(resolverPk, digest);
        arena.resolveChallenge(challengeId, b, fightHash, abi.encodePacked(r, s, v));
        uint256 before = bob.balance;
        vm.prank(bob);
        arena.claimWinnings(challengeId);
        assertEq(bob.balance, before + 0.02 ether);
    }
}
