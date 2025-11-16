export enum LoanState {
  Listed = 0,
  Funded = 1,
  Repaid = 2,
  Defaulted = 3,
  Cancelled = 4,
}

export interface LoanOffer {
  borrower: `0x${string}`
  lender: `0x${string}`
  nft: `0x${string}`
  paymentToken: `0x${string}`
  tokenId: bigint
  principal: bigint
  interest: bigint
  dueDate: bigint
  state: LoanState
}

export interface LoanWithId extends LoanOffer {
  loanId: number
}

export const LOAN_STATE_LABELS: Record<LoanState, string> = {
  [LoanState.Listed]: 'Listed',
  [LoanState.Funded]: 'Funded',
  [LoanState.Repaid]: 'Repaid',
  [LoanState.Defaulted]: 'Defaulted',
  [LoanState.Cancelled]: 'Cancelled',
}

export const LOAN_STATE_COLORS: Record<
  LoanState,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  [LoanState.Listed]: 'default',
  [LoanState.Funded]: 'secondary',
  [LoanState.Repaid]: 'outline',
  [LoanState.Defaulted]: 'destructive',
  [LoanState.Cancelled]: 'outline',
}
