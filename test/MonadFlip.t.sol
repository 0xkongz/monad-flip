// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/MonadFlip.sol";

// Mock Entropy contract for testing - only implements methods we use
contract MockEntropy {
    uint256 private _fee = 0.001 ether;
    uint64 private _sequenceNumber = 1;
    
    function getFee(address) external view returns (uint128) {
        return uint128(_fee);
    }
    
    function requestWithCallback(
        address callbackAddress,
        bytes32
    ) external payable returns (uint64) {
        require(msg.value >= _fee, "Insufficient fee");
        
        uint64 currentSequence = _sequenceNumber++;
        
        // Simulate callback with a deterministic random number for testing
        bytes32 randomNumber = keccak256(abi.encodePacked(currentSequence, block.timestamp));
        IEntropyConsumer(callbackAddress)._entropyCallback(
            currentSequence,
            address(this),
            randomNumber
        );
        
        return currentSequence;
    }
    
    function setFee(uint256 newFee) external {
        _fee = newFee;
    }
}

contract MonadFlipTest is Test {
    MonadFlip public monadFlip;
    MockEntropy public mockEntropy;
    
    address public owner = address(0x1);
    address public player1 = address(0x2);
    address public player2 = address(0x3);
    
    uint256 public constant INITIAL_BALANCE = 10 ether;
    uint256 public constant BET_AMOUNT = 1 ether;
    
    event BetPlaced(
        address indexed player,
        uint64 indexed sequenceNumber,
        uint256 amount,
        MonadFlip.CoinSide guess
    );
    
    event BetSettled(
        address indexed player,
        uint64 indexed sequenceNumber,
        uint256 randomNumber,
        MonadFlip.CoinSide result,
        bool won,
        uint256 payout
    );

    function setUp() public {
        // Deploy mock entropy contract
        mockEntropy = new MockEntropy();
        
        // Deploy MonadFlip contract
        vm.deal(owner, INITIAL_BALANCE);
        vm.prank(owner);
        monadFlip = new MonadFlip{value: INITIAL_BALANCE}(address(mockEntropy));
        
        // Give players some ETH
        vm.deal(player1, 5 ether);
        vm.deal(player2, 5 ether);
    }

    function test_Deployment() public {
        assertEq(monadFlip.owner(), owner);
        assertEq(monadFlip.getBalance(), INITIAL_BALANCE);
        assertEq(monadFlip.feePercentage(), 1000); // 10%
        assertEq(monadFlip.minimumBet(), 0.001 ether);
        assertEq(monadFlip.maximumBet(), 10 ether);
    }

    function test_PlaceBet() public {
        uint256 entropyFee = mockEntropy.getFee(address(monadFlip));
        uint256 totalAmount = BET_AMOUNT + entropyFee;
        
        vm.prank(player1);
        vm.expectEmit(true, true, false, true);
        emit BetPlaced(player1, 1, totalAmount, MonadFlip.CoinSide.HEADS);
        
        monadFlip.placeBet{value: totalAmount}(MonadFlip.CoinSide.HEADS, keccak256("test_randomness"));
        
        // Check bet was recorded
        (
            address player,
            uint256 amount,
            MonadFlip.CoinSide guess,
            bool isSettled,
            bool won,
            uint256 payout
        ) = monadFlip.getBet(1);
        
        assertEq(player, player1);
        assertEq(amount, BET_AMOUNT);
        assertEq(uint256(guess), uint256(MonadFlip.CoinSide.HEADS));
        assertTrue(isSettled); // Mock entropy settles immediately
    }

    function test_PlaceBet_InsufficientAmount() public {
        vm.prank(player1);
        vm.expectRevert("Bet amount too low");
        monadFlip.placeBet{value: 0.0005 ether}(MonadFlip.CoinSide.HEADS, keccak256("test"));
    }

    function test_PlaceBet_ExcessiveAmount() public {
        vm.prank(player1);
        vm.expectRevert("Bet amount too high");
        monadFlip.placeBet{value: 15 ether}(MonadFlip.CoinSide.HEADS, keccak256("test"));
    }

    function test_CalculatePayout() public {
        uint256 betAmount = 1 ether;
        uint256 expectedPayout = betAmount * 2; // Double
        uint256 fee = (expectedPayout * 1000) / 10000; // 10%
        uint256 actualPayout = monadFlip.calculatePayout(betAmount);
        
        assertEq(actualPayout, expectedPayout - fee);
    }

    function test_SetFeePercentage() public {
        vm.prank(owner);
        monadFlip.setFeePercentage(500); // 5%
        assertEq(monadFlip.feePercentage(), 500);
    }

    function test_SetFeePercentage_OnlyOwner() public {
        vm.prank(player1);
        vm.expectRevert("Only owner can call this function");
        monadFlip.setFeePercentage(500);
    }

    function test_SetFeePercentage_TooHigh() public {
        vm.prank(owner);
        vm.expectRevert("Fee cannot exceed 20%");
        monadFlip.setFeePercentage(2500); // 25%
    }

    function test_SetBetLimits() public {
        vm.prank(owner);
        monadFlip.setBetLimits(0.01 ether, 5 ether);
        assertEq(monadFlip.minimumBet(), 0.01 ether);
        assertEq(monadFlip.maximumBet(), 5 ether);
    }

    function test_SetBetLimits_OnlyOwner() public {
        vm.prank(player1);
        vm.expectRevert("Only owner can call this function");
        monadFlip.setBetLimits(0.01 ether, 5 ether);
    }

    function test_WithdrawFees() public {
        uint256 ownerBalanceBefore = owner.balance;
        uint256 withdrawAmount = 1 ether;
        
        vm.prank(owner);
        monadFlip.withdrawFees(withdrawAmount);
        
        assertEq(owner.balance, ownerBalanceBefore + withdrawAmount);
        assertEq(monadFlip.getBalance(), INITIAL_BALANCE - withdrawAmount);
    }

    function test_WithdrawFees_OnlyOwner() public {
        vm.prank(player1);
        vm.expectRevert("Only owner can call this function");
        monadFlip.withdrawFees(1 ether);
    }

    function test_AddFunds() public {
        uint256 additionalFunds = 2 ether;
        
        vm.prank(owner);
        monadFlip.addFunds{value: additionalFunds}();
        
        assertEq(monadFlip.getBalance(), INITIAL_BALANCE + additionalFunds);
    }

    function test_TransferOwnership() public {
        vm.prank(owner);
        monadFlip.transferOwnership(player1);
        assertEq(monadFlip.owner(), player1);
    }

    function test_TransferOwnership_OnlyOwner() public {
        vm.prank(player1);
        vm.expectRevert("Only owner can call this function");
        monadFlip.transferOwnership(player2);
    }

    function test_GetPlayerBets() public {
        uint256 entropyFee = mockEntropy.getFee(address(monadFlip));
        uint256 totalAmount = BET_AMOUNT + entropyFee;
        
        // Player makes multiple bets
        vm.startPrank(player1);
        monadFlip.placeBet{value: totalAmount}(MonadFlip.CoinSide.HEADS, keccak256("random1"));
        monadFlip.placeBet{value: totalAmount}(MonadFlip.CoinSide.TAILS, keccak256("random2"));
        vm.stopPrank();
        
        uint64[] memory playerBets = monadFlip.getPlayerBets(player1);
        assertEq(playerBets.length, 2);
        assertEq(playerBets[0], 1);
        assertEq(playerBets[1], 2);
    }

    function test_InsufficientContractBalance() public {
        // Withdraw most funds
        vm.prank(owner);
        monadFlip.withdrawFees(9.5 ether);
        
        uint256 entropyFee = mockEntropy.getFee(address(monadFlip));
        uint256 totalAmount = BET_AMOUNT + entropyFee;
        
        vm.prank(player1);
        vm.expectRevert("Contract insufficient balance for potential payout");
        monadFlip.placeBet{value: totalAmount}(MonadFlip.CoinSide.HEADS, keccak256("test"));
    }

    function testFuzz_CalculatePayout(uint256 betAmount) public {
        vm.assume(betAmount > 0 && betAmount <= 10 ether);
        
        uint256 payout = monadFlip.calculatePayout(betAmount);
        uint256 expectedWinnings = betAmount * 2;
        uint256 expectedFee = (expectedWinnings * 1000) / 10000;
        
        assertEq(payout, expectedWinnings - expectedFee);
        assertTrue(payout < expectedWinnings);
    }

    function testFuzz_PlaceBet(uint96 betAmount, bool guess) public {
        vm.assume(betAmount >= 0.001 ether && betAmount <= 10 ether);
        
        uint256 entropyFee = mockEntropy.getFee(address(monadFlip));
        uint256 totalAmount = betAmount + entropyFee;
        
        // Ensure contract has enough balance
        uint256 potentialPayout = monadFlip.calculatePayout(betAmount);
        if (monadFlip.getBalance() < potentialPayout) {
            vm.prank(owner);
            monadFlip.addFunds{value: potentialPayout}();
        }
        
        vm.deal(player1, totalAmount);
        vm.prank(player1);
        
        MonadFlip.CoinSide coinGuess = guess ? MonadFlip.CoinSide.HEADS : MonadFlip.CoinSide.TAILS;
        monadFlip.placeBet{value: totalAmount}(coinGuess, keccak256(abi.encodePacked("fuzz", betAmount)));
        
        // Verify bet was placed
        (address player, uint256 amount, , bool isSettled, , ) = monadFlip.getBet(1);
        assertEq(player, player1);
        assertEq(amount, betAmount);
        assertTrue(isSettled);
    }
}
