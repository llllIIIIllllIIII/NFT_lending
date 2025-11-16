'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import Link from 'next/link'
import { Wallet, Globe } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export function Navbar() {
  const { language, setLanguage, t } = useLanguage()

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Wallet className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">NFT Lending</span>
          </Link>

          <div className="flex items-center space-x-6">
            <Link
              href="/marketplace"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('nav.marketplace')}
            </Link>
            <Link
              href="/borrow"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('nav.borrow')}
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('nav.dashboard')}
            </Link>
            <Link
              href="/faucet"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('nav.faucet')}
            </Link>
            
            {/* Language Switcher */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                  <Globe className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-32 p-2" align="end">
                <div className="space-y-1">
                  <Button
                    variant={language === 'zh' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setLanguage('zh')}
                  >
                    🇨🇳 中文
                  </Button>
                  <Button
                    variant={language === 'en' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setLanguage('en')}
                  >
                    🇺🇸 English
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            
            <ConnectButton />
          </div>
        </div>
      </div>
    </nav>
  )
}
