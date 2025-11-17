import { getDefaultConfig } from '@rainbow-me/rainbowkit'
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

// Get WalletConnect Project ID
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!

export const config = getDefaultConfig({
  appName: 'NFT Lending',
  projectId,
  chains: [iotaEvmTestnet],
  ssr: true,
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
