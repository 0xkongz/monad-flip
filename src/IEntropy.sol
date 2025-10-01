// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/**
 * @title IEntropy
 * @dev Interface for Pyth's Entropy contract on Monad
 * @notice Pyth Entropy provides secure randomness using a commit-reveal scheme
 */
interface IEntropy {
    /**
     * @notice Request a random number with a user commitment
     * @param provider The entropy provider to use
     * @param userCommitment A unique user commitment for this request
     * @param useBlockhash Whether to use blockhash as additional entropy
     * @return sequenceNumber The sequence number for this request
     */
    function request(
        address provider,
        bytes32 userCommitment,
        bool useBlockhash
    ) external payable returns (uint64 sequenceNumber);

    /**
     * @notice Reveal the random number for a given sequence
     * @param provider The entropy provider
     * @param sequenceNumber The sequence number from the request
     * @param userRandomness The user's random number used in the commitment
     * @param providerRevelation The provider's revelation
     * @return randomNumber The revealed random number
     */
    function reveal(
        address provider,
        uint64 sequenceNumber,
        bytes32 userRandomness,
        bytes32 providerRevelation
    ) external returns (bytes32 randomNumber);

    /**
     * @notice Get the fee required for a request
     * @param provider The entropy provider
     * @return The fee in wei
     */
    function getFee(address provider) external view returns (uint128);

    /**
     * @notice Get the default provider address
     * @return The default provider address
     */
    function getDefaultProvider() external view returns (address);
}