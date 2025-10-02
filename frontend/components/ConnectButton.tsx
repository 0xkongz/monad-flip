'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { monadTestnet } from '@/config/chains';

export function ConnectButton() {
  const { address, isConnected, chain } = useAccount();
  const { connectors, connect, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [showWalletOptions, setShowWalletOptions] = useState(false);

  const isWrongNetwork = isConnected && chain?.id !== monadTestnet.id;

  const handleSwitchNetwork = () => {
    switchChain({ chainId: monadTestnet.id });
  };

  const handleConnectWallet = (connector: any) => {
    connect({ connector });
    setShowWalletOptions(false);
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        {isWrongNetwork && (
          <button
            onClick={handleSwitchNetwork}
            className="px-4 py-2 bg-gradient-to-b from-yellow-500 to-yellow-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl active:scale-95 transform transition-all duration-200 ease-out"
          >
            Switch to Monad
          </button>
        )}
        <div className="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg">
          <p className="text-sm font-medium text-white/90">
            {address.slice(0, 6)}...{address.slice(-4)}
          </p>
        </div>
        <button
          onClick={() => disconnect()}
          className="px-6 py-2.5 bg-gradient-to-b from-red-500 to-red-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl active:scale-95 transform transition-all duration-200 ease-out"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowWalletOptions(!showWalletOptions)}
        disabled={isPending}
        className="px-8 py-3 bg-gradient-to-b from-blue-500 to-blue-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl active:scale-95 transform transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {showWalletOptions && (
        <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl overflow-hidden z-50">
          <div className="p-2">
            {connectors.map((connector) => (
              <button
                key={connector.id}
                onClick={() => handleConnectWallet(connector)}
                disabled={isPending}
                className="w-full px-4 py-3 text-left text-gray-800 hover:bg-gray-100 rounded-xl transition-colors duration-150 flex items-center gap-3 disabled:opacity-50"
              >
                <span className="text-2xl">
                  {connector.name.toLowerCase().includes('metamask') ? '🦊' :
                   connector.name.toLowerCase().includes('phantom') ? '👻' :
                   '💼'}
                </span>
                <span className="font-medium">{connector.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 mt-2 px-4 py-2 bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-xl absolute right-0">
          {error.message}
        </p>
      )}
    </div>
  );
}
