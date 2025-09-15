// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./MonadFlip.sol";

/**
 * @title MonadFlipWithCommitReveal
 * @dev Enhanced version with commit-reveal scheme for maximum security
 * @notice This version requires users to commit to randomness first, then reveal
 */
contract MonadFlipWithCommitReveal is MonadFlip {
    
    struct Commitment {
        bytes32 commitment;
        uint256 timestamp;
        bool revealed;
    }
    
    mapping(address => Commitment) public commitments;
    uint256 public commitmentDuration = 1 hours; // Time between commit and reveal
    uint256 public revealDeadline = 24 hours; // Max time to reveal after commit
    
    event CommitmentMade(address indexed player, bytes32 commitment);
    event CommitmentRevealed(address indexed player, bytes32 randomness);
    
    constructor(address _entropyAddress) MonadFlip(_entropyAddress) {}
    
    /**
     * @dev Step 1: Commit to a randomness value
     * @param _commitment Hash of (randomness + nonce)
     */
    function commitRandomness(bytes32 _commitment) external {
        require(_commitment != bytes32(0), "Invalid commitment");
        require(commitments[msg.sender].timestamp == 0 || 
                block.timestamp > commitments[msg.sender].timestamp + revealDeadline,
                "Previous commitment still active");
        
        commitments[msg.sender] = Commitment({
            commitment: _commitment,
            timestamp: block.timestamp,
            revealed: false
        });
        
        emit CommitmentMade(msg.sender, _commitment);
    }
    
    /**
     * @dev Step 2: Reveal randomness and place bet
     * @param _guess Coin flip guess
     * @param _randomness Original randomness value
     * @param _nonce Nonce used in commitment
     */
    function revealAndPlaceBet(
        CoinSide _guess,
        bytes32 _randomness,
        bytes32 _nonce
    ) external payable validBetAmount whenNotPaused nonReentrant {
        Commitment storage commitment = commitments[msg.sender];
        
        require(commitment.timestamp != 0, "No commitment found");
        require(!commitment.revealed, "Already revealed");
        require(block.timestamp >= commitment.timestamp + commitmentDuration, 
                "Must wait before revealing");
        require(block.timestamp <= commitment.timestamp + revealDeadline,
                "Reveal deadline passed");
        
        // Verify commitment
        bytes32 expectedCommitment = keccak256(abi.encodePacked(_randomness, _nonce));
        require(expectedCommitment == commitment.commitment, "Invalid reveal");
        
        commitment.revealed = true;
        
        // Place bet with revealed randomness
        _placeBetInternal(_guess, _randomness);
        
        emit CommitmentRevealed(msg.sender, _randomness);
    }
    
    /**
     * @dev Internal bet placement logic
     */
    function _placeBetInternal(CoinSide _guess, bytes32 _userRandomness) internal {
        require(activeBetsCount < maxConcurrentBets, "Too many concurrent bets");
        require(_userRandomness != bytes32(0), "Invalid user randomness");
        
        // Check contract has enough balance to pay potential winnings
        uint256 entropyFee = uint256(entropy.getFee(address(this)));
        uint256 betAmount = msg.value - entropyFee;
        uint256 potentialPayout = calculatePayout(betAmount);
        require(
            address(this).balance >= potentialPayout,
            "Contract insufficient balance for potential payout"
        );
        
        uint64 sequenceNumber = entropy.requestWithCallback{
            value: entropyFee
        }(
            address(this),
            _userRandomness
        );
        
        bets[sequenceNumber] = Bet({
            player: msg.sender,
            amount: betAmount,
            guess: _guess,
            isSettled: false,
            won: false,
            payout: 0
        });
        
        playerBets[msg.sender].push(sequenceNumber);
        activeBetsCount++;
        
        emit BetPlaced(msg.sender, sequenceNumber, msg.value, _guess);
    }
    
    /**
     * @dev Override original placeBet to require commit-reveal
     */
    function placeBet(CoinSide, bytes32) external payable override {
        revert("Use commit-reveal scheme: commitRandomness() then revealAndPlaceBet()");
    }
    
    /**
     * @dev Set commitment timing parameters
     */
    function setCommitmentTiming(uint256 _commitmentDuration, uint256 _revealDeadline) 
        external onlyOwner {
        require(_commitmentDuration > 0, "Duration must be > 0");
        require(_revealDeadline > _commitmentDuration, "Deadline must be > duration");
        commitmentDuration = _commitmentDuration;
        revealDeadline = _revealDeadline;
    }
    
    /**
     * @dev Clean up expired commitments
     */
    function cleanupCommitment(address player) external {
        Commitment storage commitment = commitments[player];
        require(commitment.timestamp != 0, "No commitment found");
        require(block.timestamp > commitment.timestamp + revealDeadline,
                "Commitment not expired");
        
        delete commitments[player];
    }
}