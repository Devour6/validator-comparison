'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ValidatorSearch } from '@/components/validator-search'
import { ComparisonView } from '@/components/comparison-view'
import { Methodology } from '@/components/methodology'
import type { ValidatorRaw } from '@/lib/types'

const MAX_VALIDATORS = 4

export default function Home() {
  const [validators, setValidators] = useState<ValidatorRaw[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<(ValidatorRaw | null)[]>([null])

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/validators')
        if (!res.ok) throw new Error('Failed to fetch validators')
        const data: ValidatorRaw[] = await res.json()
        data.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        setValidators(data)
      } catch (err) {
        setError(String(err))
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleSelect = useCallback((index: number, v: ValidatorRaw | null) => {
    setSelected(prev => {
      const next: (ValidatorRaw | null)[] = [...prev]
      if (v === null) {
        // Remove this slot
        next.splice(index, 1)
        if (next.length === 0) next.push(null)
        return next
      }
      next[index] = v
      // Auto-add a new empty slot if all slots are filled and under max
      const allFilled = !next.some(x => x === null)
      if (allFilled && next.length < MAX_VALIDATORS) {
        return [...next, null] as (ValidatorRaw | null)[]
      }
      return next
    })
  }, [])

  const addSlot = useCallback(() => {
    setSelected(prev => {
      if (prev.length >= MAX_VALIDATORS) return prev
      return [...prev, null]
    })
  }, [])

  const activeValidators = selected.filter((v): v is ValidatorRaw => v !== null)
  const selectedPubkeys = new Set(activeValidators.map(v => v.vote_account_pubkey))

  return (
    <div className="min-h-screen bg-[#0F0E0C]">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Phase" width={40} height={40} className="rounded-lg" />
            <div>
              <h1 className="font-display text-2xl md:text-3xl text-[#F3EED9]">
                Validator Comparison
              </h1>
              <p className="text-muted-foreground mt-0.5">
                Compare Solana validators side-by-side -- performance, APY, decentralization, and more.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <Tabs defaultValue="compare">
          <TabsList className="mb-8 bg-secondary">
            <TabsTrigger value="compare" className="font-display text-xs">Compare</TabsTrigger>
            <TabsTrigger value="methodology" className="font-display text-xs">Methodology</TabsTrigger>
          </TabsList>

          <TabsContent value="compare">
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="space-y-3 text-center">
                  <div className="w-8 h-8 border-2 border-[#F3EED9] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-muted-foreground">Loading validators from Trillium...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400">
                {error}
              </div>
            )}

            {!loading && !error && (
              <div className="space-y-8">
                {/* Search Slots */}
                <div className={`grid grid-cols-1 ${selected.length >= 2 ? 'md:grid-cols-2' : ''} gap-4`}>
                  {selected.map((v, i) => (
                    <ValidatorSearch
                      key={i}
                      validators={validators.filter(val => !selectedPubkeys.has(val.vote_account_pubkey) || val.vote_account_pubkey === v?.vote_account_pubkey)}
                      selected={v}
                      onSelect={(val) => handleSelect(i, val)}
                      onRemove={selected.length > 1 ? () => handleSelect(i, null) : undefined}
                      placeholder="Search by name or pubkey..."
                      label={`Validator ${i + 1}`}
                    />
                  ))}
                </div>

                {/* Add Validator Button */}
                {selected.length < MAX_VALIDATORS && selected.every(v => v !== null) && (
                  <button
                    onClick={addSlot}
                    className="w-full py-3 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                  >
                    + Add another validator (up to {MAX_VALIDATORS})
                  </button>
                )}

                <p className="text-xs text-muted-foreground">
                  {validators.length.toLocaleString()} validators loaded -- 10-epoch weighted averages
                </p>

                {/* Comparison */}
                {activeValidators.length > 0 ? (
                  <ComparisonView
                    validators={activeValidators}
                    allValidators={validators}
                  />
                ) : (
                  <div className="text-center py-16 space-y-3">
                    <p className="text-xl font-display text-muted-foreground">
                      Search for a validator to see its grades
                    </p>
                    <p className="text-sm text-muted-foreground/60">
                      Add up to {MAX_VALIDATORS} validators for side-by-side comparison
                    </p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="methodology">
            <Methodology />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border mt-12">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Phase Validator Tools</span>
          <span>Data: Trillium API</span>
        </div>
      </footer>
    </div>
  )
}
