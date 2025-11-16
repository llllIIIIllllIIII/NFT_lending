'use client'

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coins, Percent, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { TokenSelector, type Token } from "@/components/token-selector";
import { DatePicker } from "@/components/date-picker";
import { NFTSelector } from "@/components/nft-selector";
import { NFT_LENDING_ABI, TEST_ERC721_ABI } from '@/config/contracts'
import { useLanguage } from '@/contexts/LanguageContext'
import Link from 'next/link'

const NFT_LENDING_ADDRESS = process.env.NEXT_PUBLIC_NFT_LENDING_ADDRESS as `0x${string}`
const TEST_ERC721_ADDRESS = process.env.NEXT_PUBLIC_TEST_ERC721_ADDRESS as `0x${string}`

export default function BorrowPage() {
  const { address, isConnected } = useAccount()
  const { t } = useLanguage()
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [selectedNftId, setSelectedNftId] = useState<string>("");
  const [principal, setPrincipal] = useState("");
  const [interest, setInterest] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [userNfts, setUserNfts] = useState<string[]>([]);
  const [isLoadingNfts, setIsLoadingNfts] = useState(false);

  // 預設選擇測試 USDC
  useEffect(() => {
    const defaultToken: Token = {
      address: (process.env.NEXT_PUBLIC_TEST_ERC20_ADDRESS || '') as `0x${string}`,
      symbol: 'TUSDC',
      name: 'Test USDC',
      decimals: 18,
    };
    setSelectedToken(defaultToken);
  }, []);

  // 檢查用戶擁有的 NFT 數量
  const { data: nftBalance } = useReadContract({
    address: TEST_ERC721_ADDRESS,
    abi: TEST_ERC721_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })

  // 獲取用戶的 NFT Token IDs (簡化版本)
  useEffect(() => {
    async function fetchUserNfts() {
      if (!address || !nftBalance || Number(nftBalance) === 0) {
        setUserNfts([])
        return
      }

      setIsLoadingNfts(true)
      try {
        // 簡化方案：檢查常見的 Token ID 範圍 (1-100)
        const nftIds: string[] = []
        const maxCheck = 100
        
        // 使用 Promise.all 並行檢查以提高速度
        const checkPromises = Array.from({ length: maxCheck }, (_, i) => {
          const tokenId = i + 1
          return fetch(`${process.env.NEXT_PUBLIC_RPC_URL}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: tokenId,
              method: 'eth_call',
              params: [{
                to: TEST_ERC721_ADDRESS,
                data: `0x6352211e${tokenId.toString(16).padStart(64, '0')}` // ownerOf(tokenId)
              }, 'latest']
            })
          })
          .then(res => res.json())
          .then(data => {
            if (data.result && data.result !== '0x') {
              const owner = '0x' + data.result.slice(-40)
              if (owner.toLowerCase() === address.toLowerCase()) {
                return tokenId.toString()
              }
            }
            return null
          })
          .catch(() => null)
        })

        const results = await Promise.all(checkPromises)
        const foundNfts = results.filter((id): id is string => id !== null)
        
        // 限制最多顯示用戶擁有的 NFT 數量
        setUserNfts(foundNfts.slice(0, Number(nftBalance)))
      } finally {
        setIsLoadingNfts(false)
      }
    }

    fetchUserNfts()
  }, [address, nftBalance])

  // 檢查 NFT 是否已經 approve
  const { data: isApproved, refetch: refetchApproval } = useReadContract({
    address: TEST_ERC721_ADDRESS,
    abi: TEST_ERC721_ABI,
    functionName: 'isApprovedForAll',
    args: address ? [address, NFT_LENDING_ADDRESS] : undefined,
  })

  // 設置日期範圍
  const getMinDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow
  }

  const getMaxDate = () => {
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 180)
    return maxDate
  }

  // 計算 APR
  const calculateAPR = () => {
    if (!principal || !interest || !dueDate) return null
    
    const principalNum = parseFloat(principal)
    const interestNum = parseFloat(interest)
    const today = new Date()
    const daysToMaturity = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysToMaturity <= 0 || principalNum <= 0) return null
    
    // APR = (interest / principal) * (365 / days) * 100
    const apr = (interestNum / principalNum) * (365 / daysToMaturity) * 100
    return apr.toFixed(2)
  }

  const totalRepayment = principal && interest 
    ? (parseFloat(principal) + parseFloat(interest)).toFixed(2)
    : '—';

  const apr = calculateAPR()

  // Approve NFT
  const { 
    data: approveHash, 
    writeContract: approveNFT,
    isPending: isApproving,
    error: approveError,
    reset: resetApprove
  } = useWriteContract()

  const { isLoading: isApprovingConfirm, isSuccess: isApprovalSuccess } = 
    useWaitForTransactionReceipt({ 
      hash: approveHash,
    })

  // 當 approval 成功後重新檢查狀態
  useEffect(() => {
    if (isApprovalSuccess) {
      refetchApproval()
    }
  }, [isApprovalSuccess, refetchApproval])

  const handleApproveNFT = async () => {
    resetApprove()
    approveNFT({
      address: TEST_ERC721_ADDRESS,
      abi: TEST_ERC721_ABI,
      functionName: 'setApprovalForAll',
      args: [NFT_LENDING_ADDRESS, true],
    })
  }

  // Create Loan Offer
  const { 
    data: createLoanHash, 
    writeContract: createLoan,
    isPending: isCreating,
    error: createError,
    reset: resetCreate
  } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isCreated } = 
    useWaitForTransactionReceipt({ hash: createLoanHash })

  const handleCreateLoan = async () => {
    if (!address || !selectedNftId || !selectedToken || !principal || !interest || !dueDate) return
    
    // 將日期轉換為 Unix timestamp (秒)
    const dueDateTimestamp = Math.floor(dueDate.getTime() / 1000)
    
    console.log('Creating loan with params:', {
      nft: TEST_ERC721_ADDRESS,
      tokenId: selectedNftId,
      paymentToken: selectedToken.address,
      principal: parseUnits(principal, selectedToken.decimals).toString(),
      interest: parseUnits(interest, selectedToken.decimals).toString(),
      dueDate: dueDateTimestamp,
      dueDateReadable: new Date(dueDateTimestamp * 1000).toISOString()
    })

    resetCreate()
    createLoan({
      address: NFT_LENDING_ADDRESS,
      abi: NFT_LENDING_ABI,
      functionName: 'createLoanOffer',
      args: [
        TEST_ERC721_ADDRESS,
        BigInt(selectedNftId),
        selectedToken.address,
        parseUnits(principal, selectedToken.decimals),
        parseUnits(interest, selectedToken.decimals),
        BigInt(dueDateTimestamp)
      ],
    })
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle>{t('borrow.connectWallet')}</CardTitle>
            <CardDescription>{t('borrow.connectDescription')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{t('borrow.title')}</h1>
          <p className="text-muted-foreground">{t('borrow.subtitle')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('borrow.card.title')}</CardTitle>
            <CardDescription>{t('borrow.card.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* NFT Selection */}
            <div className="space-y-2">
              <Label>{t('borrow.nft.label')}</Label>
              
              {nftBalance && Number(nftBalance) > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground">
                      {t('common.youOwn')} {Number(nftBalance)} Test NFT(s)
                    </span>
                    {isLoadingNfts && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </div>
                  
                  {/* NFT Selector Dropdown */}
                  {userNfts.length > 0 ? (
                    <>
                      <NFTSelector
                        nfts={userNfts}
                        value={selectedNftId}
                        onSelect={setSelectedNftId}
                        placeholder={t('borrow.nft.placeholder')}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('borrow.nft.hint')}
                      </p>
                    </>
                  ) : !isLoadingNfts ? (
                    <>
                      <Input
                        type="number"
                        placeholder={t('borrow.nft.placeholder')}
                        value={selectedNftId}
                        onChange={(e) => setSelectedNftId(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('borrow.nft.hint')}
                      </p>
                    </>
                  ) : null}
                </div>
              ) : (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">
                    {t('borrow.nft.noNFT')}
                  </p>
                  <Link href="/faucet">
                    <Button variant="outline">
                      {t('borrow.nft.goToFaucet')}
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* NFT Approval Section */}
            {nftBalance && Number(nftBalance) > 0 && (
              <div className="space-y-2">
                <Label>NFT Approval</Label>
                <div className={`p-4 rounded-lg border ${isApproved ? 'bg-green-500/10 border-green-500/20' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isApproved ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-medium">NFT Approved</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-yellow-600" />
                          <span className="text-sm font-medium">Approval Required</span>
                        </>
                      )}
                    </div>
                    {!isApproved && (
                      <Button
                        onClick={handleApproveNFT}
                        disabled={isApproving || isApprovingConfirm}
                        size="sm"
                      >
                        {isApproving || isApprovingConfirm ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            {isApprovingConfirm ? 'Confirming...' : 'Approving...'}
                          </>
                        ) : (
                          'Approve NFT'
                        )}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {isApproved 
                      ? 'Your NFTs are approved for the lending contract' 
                      : 'You must approve your NFTs before creating a loan offer'}
                  </p>
                </div>
                {approveError && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {approveError.message}
                  </p>
                )}
              </div>
            )}

            {/* Payment Token */}
            <div className="space-y-2">
              <Label htmlFor="token">{t('borrow.token.label')}</Label>
              <TokenSelector
                value={selectedToken?.address}
                onSelect={setSelectedToken}
              />
              <p className="text-xs text-muted-foreground">{t('borrow.token.hint')}</p>
            </div>

            {/* Principal */}
            <div className="space-y-2">
              <Label htmlFor="principal">{t('borrow.principal.label')}</Label>
              <div className="relative">
                <Coins className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="principal" 
                  type="number" 
                  placeholder={t('borrow.principal.placeholder')}
                  className="pl-10"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">{t('borrow.principal.hint')}</p>
            </div>

            {/* Interest */}
            <div className="space-y-2">
              <Label htmlFor="interest">{t('borrow.interest.label')}</Label>
              <div className="relative">
                <Percent className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="interest" 
                  type="number" 
                  placeholder={t('borrow.interest.placeholder')}
                  className="pl-10"
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">{t('borrow.interest.hint')}</p>
            </div>

            {/* Due Date with Calendar Picker */}
            <div className="space-y-2">
              <Label htmlFor="dueDate">{t('borrow.dueDate.label')}</Label>
              <DatePicker
                value={dueDate}
                onChange={setDueDate}
                minDate={getMinDate()}
                maxDate={getMaxDate()}
                placeholder={t('borrow.dueDate.hint')}
              />
              <p className="text-xs text-muted-foreground">{t('borrow.dueDate.hint')}</p>
            </div>

            {/* Summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('borrow.summary.total')}</span>
                <span className="font-medium">{totalRepayment} {selectedToken?.symbol || 'TUSDC'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('borrow.summary.apr')}</span>
                <span className="font-medium">{apr ? `${apr}%` : '—'}</span>
              </div>
            </div>

            {/* Error Display */}
            {createError && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  <p className="font-semibold">Error</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {createError.message}
                </p>
              </div>
            )}

            {/* Success Display */}
            {isCreated && (
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <p className="font-semibold">Loan Offer Created!</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Your loan offer has been successfully listed on the marketplace.
                </p>
              </div>
            )}

            <Button 
              className="w-full" 
              size="lg"
              onClick={handleCreateLoan}
              disabled={isCreating || isConfirming || !isApproved || !selectedNftId || !principal || !interest || !dueDate}
            >
              {isCreating || isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isConfirming ? 'Confirming...' : 'Creating...'}
                </>
              ) : (
                t('borrow.button')
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
