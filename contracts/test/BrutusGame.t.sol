// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {BrutusRegistry, BrutusDailyActions, BrutusRewardPool, BrutusArenaEscrow} from "../src/BrutusGame.sol";
import {BrutusRegistryV3, BrutusPetRegistryV1} from "../src/BrutusGameV3.sol";
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

    function testBloodVaultKeepsOnlyGuardianEmergencyWithdrawNoBurnSelector() public {
        vm.chainId(97);
        address operator = bob;
        BrutusBloodVault vault = new BrutusBloodVault(address(token), address(pool), operator);
        vm.deal(address(this), 1 ether);
        (bool ok,) = address(vault).call{value: 1 ether}("");
        assertTrue(ok);

        // burn() was intentionally removed; the legacy selector must not exist.
        (bool burnOk,) = address(vault).call(abi.encodeWithSignature("burn()"));
        assertFalse(burnOk);

        address guardian = 0x76Fa8C526f8Bc27ba6958B76DeEf92a0dbE46950;
        uint256 before = guardian.balance;
        vm.prank(guardian);
        vault.emergencyWithdrawNative(payable(guardian));
        assertEq(address(vault).balance, 0);
        assertEq(guardian.balance, before + 1 ether);

        for (uint256 i = 0; i < vault.vaultUISchema().methods.length; i++) {
            assertTrue(keccak256(bytes(vault.vaultUISchema().methods[i].name)) != keccak256(bytes("burn")));
        }
    }

    function testPetRegistryPurchasesOneOfEachPetWithBnb() public {
        BrutusPetRegistryV1 pets = new BrutusPetRegistryV1(address(token), payable(bob), address(this), address(this));
        bytes32 doux = bytes32("doux_dino");
        bytes32 mort = bytes32("mort_dino");
        bytes32[] memory ids = new bytes32[](2);
        uint256[] memory prices = new uint256[](2);
        bool[] memory active = new bool[](2);
        ids[0] = doux;
        ids[1] = mort;
        prices[0] = 0.0009 ether;
        prices[1] = 0.0018 ether;
        active[0] = true;
        active[1] = true;
        pets.configurePets(ids, prices, active);

        uint256 receiverBefore = bob.balance;
        vm.prank(alice);
        pets.buyPet{value: 0.0009 ether}(doux);
        assertTrue(pets.ownsPet(alice, doux));
        assertEq(pets.ownedPetCount(alice), 1);
        assertEq(pets.ownedPetIdAt(alice, 0), doux);
        assertEq(bob.balance, receiverBefore + 0.0009 ether);

        vm.prank(alice);
        vm.expectRevert(bytes("pet already owned"));
        pets.buyPet{value: 0.0009 ether}(doux);

        vm.prank(bob);
        vm.expectRevert(bytes("wrong BNB amount"));
        pets.buyPet{value: 0.0008 ether}(doux);
    }

    function testPetRegistryAndExtraBrutesTokenPaymentsGoToDevWalletWhileBnbGoesToVault() public {
        address payable receiver = payable(bob);
        address devWallet = address(0xD3D);
        BrutusRegistryV3 registry = new BrutusRegistryV3(address(token), receiver, devWallet, 0.01 ether, address(this));
        registry.setExtraBruteTokenPrice(10_000 ether);
        BrutusPetRegistryV1 pets = new BrutusPetRegistryV1(address(token), receiver, devWallet, address(this));
        bytes32 doux = bytes32("doux_dino");
        bytes32 mort = bytes32("mort_dino");
        pets.configurePet(doux, 0.0009 ether, true);
        pets.configurePet(mort, 0.0018 ether, true);
        pets.configurePetTokenPrice(doux, 900 ether);

        uint256 receiverTokenBefore = token.balanceOf(receiver);
        uint256 devTokenBefore = token.balanceOf(devWallet);
        uint256 receiverBnbBefore = receiver.balance;
        token.mint(alice, 20_000 ether);
        vm.startPrank(alice);
        token.approve(address(registry), 10_000 ether);
        registry.createExtraBruteWithToken(bytes32("extra-token"));
        token.approve(address(pets), 900 ether);
        pets.buyPetWithToken(doux);
        pets.buyPet{value: 0.0018 ether}(mort);
        vm.stopPrank();

        assertEq(token.balanceOf(receiver), receiverTokenBefore);
        assertEq(token.balanceOf(devWallet), devTokenBefore + 10_900 ether);
        assertEq(receiver.balance, receiverBnbBefore + 0.0018 ether);
        assertTrue(pets.ownsPet(alice, doux));
        assertEq(registry.paidExtraBruteCount(alice), 1);
    }

    function testFactorySchemaCompilesAndSupportsBnb() public {
        BrutusBloodVaultFactory factory = new BrutusBloodVaultFactory();
        assertTrue(factory.isQuoteTokenSupported(address(0)));
        assertFalse(factory.isQuoteTokenSupported(address(token)));
        assertEq(factory.vaultDataSchema().fields.length, 2);
    }
}
