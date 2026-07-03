// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {BrutusRegistryV3, BrutusCombatRewardsV3, BrutusPetRegistryV1} from "../../../src/BrutusGameV3.sol";

interface IBrutusBloodVaultConfig {
    function operator() external view returns (address);
    function setRewardReceiver(address newReceiver) external;
    function setGameContracts(address newGameRegistry, address newPetRegistry) external;
}

contract DeployBrutusPatchV3 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address token = vm.envAddress("BRUTUS_TOKEN_ADDRESS");
        address payable vault = payable(vm.envAddress("BRUTUS_VAULT_ADDRESS"));
        address vaultOperator = IBrutusBloodVaultConfig(vault).operator();
        address tokenPaymentReceiver = vm.envOr("BRUTUS_TOKEN_PAYMENT_RECEIVER", vaultOperator == address(0) ? deployer : vaultOperator);
        uint256 extraBrutePriceWei = vm.envOr("BRUTUS_EXTRA_BRUTE_PRICE_WEI", uint256(0.01 ether));
        uint256 minimumHold = vm.envOr("BRUTUS_MINIMUM_HOLD", uint256(10_000 ether));
        uint256 combatClaimAmount = vm.envOr("BRUTUS_COMBAT_CLAIM_AMOUNT", uint256(0.001 ether));
        uint256 maxOperatorGasRefund = vm.envOr("BRUTUS_MAX_OPERATOR_GAS_REFUND_WEI", uint256(0.0002 ether));
        uint256 douxPrice = vm.envOr("BRUTUS_PET_DOUX_PRICE_WEI", uint256(0.0009 ether));
        uint256 mortPrice = vm.envOr("BRUTUS_PET_MORT_PRICE_WEI", uint256(0.0018 ether));
        uint256 tardPrice = vm.envOr("BRUTUS_PET_TARD_PRICE_WEI", uint256(0.0036 ether));
        uint256 vitaPrice = vm.envOr("BRUTUS_PET_VITA_PRICE_WEI", uint256(0.0069 ether));
        uint256 extraBruteTokenPriceWei = vm.envOr("BRUTUS_EXTRA_BRUTE_TOKEN_PRICE_WEI", uint256(10_000 ether));
        uint256 douxTokenPrice = vm.envOr("BRUTUS_PET_DOUX_TOKEN_PRICE_WEI", uint256(900 ether));
        uint256 mortTokenPrice = vm.envOr("BRUTUS_PET_MORT_TOKEN_PRICE_WEI", uint256(1_800 ether));
        uint256 tardTokenPrice = vm.envOr("BRUTUS_PET_TARD_TOKEN_PRICE_WEI", uint256(3_600 ether));
        uint256 vitaTokenPrice = vm.envOr("BRUTUS_PET_VITA_TOKEN_PRICE_WEI", uint256(6_900 ether));

        vm.startBroadcast(deployerPrivateKey);
        BrutusRegistryV3 registry = new BrutusRegistryV3(token, vault, tokenPaymentReceiver, extraBrutePriceWei, deployer);
        registry.setExtraBruteTokenPrice(extraBruteTokenPriceWei);
        BrutusCombatRewardsV3 combatRewards = new BrutusCombatRewardsV3(
            token,
            minimumHold,
            combatClaimAmount,
            deployer,
            maxOperatorGasRefund
        );
        IBrutusBloodVaultConfig(vault).setRewardReceiver(address(combatRewards));
        BrutusPetRegistryV1 petRegistry = new BrutusPetRegistryV1(token, vault, tokenPaymentReceiver, deployer);
        bytes32[] memory petIds = new bytes32[](4);
        uint256[] memory petPrices = new uint256[](4);
        bool[] memory petActive = new bool[](4);
        petIds[0] = bytes32("doux_dino");
        petIds[1] = bytes32("mort_dino");
        petIds[2] = bytes32("tard_dino");
        petIds[3] = bytes32("vita_dino");
        petPrices[0] = douxPrice;
        petPrices[1] = mortPrice;
        petPrices[2] = tardPrice;
        petPrices[3] = vitaPrice;
        petActive[0] = true;
        petActive[1] = true;
        petActive[2] = true;
        petActive[3] = true;
        petRegistry.configurePets(petIds, petPrices, petActive);
        uint256[] memory petTokenPrices = new uint256[](4);
        petTokenPrices[0] = douxTokenPrice;
        petTokenPrices[1] = mortTokenPrice;
        petTokenPrices[2] = tardTokenPrice;
        petTokenPrices[3] = vitaTokenPrice;
        petRegistry.configurePetTokenPrices(petIds, petTokenPrices);
        IBrutusBloodVaultConfig(vault).setGameContracts(address(registry), address(petRegistry));
        vm.stopBroadcast();

        console2.log("deployer", deployer);
        console2.log("registryV3", address(registry));
        console2.log("combatRewardsV3", address(combatRewards));
        console2.log("petRegistryV1", address(petRegistry));
        console2.log("tokenPaymentReceiver", tokenPaymentReceiver);
        console2.log("token", token);
        console2.log("vault", vault);
    }
}
