'use client';

import { useState } from 'react';
import { CoinFlip } from '@/components/CoinFlip';
import { GameHistory } from '@/components/GameHistory';
import { ConnectButton } from '@/components/ConnectButton';
import { Statistics } from '@/components/Statistics';

export default function Home() {
  const [refreshHistory, setRefreshHistory] = useState(0);

  const handleGameComplete = () => {
    setRefreshHistory(prev => prev + 1);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-gray-200/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">🎲</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Monad Coin Flip</h1>
                <p className="text-xs text-gray-500">Provably Fair Gaming</p>
              </div>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-3">
            Win <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">1.9x</span> Your Bet
          </h2>
          <p className="text-gray-600 text-lg">
            Provably fair coin flip powered by Pyth Entropy
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-gray-200/50 shadow-sm">
            <div className="text-sm text-gray-500 mb-1">Min Bet</div>
            <div className="text-2xl font-semibold text-gray-900">0.01 MON</div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-gray-200/50 shadow-sm">
            <div className="text-sm text-gray-500 mb-1">Max Bet</div>
            <div className="text-2xl font-semibold text-gray-900">1 MON</div>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-gray-200/50 shadow-sm">
            <div className="text-sm text-gray-500 mb-1">House Fee</div>
            <div className="text-2xl font-semibold text-gray-900">5%</div>
          </div>
        </div>

        {/* Coin Flip Component */}
        <div className="mb-8">
          <CoinFlip onGameComplete={handleGameComplete} />
        </div>

        {/* Game History */}
        <div>
          <GameHistory key={refreshHistory} />
        </div>
      </div>

      {/* Statistics */}
      <Statistics />

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-gray-200/50">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm">
            Powered by <span className="font-semibold">Pyth Entropy</span> on <span className="font-semibold">Monad Testnet</span>
          </p>
          <p className="text-gray-400 text-xs mt-2">
            ⚠️ Testnet only. Never bet more than you can afford to lose.
          </p>
        </div>
      </footer>
    </main>
  );
}
