'use client'

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Loader2, CheckCircle2, AlertCircle, Coins, Calendar, Clock, Image as ImageIcon } from "lucide-react";
import { NFT_LENDING_ABI, ERC20_ABI } from '@/config/contracts'
import { useLanguage } from '@/contexts/LanguageContext'

const NFT_LENDING_ADDRESS = process.env.NEXT_PUBLIC_NFT_LENDING_ADDRESS as `0x${string}`

interface LoanOffer {
  loanId: number
  borrower: string
  lender: string
  nft: string
  paymentToken: string
  tokenId: bigint
  principal: bigint
  interest: bigint
  dueDate: bigint
  state: number
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount()
  const { t } = useLanguage()
  const [borrowedLoans, setBorrowedLoans] = useState<LoanOffer[]>([])
  const [lentLoans, setLentLoans] = useState<LoanOffer[]>([])
  const [listedLoans, setListedLoans] = useState<LoanOffer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null)

  // 獲取下一個 loan ID
  const { data: nextLoanId } = useReadContract({
    address: NFT_LENDING_ADDRESS,
    abi: NFT_LENDING_ABI,
    functionName: 'nextLoanId',
  })

  // 獲取用戶相關的貸款
  useEffect(() => {
    async function fetchUserLoans() {
      if (!nextLoanId || !address) return
      
      setIsLoading(true)
      try {
        const totalLoans = Number(nextLoanId) - 1
        const borrowed: LoanOffer[] = []
        const lent: LoanOffer[] = []
        const listed: LoanOffer[] = []

        for (let i = 1; i <= totalLoans; i++) {
          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_RPC_URL}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: i,
                method: 'eth_call',
                params: [{
                  to: NFT_LENDING_ADDRESS,
                  data: `0xe1ec3c68${i.toString(16).padStart(64, '0')}` // loans(uint256)
                }, 'latest']
              })
            })

            const data = await response.json()
            
            if (data.result && data.result !== '0x' && data.result.length > 2) {
              const hex = data.result.slice(2)
              
              const borrower = '0x' + hex.slice(24, 64)
              const lender = '0x' + hex.slice(88, 128)
              const nft = '0x' + hex.slice(152, 192)
              const paymentToken = '0x' + hex.slice(216, 256)
              const tokenId = BigInt('0x' + hex.slice(256, 320))
              const principal = BigInt('0x' + hex.slice(320, 384))
              const interest = BigInt('0x' + hex.slice(384, 448))
              const dueDateHex = hex.slice(496, 512)
              const dueDate = BigInt('0x' + dueDateHex)
              const stateHex = hex.slice(574, 576) || hex.slice(-2)
              const state = parseInt(stateHex, 16)

              const loan: LoanOffer = {
                loanId: i,
                borrower,
                lender,
                nft,
                paymentToken,
                tokenId,
                principal,
                interest,
                dueDate,
                state
              }

              // 作為借款人：Funded 狀態 (state === 1)
              if (borrower.toLowerCase() === address.toLowerCase() && state === 1) {
                borrowed.push(loan)
              }
              
              // 作為放款人：Funded 狀態 (state === 1)
              if (lender.toLowerCase() === address.toLowerCase() && state === 1) {
                lent.push(loan)
              }
              
              // 作為借款人：Listed 狀態 (state === 0)
              if (borrower.toLowerCase() === address.toLowerCase() && state === 0) {
                listed.push(loan)
              }
            }
          } catch (error) {
            console.error(`Error fetching loan ${i}:`, error)
          }
        }

        setBorrowedLoans(borrowed)
        setLentLoans(lent)
        setListedLoans(listed)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserLoans()
  }, [nextLoanId, address])

  // 檢查 token allowance (for repayment)
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: selectedLoanId && borrowedLoans.find(l => l.loanId === selectedLoanId) 
      ? borrowedLoans.find(l => l.loanId === selectedLoanId)!.paymentToken as `0x${string}`
      : undefined,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && selectedLoanId && borrowedLoans.find(l => l.loanId === selectedLoanId)
      ? [address, NFT_LENDING_ADDRESS]
      : undefined,
  })

  // Approve Token (for repayment)
  const { 
    data: approveHash, 
    writeContract: approveToken,
    isPending: isApproving,
    reset: resetApprove
  } = useWriteContract()

  const { isLoading: isApprovingConfirm, isSuccess: isApprovalSuccess } = 
    useWaitForTransactionReceipt({ hash: approveHash })

  useEffect(() => {
    if (isApprovalSuccess) {
      refetchAllowance()
    }
  }, [isApprovalSuccess, refetchAllowance])

  const handleApproveToken = (loan: LoanOffer) => {
    resetApprove()
    setSelectedLoanId(loan.loanId)
    const totalRepayment = loan.principal + loan.interest
    approveToken({
      address: loan.paymentToken as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [NFT_LENDING_ADDRESS, totalRepayment],
    })
  }

  // Repay Loan
  const { 
    data: repayHash, 
    writeContract: repayLoan,
    isPending: isRepaying,
    error: repayError,
    reset: resetRepay
  } = useWriteContract()

  const { isLoading: isRepayingConfirm, isSuccess: isRepaid } = 
    useWaitForTransactionReceipt({ hash: repayHash })

  const handleRepayLoan = (loanId: number) => {
    resetRepay()
    repayLoan({
      address: NFT_LENDING_ADDRESS,
      abi: NFT_LENDING_ABI,
      functionName: 'repayLoan',
      args: [BigInt(loanId)],
    })
  }

  // Claim Default
  const { 
    data: claimHash, 
    writeContract: claimDefault,
    isPending: isClaiming,
    error: claimError,
    reset: resetClaim
  } = useWriteContract()

  const { isLoading: isClaimingConfirm, isSuccess: isClaimed } = 
    useWaitForTransactionReceipt({ hash: claimHash })

  const handleClaimDefault = (loanId: number) => {
    resetClaim()
    claimDefault({
      address: NFT_LENDING_ADDRESS,
      abi: NFT_LENDING_ABI,
      functionName: 'claimDefault',
      args: [BigInt(loanId)],
    })
  }

  // Cancel Loan Offer
  const { 
    data: cancelHash, 
    writeContract: cancelLoan,
    isPending: isCancelling,
    error: cancelError,
    reset: resetCancel
  } = useWriteContract()

  const { isLoading: isCancellingConfirm, isSuccess: isCancelled } = 
    useWaitForTransactionReceipt({ hash: cancelHash })

  const handleCancelLoan = (loanId: number) => {
    resetCancel()
    cancelLoan({
      address: NFT_LENDING_ADDRESS,
      abi: NFT_LENDING_ABI,
      functionName: 'cancelLoanOffer',
      args: [BigInt(loanId)],
    })
  }

  // 計算剩餘時間
  const getRemainingTime = (dueDate: bigint) => {
    const now = Math.floor(Date.now() / 1000)
    const remaining = Number(dueDate) - now
    
    if (remaining <= 0) return { text: 'Overdue', overdue: true }
    
    const days = Math.floor(remaining / (60 * 60 * 24))
    const hours = Math.floor((remaining % (60 * 60 * 24)) / (60 * 60))
    
    if (days > 0) {
      return { text: `${days}d ${hours}h remaining`, overdue: false }
    } else {
      return { text: `${hours}h remaining`, overdue: false }
    }
  }

  // 格式化日期
  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString()
  }

  // 檢查是否逾期
  const isOverdue = (dueDate: bigint) => {
    const now = Math.floor(Date.now() / 1000)
    return Number(dueDate) < now
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle>Please Connect Wallet</CardTitle>
            <CardDescription>You need to connect your wallet to view your dashboard</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Dashboard</h1>
          <p className="text-muted-foreground">Manage your active loans and lending positions</p>
        </div>

        <Tabs defaultValue="listed" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="listed">
              Listed ({listedLoans.length})
            </TabsTrigger>
            <TabsTrigger value="borrowed">
              My Loans ({borrowedLoans.length})
            </TabsTrigger>
            <TabsTrigger value="lent">
              My Lending ({lentLoans.length})
            </TabsTrigger>
          </TabsList>

          {/* Listed 視圖 - 我掛出的 NFT */}
          <TabsContent value="listed" className="mt-6">
            <div className="mb-4">
              <h2 className="text-2xl font-semibold mb-2">My Listed NFTs</h2>
              <p className="text-muted-foreground">Your NFT loan offers awaiting lenders</p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : listedLoans.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Package className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Listed NFTs</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    You don't have any NFTs listed for borrowing. Go to Borrow page to create a loan offer.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {listedLoans.map((loan) => {
                  const now = Math.floor(Date.now() / 1000)
                  const daysUntilDue = Math.max(1, Math.ceil((Number(loan.dueDate) - now) / (60 * 60 * 24)))
                  const apr = loan.principal > BigInt(0) && daysUntilDue > 0
                    ? (Number(loan.interest) / Number(loan.principal)) * (365 / daysUntilDue) * 100 
                    : 0

                  return (
                    <Card key={loan.loanId} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">Loan #{loan.loanId}</CardTitle>
                            <CardDescription className="mt-1 flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" />
                              NFT Token #{loan.tokenId.toString()}
                            </CardDescription>
                          </div>
                          <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            Listed
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Loan Amount */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Coins className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Loan Amount:</span>
                          </div>
                          <span className="font-semibold">{formatUnits(loan.principal, 18)} TUSDC</span>
                        </div>

                        {/* Interest */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Interest:</span>
                          <span className="font-semibold">{formatUnits(loan.interest, 18)} TUSDC</span>
                        </div>

                        {/* APR */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">APR:</span>
                          <span className="font-semibold text-orange-600 dark:text-orange-400">
                            {apr.toFixed(2)}%
                          </span>
                        </div>

                        {/* Due Date */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Due Date:</span>
                          </div>
                          <span className="text-sm">{formatDate(loan.dueDate)}</span>
                        </div>

                        {/* Duration */}
                        <div className="flex items-center justify-between p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm font-medium">{daysUntilDue} days duration</span>
                          </div>
                        </div>

                        <div className="pt-4 space-y-3">
                          {/* Cancel Button */}
                          <Button
                            className="w-full"
                            variant="destructive"
                            onClick={() => handleCancelLoan(loan.loanId)}
                            disabled={isCancelling || isCancellingConfirm}
                          >
                            {isCancelling || isCancellingConfirm ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {isCancellingConfirm ? 'Confirming...' : 'Cancelling...'}
                              </>
                            ) : (
                              'Cancel Listing'
                            )}
                          </Button>
                          
                          <p className="text-xs text-center text-muted-foreground">
                            Cancelling will return your NFT to your wallet
                          </p>
                        </div>

                        {/* Success Display */}
                        {isCancelled && selectedLoanId === loan.loanId && (
                          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                              <CheckCircle2 className="w-4 h-4" />
                              <p className="text-sm font-semibold">Listing Cancelled!</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Your NFT has been returned to your wallet.
                            </p>
                          </div>
                        )}

                        {/* Error Display */}
                        {cancelError && selectedLoanId === loan.loanId && (
                          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                              <AlertCircle className="w-4 h-4" />
                              <p className="text-sm font-semibold">Error</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {cancelError.message}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* 借款人視圖 - 我借出的 NFT */}
          <TabsContent value="borrowed" className="mt-6">
            <div className="mb-4">
              <h2 className="text-2xl font-semibold mb-2">NFTs I Borrowed Against</h2>
              <p className="text-muted-foreground">Your active loans that need repayment</p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : borrowedLoans.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Package className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Active Loans</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    You don't have any active loans. Go to Marketplace to fund a loan or create your own.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {borrowedLoans.map((loan) => {
                  const totalRepayment = loan.principal + loan.interest
                  const isApproved = allowance && selectedLoanId === loan.loanId 
                    ? allowance >= totalRepayment 
                    : false
                  const timeRemaining = getRemainingTime(loan.dueDate)

                  return (
                    <Card key={loan.loanId} className={`hover:shadow-lg transition-shadow ${timeRemaining.overdue ? 'border-red-500' : ''}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">Loan #{loan.loanId}</CardTitle>
                            <CardDescription className="mt-1 flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" />
                              NFT Token #{loan.tokenId.toString()}
                            </CardDescription>
                          </div>
                          <Badge variant={timeRemaining.overdue ? "destructive" : "secondary"}>
                            {timeRemaining.overdue ? 'Overdue' : 'Active'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Principal Borrowed */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Coins className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Borrowed:</span>
                          </div>
                          <span className="font-semibold">{formatUnits(loan.principal, 18)} TUSDC</span>
                        </div>

                        {/* Total Repayment */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total Repayment:</span>
                          <span className="font-semibold text-lg text-orange-600 dark:text-orange-400">
                            {formatUnits(totalRepayment, 18)} TUSDC
                          </span>
                        </div>

                        {/* Interest */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Interest:</span>
                          <span>{formatUnits(loan.interest, 18)} TUSDC</span>
                        </div>

                        {/* Due Date */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Due Date:</span>
                          </div>
                          <span className="text-sm">{formatDate(loan.dueDate)}</span>
                        </div>

                        {/* Time Remaining */}
                        <div className={`flex items-center justify-between p-2 rounded-lg ${
                          timeRemaining.overdue 
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400' 
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        }`}>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm font-medium">{timeRemaining.text}</span>
                          </div>
                        </div>

                        <div className="pt-4 space-y-3">
                          {/* Approval Status */}
                          {selectedLoanId === loan.loanId && (
                            <div className={`p-3 rounded-lg text-sm ${
                              isApproved 
                                ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                                : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                            }`}>
                              <div className="flex items-center gap-2">
                                {isApproved ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="font-medium">Tokens Approved</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="font-medium">Approval Required</span>
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          {(!selectedLoanId || selectedLoanId !== loan.loanId || !isApproved) && (
                            <Button
                              className="w-full"
                              variant="outline"
                              onClick={() => handleApproveToken(loan)}
                              disabled={isApproving || isApprovingConfirm || (selectedLoanId === loan.loanId && isApproved)}
                            >
                              {isApproving || isApprovingConfirm ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  {isApprovingConfirm ? 'Confirming...' : 'Approving...'}
                                </>
                              ) : selectedLoanId === loan.loanId && isApproved ? (
                                <>
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Approved
                                </>
                              ) : (
                                'Approve Repayment'
                              )}
                            </Button>
                          )}

                          {selectedLoanId === loan.loanId && isApproved && (
                            <Button
                              className="w-full"
                              onClick={() => handleRepayLoan(loan.loanId)}
                              disabled={isRepaying || isRepayingConfirm || timeRemaining.overdue}
                            >
                              {isRepaying || isRepayingConfirm ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  {isRepayingConfirm ? 'Confirming...' : 'Repaying...'}
                                </>
                              ) : timeRemaining.overdue ? (
                                'Overdue - Cannot Repay'
                              ) : (
                                `Repay ${formatUnits(totalRepayment, 18)} TUSDC`
                              )}
                            </Button>
                          )}
                        </div>

                        {/* Success Display */}
                        {isRepaid && selectedLoanId === loan.loanId && (
                          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                              <CheckCircle2 className="w-4 h-4" />
                              <p className="text-sm font-semibold">Loan Repaid!</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Your NFT has been returned to your wallet.
                            </p>
                          </div>
                        )}

                        {/* Error Display */}
                        {repayError && selectedLoanId === loan.loanId && (
                          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                              <AlertCircle className="w-4 h-4" />
                              <p className="text-sm font-semibold">Error</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {repayError.message}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* 放款人視圖 - 我借款給別人 */}
          <TabsContent value="lent" className="mt-6">
            <div className="mb-4">
              <h2 className="text-2xl font-semibold mb-2">My Lending Positions</h2>
              <p className="text-muted-foreground">Loans you've funded with collateral held</p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : lentLoans.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Package className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Lending Positions</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    You haven't funded any loans yet. Browse the Marketplace to find opportunities.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {lentLoans.map((loan) => {
                  const totalRepayment = loan.principal + loan.interest
                  const timeRemaining = getRemainingTime(loan.dueDate)
                  const canClaim = isOverdue(loan.dueDate)

                  return (
                    <Card key={loan.loanId} className={`hover:shadow-lg transition-shadow ${canClaim ? 'border-red-500' : ''}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">Loan #{loan.loanId}</CardTitle>
                            <CardDescription className="mt-1 flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" />
                              Collateral: NFT #{loan.tokenId.toString()}
                            </CardDescription>
                          </div>
                          <Badge variant={canClaim ? "destructive" : "secondary"} className="bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            Lender
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Borrower */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Borrower:</span>
                          <span className="font-mono">{loan.borrower.slice(0, 6)}...{loan.borrower.slice(-4)}</span>
                        </div>

                        {/* Principal Lent */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Coins className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Principal Lent:</span>
                          </div>
                          <span className="font-semibold">{formatUnits(loan.principal, 18)} TUSDC</span>
                        </div>

                        {/* Expected Return */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Expected Return:</span>
                          <span className="font-semibold text-lg text-green-600 dark:text-green-400">
                            {formatUnits(totalRepayment, 18)} TUSDC
                          </span>
                        </div>

                        {/* Profit */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Profit:</span>
                          <span className="text-green-600 dark:text-green-400">+{formatUnits(loan.interest, 18)} TUSDC</span>
                        </div>

                        {/* Due Date */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Due Date:</span>
                          </div>
                          <span className="text-sm">{formatDate(loan.dueDate)}</span>
                        </div>

                        {/* Time Status */}
                        <div className={`flex items-center justify-between p-2 rounded-lg ${
                          canClaim
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400' 
                            : 'bg-green-500/10 text-green-600 dark:text-green-400'
                        }`}>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm font-medium">{timeRemaining.text}</span>
                          </div>
                        </div>

                        <div className="pt-4 space-y-3">
                          {/* Claim Default Button */}
                          <Button
                            className="w-full"
                            variant={canClaim ? "destructive" : "outline"}
                            onClick={() => handleClaimDefault(loan.loanId)}
                            disabled={!canClaim || isClaiming || isClaimingConfirm}
                          >
                            {isClaiming || isClaimingConfirm ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {isClaimingConfirm ? 'Confirming...' : 'Claiming...'}
                              </>
                            ) : canClaim ? (
                              'Claim NFT Collateral'
                            ) : (
                              'Waiting for Due Date'
                            )}
                          </Button>
                          
                          {!canClaim && (
                            <p className="text-xs text-center text-muted-foreground">
                              You can claim the collateral after the due date if not repaid
                            </p>
                          )}
                        </div>

                        {/* Success Display */}
                        {isClaimed && (
                          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                              <CheckCircle2 className="w-4 h-4" />
                              <p className="text-sm font-semibold">NFT Claimed!</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              The collateral NFT has been transferred to your wallet.
                            </p>
                          </div>
                        )}

                        {/* Error Display */}
                        {claimError && (
                          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                              <AlertCircle className="w-4 h-4" />
                              <p className="text-sm font-semibold">Error</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {claimError.message}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
