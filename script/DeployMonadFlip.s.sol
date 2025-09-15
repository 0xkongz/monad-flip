// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/MonadFlip.sol";

contract DeployMonadFlip is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Pyth Entropy contract address for Monad
        address entropyAddress = 0x36825bf3Fbdf5a29E2d5148bfe7Dcf7B5639e320;
        
        // Deploy with some initial funding (1 ETH)
        MonadFlip monadFlip = new MonadFlip{value: 1 ether}(entropyAddress);
        
        console.log("MonadFlip deployed to:", address(monadFlip));
        console.log("Owner:", monadFlip.owner());
        console.log("Initial balance:", monadFlip.getBalance());
        console.log("Fee percentage:", monadFlip.feePercentage());
        console.log("Minimum bet:", monadFlip.minimumBet());
        console.log("Maximum bet:", monadFlip.maximumBet());

        vm.stopBroadcast();
    }
}