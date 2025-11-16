'use client'

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatUnits } from 'viem'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Loader2, CheckCircle2, AlertCircle, Coins, Calendar, Percent } from "lucide-react";
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

export default function MarketplacePage() {
  const { address, isConnected } = useAccount()
  const { t } = useLanguage()
  const [loans, setLoans] = useState<LoanOffer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null)

  // 獲取下一個 loan ID
  const { data: nextLoanId } = useReadContract({
    address: NFT_LENDING_ADDRESS,
    abi: NFT_LENDING_ABI,
    functionName: 'nextLoanId',
  })

  // 獲取所有活躍的貸款
  useEffect(() => {
    async function fetchLoans() {
      if (!nextLoanId) return
      
      setIsLoading(true)
      try {
        const totalLoans = Number(nextLoanId) - 1
        const activeLoans: LoanOffer[] = []

        // 從 1 開始逐一查詢貸款
        for (let i = 1; i <= totalLoans; i++) {
          try {
            // 直接讀取 loans mapping，因為 getLoan 會在某些情況下 revert
            // loans(uint256) 的 function selector 是 0xe1ec3c68
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
              // 移除 0x 前綴
              const hex = data.result.slice(2)
              
              console.log(`Raw hex for loan ${i}:`, hex)
              console.log(`Hex length:`, hex.length)
              
              // 每個地址/uint256 佔 64 個字符（32 bytes）
              const borrower = '0x' + hex.slice(24, 64)
              const lender = '0x' + hex.slice(88, 128)
              const nft = '0x' + hex.slice(152, 192)
              const paymentToken = '0x' + hex.slice(216, 256)
              const tokenId = BigInt('0x' + hex.slice(256, 320))
              const principal = BigInt('0x' + hex.slice(320, 384))
              const interest = BigInt('0x' + hex.slice(384, 448))
              // uint64 dueDate - 位於第 7 個 slot (448-512)，但只占後 16 個字符
              const dueDateHex = hex.slice(496, 512) // 取最後 16 個字符
              const dueDate = BigInt('0x' + dueDateHex)
              // uint8 state - 位於第 8 個 slot (512-576)，取最後 2 個字符
              const stateHex = hex.slice(574, 576) || hex.slice(-2) // 取最後 2 個字符
              const state = parseInt(stateHex, 16)

              console.log(`Loan ${i}:`, {
                borrower,
                lender,
                nft,
                paymentToken,
                tokenId: tokenId.toString(),
                principal: principal.toString(),
                interest: interest.toString(),
                dueDateHex,
                dueDate: dueDate.toString(),
                stateHex,
                state,
                borrowerCheck: borrower !== '0x0000000000000000000000000000000000000000',
                stateCheck: state === 0
              })

              // 只添加 Listed 狀態且 borrower 不為空的貸款
              if (state === 0 && borrower !== '0x0000000000000000000000000000000000000000') {
                console.log(`Adding loan ${i} to activeLoans`)
                activeLoans.push({
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
                })
              } else {
                console.log(`Skipping loan ${i} - state: ${state}, borrower not zero: ${borrower !== '0x0000000000000000000000000000000000000000'}`)
              }
            }
          } catch (error) {
            console.error(`Error fetching loan ${i}:`, error)
          }
        }

        console.log('Active loans:', activeLoans)
        setLoans(activeLoans)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLoans()
  }, [nextLoanId])

  // 檢查 token allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: selectedLoanId && loans.find(l => l.loanId === selectedLoanId) 
      ? loans.find(l => l.loanId === selectedLoanId)!.paymentToken as `0x${string}`
      : undefined,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && selectedLoanId && loans.find(l => l.loanId === selectedLoanId)
      ? [address, NFT_LENDING_ADDRESS]
      : undefined,
  })

  // Approve Token
  const { 
    data: approveHash, 
    writeContract: approveToken,
    isPending: isApproving,
    error: approveError,
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
    approveToken({
      address: loan.paymentToken as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [NFT_LENDING_ADDRESS, loan.principal],
    })
  }

  // Fund Loan
  const { 
    data: fundHash, 
    writeContract: fundLoan,
    isPending: isFunding,
    error: fundError,
    reset: resetFund
  } = useWriteContract()

  const { isLoading: isFundingConfirm, isSuccess: isFunded } = 
    useWaitForTransactionReceipt({ hash: fundHash })

  const handleFundLoan = (loanId: number) => {
    resetFund()
    fundLoan({
      address: NFT_LENDING_ADDRESS,
      abi: NFT_LENDING_ABI,
      functionName: 'fundLoan',
      args: [BigInt(loanId)],
    })
  }

  // 計算 APR
  const calculateAPR = (principal: bigint, interest: bigint, dueDate: bigint) => {
    const now = Math.floor(Date.now() / 1000)
    const daysToMaturity = Math.ceil((Number(dueDate) - now) / (60 * 60 * 24))
    
    if (daysToMaturity <= 0) return '0.00'
    
    const principalNum = Number(formatUnits(principal, 18))
    const interestNum = Number(formatUnits(interest, 18))
    
    const apr = (interestNum / principalNum) * (365 / daysToMaturity) * 100
    return apr.toFixed(2)
  }

  // 格式化日期
  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString()
  }

  // 縮短地址
  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle>Please Connect Wallet</CardTitle>
            <CardDescription>You need to connect your wallet to view and fund loans</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Loan Marketplace</h1>
          <p className="text-muted-foreground">Browse active loan offers and fund the ones that match your criteria</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : loans.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Package className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Active Loans</h3>
              <p className="text-muted-foreground text-center max-w-md">
                There are currently no loan offers available in the marketplace. Check back later or create your own loan offer.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {loans.map((loan) => {
              const isApproved = allowance && selectedLoanId === loan.loanId 
                ? allowance >= loan.principal 
                : false
              const totalRepayment = loan.principal + loan.interest
              const apr = calculateAPR(loan.principal, loan.interest, loan.dueDate)

              return (
                <Card key={loan.loanId} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">Loan #{loan.loanId}</CardTitle>
                        <CardDescription className="mt-1">
                          NFT Token #{loan.tokenId.toString()}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400">
                        Active
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Borrower */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Borrower:</span>
                      <span className="font-mono">{shortenAddress(loan.borrower)}</span>
                    </div>

                    {/* Principal */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Principal:</span>
                      </div>
                      <span className="font-semibold">{formatUnits(loan.principal, 18)} TUSDC</span>
                    </div>

                    {/* Total Repayment */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Repayment:</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {formatUnits(totalRepayment, 18)} TUSDC
                      </span>
                    </div>

                    {/* APR */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Percent className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">APR:</span>
                      </div>
                      <span className="font-semibold">{apr}%</span>
                    </div>

                    {/* Due Date */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Due Date:</span>
                      </div>
                      <span className="text-sm">{formatDate(loan.dueDate)}</span>
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
                            'Approve Tokens'
                          )}
                        </Button>
                      )}

                      {selectedLoanId === loan.loanId && isApproved && (
                        <Button
                          className="w-full"
                          onClick={() => handleFundLoan(loan.loanId)}
                          disabled={isFunding || isFundingConfirm}
                        >
                          {isFunding || isFundingConfirm ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {isFundingConfirm ? 'Confirming...' : 'Funding...'}
                            </>
                          ) : (
                            'Fund Loan'
                          )}
                        </Button>
                      )}
                    </div>

                    {/* Error Display */}
                    {(approveError || fundError) && selectedLoanId === loan.loanId && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                          <AlertCircle className="w-4 h-4" />
                          <p className="text-sm font-semibold">Error</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {approveError?.message || fundError?.message}
                        </p>
                      </div>
                    )}

                    {/* Success Display */}
                    {isFunded && selectedLoanId === loan.loanId && (
                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <p className="text-sm font-semibold">Loan Funded!</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          The borrower has received the funds.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
