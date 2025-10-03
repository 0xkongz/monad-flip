// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./IEntropy.sol";

/**
 * @title CoinFlip
 * @dev A provably fair coin flip betting game on Monad using Pyth Entropy
 * @notice Users bet MON, choose heads (0) or tails (1), and win 1.9x if correct (5% house fee)
 */
contract CoinFlip {
    // Events
    event BetPlaced(
        address indexed player,
        uint256 amount,
        uint8 choice,
        uint256 gameId,
        uint64 sequenceNumber,
        bytes32 userCommitment
    );
    event GameResult(
        address indexed player,
        uint256 indexed gameId,
        uint8 choice,
        uint8 result,
        bool won,
        uint256 payout
    );
    event HouseFundsDeposited(address indexed sender, uint256 amount);
    event HouseFundsWithdrawn(address indexed owner, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // Pyth Entropy
    IEntropy public immutable entropy;
    address public immutable entropyProvider;

    // State variables
    address public owner;
    uint256 public minBet;
    uint256 public maxBet;
    uint256 public houseFees;
    uint256 public gameIdCounter;
    uint256 public constant HOUSE_FEE_PERCENT = 5; // 5% house fee

    // Game states
    enum GameState {
        Pending,
        Revealed,
        Cancelled
    }

    // Game structure
    struct Game {
        address player;
        uint256 betAmount;
        uint8 playerChoice; // 0 = Heads, 1 = Tails
        uint8 result;
        bool won;
        uint256 payout;
        uint256 timestamp;
        GameState state;
        uint64 entropySequenceNumber;
        bytes32 userRandomness;
    }

    mapping(uint256 => Game) public games;
    mapping(address => uint256[]) public playerGames;
    mapping(uint64 => uint256) public sequenceNumberToGameId; // Map entropy sequence to game ID

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier validBetAmount() {
        require(msg.value >= minBet, "Bet amount is below minimum");
        require(msg.value <= maxBet, "Bet amount is above maximum");
        _;
    }

    modifier validChoice(uint8 _choice) {
        require(_choice == 0 || _choice == 1, "Invalid choice: must be 0 (Heads) or 1 (Tails)");
        _;
    }

    constructor(
        address _entropyAddress,
        address _entropyProvider,
        uint256 _minBet,
        uint256 _maxBet
    ) payable {
        require(_entropyAddress != address(0), "Invalid entropy address");
        require(_minBet > 0, "Minimum bet must be greater than 0");
        require(_maxBet > _minBet, "Maximum bet must be greater than minimum bet");

        entropy = IEntropy(_entropyAddress);
        entropyProvider = _entropyProvider;
        owner = msg.sender;
        minBet = _minBet;
        maxBet = _maxBet;
        gameIdCounter = 0;
    }

    /**
     * @dev Place a bet and request randomness from Pyth Entropy
     * @param _choice Player's choice: 0 for Heads, 1 for Tails
     * @param _userRandomness User's random number for commitment (should be truly random)
     */
    function placeBet(uint8 _choice, bytes32 _userRandomness)
        external
        payable
        validBetAmount
        validChoice(_choice)
        returns (uint256 gameId)
    {
        require(_userRandomness != bytes32(0), "User randomness cannot be zero");

        uint256 betAmount = msg.value;

        // Get entropy fee
        uint128 entropyFee = entropy.getFee(entropyProvider);
        require(betAmount > entropyFee, "Bet amount must cover entropy fee");

        uint256 actualBet = betAmount - entropyFee;
        uint256 potentialPayout = (actualBet * 190) / 100; // 1.9x payout

        // Ensure contract has enough balance to pay out
        require(
            address(this).balance >= actualBet + potentialPayout,
            "Insufficient house balance for potential payout"
        );

        // Create user commitment
        bytes32 userCommitment = keccak256(abi.encodePacked(_userRandomness));

        // Request randomness from Pyth Entropy
        uint64 sequenceNumber = entropy.request{value: entropyFee}(
            entropyProvider,
            userCommitment,
            true
        );

        // Generate game ID
        gameId = gameIdCounter++;

        // Store game
        games[gameId] = Game({
            player: msg.sender,
            betAmount: actualBet,
            playerChoice: _choice,
            result: 0,
            won: false,
            payout: 0,
            timestamp: block.timestamp,
            state: GameState.Pending,
            entropySequenceNumber: sequenceNumber,
            userRandomness: _userRandomness
        });

        playerGames[msg.sender].push(gameId);
        sequenceNumberToGameId[sequenceNumber] = gameId;

        emit BetPlaced(msg.sender, actualBet, _choice, gameId, sequenceNumber, userCommitment);

        return gameId;
    }

    /**
     * @dev Reveal the result using Pyth Entropy
     * @param _gameId The game ID to reveal
     * @param _providerRevelation The provider's revelation from Pyth
     */
    function revealResult(uint256 _gameId, bytes32 _providerRevelation) external {
        Game storage game = games[_gameId];
        require(game.state == GameState.Pending, "Game already revealed or cancelled");
        require(game.player != address(0), "Game does not exist");

        // Reveal randomness from Pyth Entropy
        bytes32 randomNumber = entropy.reveal(
            entropyProvider,
            game.entropySequenceNumber,
            game.userRandomness,
            _providerRevelation
        );

        // Generate result (0 or 1)
        uint8 result = uint8(uint256(randomNumber) % 2);
        game.result = result;
        game.state = GameState.Revealed;

        bool won = (game.playerChoice == result);
        game.won = won;

        if (won) {
            // Calculate payout: original bet + winnings (90% of bet)
            uint256 payout = game.betAmount + ((game.betAmount * 90) / 100);
            uint256 fee = (game.betAmount * HOUSE_FEE_PERCENT) / 100;
            houseFees += fee;
            game.payout = payout;

            // Transfer payout to winner
            (bool success, ) = payable(game.player).call{value: payout}("");
            require(success, "Payout transfer failed");
        } else {
            // Player loses, bet stays in contract as house balance
            uint256 fee = (game.betAmount * HOUSE_FEE_PERCENT) / 100;
            houseFees += fee;
        }

        emit GameResult(game.player, _gameId, game.playerChoice, result, won, game.payout);
    }

    /**
     * @dev Cancel a game and refund the player (only if reveal times out)
     * @param _gameId The game ID to cancel
     * @notice Can only be called after 1 hour of game creation
     */
    function cancelGame(uint256 _gameId) external {
        Game storage game = games[_gameId];
        require(game.state == GameState.Pending, "Game already revealed or cancelled");
        require(game.player != address(0), "Game does not exist");
        require(msg.sender == game.player, "Only player can cancel their game");
        require(block.timestamp > game.timestamp + 1 hours, "Cannot cancel game yet, wait 1 hour");

        game.state = GameState.Cancelled;

        // Refund the bet to the player
        (bool success, ) = payable(game.player).call{value: game.betAmount}("");
        require(success, "Refund transfer failed");
    }

    /**
     * @dev Deposit funds to the house balance
     */
    function depositHouseFunds() external payable {
        require(msg.value > 0, "Must deposit some amount");
        emit HouseFundsDeposited(msg.sender, msg.value);
    }

    /**
     * @dev Withdraw accumulated house fees (only owner)
     * @param _amount Amount to withdraw
     */
    function withdrawHouseFees(uint256 _amount) external onlyOwner {
        require(_amount <= houseFees, "Insufficient house fees");
        require(_amount <= address(this).balance, "Insufficient contract balance");

        houseFees -= _amount;

        (bool success, ) = payable(owner).call{value: _amount}("");
        require(success, "Withdrawal failed");

        emit HouseFundsWithdrawn(owner, _amount);
    }

    /**
     * @dev Emergency withdrawal of all funds (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");

        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Emergency withdrawal failed");

        emit HouseFundsWithdrawn(owner, balance);
    }

    /**
     * @dev Update minimum bet (only owner)
     */
    function setMinBet(uint256 _minBet) external onlyOwner {
        require(_minBet > 0, "Minimum bet must be greater than 0");
        require(_minBet < maxBet, "Minimum bet must be less than maximum bet");
        minBet = _minBet;
    }

    /**
     * @dev Update maximum bet (only owner)
     */
    function setMaxBet(uint256 _maxBet) external onlyOwner {
        require(_maxBet > minBet, "Maximum bet must be greater than minimum bet");
        maxBet = _maxBet;
    }

    /**
     * @dev Transfer ownership (only owner)
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "New owner cannot be zero address");
        address previousOwner = owner;
        owner = _newOwner;
        emit OwnershipTransferred(previousOwner, _newOwner);
    }

    /**
     * @dev Get player's game history
     */
    function getPlayerGames(address _player) external view returns (uint256[] memory) {
        return playerGames[_player];
    }

    /**
     * @dev Get game details by ID
     */
    function getGame(uint256 _gameId) external view returns (Game memory) {
        return games[_gameId];
    }

    /**
     * @dev Get game ID by entropy sequence number
     */
    function getGameIdBySequence(uint64 _sequenceNumber) external view returns (uint256) {
        return sequenceNumberToGameId[_sequenceNumber];
    }

    /**
     * @dev Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Get available house balance (total - fees)
     */
    function getAvailableHouseBalance() external view returns (uint256) {
        return address(this).balance > houseFees ? address(this).balance - houseFees : 0;
    }

    /**
     * @dev Get entropy fee for a bet
     */
    function getEntropyFee() external view returns (uint128) {
        return entropy.getFee(entropyProvider);
    }

    // Receive function to accept MON deposits
    receive() external payable {
        emit HouseFundsDeposited(msg.sender, msg.value);
    }

    // Fallback function
    fallback() external payable {
        emit HouseFundsDeposited(msg.sender, msg.value);
    }
}