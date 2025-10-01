// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/CoinFlip.sol";

// Mock Entropy contract for testing
contract MockEntropy {
    uint128 public fee = 0.001 ether;
    uint64 private sequenceCounter = 1;

    mapping(uint64 => bytes32) public commitments;

    function request(
        address,
        bytes32 userCommitment,
        bool
    ) external payable returns (uint64) {
        require(msg.value >= fee, "Insufficient fee");
        uint64 sequence = sequenceCounter++;
        commitments[sequence] = userCommitment;
        return sequence;
    }

    function reveal(
        address,
        uint64 sequenceNumber,
        bytes32 userRandomness,
        bytes32 providerRevelation
    ) external view returns (bytes32) {
        bytes32 expectedCommitment = keccak256(abi.encodePacked(userRandomness));
        require(commitments[sequenceNumber] == expectedCommitment, "Invalid commitment");

        // Generate deterministic but unpredictable result
        return keccak256(abi.encodePacked(userRandomness, providerRevelation));
    }

    function getFee(address) external view returns (uint128) {
        return fee;
    }

    function getDefaultProvider() external view returns (address) {
        return address(this);
    }
}

contract CoinFlipTest is Test {
    CoinFlip public coinFlip;
    MockEntropy public mockEntropy;
    address public owner;
    address public player1;
    address public player2;

    uint256 constant MIN_BET = 0.01 ether;
    uint256 constant MAX_BET = 10 ether;
    uint256 constant INITIAL_HOUSE_FUNDS = 100 ether;

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

    function setUp() public {
        owner = address(this);
        player1 = makeAddr("player1");
        player2 = makeAddr("player2");

        // Deploy mock entropy
        mockEntropy = new MockEntropy();

        // Deploy contract with initial house funds
        coinFlip = new CoinFlip{value: INITIAL_HOUSE_FUNDS}(
            address(mockEntropy),
            address(mockEntropy),
            MIN_BET,
            MAX_BET
        );

        // Fund players
        vm.deal(player1, 100 ether);
        vm.deal(player2, 100 ether);
    }

    // Allow test contract to receive ETH
    receive() external payable {}

    function testDeployment() public {
        assertEq(coinFlip.owner(), owner);
        assertEq(coinFlip.minBet(), MIN_BET);
        assertEq(coinFlip.maxBet(), MAX_BET);
        assertEq(address(coinFlip).balance, INITIAL_HOUSE_FUNDS);
        assertEq(coinFlip.gameIdCounter(), 0);
    }

    function testPlaceBet() public {
        vm.startPrank(player1);

        uint256 betAmount = 1 ether;
        uint8 choice = 0; // Heads
        bytes32 userRandomness = keccak256(abi.encodePacked("random123"));

        uint256 gameId = coinFlip.placeBet{value: betAmount}(choice, userRandomness);

        assertEq(gameId, 0);
        assertEq(coinFlip.gameIdCounter(), 1);

        CoinFlip.Game memory game = coinFlip.getGame(gameId);
        assertEq(game.player, player1);
        assertEq(game.playerChoice, choice);
        assertEq(uint256(game.state), uint256(CoinFlip.GameState.Pending));

        vm.stopPrank();
    }

    function testRevealResult() public {
        vm.startPrank(player1);

        uint256 betAmount = 1 ether;
        uint8 choice = 0;
        bytes32 userRandomness = keccak256(abi.encodePacked("random123"));

        uint256 gameId = coinFlip.placeBet{value: betAmount}(choice, userRandomness);

        vm.stopPrank();

        // Anyone can reveal
        bytes32 providerRevelation = keccak256(abi.encodePacked("provider_random"));
        coinFlip.revealResult(gameId, providerRevelation);

        CoinFlip.Game memory game = coinFlip.getGame(gameId);
        assertEq(uint256(game.state), uint256(CoinFlip.GameState.Revealed));
        assertTrue(game.result == 0 || game.result == 1);
    }

    function testMultipleBets() public {
        vm.startPrank(player1);

        for (uint256 i = 0; i < 3; i++) {
            bytes32 userRandomness = keccak256(abi.encodePacked("random", i));
            coinFlip.placeBet{value: 1 ether}(uint8(i % 2), userRandomness);
        }

        assertEq(coinFlip.gameIdCounter(), 3);

        uint256[] memory playerGames = coinFlip.getPlayerGames(player1);
        assertEq(playerGames.length, 3);

        vm.stopPrank();
    }

    function testCancelGame() public {
        vm.startPrank(player1);

        bytes32 userRandomness = keccak256(abi.encodePacked("random"));
        uint256 gameId = coinFlip.placeBet{value: 1 ether}(0, userRandomness);

        // Try to cancel immediately (should fail)
        vm.expectRevert("Cannot cancel game yet, wait 1 hour");
        coinFlip.cancelGame(gameId);

        // Move forward 1 hour
        vm.warp(block.timestamp + 1 hours + 1);

        uint256 balanceBefore = player1.balance;
        coinFlip.cancelGame(gameId);
        uint256 balanceAfter = player1.balance;

        // Player should get refund (bet amount minus entropy fee)
        CoinFlip.Game memory game = coinFlip.getGame(gameId);
        assertEq(uint256(game.state), uint256(CoinFlip.GameState.Cancelled));
        assertGt(balanceAfter, balanceBefore);

        vm.stopPrank();
    }

    function testRevertBelowMinBet() public {
        vm.startPrank(player1);
        bytes32 userRandomness = keccak256(abi.encodePacked("random"));
        vm.expectRevert("Bet amount is below minimum");
        coinFlip.placeBet{value: 0.001 ether}(0, userRandomness);
        vm.stopPrank();
    }

    function testRevertAboveMaxBet() public {
        vm.startPrank(player1);
        bytes32 userRandomness = keccak256(abi.encodePacked("random"));
        vm.expectRevert("Bet amount is above maximum");
        coinFlip.placeBet{value: 11 ether}(0, userRandomness);
        vm.stopPrank();
    }

    function testRevertInvalidChoice() public {
        vm.startPrank(player1);
        bytes32 userRandomness = keccak256(abi.encodePacked("random"));
        vm.expectRevert("Invalid choice: must be 0 (Heads) or 1 (Tails)");
        coinFlip.placeBet{value: 1 ether}(2, userRandomness);
        vm.stopPrank();
    }

    function testRevertZeroRandomness() public {
        vm.startPrank(player1);
        vm.expectRevert("User randomness cannot be zero");
        coinFlip.placeBet{value: 1 ether}(0, bytes32(0));
        vm.stopPrank();
    }

    function testDepositHouseFunds() public {
        uint256 depositAmount = 10 ether;
        uint256 initialBalance = address(coinFlip).balance;

        vm.expectEmit(true, false, false, true);
        emit HouseFundsDeposited(owner, depositAmount);

        coinFlip.depositHouseFunds{value: depositAmount}();

        assertEq(address(coinFlip).balance, initialBalance + depositAmount);
    }

    function testWithdrawHouseFees() public {
        // Place and reveal a bet to accumulate fees
        vm.startPrank(player1);
        bytes32 userRandomness = keccak256(abi.encodePacked("random"));
        uint256 gameId = coinFlip.placeBet{value: 1 ether}(0, userRandomness);
        vm.stopPrank();

        bytes32 providerRevelation = keccak256(abi.encodePacked("provider"));
        coinFlip.revealResult(gameId, providerRevelation);

        uint256 fees = coinFlip.houseFees();
        if (fees > 0) {
            uint256 ownerBalanceBefore = owner.balance;
            coinFlip.withdrawHouseFees(fees);
            assertEq(owner.balance, ownerBalanceBefore + fees);
            assertEq(coinFlip.houseFees(), 0);
        }
    }

    function testRevertWithdrawHouseFeesNonOwner() public {
        vm.prank(player1);
        vm.expectRevert("Only owner can call this function");
        coinFlip.withdrawHouseFees(1 ether);
    }

    function testEmergencyWithdraw() public {
        uint256 contractBalance = address(coinFlip).balance;
        uint256 ownerBalanceBefore = owner.balance;

        coinFlip.emergencyWithdraw();

        assertEq(address(coinFlip).balance, 0);
        assertEq(owner.balance, ownerBalanceBefore + contractBalance);
    }

    function testSetMinBet() public {
        uint256 newMinBet = 0.05 ether;
        coinFlip.setMinBet(newMinBet);
        assertEq(coinFlip.minBet(), newMinBet);
    }

    function testSetMaxBet() public {
        uint256 newMaxBet = 20 ether;
        coinFlip.setMaxBet(newMaxBet);
        assertEq(coinFlip.maxBet(), newMaxBet);
    }

    function testTransferOwnership() public {
        address newOwner = makeAddr("newOwner");
        coinFlip.transferOwnership(newOwner);
        assertEq(coinFlip.owner(), newOwner);
    }

    function testGetEntropyFee() public {
        uint128 fee = coinFlip.getEntropyFee();
        assertEq(fee, mockEntropy.fee());
    }
}