// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/MonadFlip.sol";

contract TestDeploy is Script {
    function run() external {
        // Use anvil's default private key for testing
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        
        vm.startBroadcast(deployerPrivateKey);

        // Pyth Entropy contract address for Monad
        address entropyAddress = 0x36825bf3Fbdf5a29E2d5148bfe7Dcf7B5639e320;
        
        // Deploy with 1 ETH funding
        MonadFlip monadFlip = new MonadFlip{value: 1 ether}(entropyAddress);
        
        console.log("=== TEST DEPLOYMENT SUCCESSFUL ===");
        console.log("MonadFlip deployed to:", address(monadFlip));
        console.log("Owner:", monadFlip.owner());
        console.log("Initial balance:", monadFlip.getBalance());
        console.log("Fee percentage:", monadFlip.feePercentage());
        console.log("Minimum bet:", monadFlip.minimumBet());
        console.log("Maximum bet:", monadFlip.maximumBet());
        console.log("Contract paused:", monadFlip.isPaused());

        vm.stopBroadcast();
    }
}