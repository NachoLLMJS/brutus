// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {BrutusRegistryV2, BrutusDailyActionsV2, BrutusCombatRewardsV2, BrutusArenaEscrowV2} from "../../../src/BrutusGameV2.sol";

contract DeployBrutusRealV2 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address token = vm.envAddress("BRUTUS_TOKEN_ADDRESS");
        address payable vault = payable(vm.envAddress("BRUTUS_VAULT_ADDRESS"));
        address resolver = vm.envOr("BRUTUS_RESOLVER", deployer);
        address feeReceiver = vm.envOr("BRUTUS_FEE_RECEIVER", deployer);
        uint256 extraBrutePriceWei = vm.envOr("BRUTUS_EXTRA_BRUTE_PRICE_WEI", uint256(0.01 ether));
        uint256 minimumHold = vm.envOr("BRUTUS_MINIMUM_HOLD", uint256(10_000 ether));
        uint256 combatClaimAmount = vm.envOr("BRUTUS_COMBAT_CLAIM_AMOUNT", uint256(0.001 ether));
        uint16 arenaFeeBps = uint16(vm.envOr("BRUTUS_ARENA_FEE_BPS", uint256(0)));

        vm.startBroadcast(deployerPrivateKey);
        BrutusRegistryV2 registry = new BrutusRegistryV2(token, vault, extraBrutePriceWei, deployer);
        BrutusDailyActionsV2 dailyActions = new BrutusDailyActionsV2(address(registry));
        BrutusCombatRewardsV2 combatRewards = new BrutusCombatRewardsV2(token, address(registry), minimumHold, combatClaimAmount, deployer);
        BrutusArenaEscrowV2 arena = new BrutusArenaEscrowV2(address(registry), resolver, feeReceiver, arenaFeeBps);
        vm.stopBroadcast();

        console2.log("deployer", deployer);
        console2.log("token", token);
        console2.log("vault", vault);
        console2.log("registryV2", address(registry));
        console2.log("dailyActionsV2", address(dailyActions));
        console2.log("combatRewardsV2", address(combatRewards));
        console2.log("arenaEscrowV2", address(arena));
        console2.log("resolver", resolver);
        console2.log("feeReceiver", feeReceiver);
        console2.log("extraBrutePriceWei", extraBrutePriceWei);
        console2.log("minimumHold", minimumHold);
        console2.log("combatClaimAmount", combatClaimAmount);
    }
}
