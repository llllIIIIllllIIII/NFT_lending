'use client'

import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Coins, Image as ImageIcon, CheckCircle2, Loader2, Sparkles, ArrowRight, Info } from 'lucide-react'
import { TEST_ERC20_ABI, TEST_ERC721_ABI } from '@/config/contracts'
import { useLanguage } from '@/contexts/LanguageContext'

const TEST_ERC20_ADDRESS = process.env.NEXT_PUBLIC_TEST_ERC20_ADDRESS as `0x${string}`
const TEST_ERC721_ADDRESS = process.env.NEXT_PUBLIC_TEST_ERC721_ADDRESS as `0x${string}`

export default function FaucetPage() {
  const { address, isConnected } = useAccount()
  const { t } = useLanguage()
  const [tokenAmount, setTokenAmount] = useState('1000')
  const [nftTokenId, setNftTokenId] = useState('')

  // Debug: Log contract addresses on mount
  console.log('Contract Addresses:', {
    ERC20: TEST_ERC20_ADDRESS,
    ERC721: TEST_ERC721_ADDRESS,
    userAddress: address,
    isConnected
  })

  // Mint ERC20
  const { 
    data: mintTokenHash, 
    writeContract: mintToken,
    isPending: isMintingToken,
    error: mintTokenError 
  } = useWriteContract()

  const { isLoading: isTokenConfirming, isSuccess: isTokenMinted } = 
    useWaitForTransactionReceipt({ hash: mintTokenHash })

  // Mint ERC721
  const { 
    data: mintNftHash, 
    writeContract: mintNft,
    isPending: isMintingNft,
    error: mintNftError 
  } = useWriteContract()

  const { isLoading: isNftConfirming, isSuccess: isNftMinted } = 
    useWaitForTransactionReceipt({ hash: mintNftHash })

  // Log errors
  if (mintTokenError) {
    console.error('Mint Token Error:', mintTokenError)
  }
  if (mintNftError) {
    console.error('Mint NFT Error:', mintNftError)
  }

  const handleMintToken = () => {
    if (!address) return
    
    console.log('Minting token with params:', {
      address: TEST_ERC20_ADDRESS,
      userAddress: address,
      amount: tokenAmount,
      parsedAmount: parseUnits(tokenAmount, 18).toString()
    })
    
    mintToken({
      address: TEST_ERC20_ADDRESS,
      abi: TEST_ERC20_ABI,
      functionName: 'mint',
      args: [address, parseUnits(tokenAmount, 18)],
    })
  }

  const handleMintNft = () => {
    if (!address || !nftTokenId) return
    
    mintNft({
      address: TEST_ERC721_ADDRESS,
      abi: TEST_ERC721_ABI,
      functionName: 'mint',
      args: [address, BigInt(nftTokenId)],
    })
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container max-w-md px-4">
          <Card className="border-2">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">{t('faucet.connectWallet')}</CardTitle>
              <CardDescription className="text-base">
                {t('faucet.connectDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {t('faucet.connectHint')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container max-w-5xl mx-auto py-12 px-4">
        {/* Hero Section */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            <span>{t('faucet.badge')}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            {t('faucet.title')}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('faucet.description')}
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Token Card */}
          <Card className="border-2 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:border-primary/50 group">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 group-hover:from-green-500/30 group-hover:to-emerald-500/30 transition-all">
                  <Coins className="w-7 h-7 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{t('faucet.token.title')}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{t('faucet.token.subtitle')}</p>
                </div>
              </div>
              <CardDescription className="text-base leading-relaxed">
                {t('faucet.token.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="tokenAmount" className="text-base font-medium">
                  {t('faucet.token.amountLabel')}
                </Label>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setTokenAmount('100')}
                    className="hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-colors"
                  >
                    100
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setTokenAmount('1000')}
                    className="hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-colors"
                  >
                    1000
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setTokenAmount('10000')}
                    className="hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-colors"
                  >
                    10000
                  </Button>
                </div>
                <Input
                  id="tokenAmount"
                  type="number"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  placeholder={t('faucet.token.amountPlaceholder')}
                  className="text-lg h-12 border-2 focus-visible:ring-2 focus-visible:ring-primary/20"
                />
              </div>
              
              <Button 
                onClick={handleMintToken} 
                disabled={isMintingToken || isTokenConfirming || !tokenAmount}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 transition-all duration-300"
              >
                {isMintingToken || isTokenConfirming ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {t('faucet.token.minting')}
                  </>
                ) : isTokenMinted ? (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    {t('faucet.token.minted')}
                  </>
                ) : (
                  <>
                    <Coins className="mr-2 h-5 w-5" />
                    {t('faucet.token.mint')}
                  </>
                )}
              </Button>

              {isTokenMinted && (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <p className="font-semibold">{t('faucet.token.success')}</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('faucet.token.successDescription')}
                  </p>
                </div>
              )}

              {mintTokenError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <p className="font-semibold">Error</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {mintTokenError.message}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* NFT Card */}
          <Card className="border-2 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:border-primary/50 group">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 group-hover:from-purple-500/30 group-hover:to-pink-500/30 transition-all">
                  <ImageIcon className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{t('faucet.nft.title')}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{t('faucet.nft.subtitle')}</p>
                </div>
              </div>
              <CardDescription className="text-base leading-relaxed">
                {t('faucet.nft.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="nftTokenId" className="text-base font-medium">
                  {t('faucet.nft.idLabel')}
                </Label>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setNftTokenId('1')}
                    className="hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-colors"
                  >
                    #1
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setNftTokenId(Math.floor(Math.random() * 10000).toString())}
                    className="hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-colors"
                  >
                    {t('faucet.nft.random')}
                  </Button>
                </div>
                <Input
                  id="nftTokenId"
                  type="number"
                  value={nftTokenId}
                  onChange={(e) => setNftTokenId(e.target.value)}
                  placeholder={t('faucet.nft.idPlaceholder')}
                  className="text-lg h-12 border-2 focus-visible:ring-2 focus-visible:ring-primary/20"
                />
              </div>
              
              <Button 
                onClick={handleMintNft} 
                disabled={isMintingNft || isNftConfirming || !nftTokenId}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300"
              >
                {isMintingNft || isNftConfirming ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {t('faucet.nft.minting')}
                  </>
                ) : isNftMinted ? (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    {t('faucet.nft.minted')}
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-5 w-5" />
                    {t('faucet.nft.mint')}
                  </>
                )}
              </Button>

              {isNftMinted && (
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <p className="font-semibold">{t('faucet.nft.success')}</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('faucet.nft.successDescription')}
                  </p>
                </div>
              )}

              {mintNftError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <p className="font-semibold">Error</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {mintNftError.message}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Usage Guide */}
        <Card className="border-2 bg-gradient-to-br from-card via-card to-primary/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Info className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">{t('faucet.guide.title')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-2 rounded-lg bg-green-500/10 shrink-0">
                    <Coins className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      {t('faucet.guide.tokenTitle')}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t('faucet.guide.tokenDescription')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-2 rounded-lg bg-purple-500/10 shrink-0">
                    <ImageIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      {t('faucet.guide.nftTitle')}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t('faucet.guide.nftDescription')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">
                    {t('faucet.guide.nextStepsTitle')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('faucet.guide.nextStepsDescription')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
