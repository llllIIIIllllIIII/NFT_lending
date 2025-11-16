# NFT Lending MVP

Minimal smart contract scope for an NFT-collateralized lending flow meant for a one-day hackathon build. Borrowers escrow an ERC-721, pick the ERC-20 asset, principal, fixed interest, and due date. A single lender funds the offer with that token, borrowers repay lump-sum, and lenders seize the NFT on default. No auctions, no price feeds, no batch operations.

## Contract scope

- **Single-loan lifecycle:** Offer → Fund → Repay or Default. Each loan tracks borrower, lender, NFT info, payment token, principal, interest, and due date.
src/NFTLending.sol    # Core lending contract
src/TestERC20.sol     # Mintable ERC-20 test token (role-based)
src/TestERC721.sol    # Mintable ERC-721 test collection (role-based)
- **One lender per offer:** First funder wins. Funds flow straight to the borrower on acceptance.
- **Deterministic outcomes:** Repayments require exact `principal + interest`. Overdue funded loans can be claimed by the lender for collateral.
- **Security by limitation:** No rate changes, oracles, auctions, or admin controls. Minimal storage and only essential state transitions.

## Key components

| Element | Purpose |
| --- | --- |
| `struct LoanOffer` | Stores immutable terms plus current state for each loan ID. |
| `enum LoanState` | `Listed`, `Funded`, `Repaid`, `Defaulted`, `Cancelled`. Prevents double actions. |
| `createLoanOffer` | Escrows NFT, records borrower-defined terms, emits listing event. |
| `fundLoan` | Pulls exact ERC-20 principal from first lender, forwards tokens to borrower, locks lender ad                                                       dress. |
| `repayLoan` | Borrower repays before due date to release NFT and stream funds plus interest (same ERC-20) to lender. |
| `claimDefault` | Lets lender seize the NFT after the due date passes without repayment. |
| `cancelLoanOffer` | Borrower can unwind any unfunded listing. |
| `getLoan` | View helper returning the complete struct for off-chain consumers. |

### Assumptions & limitations

- One ERC-20 asset per loan. Borrowers choose the token address; mixing assets or using ETH directly is outside MVP scope.
- Borrowers self-manage pricing risk; the protocol performs no valuation, liquidation auctions, or refinancing.
- Time-based logic relies on block timestamps and caps loan duration at 180 days to remain predictable.
- NFTs must implement the standard `safeTransferFrom` interface. Fractional, rental, or batch mechanics are out of scope.

## Repository layout

```
foundry.toml          # Foundry configuration
src/NFTLending.sol    # Core lending contract
test/                 # Solidity tests + mocks
  ├─ mocks/MockERC721.sol
  └─ NFTLending.t.sol
README.md             # This document
```

## Local development

1. **Install Foundry (if needed):**

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

2. **Run the test suite:**

```bash
forge test
```

That's it—deploy `NFTLending.sol` to any EVM-compatible network, and wire simple front-ends or scripts around the exposed events and view helpers.
