// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {BrutusBloodVaultFactory} from "../../../src/BrutusBloodVault.sol";

contract DeployBrutusFactoryOnly is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);
        BrutusBloodVaultFactory factory = new BrutusBloodVaultFactory();
        vm.stopBroadcast();

        console2.log("deployer", deployer);
        console2.log("brutusBloodVaultFactory", address(factory));
        console2.log("vaultDataSchema fields: rewardReceiver, operator");
    }
}
