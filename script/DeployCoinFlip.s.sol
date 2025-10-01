// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/CoinFlip.sol";

contract DeployCoinFlip is Script {
    function run() external {
        // Configuration
        address entropyAddress = vm.envAddress("ENTROPY_ADDRESS");
        uint256 minBet = 0.01 ether; // Minimum bet: 0.01 MON
        uint256 maxBet = 1 ether;    // Maximum bet: 1 MON
        uint256 initialHouseFunds = 2 ether; // Initial house funds: 2 MON

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Get default entropy provider
        IEntropy entropy = IEntropy(entropyAddress);
        address entropyProvider = entropy.getDefaultProvider();

        console.log("Using Entropy at:", entropyAddress);
        console.log("Entropy Provider:", entropyProvider);

        // Deploy CoinFlip contract with initial house funds
        CoinFlip coinFlip = new CoinFlip{value: initialHouseFunds}(
            entropyAddress,
            entropyProvider,
            minBet,
            maxBet
        );

        console.log("CoinFlip deployed at:", address(coinFlip));
        console.log("Owner:", coinFlip.owner());
        console.log("Min Bet:", coinFlip.minBet());
        console.log("Max Bet:", coinFlip.maxBet());
        console.log("Initial House Balance:", address(coinFlip).balance);
        console.log("Entropy Fee:", coinFlip.getEntropyFee());

        vm.stopBroadcast();
    }
}