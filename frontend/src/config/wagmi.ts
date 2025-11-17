import { http, createConfig } from 'wagmi'
import { injected, walletConnect, coinbaseWallet } from '@wagmi/connectors'
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

export const config = createConfig({
  chains: [iotaEvmTestnet],
  connectors: [
    // Browser extension wallets (MetaMask, Rabby, Phantom, Trust Wallet, etc.)
    injected({ 
      shimDisconnect: true,
    }),
    // WalletConnect - for mobile wallets and dApp browsers
    walletConnect({ 
      projectId,
      metadata: {
        name: 'NFT Lending',
        description: 'NFT-backed lending platform on IOTA EVM',
        url: 'https://nft-lending.app',
        icons: ['https://nft-lending.app/icon.png']
      },
      showQrModal: true,
      qrModalOptions: {
        themeMode: 'dark',
      },
    }),
    // Coinbase Wallet
    coinbaseWallet({
      appName: 'NFT Lending',
      appLogoUrl: 'https://nft-lending.app/icon.png',
      darkMode: true,
    }),
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
