// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/CoinFlipV2.sol";

contract DeployCoinFlipV2 is Script {
    function run() external {
        // Configuration
        address entropyAddress = vm.envAddress("ENTROPY_ADDRESS");
        uint256 minBet = 0.01 ether; // Minimum bet: 0.01 MON
        uint256 maxBet = 1 ether;    // Maximum bet: 1 MON

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Get default entropy provider from Entropy V2
        IEntropyV2 entropy = IEntropyV2(entropyAddress);
        address entropyProvider = entropy.getDefaultProvider();

        console.log("Using Entropy V2 at:", entropyAddress);
        console.log("Entropy Provider:", entropyProvider);

        // Deploy CoinFlipV2 contract (no initial funds needed, owner can deposit later)
        CoinFlipV2 coinFlip = new CoinFlipV2(
            entropyAddress,
            entropyProvider,
            minBet,
            maxBet
        );

        console.log("CoinFlipV2 deployed at:", address(coinFlip));
        console.log("Owner:", coinFlip.owner());
        console.log("Min Bet:", coinFlip.minBet());
        console.log("Max Bet:", coinFlip.maxBet());
        console.log("Initial House Balance:", address(coinFlip).balance);
        console.log("Entropy Fee:", coinFlip.getEntropyFee());
        console.log("Entropy Provider:", coinFlip.getEntropyProvider());

        vm.stopBroadcast();
    }
}
