'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();

  const handleConnect = () => {
    connect({ connector: injected() });
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
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
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleConnect}
        disabled={isPending}
        className="px-8 py-3 bg-gradient-to-b from-blue-500 to-blue-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl active:scale-95 transform transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>
      {error && (
        <p className="text-sm text-red-400 mt-1 px-4 py-2 bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-xl">
          {error.message}
        </p>
      )}
    </div>
  );
}
