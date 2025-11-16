import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Language = 'zh' | 'en'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations = {
  zh: {
    // Navbar
    'nav.marketplace': 'Marketplace',
    'nav.borrow': 'Borrow',
    'nav.dashboard': 'Dashboard',
    'nav.faucet': 'Faucet',
    
    // Faucet Page
    'faucet.badge': '測試網資產水龍頭',
    'faucet.title': '免費領取測試資產',
    'faucet.description': '立即獲取測試代幣和 NFT,在 IOTA EVM Testnet 上體驗完整的借貸功能',
    'faucet.connectWallet': '測試代幣水龍頭',
    'faucet.connectDescription': '請先連接您的錢包以領取測試資產',
    'faucet.connectHint': '點擊右上角的 "Connect Wallet" 按鈕開始',
    
    // Token Section
    'faucet.token.title': '測試代幣',
    'faucet.token.subtitle': 'Test USDC (TUSDC)',
    'faucet.token.description': '領取測試代幣用於借貸交易,可作為放款資金或還款使用',
    'faucet.token.amountLabel': '領取數量',
    'faucet.token.amountPlaceholder': '輸入數量 (例如: 1000)',
    'faucet.token.mint': '領取測試代幣',
    'faucet.token.minting': '鑄造中...',
    'faucet.token.minted': '領取成功!',
    'faucet.token.success': '領取成功!',
    'faucet.token.successDescription': '測試代幣已成功轉入您的錢包',
    
    // NFT Section
    'faucet.nft.title': '測試 NFT',
    'faucet.nft.subtitle': 'Test NFT Collection (TNFT)',
    'faucet.nft.description': '鑄造測試 NFT 作為借貸抵押品,借款者必須持有 NFT',
    'faucet.nft.idLabel': 'NFT Token ID',
    'faucet.nft.idPlaceholder': '輸入編號 (例如: 1, 2, 3...)',
    'faucet.nft.random': '隨機',
    'faucet.nft.mint': '鑄造測試 NFT',
    'faucet.nft.minting': '鑄造中...',
    'faucet.nft.minted': '鑄造成功!',
    'faucet.nft.success': '鑄造成功!',
    'faucet.nft.successDescription': '測試 NFT 已成功鑄造到您的錢包',
    
    // Usage Guide
    'faucet.guide.title': '使用指南',
    'faucet.guide.tokenTitle': '測試代幣 (TUSDC)',
    'faucet.guide.tokenDescription': '作為放款者,需要代幣來資助借款;作為借款者,需要代幣來償還貸款。',
    'faucet.guide.nftTitle': '測試 NFT',
    'faucet.guide.nftDescription': '用作借貸的抵押品。借款者需要持有 NFT 才能創建借款請求。',
    'faucet.guide.nextStepsTitle': '💡 下一步操作',
    'faucet.guide.nextStepsDescription': '領取資產後,前往 Borrow 頁面創建借款請求,或到 Marketplace 瀏覽現有的借貸機會。',
    
    // Borrow Page
    'borrow.title': '創建借款請求',
    'borrow.subtitle': '使用您的 NFT 作為抵押品並設定借款條件',
    'borrow.connectWallet': '請連接錢包',
    'borrow.connectDescription': '您需要連接錢包才能創建借款請求',
    'borrow.card.title': '借款詳情',
    'borrow.card.subtitle': '定義您的 NFT 抵押借款條件',
    'borrow.nft.label': 'NFT 抵押品',
    'borrow.nft.placeholder': '輸入要抵押的 NFT Token ID',
    'borrow.nft.hint': '輸入您擁有的 NFT 的 Token ID',
    'borrow.nft.noNFT': '您還沒有任何測試 NFT',
    'borrow.nft.goToFaucet': '前往 Faucet 鑄造 NFT',
    'borrow.token.label': '支付代幣',
    'borrow.token.hint': '用於本金和利息的 ERC-20 代幣地址',
    'borrow.principal.label': '本金金額',
    'borrow.principal.placeholder': '0.00',
    'borrow.principal.hint': '您想要借入的金額',
    'borrow.interest.label': '利息金額',
    'borrow.interest.placeholder': '0.00',
    'borrow.interest.hint': '還款時需要支付的固定利息',
    'borrow.dueDate.label': '還款截止日期',
    'borrow.dueDate.hint': '最多 180 天',
    'borrow.summary.total': '總還款金額',
    'borrow.summary.apr': '預估年化利率',
    'borrow.button': '創建借款請求',
    
    // Common
    'common.youOwn': '您擁有',
  },
  en: {
    // Navbar
    'nav.marketplace': 'Marketplace',
    'nav.borrow': 'Borrow',
    'nav.dashboard': 'Dashboard',
    'nav.faucet': 'Faucet',
    
    // Faucet Page
    'faucet.badge': 'Testnet Asset Faucet',
    'faucet.title': 'Get Free Test Assets',
    'faucet.description': 'Instantly obtain test tokens and NFTs to experience the full lending features on IOTA EVM Testnet',
    'faucet.connectWallet': 'Test Asset Faucet',
    'faucet.connectDescription': 'Please connect your wallet to claim test assets',
    'faucet.connectHint': 'Click the "Connect Wallet" button in the top right corner to get started',
    
    // Token Section
    'faucet.token.title': 'Test Token',
    'faucet.token.subtitle': 'Test USDC (TUSDC)',
    'faucet.token.description': 'Claim test tokens for lending transactions, use as loan funding or repayment',
    'faucet.token.amountLabel': 'Claim Amount',
    'faucet.token.amountPlaceholder': 'Enter amount (e.g., 1000)',
    'faucet.token.mint': 'Claim Test Tokens',
    'faucet.token.minting': 'Minting...',
    'faucet.token.minted': 'Claimed Successfully!',
    'faucet.token.success': 'Claimed Successfully!',
    'faucet.token.successDescription': 'Test tokens have been successfully transferred to your wallet',
    
    // NFT Section
    'faucet.nft.title': 'Test NFT',
    'faucet.nft.subtitle': 'Test NFT Collection (TNFT)',
    'faucet.nft.description': 'Mint test NFTs as loan collateral, borrowers must hold NFTs',
    'faucet.nft.idLabel': 'NFT Token ID',
    'faucet.nft.idPlaceholder': 'Enter ID (e.g., 1, 2, 3...)',
    'faucet.nft.random': 'Random',
    'faucet.nft.mint': 'Mint Test NFT',
    'faucet.nft.minting': 'Minting...',
    'faucet.nft.minted': 'Minted Successfully!',
    'faucet.nft.success': 'Minted Successfully!',
    'faucet.nft.successDescription': 'Test NFT has been successfully minted to your wallet',
    
    // Usage Guide
    'faucet.guide.title': 'Usage Guide',
    'faucet.guide.tokenTitle': 'Test Token (TUSDC)',
    'faucet.guide.tokenDescription': 'As a lender, you need tokens to fund loans; as a borrower, you need tokens to repay loans.',
    'faucet.guide.nftTitle': 'Test NFT',
    'faucet.guide.nftDescription': 'Used as collateral for lending. Borrowers need to hold NFTs to create loan requests.',
    'faucet.guide.nextStepsTitle': '💡 Next Steps',
    'faucet.guide.nextStepsDescription': 'After claiming assets, go to the Borrow page to create a loan request, or visit the Marketplace to browse existing lending opportunities.',
    
    // Borrow Page
    'borrow.title': 'Create Loan Offer',
    'borrow.subtitle': 'List your NFT as collateral and set your borrowing terms',
    'borrow.connectWallet': 'Please Connect Wallet',
    'borrow.connectDescription': 'You need to connect your wallet to create a loan offer',
    'borrow.card.title': 'Loan Details',
    'borrow.card.subtitle': 'Define the terms for your NFT-backed loan',
    'borrow.nft.label': 'NFT Collateral',
    'borrow.nft.placeholder': 'Enter the Token ID to use as collateral',
    'borrow.nft.hint': 'Enter the Token ID of the NFT you own',
    'borrow.nft.noNFT': 'You don\'t own any Test NFTs',
    'borrow.nft.goToFaucet': 'Go to Faucet to Mint NFT',
    'borrow.token.label': 'Payment Token',
    'borrow.token.hint': 'ERC-20 token address for principal and interest',
    'borrow.principal.label': 'Principal Amount',
    'borrow.principal.placeholder': '0.00',
    'borrow.principal.hint': 'Amount you want to borrow',
    'borrow.interest.label': 'Interest Amount',
    'borrow.interest.placeholder': '0.00',
    'borrow.interest.hint': 'Fixed interest you\'ll pay on repayment',
    'borrow.dueDate.label': 'Repayment Deadline',
    'borrow.dueDate.hint': 'Maximum 180 days from now',
    'borrow.summary.total': 'Total repayment',
    'borrow.summary.apr': 'Estimated APR',
    'borrow.button': 'Create Loan Offer',
    
    // Common
    'common.youOwn': 'You own',
  },
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('zh')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('language') as Language
      if (saved && (saved === 'zh' || saved === 'en')) {
        setLanguageState(saved)
      }
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang)
    }
  }

  const t = (key: string): string => {
    // 直接使用扁平化的 key
    return translations[language][key as keyof typeof translations.zh] || key
  }

  // 避免 hydration 不匹配
  if (!mounted) {
    return null
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
