// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
import "@pythnetwork/entropy-sdk-solidity/EntropyStructsV2.sol";

/**
 * @title CoinFlipV2
 * @dev A provably fair coin flip betting game using Pyth Entropy V2 with automatic callbacks
 * @notice Users bet MON, choose heads (0) or tails (1), and win 1.9x if correct (5% house fee)
 */
contract CoinFlipV2 is IEntropyConsumer {
    // Custom errors
    error InsufficientFee();
    error InvalidChoice();
    error BetTooLow();
    error BetTooHigh();
    error InsufficientHouseBalance();
    error OnlyOwner();
    error PayoutFailed();
    error RefundFailed();
    error WithdrawalFailed();
    error GameNotPending();
    error NotPlayer();
    error CannotCancelYet();

    // Events
    event BetPlaced(
        address indexed player,
        uint256 indexed gameId,
        uint256 amount,
        uint8 choice,
        uint64 sequenceNumber
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

    // Pyth Entropy V2
    IEntropyV2 private immutable entropy;
    address private entropyProvider;

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
    }

    mapping(uint256 => Game) public games;
    mapping(address => uint256[]) public playerGames;
    mapping(uint64 => uint256) public sequenceToGameId; // Map entropy sequence to game ID

    constructor(
        address _entropyAddress,
        address _entropyProvider,
        uint256 _minBet,
        uint256 _maxBet
    ) payable {
        require(_entropyAddress != address(0), "Invalid entropy address");
        require(_minBet > 0, "Minimum bet must be greater than 0");
        require(_maxBet > _minBet, "Maximum bet must be greater than minimum bet");

        entropy = IEntropyV2(_entropyAddress);
        entropyProvider = _entropyProvider;
        owner = msg.sender;
        minBet = _minBet;
        maxBet = _maxBet;
        gameIdCounter = 0;
    }

    /**
     * @dev Place a bet and request randomness from Pyth Entropy V2
     * @param _choice Player's choice: 0 for Heads, 1 for Tails
     */
    function placeBet(uint8 _choice) external payable returns (uint256 gameId) {
        // Validate choice
        if (_choice != 0 && _choice != 1) revert InvalidChoice();

        // Get entropy fee
        uint256 entropyFee = entropy.getFeeV2();
        uint256 betAmount = msg.value - entropyFee;

        // Validate bet amount
        if (betAmount < minBet) revert BetTooLow();
        if (betAmount > maxBet) revert BetTooHigh();

        uint256 potentialPayout = (betAmount * 190) / 100; // 1.9x payout

        // Ensure contract has enough balance to pay out
        if (address(this).balance < betAmount + potentialPayout) {
            revert InsufficientHouseBalance();
        }

        // Request randomness from Pyth Entropy V2
        // Using default provider, so no provider argument needed
        uint64 sequenceNumber = entropy.requestV2{value: entropyFee}();

        // Generate game ID
        gameId = gameIdCounter++;

        // Store game
        games[gameId] = Game({
            player: msg.sender,
            betAmount: betAmount,
            playerChoice: _choice,
            result: 0,
            won: false,
            payout: 0,
            timestamp: block.timestamp,
            state: GameState.Pending
        });

        playerGames[msg.sender].push(gameId);
        sequenceToGameId[sequenceNumber] = gameId;

        emit BetPlaced(msg.sender, gameId, betAmount, _choice, sequenceNumber);

        return gameId;
    }

    /**
     * @dev This method is required by IEntropyConsumer interface
     * @dev Called automatically by Pyth Entropy when random number is generated
     */
    function entropyCallback(
        uint64 sequenceNumber,
        address, // provider (not used)
        bytes32 randomNumber
    ) internal override {
        uint256 gameId = sequenceToGameId[sequenceNumber];
        Game storage game = games[gameId];

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
            if (!success) revert PayoutFailed();
        } else {
            // Player loses, bet stays in contract as house balance
            uint256 fee = (game.betAmount * HOUSE_FEE_PERCENT) / 100;
            houseFees += fee;
        }

        emit GameResult(game.player, gameId, game.playerChoice, result, won, game.payout);
    }

    /**
     * @dev This method is required by IEntropyConsumer interface
     * @dev Returns the address of the entropy contract
     */
    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }

    /**
     * @dev Cancel a game and refund the player (only if callback times out)
     * @param _gameId The game ID to cancel
     * @notice Can only be called after 1 hour of game creation
     */
    function cancelGame(uint256 _gameId) external {
        Game storage game = games[_gameId];

        if (game.state != GameState.Pending) revert GameNotPending();
        if (msg.sender != game.player) revert NotPlayer();
        if (block.timestamp <= game.timestamp + 1 hours) revert CannotCancelYet();

        game.state = GameState.Cancelled;

        // Refund the bet to the player
        (bool success, ) = payable(game.player).call{value: game.betAmount}("");
        if (!success) revert RefundFailed();
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
    function withdrawHouseFees(uint256 _amount) external {
        if (msg.sender != owner) revert OnlyOwner();
        require(_amount <= houseFees, "Insufficient house fees");
        require(_amount <= address(this).balance, "Insufficient contract balance");

        houseFees -= _amount;

        (bool success, ) = payable(owner).call{value: _amount}("");
        if (!success) revert WithdrawalFailed();

        emit HouseFundsWithdrawn(owner, _amount);
    }

    /**
     * @dev Emergency withdrawal of all funds (only owner)
     */
    function emergencyWithdraw() external {
        if (msg.sender != owner) revert OnlyOwner();
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");

        (bool success, ) = payable(owner).call{value: balance}("");
        if (!success) revert WithdrawalFailed();

        emit HouseFundsWithdrawn(owner, balance);
    }

    /**
     * @dev Update minimum bet (only owner)
     */
    function setMinBet(uint256 _minBet) external {
        if (msg.sender != owner) revert OnlyOwner();
        require(_minBet > 0, "Minimum bet must be greater than 0");
        require(_minBet < maxBet, "Minimum bet must be less than maximum bet");
        minBet = _minBet;
    }

    /**
     * @dev Update maximum bet (only owner)
     */
    function setMaxBet(uint256 _maxBet) external {
        if (msg.sender != owner) revert OnlyOwner();
        require(_maxBet > minBet, "Maximum bet must be greater than minimum bet");
        maxBet = _maxBet;
    }

    /**
     * @dev Update entropy provider (only owner)
     */
    function setEntropyProvider(address _provider) external {
        if (msg.sender != owner) revert OnlyOwner();
        require(_provider != address(0), "Invalid provider address");
        entropyProvider = _provider;
    }

    /**
     * @dev Transfer ownership (only owner)
     */
    function transferOwnership(address _newOwner) external {
        if (msg.sender != owner) revert OnlyOwner();
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
        return sequenceToGameId[_sequenceNumber];
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
    function getEntropyFee() external view returns (uint256) {
        return entropy.getFeeV2();
    }

    /**
     * @dev Get entropy provider address
     */
    function getEntropyProvider() external view returns (address) {
        return entropyProvider;
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
