// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/MonadFlip.sol";

contract DeployMonadFlipKeystore is Script {
    function run() external {
        // Start broadcast with keystore account
        vm.startBroadcast();

        // Pyth Entropy contract address for Monad
        address entropyAddress = 0x36825bf3Fbdf5a29E2d5148bfe7Dcf7B5639e320;
        
        // Deploy with initial funding (1 ETH)
        uint256 initialFunding = 1 ether;
        
        console.log("Deploying MonadFlip...");
        console.log("Entropy address:", entropyAddress);
        console.log("Initial funding:", initialFunding);
        
        MonadFlip monadFlip = new MonadFlip{value: initialFunding}(entropyAddress);
        
        console.log("=== DEPLOYMENT SUCCESSFUL ===");
        console.log("MonadFlip deployed to:", address(monadFlip));
        console.log("Owner:", monadFlip.owner());
        console.log("Initial balance:", monadFlip.getBalance());
        console.log("Entropy address:", address(monadFlip.entropy()));
        
        vm.stopBroadcast();
    }
}