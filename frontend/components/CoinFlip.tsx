'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, usePublicClient } from 'wagmi';
import { parseEther, formatEther, decodeEventLog } from 'viem';
import { COIN_FLIP_ADDRESS, COIN_FLIP_ABI } from '../config/contract';
import { monadTestnet } from '../config/chains';

type CoinSide = 0 | 1; // 0 = Heads, 1 = Tails

interface CoinFlipProps {
  onGameComplete?: () => void;
}

export function CoinFlip({ onGameComplete }: CoinFlipProps) {
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();
  const [betAmount, setBetAmount] = useState('0.01');
  const [selectedSide, setSelectedSide] = useState<CoinSide>(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [isFlipping, setIsFlipping] = useState(false);
  const [currentGameId, setCurrentGameId] = useState<bigint | null>(null);
  const [sequenceNumber, setSequenceNumber] = useState<bigint | null>(null);
  const [userRandomness, setUserRandomness] = useState<`0x${string}` | null>(null);

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

  // Write contract for placeBet
  const {
    writeContract: writePlaceBet,
    data: placeBetHash,
    isPending: isPlaceBetPending,
    error: placeBetError
  } = useWriteContract();

  const {
    isLoading: isPlaceBetConfirming,
    isSuccess: isPlaceBetConfirmed
  } = useWaitForTransactionReceipt({
    hash: placeBetHash,
  });

  // Write contract for revealResult
  const {
    writeContract: writeReveal,
    data: revealHash,
    isPending: isRevealPending
  } = useWriteContract();

  const {
    isLoading: isRevealConfirming,
    isSuccess: isRevealConfirmed
  } = useWaitForTransactionReceipt({
    hash: revealHash,
  });

  // Generate random bytes32 for userRandomness
  const generateRandomBytes32 = (): `0x${string}` => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return `0x${Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')}`;
  };

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

    try {
      setIsFlipping(true);
      setStatusMessage('Placing bet...');

      const randomness = generateRandomBytes32();
      setUserRandomness(randomness);

      const betWei = parseEther(betAmount);
      const totalValue = entropyFee ? betWei + BigInt(entropyFee) : betWei;

      writePlaceBet({
        address: COIN_FLIP_ADDRESS,
        abi: COIN_FLIP_ABI,
        functionName: 'placeBet',
        args: [selectedSide, randomness],
        value: totalValue,
      });
    } catch (err) {
      console.error('Error placing bet:', err);
      setStatusMessage('Failed to place bet');
      setIsFlipping(false);
    }
  };

  // Fetch provider revelation from Fortuna API
  const fetchProviderRevelation = async (sequenceNum: bigint): Promise<`0x${string}` | null> => {
    try {
      // Try different possible Fortuna endpoints
      const endpoints = [
        `https://fortuna-staging.dourolabs.app/v1/chains/monad-testnet/revelations/${sequenceNum}`,
        `https://fortuna-staging.dourolabs.app/v1/chains/monad/revelations/${sequenceNum}`,
        `https://fortuna.dourolabs.app/v1/chains/monad-testnet/revelations/${sequenceNum}`,
        `https://fortuna.dourolabs.app/v1/chains/monad/revelations/${sequenceNum}`,
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint);
          if (response.ok) {
            const data = await response.json();
            console.log('Fortuna API response:', data);

            // The revelation might be in different fields
            if (data.revelation) return data.revelation as `0x${string}`;
            if (data.value) return data.value as `0x${string}`;
            if (data.data) return data.data as `0x${string}`;

            // If the response is a string starting with 0x, use it directly
            if (typeof data === 'string' && data.startsWith('0x')) {
              return data as `0x${string}`;
            }
          }
        } catch (err) {
          console.log(`Failed to fetch from ${endpoint}:`, err);
          continue;
        }
      }

      return null;
    } catch (err) {
      console.error('Error fetching provider revelation:', err);
      return null;
    }
  };

  // Handle bet placed confirmation
  useEffect(() => {
    const handleBetPlaced = async () => {
      if (!isPlaceBetConfirmed || !publicClient || !placeBetHash || !userRandomness) return;

      try {
        setStatusMessage('Bet confirmed! Fetching randomness...');

        // Get transaction receipt to extract event logs
        const receipt = await publicClient.getTransactionReceipt({ hash: placeBetHash });

        // Find BetPlaced event
        const betPlacedEvent = receipt.logs.find((log) => {
          try {
            const decoded = decodeEventLog({
              abi: COIN_FLIP_ABI,
              data: log.data,
              topics: log.topics,
            });
            return decoded.eventName === 'BetPlaced';
          } catch {
            return false;
          }
        });

        if (!betPlacedEvent) {
          throw new Error('BetPlaced event not found');
        }

        const decoded = decodeEventLog({
          abi: COIN_FLIP_ABI,
          data: betPlacedEvent.data,
          topics: betPlacedEvent.topics,
        });

        const gameId = (decoded.args as any).gameId;
        const seqNum = (decoded.args as any).sequenceNumber;

        console.log('Game ID:', gameId);
        console.log('Sequence Number:', seqNum);

        setCurrentGameId(gameId);
        setSequenceNumber(seqNum);

        // Wait a bit for Pyth to process the request
        setStatusMessage('Waiting for Pyth Entropy provider...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Fetch provider revelation
        setStatusMessage('Fetching provider revelation...');
        const providerRevelation = await fetchProviderRevelation(seqNum);

        if (!providerRevelation) {
          throw new Error('Failed to fetch provider revelation. Please try revealing manually.');
        }

        console.log('Provider Revelation:', providerRevelation);

        // Call revealResult
        setStatusMessage('Revealing result...');
        writeReveal({
          address: COIN_FLIP_ADDRESS,
          abi: COIN_FLIP_ABI,
          functionName: 'revealResult',
          args: [gameId, providerRevelation],
        });

      } catch (err) {
        console.error('Error in auto-reveal:', err);
        setStatusMessage(err instanceof Error ? err.message : 'Error revealing result. Please try canceling the game after 1 hour.');
        setIsFlipping(false);
      }
    };

    handleBetPlaced();
  }, [isPlaceBetConfirmed, placeBetHash, userRandomness, publicClient, writeReveal]);

  // Handle reveal confirmation
  useEffect(() => {
    const handleRevealConfirmed = async () => {
      if (!isRevealConfirmed || !currentGameId || !publicClient || !revealHash) return;

      try {
        setStatusMessage('Checking result...');

        // Get transaction receipt to extract GameResult event
        const receipt = await publicClient.getTransactionReceipt({ hash: revealHash });

        const gameResultEvent = receipt.logs.find((log) => {
          try {
            const decoded = decodeEventLog({
              abi: COIN_FLIP_ABI,
              data: log.data,
              topics: log.topics,
            });
            return decoded.eventName === 'GameResult';
          } catch {
            return false;
          }
        });

        if (gameResultEvent) {
          const decoded = decodeEventLog({
            abi: COIN_FLIP_ABI,
            data: gameResultEvent.data,
            topics: gameResultEvent.topics,
          });

          const won = (decoded.args as any).won;
          const result = (decoded.args as any).result;
          const payout = (decoded.args as any).payout;

          const resultSide = result === 0 ? 'Heads' : 'Tails';

          if (won) {
            setStatusMessage(`🎉 You won! Result: ${resultSide}. Payout: ${formatEther(payout)} MON`);
          } else {
            setStatusMessage(`😢 You lost. Result: ${resultSide}. Better luck next time!`);
          }
        }

        setTimeout(() => {
          setIsFlipping(false);
          setStatusMessage('');
          setCurrentGameId(null);
          setSequenceNumber(null);
          setUserRandomness(null);
          onGameComplete?.();
        }, 5000);

      } catch (err) {
        console.error('Error checking result:', err);
        setStatusMessage('Result revealed! Check your game history.');
        setTimeout(() => {
          setIsFlipping(false);
          setStatusMessage('');
          onGameComplete?.();
        }, 3000);
      }
    };

    handleRevealConfirmed();
  }, [isRevealConfirmed, currentGameId, publicClient, revealHash, onGameComplete]);

  // Handle errors
  useEffect(() => {
    if (isPlaceBetConfirming) {
      setStatusMessage('Confirming bet transaction...');
    } else if (placeBetError) {
      setStatusMessage(`Error: ${placeBetError.message}`);
      setIsFlipping(false);
    }
  }, [isPlaceBetConfirming, placeBetError]);

  useEffect(() => {
    if (isRevealConfirming) {
      setStatusMessage('Confirming reveal transaction...');
    }
  }, [isRevealConfirming]);

  if (!isConnected) {
    return (
      <div className="w-full max-w-md mx-auto p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
        <p className="text-center text-white/70 text-lg">Connect your wallet to play</p>
      </div>
    );
  }

  if (isWrongNetwork) {
    return (
      <div className="w-full max-w-md mx-auto p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-2xl font-bold text-white mb-4">Wrong Network</h3>
          <p className="text-white/70 text-lg mb-6">
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

  const isProcessing = isPlaceBetPending || isPlaceBetConfirming || isRevealPending || isRevealConfirming || isFlipping;

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
      <h2 className="text-3xl font-bold text-white mb-8 text-center">Coin Flip</h2>

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
        <label className="block text-white/90 font-medium mb-2">Bet Amount (MON)</label>
        <input
          type="number"
          value={betAmount}
          onChange={(e) => setBetAmount(e.target.value)}
          step="0.01"
          min={minBet ? formatEther(minBet) : '0.01'}
          max={maxBet ? formatEther(maxBet) : '1'}
          className="w-full px-4 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          placeholder="0.01"
          disabled={isProcessing}
        />
        {minBet && maxBet && (
          <p className="text-sm text-white/60 mt-2">
            Min: {formatEther(minBet)} MON | Max: {formatEther(maxBet)} MON
          </p>
        )}
      </div>

      {/* Heads/Tails Selection */}
      <div className="mb-6">
        <label className="block text-white/90 font-medium mb-3">Choose Side</label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setSelectedSide(0)}
            disabled={isProcessing}
            className={`py-4 rounded-2xl font-bold text-lg transition-all duration-200 transform active:scale-95 ${
              selectedSide === 0
                ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50'
                : 'bg-white/10 backdrop-blur-xl border border-white/20 text-white/70 hover:bg-white/20'
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
                : 'bg-white/10 backdrop-blur-xl border border-white/20 text-white/70 hover:bg-white/20'
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
        <div className="mt-6 p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl">
          <p className="text-center text-white/90">{statusMessage}</p>
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
