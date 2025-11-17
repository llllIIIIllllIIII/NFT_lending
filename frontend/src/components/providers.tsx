'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme, Locale } from '@rainbow-me/rainbowkit'
import { config } from '@/config/wagmi'
import '@rainbow-me/rainbowkit/styles.css'
import { useState, useEffect } from 'react'
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext'

function RainbowKitWrapper({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const locale: Locale = language === 'zh' ? 'zh-CN' : 'en-US'
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // 避免 hydration 不匹配
  if (!mounted) {
    return (
      <RainbowKitProvider theme={darkTheme()} locale="en-US">
        {children}
      </RainbowKitProvider>
    )
  }
  
  return (
    <RainbowKitProvider theme={darkTheme()} locale={locale}>
      {children}
    </RainbowKitProvider>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: false,
      },
    },
  }))

  return (
    <LanguageProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitWrapper>
            {children}
          </RainbowKitWrapper>
        </QueryClientProvider>
      </WagmiProvider>
    </LanguageProvider>
  )
}
