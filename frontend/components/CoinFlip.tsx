'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useWatchContractEvent } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { COIN_FLIP_ADDRESS, COIN_FLIP_ABI } from '../config/contract';
import { monadTestnet } from '../config/chains';

type CoinSide = 0 | 1; // 0 = Heads, 1 = Tails

interface CoinFlipProps {
  onGameComplete?: () => void;
}

export function CoinFlip({ onGameComplete }: CoinFlipProps) {
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const [betAmount, setBetAmount] = useState('0.01');
  const [selectedSide, setSelectedSide] = useState<CoinSide>(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [isFlipping, setIsFlipping] = useState(false);
  const [currentGameId, setCurrentGameId] = useState<bigint | null>(null);

  const isWrongNetwork = isConnected && chain?.id !== monadTestnet.id;

  // Read contract data
  const { data: minBet } = useReadContract({
    address: COIN_FLIP_ADDRESS,
    abi: COIN_FLIP_ABI,
    functionName: 'minBet',
  });

  const { data: maxBet } = useReadContract({
    address: COIN_FLIP_ADDRESS,
    abi: COIN_FLIP_ABI,
    functionName: 'maxBet',
  });

  const { data: entropyFee } = useReadContract({
    address: COIN_FLIP_ADDRESS,
    abi: COIN_FLIP_ABI,
    functionName: 'getEntropyFee',
  });

  // Write contract
  const {
    writeContract,
    data: hash,
    isPending,
    error
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Watch for GameResult event
  useWatchContractEvent({
    address: COIN_FLIP_ADDRESS,
    abi: COIN_FLIP_ABI,
    eventName: 'GameResult',
    onLogs(logs: readonly unknown[]) {
      console.log('GameResult event received:', logs);
      logs.forEach((log: unknown) => {
        const typedLog = log as { args: { player: string; gameId: bigint; result: number; won: boolean; payout: bigint } };
        const { player, gameId, result, won, payout } = typedLog.args;

        console.log('Processing GameResult:', { player, gameId: gameId?.toString(), result, won, payout: payout?.toString() });
        console.log('Current state:', { currentGameId: currentGameId?.toString(), address });

        // Only process if it's our game - check player address match
        if (player?.toLowerCase() === address?.toLowerCase()) {
          // Also match gameId if we have it, but don't require it
          if (currentGameId === null || gameId === currentGameId) {
            const resultSide = result === 0 ? 'Heads' : 'Tails';

            if (won) {
              setStatusMessage(`🎉 You won! Result: ${resultSide}. Payout: ${formatEther(payout)} MON`);
            } else {
              setStatusMessage(`😢 You lost. Result: ${resultSide}. Better luck next time!`);
            }

            // Immediately stop flipping and update UI
            setIsFlipping(false);
            setCurrentGameId(null);
            onGameComplete?.();

            // Clear message after 5 seconds
            setTimeout(() => {
              setStatusMessage('');
            }, 5000);
          }
        }
      });
    },
  });

  const handlePlaceBet = async () => {
    if (!isConnected || !address) {
      setStatusMessage('Please connect your wallet');
      return;
    }

    const betValue = parseFloat(betAmount);
    const minBetEth = minBet ? parseFloat(formatEther(minBet)) : 0.01;
    const maxBetEth = maxBet ? parseFloat(formatEther(maxBet)) : 1;

    if (betValue < minBetEth || betValue > maxBetEth) {
      setStatusMessage(`Bet must be between ${minBetEth} and ${maxBetEth} MON`);
      return;
    }

    // Check if bet is profitable after entropy fee
    const entropyFeeEth = entropyFee ? parseFloat(formatEther(BigInt(entropyFee))) : 0;
    const potentialWinnings = betValue * 0.9; // 90% win amount
    if (potentialWinnings <= entropyFeeEth) {
      setStatusMessage(`Bet too low! Minimum ${(entropyFeeEth / 0.9).toFixed(4)} MON required to cover entropy fee of ${entropyFeeEth.toFixed(4)} MON`);
      return;
    }

    try {
      setIsFlipping(true);
      setStatusMessage('Placing bet...');

      const betWei = parseEther(betAmount);
      const totalValue = entropyFee ? betWei + BigInt(entropyFee) : betWei;

      writeContract({
        address: COIN_FLIP_ADDRESS,
        abi: COIN_FLIP_ABI,
        functionName: 'placeBet',
        args: [selectedSide],
        value: totalValue,
      });
    } catch (err) {
      console.error('Error placing bet:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to place bet';

      // Parse common error messages
      if (errorMessage.includes('BetTooLowForEntropyFee')) {
        setStatusMessage(`Bet too low to cover entropy fee! Increase your bet.`);
      } else if (errorMessage.includes('InsufficientHouseBalance')) {
        setStatusMessage('Insufficient house balance. Please try a smaller bet.');
      } else if (errorMessage.includes('user rejected')) {
        setStatusMessage('Transaction rejected by user');
      } else {
        setStatusMessage('Failed to place bet');
      }
      setIsFlipping(false);
    }
  };

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirming) {
      setStatusMessage('Confirming transaction...');
    } else if (isConfirmed && hash) {
      setStatusMessage('Bet placed! Waiting for Pyth Entropy to reveal result...');

      // Extract gameId from transaction logs
      const extractGameId = async () => {
        try {
          // We'll get the gameId from the BetPlaced event via the watcher
          // For now, just set a placeholder - the GameResult event will match it
        } catch (err) {
          console.error('Error extracting gameId:', err);
        }
      };

      extractGameId();
    } else if (error) {
      setStatusMessage(`Error: ${error.message}`);
      setIsFlipping(false);
    }
  }, [isConfirming, isConfirmed, error, hash]);

  // Watch for BetPlaced event to get gameId
  useWatchContractEvent({
    address: COIN_FLIP_ADDRESS,
    abi: COIN_FLIP_ABI,
    eventName: 'BetPlaced',
    onLogs(logs: readonly unknown[]) {
      logs.forEach((log: unknown) => {
        const typedLog = log as { args: { player: string; gameId: bigint } };
        const { player, gameId } = typedLog.args;

        if (player?.toLowerCase() === address?.toLowerCase() && isFlipping) {
          console.log('Bet placed! Game ID:', gameId.toString());
          setCurrentGameId(gameId);
        }
      });
    },
  });

  if (!isConnected) {
    return (
      <div className="w-full max-w-md mx-auto p-8 bg-white/5 dark:bg-gray-800/50 backdrop-blur-xl border border-white/10 dark:border-gray-700/50 rounded-3xl shadow-2xl">
        <p className="text-center text-gray-700 dark:text-white/70 text-lg">Connect your wallet to play</p>
      </div>
    );
  }

  if (isWrongNetwork) {
    return (
      <div className="w-full max-w-md mx-auto p-8 bg-white/5 dark:bg-gray-800/50 backdrop-blur-xl border border-white/10 dark:border-gray-700/50 rounded-3xl shadow-2xl">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Wrong Network</h3>
          <p className="text-gray-700 dark:text-white/70 text-lg mb-6">
            Please switch to Monad Testnet to play
          </p>
          <button
            onClick={() => switchChain({ chainId: monadTestnet.id })}
            className="px-8 py-3 bg-gradient-to-b from-yellow-500 to-yellow-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl active:scale-95 transform transition-all duration-200 ease-out"
          >
            Switch to Monad Testnet
          </button>
        </div>
      </div>
    );
  }

  const isProcessing = isPending || isConfirming || isFlipping;

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white/5 dark:bg-gray-800/50 backdrop-blur-xl border border-white/10 dark:border-gray-700/50 rounded-3xl shadow-2xl">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">Coin Flip</h2>

      {/* Coin Animation */}
      <div className="flex justify-center mb-8">
        <div
          className={`w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-2xl flex items-center justify-center text-4xl font-bold text-white transition-all duration-700 ${
            isFlipping ? 'animate-flip' : ''
          }`}
        >
          {selectedSide === 0 ? 'H' : 'T'}
        </div>
      </div>

      {/* Bet Amount Input */}
      <div className="mb-6">
        <label className="block text-gray-900 dark:text-white/90 font-medium mb-2">Bet Amount (MON)</label>
        <input
          type="number"
          value={betAmount}
          onChange={(e) => setBetAmount(e.target.value)}
          step="0.01"
          min={minBet ? formatEther(minBet) : '0.01'}
          max={maxBet ? formatEther(maxBet) : '1'}
          className="w-full px-4 py-3 bg-white/10 dark:bg-gray-700/50 backdrop-blur-xl border border-gray-300/50 dark:border-white/20 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          placeholder="0.01"
          disabled={isProcessing}
        />
        {minBet && maxBet && (
          <p className="text-sm text-gray-600 dark:text-white/60 mt-2">
            Min: {formatEther(minBet)} MON | Max: {formatEther(maxBet)} MON
          </p>
        )}
        {entropyFee && (
          <p className="text-xs text-gray-500 dark:text-white/50 mt-1">
            + {formatEther(BigInt(entropyFee))} MON Pyth Entropy fee
          </p>
        )}
      </div>

      {/* Heads/Tails Selection */}
      <div className="mb-6">
        <label className="block text-gray-900 dark:text-white/90 font-medium mb-3">Choose Side</label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setSelectedSide(0)}
            disabled={isProcessing}
            className={`py-4 rounded-2xl font-bold text-lg transition-all duration-200 transform active:scale-95 ${
              selectedSide === 0
                ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50'
                : 'bg-white/10 dark:bg-gray-700/50 backdrop-blur-xl border border-gray-300/50 dark:border-white/20 text-gray-700 dark:text-white/70 hover:bg-white/20 dark:hover:bg-gray-600/50'
            } disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100`}
          >
            Heads
          </button>
          <button
            onClick={() => setSelectedSide(1)}
            disabled={isProcessing}
            className={`py-4 rounded-2xl font-bold text-lg transition-all duration-200 transform active:scale-95 ${
              selectedSide === 1
                ? 'bg-gradient-to-b from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/50'
                : 'bg-white/10 dark:bg-gray-700/50 backdrop-blur-xl border border-gray-300/50 dark:border-white/20 text-gray-700 dark:text-white/70 hover:bg-white/20 dark:hover:bg-gray-600/50'
            } disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100`}
          >
            Tails
          </button>
        </div>
      </div>

      {/* Place Bet Button */}
      <button
        onClick={handlePlaceBet}
        disabled={isProcessing}
        className="w-full py-4 bg-gradient-to-b from-green-500 to-green-600 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl active:scale-95 transform transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {isProcessing ? 'Processing...' : 'Place Bet'}
      </button>

      {/* Status Message */}
      {statusMessage && (
        <div className="mt-6 p-4 bg-white/10 dark:bg-gray-700/50 backdrop-blur-xl border border-gray-300/50 dark:border-white/20 rounded-2xl">
          <p className="text-center text-gray-900 dark:text-white/90">{statusMessage}</p>
        </div>
      )}

      {/* CSS for coin flip animation */}
      <style jsx>{`
        @keyframes flip {
          0% {
            transform: rotateY(0deg);
          }
          100% {
            transform: rotateY(1080deg);
          }
        }
        .animate-flip {
          animation: flip 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
