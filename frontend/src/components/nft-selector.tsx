"use client"

import * as React from "react"
import { Check, Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface NFTSelectorProps {
  nfts: string[]
  value?: string
  onSelect?: (tokenId: string) => void
  placeholder?: string
}

export function NFTSelector({ nfts, value, onSelect, placeholder = "Select NFT" }: NFTSelectorProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            {value ? `Test NFT #${value}` : placeholder}
          </div>
          <svg
            className="ml-2 h-4 w-4 shrink-0 opacity-50"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search NFT by Token ID..." />
          <CommandList>
            <CommandEmpty>No NFT found.</CommandEmpty>
            <CommandGroup>
              {nfts.map((tokenId) => (
                <CommandItem
                  key={tokenId}
                  value={tokenId}
                  onSelect={(currentValue) => {
                    onSelect?.(currentValue === value ? "" : currentValue)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === tokenId ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <ImageIcon className="mr-2 h-4 w-4 text-primary" />
                  Test NFT #{tokenId}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
