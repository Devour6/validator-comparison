'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import type { ValidatorRaw } from '@/lib/types'

interface ValidatorSearchProps {
  validators: ValidatorRaw[]
  selected: ValidatorRaw | null
  onSelect: (v: ValidatorRaw) => void
  placeholder: string
  label: string
}

export function ValidatorSearch({ validators, selected, onSelect, placeholder, label }: ValidatorSearchProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query.length >= 1
    ? validators.filter(v => {
        const q = query.toLowerCase()
        return (
          v.name?.toLowerCase().includes(q) ||
          v.vote_account_pubkey?.toLowerCase().includes(q)
        )
      }).slice(0, 50)
    : []

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = useCallback((v: ValidatorRaw) => {
    onSelect(v)
    setQuery('')
    setOpen(false)
  }, [onSelect])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || filtered.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleSelect(filtered[highlightIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  if (selected) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">{label}</label>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{selected.name || 'Unknown'}</p>
            <p className="text-xs text-muted-foreground font-mono truncate">{selected.vote_account_pubkey}</p>
          </div>
          <button
            onClick={() => onSelect(null as unknown as ValidatorRaw)}
            className="shrink-0 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-secondary"
          >
            Change
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2 relative" ref={ref}>
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <Input
        ref={inputRef}
        value={query}
        onChange={e => {
          setQuery(e.target.value)
          setOpen(true)
          setHighlightIdx(0)
        }}
        onFocus={() => query.length >= 1 && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="bg-surface border-border text-foreground placeholder:text-muted-foreground"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-border bg-[#1a1916] shadow-xl max-h-64 overflow-y-auto">
          {filtered.map((v, i) => (
            <button
              key={v.vote_account_pubkey}
              onClick={() => handleSelect(v)}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                i === highlightIdx ? 'bg-secondary' : 'hover:bg-secondary/50'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {v.name || 'Unknown Validator'}
                </p>
                <p className="text-xs text-muted-foreground font-mono truncate">
                  {v.vote_account_pubkey}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {v.average_activated_stake >= 1000
                  ? (v.average_activated_stake / 1000).toFixed(0) + 'K'
                  : v.average_activated_stake?.toFixed(0)}{' '}
                SOL
              </span>
            </button>
          ))}
        </div>
      )}
      {open && query.length >= 1 && filtered.length === 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-border bg-[#1a1916] shadow-xl p-4 text-sm text-muted-foreground text-center">
          No validators found
        </div>
      )}
    </div>
  )
}
