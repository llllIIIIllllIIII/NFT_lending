# NFT Lending Protocol - Frontend

Modern, responsive frontend for the NFT-backed lending protocol built with Next.js 14, shadcn/ui, and Web3 libraries.

## Features

- 🌐 **Wallet Connection**: RainbowKit integration for seamless wallet connectivity
- 🎨 **Modern UI**: shadcn/ui components with Tailwind CSS dark mode
- 📱 **Responsive Design**: Mobile-first approach inspired by leading DeFi protocols
- ⚡ **Real-time Updates**: wagmi hooks for contract state synchronization
- 🔐 **Secure Transactions**: Step-by-step approval flows and transaction status tracking

## Tech Stack

- **Framework**: [Next.js 14+](https://nextjs.org/) with App Router
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Web3**: [wagmi](https://wagmi.sh/), [viem](https://viem.sh/), [RainbowKit](https://www.rainbowkit.com/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) + React Query
- **Icons**: [Lucide React](https://lucide.dev/)
- **Network**: IOTA EVM Testnet (Chain ID: 1075)

## Getting Started

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Update contract addresses and WalletConnect Project ID (get from https://cloud.walletconnect.com).

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js pages
│   │   ├── page.tsx           # Landing
│   │   ├── marketplace/       # Browse loans
│   │   ├── borrow/            # Create offers
│   │   └── dashboard/         # Positions
│   ├── components/
│   │   ├── ui/                # shadcn components
│   │   ├── navbar.tsx
│   │   └── providers.tsx
│   ├── config/
│   │   ├── wagmi.ts           # Web3 config
│   │   └── contracts.ts       # ABIs
│   └── types/
│       └── loan.ts
└── package.json
```

## Key Pages

- **Landing (`/`)**: Protocol overview with CTAs
- **Marketplace (`/marketplace`)**: Browse and fund loan offers
- **Borrow (`/borrow`)**: Create NFT-backed loan requests
- **Dashboard (`/dashboard`)**: Manage your positions (borrower/lender views)

## Resources

- [Smart Contract Integration Guide](../docs/frontend-spec.md)
- [Next.js Docs](https://nextjs.org/docs)
- [wagmi Docs](https://wagmi.sh/)
- [shadcn/ui](https://ui.shadcn.com/)

## License

MIT
