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

  return (
    <div className="w-full max-w-2xl mx-auto p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
      <h2 className="text-2xl font-bold text-white mb-6">Game History</h2>

      <div className="space-y-4">
        {games.map(({ id, game }) => (
          <div
            key={id.toString()}
            className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg hover:bg-white/10 transition-all duration-200"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-white/50">Game #{id.toString()}</p>
                <p className="text-xs text-white/40 mt-1">{formatTimestamp(game.timestamp)}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                game.state === 1
                  ? (game.won ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30')
                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              }`}>
                {getStateText(game.state)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-xs text-white/50 mb-1">Your Choice</p>
                <p className="text-lg font-semibold text-white">{getChoiceText(game.playerChoice)}</p>
              </div>
              <div>
                <p className="text-xs text-white/50 mb-1">Result</p>
                <p className="text-lg font-semibold text-white">
                  {game.state === 1 ? getResultText(game.result) : '-'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-white/50 mb-1">Bet Amount</p>
                <p className="text-base font-medium text-white">{formatEther(game.betAmount)} MON</p>
              </div>
              <div>
                <p className="text-xs text-white/50 mb-1">
                  {game.won ? 'Payout' : 'Lost'}
                </p>
                <p className={`text-base font-medium ${game.won ? 'text-green-400' : 'text-red-400'}`}>
                  {game.state === 1
                    ? (game.won ? `+${formatEther(game.payout)} MON` : `-${formatEther(game.betAmount)} MON`)
                    : '-'
                  }
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
