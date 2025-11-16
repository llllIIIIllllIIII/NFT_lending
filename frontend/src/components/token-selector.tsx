'use client'

import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface Token {
  address: `0x${string}`
  symbol: string
  name: string
  decimals: number
  logoUrl?: string
}

// 預設代幣列表
const DEFAULT_TOKENS: Token[] = [
  {
    address: (process.env.NEXT_PUBLIC_TEST_ERC20_ADDRESS || '') as `0x${string}`,
    symbol: 'TUSDC',
    name: 'Test USDC',
    decimals: 18,
  },
  // 可以添加更多測試代幣
]

interface TokenSelectorProps {
  value?: `0x${string}`
  onSelect: (token: Token) => void
  tokens?: Token[]
}

export function TokenSelector({ value, onSelect, tokens = DEFAULT_TOKENS }: TokenSelectorProps) {
  const [open, setOpen] = useState(false)
  
  const selectedToken = tokens.find((token) => token.address === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedToken ? (
            <div className="flex items-center gap-2">
              {selectedToken.logoUrl && (
                <img 
                  src={selectedToken.logoUrl} 
                  alt={selectedToken.symbol}
                  className="w-5 h-5 rounded-full"
                />
              )}
              <div className="flex flex-col items-start">
                <span className="font-semibold">{selectedToken.symbol}</span>
                <span className="text-xs text-muted-foreground">
                  {selectedToken.name}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">選擇代幣...</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="搜尋代幣..." />
          <CommandList>
            <CommandEmpty>找不到代幣</CommandEmpty>
            <CommandGroup heading="可用代幣">
              {tokens.map((token) => (
                <CommandItem
                  key={token.address}
                  value={token.symbol}
                  onSelect={() => {
                    onSelect(token)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === token.address ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex items-center gap-2 flex-1">
                    {token.logoUrl && (
                      <img 
                        src={token.logoUrl} 
                        alt={token.symbol}
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <div className="flex flex-col">
                      <span className="font-semibold">{token.symbol}</span>
                      <span className="text-xs text-muted-foreground">
                        {token.name}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {token.address.slice(0, 6)}...{token.address.slice(-4)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
