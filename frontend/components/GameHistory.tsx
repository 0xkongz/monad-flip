'use client';

import { useEffect, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { COIN_FLIP_ADDRESS, COIN_FLIP_ABI } from '../config/contract';

interface Game {
  player: string;
  betAmount: bigint;
  playerChoice: number;
  result: number;
  won: boolean;
  payout: bigint;
  timestamp: bigint;
  state: number;
  entropySequenceNumber: bigint;
  userRandomness: string;
}

interface GameWithId {
  id: bigint;
  game: Game;
}

export function GameHistory() {
  const { address, isConnected } = useAccount();
  const [games, setGames] = useState<GameWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [showAllGames, setShowAllGames] = useState(false);

  // Get player's game IDs
  const { data: gameIds, refetch: refetchGameIds } = useReadContract({
    address: COIN_FLIP_ADDRESS,
    abi: COIN_FLIP_ABI,
    functionName: 'getPlayerGames',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Get entropy fee
  const { data: entropyFee } = useReadContract({
    address: COIN_FLIP_ADDRESS,
    abi: COIN_FLIP_ABI,
    functionName: 'getEntropyFee',
  });

  // Fetch individual game details
  useEffect(() => {
    const fetchGames = async () => {
      if (!gameIds || !Array.isArray(gameIds) || gameIds.length === 0) {
        setGames([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const gamesData: GameWithId[] = [];

      // Fetch each game individually using viem directly
      const { createPublicClient, http } = await import('viem');
      const { monadTestnet } = await import('../config/chains');

      const publicClient = createPublicClient({
        chain: monadTestnet,
        transport: http('https://testnet-rpc.monad.xyz'),
      });

      for (const gameId of gameIds) {
        try {
          const game = await publicClient.readContract({
            address: COIN_FLIP_ADDRESS,
            abi: COIN_FLIP_ABI,
            functionName: 'getGame',
            args: [gameId],
          }) as Game;

          gamesData.push({ id: gameId, game });
        } catch (error) {
          console.error(`Error fetching game ${gameId}:`, error);
        }
      }

      setGames(gamesData.reverse()); // Show most recent first
      setIsLoading(false);
    };

    fetchGames();
  }, [gameIds]);

  // Refresh every 10 seconds
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      refetchGameIds();
    }, 10000);

    return () => clearInterval(interval);
  }, [isConnected, refetchGameIds]);

  if (!isConnected) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6">Game History</h2>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white"></div>
        </div>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6">Game History</h2>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-24 h-24 rounded-full bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center mb-4">
            <span className="text-4xl">🎲</span>
          </div>
          <p className="text-white/70 text-lg">No games yet</p>
          <p className="text-white/50 text-sm mt-2">Place your first bet to get started!</p>
        </div>
      </div>
    );
  }

  const getChoiceText = (choice: number) => (choice === 0 ? 'Heads' : 'Tails');
  const getResultText = (result: number) => (result === 0 ? 'Heads' : 'Tails');
  const getStateText = (state: number) => {
    switch (state) {
      case 0: return 'Pending';
      case 1: return 'Completed';
      case 2: return 'Cancelled';
      default: return 'Unknown';
    }
  };

  const formatTimestamp = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };

  const toggleExpanded = (gameId: string) => {
    setExpandedGames(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gameId)) {
        newSet.delete(gameId);
      } else {
        newSet.add(gameId);
      }
      return newSet;
    });
  };

  // Show only last 5 games by default
  const displayedGames = showAllGames ? games : games.slice(0, 5);
  const hasMoreGames = games.length > 5;

  return (
    <div className="w-full max-w-2xl mx-auto p-8 bg-white/5 dark:bg-gray-800/50 backdrop-blur-xl border border-white/10 dark:border-gray-700/50 rounded-3xl shadow-2xl">
      {/* Header with Collapse Button */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Game History</h2>
        <button
          onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
          className="p-2 rounded-lg hover:bg-white/10 dark:hover:bg-gray-700/50 transition-colors"
          aria-label="Toggle history"
        >
          <svg
            className={`w-5 h-5 text-gray-600 dark:text-white/70 transition-transform ${isHistoryCollapsed ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Collapsible Content */}
      {!isHistoryCollapsed && (
        <>
          <div className="space-y-2">
            {displayedGames.map(({ id, game }) => {
              const isExpanded = expandedGames.has(id.toString());

              return (
                <div
                  key={id.toString()}
                  className="bg-white/5 dark:bg-gray-700/30 backdrop-blur-xl border border-white/10 dark:border-gray-600/50 rounded-xl overflow-hidden transition-all duration-200"
                >
                  {/* Collapsed View - Single Line */}
                  <button
                    onClick={() => toggleExpanded(id.toString())}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/10 dark:hover:bg-gray-600/30 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* Game Number */}
                      <span className="text-sm text-gray-600 dark:text-white/50 font-mono">#{id.toString()}</span>

                      {/* Bet Amount */}
                      <span className="text-sm text-gray-700 dark:text-white/70">{formatEther(game.betAmount)} MON</span>

                      {/* Result */}
                      <span className={`text-sm font-medium ${
                        game.state === 1
                          ? (game.won ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')
                          : 'text-yellow-600 dark:text-yellow-400'
                      }`}>
                        {game.state === 1 ? (game.won ? 'WIN' : 'LOSE') : 'PENDING'}
                      </span>
                    </div>

                    {/* Profit/Loss */}
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold ${
                        game.won ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {game.state === 1
                          ? (game.won ? `+${formatEther(game.payout)} MON` : `-${formatEther(game.betAmount)} MON`)
                          : '-'
                        }
                      </span>

                      {/* Expand Arrow */}
                      <svg
                        className={`w-5 h-5 text-gray-500 dark:text-white/50 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded View - Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-white/10 dark:border-gray-600/50 space-y-3">
                      {/* Timestamp */}
                      <div className="text-xs text-gray-500 dark:text-white/40">
                        {formatTimestamp(game.timestamp)}
                      </div>

                      {/* Game Details */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-white/50 mb-1">Your Choice</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{getChoiceText(game.playerChoice)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-white/50 mb-1">Result</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {game.state === 1 ? getResultText(game.result) : '-'}
                          </p>
                        </div>
                      </div>

                      {/* Financial Details */}
                      <div className="pt-2 border-t border-white/10 dark:border-gray-600/50 space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500 dark:text-white/50">Bet Amount</span>
                          <span className="text-gray-700 dark:text-white/70 font-medium">{formatEther(game.betAmount)} MON</span>
                        </div>
                        {entropyFee && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500 dark:text-white/50">Entropy Fee</span>
                            <span className="text-gray-700 dark:text-white/70">{formatEther(BigInt(entropyFee))} MON</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-gray-600 dark:text-white/60">Total Paid</span>
                          <span className="text-gray-800 dark:text-white/80">
                            {entropyFee ? formatEther(game.betAmount + BigInt(entropyFee)) : formatEther(game.betAmount)} MON
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Show More/Less Button */}
          {hasMoreGames && (
            <button
              onClick={() => setShowAllGames(!showAllGames)}
              className="w-full mt-4 px-4 py-3 bg-white/5 dark:bg-gray-700/30 backdrop-blur-xl border border-white/10 dark:border-gray-600/50 rounded-xl hover:bg-white/10 dark:hover:bg-gray-600/30 transition-colors text-sm font-medium text-gray-700 dark:text-white/70"
            >
              {showAllGames ? `Hide ${games.length - 5} older games` : `Show ${games.length - 5} more games`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
