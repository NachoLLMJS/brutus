// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {BrutusRegistry, BrutusDailyActions, BrutusRewardPool, BrutusArenaEscrow} from "../../../src/BrutusGame.sol";

contract DeployBrutusGameWithToken is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address token = vm.envAddress("BRUTUS_TOKEN_ADDRESS");
        address resolver = vm.envOr("BRUTUS_RESOLVER", deployer);
        address feeReceiver = vm.envOr("BRUTUS_FEE_RECEIVER", deployer);
        uint256 extraBruteBasePrice = vm.envOr("BRUTUS_EXTRA_BRUTE_PRICE", uint256(1_000 ether));
        uint256 minimumStake = vm.envOr("BRUTUS_MINIMUM_STAKE", uint256(10_000 ether));
        uint16 arenaFeeBps = uint16(vm.envOr("BRUTUS_ARENA_FEE_BPS", uint256(500)));

        vm.startBroadcast(deployerPrivateKey);
        BrutusRewardPool rewardPool = new BrutusRewardPool(token, minimumStake, deployer);
        BrutusRegistry registry = new BrutusRegistry(token, address(rewardPool), extraBruteBasePrice, deployer);
        BrutusDailyActions dailyActions = new BrutusDailyActions(address(registry));
        BrutusArenaEscrow arena = new BrutusArenaEscrow(address(registry), resolver, feeReceiver, arenaFeeBps);
        vm.stopBroadcast();

        console2.log("deployer", deployer);
        console2.log("token", token);
        console2.log("rewardPool", address(rewardPool));
        console2.log("registry", address(registry));
        console2.log("dailyActions", address(dailyActions));
        console2.log("arenaEscrow", address(arena));
        console2.log("resolver", resolver);
        console2.log("feeReceiver", feeReceiver);
    }
}
