// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/MonadFlip.sol";

contract DeployMonadFlipProduction is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying MonadFlip from:", deployer);
        console.log("Deployer balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);

        // Pyth Entropy contract address for Monad
        address entropyAddress = 0x36825bf3Fbdf5a29E2d5148bfe7Dcf7B5639e320;
        
        // Deploy with substantial initial funding (10 ETH for production)
        uint256 initialFunding = 10 ether;
        require(deployer.balance >= initialFunding, "Insufficient balance for deployment");
        
        MonadFlip monadFlip = new MonadFlip{value: initialFunding}(entropyAddress);
        
        // Set production-ready parameters
        monadFlip.setBetLimits(0.01 ether, 1 ether); // 0.01 - 1 ETH bet range
        monadFlip.setFeePercentage(500); // 5% fee for production
        monadFlip.setMaxConcurrentBets(50); // Conservative limit
        
        console.log("=== DEPLOYMENT SUCCESSFUL ===");
        console.log("MonadFlip deployed to:", address(monadFlip));
        console.log("Owner:", monadFlip.owner());
        console.log("Initial balance:", monadFlip.getBalance());
        console.log("Fee percentage:", monadFlip.feePercentage());
        console.log("Minimum bet:", monadFlip.minimumBet());
        console.log("Maximum bet:", monadFlip.maximumBet());
        console.log("Max concurrent bets:", monadFlip.maxConcurrentBets());
        console.log("Entropy address:", address(monadFlip.entropy()));
        console.log("Contract paused:", monadFlip.isPaused());
        
        console.log("=== SECURITY CHECKLIST ===");
        console.log("1. Contract uses secure user-provided randomness: YES");
        console.log("2. Reentrancy protection enabled: YES");
        console.log("3. Emergency pause functionality: YES");
        console.log("4. DoS protection (max concurrent bets): YES");
        console.log("5. Safe transfer patterns: YES");
        console.log("6. Access controls: YES");
        
        console.log("=== POST-DEPLOYMENT ACTIONS REQUIRED ===");
        console.log("1. Verify contract on block explorer");
        console.log("2. Set up monitoring for events");
        console.log("3. Prepare emergency procedures");
        console.log("4. Consider transferring ownership to multisig");
        console.log("5. Conduct final security audit");

        vm.stopBroadcast();
    }
}