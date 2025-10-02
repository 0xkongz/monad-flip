import { http, createConfig } from 'wagmi'
import { injected } from 'wagmi/connectors'
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
          provider: typeof window !== 'undefined' ? (window as any)?.phantom?.ethereum : undefined,
        }
      },
    }),
    injected(), // Fallback for other injected wallets
  ],
  transports: {
    [monadTestnet.id]: http('https://testnet-rpc.monad.xyz'),
  },
})
