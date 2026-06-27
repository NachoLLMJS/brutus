// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {BrutusRegistry, BrutusDailyActions, BrutusRewardPool, BrutusArenaEscrow} from "../src/BrutusGame.sol";
import {BrutusBloodVault, BrutusBloodVaultFactory} from "../src/BrutusBloodVault.sol";
import {MockERC20} from "./MockERC20.sol";

contract BrutusGameTest is Test {
    MockERC20 token;
    BrutusRewardPool pool;
    BrutusRegistry registry;
    BrutusDailyActions daily;
    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    uint256 resolverPk = 0xBEEF;
    address resolver;

    function setUp() public {
        token = new MockERC20();
        pool = new BrutusRewardPool(address(token), 10_000 ether, address(this));
        registry = new BrutusRegistry(address(token), address(pool), 1_000 ether, address(this));
        daily = new BrutusDailyActions(address(registry));
        resolver = vm.addr(resolverPk);
        token.mint(alice, 100_000 ether);
        token.mint(bob, 100_000 ether);
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
    }

    function testBaseBruteLimitAndExtraPaymentSplit() public {
        vm.startPrank(alice);
        registry.createBaseBrute(bytes32("a"));
        registry.createBaseBrute(bytes32("b"));
        registry.createBaseBrute(bytes32("c"));
        vm.expectRevert(bytes("base brute limit reached"));
        registry.createBaseBrute(bytes32("d"));

        token.approve(address(registry), 1_000 ether);
        uint256 bruteId = registry.createExtraBrute(bytes32("d"));
        vm.stopPrank();

        assertEq(bruteId, 4);
        assertEq(registry.ownerOfBrute(4), alice);
        assertEq(token.balanceOf(registry.BURN_ADDRESS()), 500 ether);
        assertEq(token.balanceOf(address(pool)), 500 ether);
        assertEq(registry.extraBrutePrice(alice), 2_000 ether);
    }

    function testDailyActionsLimit() public {
        vm.prank(alice);
        uint256 bruteId = registry.createBaseBrute(bytes32("a"));

        vm.startPrank(alice);
        daily.useDailyAction(bruteId);
        daily.useDailyAction(bruteId);
        daily.useDailyAction(bruteId);
        assertEq(daily.actionsRemaining(bruteId), 0);
        vm.expectRevert(bytes("daily actions exhausted"));
        daily.useDailyAction(bruteId);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 days);
        assertEq(daily.actionsRemaining(bruteId), 3);
    }

    function testRewardPoolRequiresMinimumStakeAndDistributesBnb() public {
        vm.startPrank(alice);
        token.approve(address(pool), 10_000 ether);
        pool.stake(10_000 ether);
        vm.stopPrank();

        vm.deal(address(this), 1 ether);
        pool.depositTaxRewards{value: 1 ether}();
        assertEq(pool.claimable(alice), 1 ether);

        uint256 before = alice.balance;
        vm.prank(alice);
        pool.claimRewards();
        assertEq(alice.balance, before + 1 ether);
    }

    function testArenaEscrowChallengeResolveAndClaim() public {
        vm.prank(alice);
        uint256 a = registry.createBaseBrute(bytes32("a"));
        vm.prank(bob);
        uint256 b = registry.createBaseBrute(bytes32("b"));

        address feeReceiver = address(0xFEE);
        BrutusArenaEscrow arena = new BrutusArenaEscrow(address(registry), resolver, feeReceiver, 500);

        vm.prank(alice);
        uint256 challengeId = arena.createChallenge{value: 1 ether}(a, address(0), 1 ether);
        vm.prank(bob);
        arena.acceptChallenge{value: 1 ether}(challengeId, b);

        bytes32 fightHash = keccak256("fight-log");
        bytes32 digest = keccak256(abi.encodePacked(address(arena), block.chainid, challengeId, b, fightHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(resolverPk, digest);
        bytes memory sig = abi.encodePacked(r, s, v);

        arena.resolveChallenge(challengeId, b, fightHash, sig);
        uint256 before = bob.balance;
        vm.prank(bob);
        arena.claimWinnings(challengeId);
        assertEq(bob.balance, before + 1.9 ether);
        assertEq(feeReceiver.balance, 0.1 ether);
    }

    function testBloodVaultForwarding() public {
        vm.chainId(97);
        vm.startPrank(alice);
        token.approve(address(pool), 10_000 ether);
        pool.stake(10_000 ether);
        vm.stopPrank();

        BrutusBloodVault vault = new BrutusBloodVault(address(token), address(pool), address(this));
        vm.deal(address(this), 2 ether);
        (bool ok,) = address(vault).call{value: 2 ether}("");
        assertTrue(ok);
        assertEq(vault.totalTaxRewardsReceived(), 2 ether);
        vault.forwardTaxRewards(2 ether);
        assertEq(pool.claimable(alice), 2 ether);
    }

    function testFactorySchemaCompilesAndSupportsBnb() public {
        BrutusBloodVaultFactory factory = new BrutusBloodVaultFactory();
        assertTrue(factory.isQuoteTokenSupported(address(0)));
        assertFalse(factory.isQuoteTokenSupported(address(token)));
        assertEq(factory.vaultDataSchema().fields.length, 2);
    }
}
