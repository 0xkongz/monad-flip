// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@pythnetwork/entropy-sdk-solidity/IEntropy.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";

contract MonadFlip is IEntropyConsumer {
    // Pyth Entropy contract address
    IEntropy public entropy;
    
    // Contract owner
    address public owner;
    
    // Fee percentage (in basis points, e.g., 1000 = 10%)
    uint256 public feePercentage = 1000; // 10% default
    
    // Minimum bet amount
    uint256 public minimumBet = 0.001 ether;
    
    // Maximum bet amount (to limit contract exposure)
    uint256 public maximumBet = 10 ether;
    
    // Emergency pause state
    bool public paused = false;
    
    // Reentrancy lock
    bool private locked = false;
    
    // Maximum concurrent bets to prevent DoS
    uint256 public maxConcurrentBets = 100;
    uint256 public activeBetsCount = 0;
    
    // Enum for coin sides
    enum CoinSide { HEADS, TAILS }
    
    // Struct to store bet information
    struct Bet {
        address player;
        uint256 amount;
        CoinSide guess;
        bool isSettled;
        bool won;
        uint256 payout;
    }
    
    // Mapping from sequence number to bet
    mapping(uint64 => Bet) public bets;
    
    // Track pending bets for each player
    mapping(address => uint64[]) public playerBets;
    
    // Events
    event BetPlaced(
        address indexed player,
        uint64 indexed sequenceNumber,
        uint256 amount,
        CoinSide guess
    );
    
    event BetSettled(
        address indexed player,
        uint64 indexed sequenceNumber,
        uint256 randomNumber,
        CoinSide result,
        bool won,
        uint256 payout
    );
    
    event FeesWithdrawn(address indexed owner, uint256 amount);
    event FeePercentageUpdated(uint256 oldFee, uint256 newFee);
    event BetLimitsUpdated(uint256 minBet, uint256 maxBet);
    event EmergencyPause(bool paused);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    modifier nonReentrant() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }
    
    modifier validBetAmount() {
        require(msg.value >= minimumBet, "Bet amount too low");
        require(msg.value <= maximumBet, "Bet amount too high");
        _;
    }
    
    constructor(address _entropyAddress) payable {
        entropy = IEntropy(_entropyAddress);
        owner = msg.sender;
    }
    
    // Required by IEntropyConsumer - returns the Entropy contract address
    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }
    
    // Function to place a bet with user-provided randomness
    function placeBet(CoinSide _guess, bytes32 _userRandomness) external payable virtual validBetAmount whenNotPaused nonReentrant {
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
        
        // Use user-provided randomness for entropy request
        // This should be a secret value that the user commits to beforehand
        uint64 sequenceNumber = entropy.requestWithCallback{
            value: entropyFee
        }(
            address(this),
            _userRandomness
        );
        
        // Store the bet
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
    
    // This function is called by Pyth Entropy when random number is ready
    function entropyCallback(
        uint64 sequenceNumber,
        address,
        bytes32 randomNumber
    ) internal override nonReentrant {
        Bet storage bet = bets[sequenceNumber];
        require(!bet.isSettled, "Bet already settled");
        require(bet.player != address(0), "Invalid bet");
        
        // Convert random number to coin flip result
        uint256 randomValue = uint256(randomNumber);
        CoinSide result = (randomValue % 2 == 0) ? CoinSide.HEADS : CoinSide.TAILS;
        
        // Check if player won
        bool won = (bet.guess == result);
        uint256 payout = 0;
        
        if (won) {
            payout = calculatePayout(bet.amount);
            // Use call instead of transfer for better gas handling
            (bool success, ) = payable(bet.player).call{value: payout}("");
            require(success, "Payout transfer failed");
        }
        
        // Update bet
        bet.isSettled = true;
        bet.won = won;
        bet.payout = payout;
        activeBetsCount--;
        
        emit BetSettled(
            bet.player,
            sequenceNumber,
            randomValue,
            result,
            won,
            payout
        );
    }
    
    // Calculate payout after fees
    function calculatePayout(uint256 betAmount) public view returns (uint256) {
        uint256 winnings = betAmount * 2; // Double the bet
        uint256 fee = (winnings * feePercentage) / 10000;
        return winnings - fee;
    }
    
    // Get player's bet history
    function getPlayerBets(address player) external view returns (uint64[] memory) {
        return playerBets[player];
    }
    
    // Get bet details
    function getBet(uint64 sequenceNumber) external view returns (
        address player,
        uint256 amount,
        CoinSide guess,
        bool isSettled,
        bool won,
        uint256 payout
    ) {
        Bet memory bet = bets[sequenceNumber];
        return (
            bet.player,
            bet.amount,
            bet.guess,
            bet.isSettled,
            bet.won,
            bet.payout
        );
    }
    
    // Owner functions
    function setFeePercentage(uint256 _feePercentage) external onlyOwner {
        require(_feePercentage <= 2000, "Fee cannot exceed 20%");
        uint256 oldFee = feePercentage;
        feePercentage = _feePercentage;
        emit FeePercentageUpdated(oldFee, _feePercentage);
    }
    
    function setBetLimits(uint256 _minimumBet, uint256 _maximumBet) external onlyOwner {
        require(_minimumBet > 0, "Minimum bet must be greater than 0");
        require(_maximumBet > _minimumBet, "Maximum bet must be greater than minimum");
        minimumBet = _minimumBet;
        maximumBet = _maximumBet;
        emit BetLimitsUpdated(_minimumBet, _maximumBet);
    }
    
    function setMaxConcurrentBets(uint256 _maxConcurrentBets) external onlyOwner {
        require(_maxConcurrentBets > 0, "Max concurrent bets must be > 0");
        maxConcurrentBets = _maxConcurrentBets;
    }
    
    function withdrawFees(uint256 amount) external onlyOwner nonReentrant {
        require(amount <= address(this).balance, "Insufficient contract balance");
        (bool success, ) = payable(owner).call{value: amount}("");
        require(success, "Withdrawal failed");
        emit FeesWithdrawn(owner, amount);
    }
    
    function addFunds() external payable onlyOwner {
        // Allow owner to add funds to ensure contract can pay winnings
    }
    
    // Emergency functions
    function pause() external onlyOwner {
        paused = true;
        emit EmergencyPause(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit EmergencyPause(false);
    }
    
    function emergencyWithdraw() external onlyOwner {
        require(paused, "Contract must be paused for emergency withdrawal");
        (bool success, ) = payable(owner).call{value: address(this).balance}("");
        require(success, "Emergency withdrawal failed");
    }
    
    // Get contract balance
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // Get Pyth Entropy fee
    function getEntropyFee() external view returns (uint256) {
        return uint256(entropy.getFee(address(this)));
    }
    
    // Emergency function to transfer ownership
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        require(newOwner != owner, "New owner must be different");
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    // View functions
    function getActiveBetsCount() external view returns (uint256) {
        return activeBetsCount;
    }
    
    function isPaused() external view returns (bool) {
        return paused;
    }
    
    // Fallback function to receive Ether
    receive() external payable {}
}
