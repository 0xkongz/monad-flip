import { http, createConfig } from 'wagmi'
import { injected, walletConnect } from 'wagmi/connectors'
import { monadTestnet } from './chains'

export const config = createConfig({
  chains: [monadTestnet],
  connectors: [
    injected({
      target: 'metaMask',
    }),
    injected({
      target() {
        return {
          id: 'phantom',
          name: 'Phantom',
          provider: (window as any)?.phantom?.ethereum,
        }
      },
    }),
    injected(), // Fallback for other injected wallets
  ],
  transports: {
    [monadTestnet.id]: http('https://testnet-rpc.monad.xyz'),
  },
})
