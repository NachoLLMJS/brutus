// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {BrutusRegistryV3, BrutusCombatRewardsV3} from "../../../src/BrutusGameV3.sol";

contract DeployBrutusPatchV3 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address token = vm.envAddress("BRUTUS_TOKEN_ADDRESS");
        address payable vault = payable(vm.envAddress("BRUTUS_VAULT_ADDRESS"));
        uint256 extraBrutePriceWei = vm.envOr("BRUTUS_EXTRA_BRUTE_PRICE_WEI", uint256(0.01 ether));
        uint256 minimumHold = vm.envOr("BRUTUS_MINIMUM_HOLD", uint256(10_000 ether));
        uint256 combatClaimAmount = vm.envOr("BRUTUS_COMBAT_CLAIM_AMOUNT", uint256(0.001 ether));
        uint256 maxOperatorGasRefund = vm.envOr("BRUTUS_MAX_OPERATOR_GAS_REFUND_WEI", uint256(0.0002 ether));

        vm.startBroadcast(deployerPrivateKey);
        BrutusRegistryV3 registry = new BrutusRegistryV3(token, vault, extraBrutePriceWei, deployer);
        BrutusCombatRewardsV3 combatRewards = new BrutusCombatRewardsV3(
            token,
            minimumHold,
            combatClaimAmount,
            deployer,
            maxOperatorGasRefund
        );
        vm.stopBroadcast();

        console2.log("deployer", deployer);
        console2.log("registryV3", address(registry));
        console2.log("combatRewardsV3", address(combatRewards));
        console2.log("token", token);
        console2.log("vault", vault);
    }
}
