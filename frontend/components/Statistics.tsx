'use client';

import { useReadContract, useBalance } from 'wagmi';
import { formatEther } from 'viem';
import { COIN_FLIP_ADDRESS } from '../config/contract';

export function Statistics() {
  // Get contract balance as a proxy for total volume
  const { data: contractBalance } = useBalance({
    address: COIN_FLIP_ADDRESS,
  });

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Platform Statistics</h3>
        <p className="text-gray-600">Real-time stats from the Monad blockchain</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-3xl p-8 border border-purple-200/50 shadow-sm">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center">
              <span className="text-3xl">💰</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Contract Balance</p>
            <p className="text-3xl font-bold text-gray-900">
              {contractBalance ? parseFloat(formatEther(contractBalance.value)).toFixed(2) : '0.00'}
            </p>
            <p className="text-sm text-gray-500 mt-1">MON</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-8 border border-green-200/50 shadow-sm">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center">
              <span className="text-3xl">🎲</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Win Rate</p>
            <p className="text-3xl font-bold text-gray-900">~50%</p>
            <p className="text-sm text-gray-500 mt-1">Provably Fair</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl p-8 border border-orange-200/50 shadow-sm">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center">
              <span className="text-3xl">⚡</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Payout Rate</p>
            <p className="text-3xl font-bold text-gray-900">1.9x</p>
            <p className="text-sm text-gray-500 mt-1">On Win</p>
          </div>
        </div>
      </div>
    </div>
  );
}
