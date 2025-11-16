# NFT Lending dApp Integration Guide

Comprehensive reference for building a front-end that interacts with `src/NFTLending.sol`. Covers state layout, lifecycle, public calls, emitted events, and UI requirements.

## 1. Lifecycle Summary

1. **Borrower lists loan** via `createLoanOffer`:
   - Transfers chosen NFT to the contract (`safeTransferFrom`).
   - Defines ERC-20 payment token, principal, fixed interest, due date (<= 180 days ahead).
2. **Borrower can cancel** unfunded offers through `cancelLoanOffer` (NFT returns).
3. **Lender funds** a listed offer using `fundLoan`:
   - Sends principal amount of the specified ERC-20 directly to the borrower.
   - Contract records lender address and moves state to `Funded`.
4. **Borrower repays** with `repayLoan` before `dueDate`:
   - Pays `principal + interest` in the same ERC-20 to the lender.
   - NFT returns to borrower, state becomes `Repaid`.
5. **If overdue**, lender calls `claimDefault`:
   - NFT transfers to lender, state becomes `Defaulted`.

## 2. Core Data

### State variables
| Name | Type | Description |
| --- | --- | --- |
| `MAX_LOAN_DURATION` | `uint256` | Hard cap (180 days) between listing and due date. |
| `nextLoanId` | `uint256` | Incremental identifier assigned on each listing. |
| `loans` | `mapping(uint256 => LoanOffer)` | Stores all loan structs keyed by `loanId`. |

### `LoanOffer` struct
| Field | Type | Notes |
| --- | --- | --- |
| `borrower` | `address` | Listing creator, NFT owner. |
| `lender` | `address` | Populated when funded. |
| `nft` | `address` | ERC-721 collection. |
| `paymentToken` | `address` | ERC-20 asset both sides must approve/transfer. |
| `tokenId` | `uint256` | NFT identifier. |
| `principal` | `uint256` | Amount lender sends & borrower repays. |
| `interest` | `uint256` | Flat fee added on repayment. |
| `dueDate` | `uint64` | Unix timestamp for repayment deadline. |
| `state` | `LoanState` | `Listed`, `Funded`, `Repaid`, `Defaulted`, `Cancelled`. |

Retrieve any loan with `getLoan(loanId)` for display or status checks.

## 3. Public Functions

### `createLoanOffer(address nft, uint256 tokenId, address paymentToken, uint256 principal, uint256 interest, uint64 dueDate)`
- **Caller**: Borrower (must own NFT and approve contract).
- **UI prerequisites**:
  - Prompt user to `setApprovalForAll` on the ERC-721 for `NFTLending`.
  - Validate `principal > 0`, `dueDate > now`, `dueDate - now <= MAX_LOAN_DURATION`.
- **Side effects**: Contract escrows NFT and emits `LoanOffered` with loan metadata.
- **Returns**: Newly assigned `loanId`.
- **Errors**: `InvalidLoan` if parameters invalid.

### `cancelLoanOffer(uint256 loanId)`
- **Caller**: Borrower only.
- **Preconditions**: `LoanState.Listed`.
- **Effects**: Marks `Cancelled`, returns NFT, emits `LoanCancelled`.
- **UI**: Show button while loan is `Listed` and caller == borrower.

### `fundLoan(uint256 loanId)`
- **Caller**: First lender willing to accept borrower terms.
- **Token flow**: `paymentToken.safeTransferFrom(lender, borrower, principal)`; lender must approve contract beforehand.
- **Preconditions**:
  - Loan exists, state `Listed`, `block.timestamp < dueDate`.
  - Sufficient ERC-20 balance & allowance.
- **Effects**: Records lender, sets state `Funded`, emits `LoanFunded`.
- **UI**: Provide allowance flow + transaction; disable once funded or expired.

### `repayLoan(uint256 loanId)`
- **Caller**: Borrower only.
- **Token flow**: Transfers `principal + interest` ERC-20 from borrower to lender (borrower must approve contract).
- **Preconditions**: Loan in `Funded`, `block.timestamp <= dueDate`.
- **Effects**: Sets state `Repaid`, returns NFT, emits `LoanRepaid`.
- **UI**: Show outstanding payoff and countdown to due date.

### `claimDefault(uint256 loanId)`
- **Caller**: Recorded lender only.
- **Preconditions**: Loan in `Funded`, `block.timestamp > dueDate`.
- **Effects**: Sets state `Defaulted`, transfers NFT to lender, emits `LoanDefaulted`.
- **UI**: Enable action once overdue; inform borrower that NFT is forfeit.

### `getLoan(uint256 loanId)` (view)
- **Returns**: Full `LoanOffer` struct; UI should poll or read via RPC for statuses.

## 4. Events to Watch

| Event | Key data | Usage |
| --- | --- | --- |
| `LoanOffered` | `loanId`, borrower, NFT, paymentToken, terms | Update marketplace listings UI. |
| `LoanFunded` | `loanId`, lender, paymentToken, principal | Move listing to "Funded" state. |
| `LoanRepaid` | `loanId`, borrower | Mark loan completed and return NFT visually. |
| `LoanDefaulted` | `loanId`, lender | Trigger default notifications, update NFT ownership view. |
| `LoanCancelled` | `loanId` | Remove listing from open offers. |

Subscribe via on-chain events or indexer; ensure frontend state machine mirrors contract states.

## 5. Allowance & Approval Checklist

| Action | Needed approvals |
| --- | --- |
| `createLoanOffer` | Borrower: `ERC721.setApprovalForAll(NFTLending, true)` |
| `fundLoan` | Lender: `ERC20.approve(NFTLending, principal)` |
| `repayLoan` | Borrower: `ERC20.approve(NFTLending, principal + interest)` |

UI should surface allowance prompts and show remaining approved amounts.

## 6. UX Considerations

- **Timer displays**: Show due date countdown and disable repay button automatically after expiry.
- **State guardrails**: Disable buttons when loan state mismatches action to avoid reverted transactions.
- **Token decimals**: Read `ERC20.decimals()` for formatting; contract stores raw units.
- **Multiple loans per user**: Display `loanId` and allow filtering by `borrower` or `lender` address.
- **Error surfacing**: Map revert reasons: `InvalidLoan` (bad params), `InvalidState` (wrong lifecycle), `NotAuthorized` (caller mismatch).

With this reference, the front-end can confidently orchestrate borrower and lender flows around the deterministic state machine of `NFTLending.sol`.
