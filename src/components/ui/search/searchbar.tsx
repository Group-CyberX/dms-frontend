"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface SearchBarProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search documents, tasks, workflows...",
  className,
}: SearchBarProps) {
  return (
    <div
      className={cn(
        "relative w-full max-w-4xl",
        className
      )}
    >
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />

      <Input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="
          h-12
          w-full
          rounded-xl
          bg-gray-100
          pl-12
          pr-4
          text-sm
          border-0
          shadow-none
          focus-visible:ring-1
          focus-visible:ring-ring
          placeholder:text-gray-500
        "
      />
    </div>
  )
}