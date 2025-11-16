import { http, createConfig } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { defineChain } from 'viem'

// IOTA EVM Testnet
export const iotaEvmTestnet = defineChain({
  id: 1076,
  name: 'IOTA EVM Testnet',
  nativeCurrency: {
    name: 'IOTA',
    symbol: 'IOTA',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://json-rpc.evm.testnet.iotaledger.net'],
    },
  },
  blockExplorers: {
    default: {
      name: 'IOTA EVM Explorer',
      url: 'https://explorer.evm.testnet.iotaledger.net',
    },
  },
  testnet: true,
})

export const config = createConfig({
  chains: [iotaEvmTestnet],
  connectors: [
    injected({ shimDisconnect: true }),
  ],
  transports: {
    [iotaEvmTestnet.id]: http(),
  },
  ssr: true,
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
