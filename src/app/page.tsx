'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ValidatorSearch } from '@/components/validator-search'
import { ComparisonView } from '@/components/comparison-view'
import { Methodology } from '@/components/methodology'
import { buildAverageValidator, NETWORK_AVERAGE_PUBKEY } from '@/lib/grading'
import { ShareButton } from '@/components/share-button'
import type { ValidatorRaw } from '@/lib/types'

const MAX_VALIDATORS = 4

let nextSlotId = 1

export default function Home() {
  const [validators, setValidators] = useState<ValidatorRaw[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<{ id: number; validator: ValidatorRaw | null }[]>([{ id: nextSlotId++, validator: null }])

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

  const handleSelect = useCallback((slotId: number, v: ValidatorRaw | null) => {
    setSelected(prev => {
      if (v === null) {
        // Remove this slot
        const next = prev.filter(s => s.id !== slotId)
        if (next.length === 0) next.push({ id: nextSlotId++, validator: null })
        return next
      }
      const next = prev.map(s => s.id === slotId ? { ...s, validator: v } : s)
      // Auto-add a new empty slot if all slots are filled and under max
      const allFilled = !next.some(s => s.validator === null)
      if (allFilled && next.length < MAX_VALIDATORS) {
        return [...next, { id: nextSlotId++, validator: null }]
      }
      return next
    })
  }, [])

  const addSlot = useCallback(() => {
    setSelected(prev => {
      if (prev.length >= MAX_VALIDATORS) return prev
      return [...prev, { id: nextSlotId++, validator: null }]
    })
  }, [])

  const networkAvg = useMemo(() => validators.length > 0 ? buildAverageValidator(validators) : null, [validators])

  const addNetworkAverage = useCallback(() => {
    if (!networkAvg) return
    setSelected(prev => {
      // Don't add if already present
      if (prev.some(s => s.validator?.vote_account_pubkey === NETWORK_AVERAGE_PUBKEY)) return prev
      // Find first empty slot or add one
      const emptyIdx = prev.findIndex(s => s.validator === null)
      if (emptyIdx >= 0) {
        const next = prev.map((s, i) => i === emptyIdx ? { ...s, validator: networkAvg } : s)
        const allFilled = !next.some(s => s.validator === null)
        if (allFilled && next.length < MAX_VALIDATORS) return [...next, { id: nextSlotId++, validator: null }]
        return next
      }
      if (prev.length < MAX_VALIDATORS) {
        const next = [...prev, { id: nextSlotId++, validator: networkAvg }]
        if (next.length < MAX_VALIDATORS) return [...next, { id: nextSlotId++, validator: null }]
        return next
      }
      return prev
    })
  }, [networkAvg])

  const activeValidators = selected.filter((s): s is { id: number; validator: ValidatorRaw } => s.validator !== null).map(s => s.validator)
  const selectedPubkeys = new Set(activeValidators.map(v => v.vote_account_pubkey))
  const hasNetworkAvg = selectedPubkeys.has(NETWORK_AVERAGE_PUBKEY)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Phase" width={40} height={40} className="rounded-lg" />
            <div>
              <h1 className="font-display text-2xl md:text-3xl text-foreground">
                Validator Comparison
              </h1>
              <p className="text-muted-foreground mt-0.5">
                Compare Solana validators side-by-side — performance, APY, decentralization, and more.
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
                  <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-muted-foreground">Loading validators from Trillium...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
                {error}
              </div>
            )}

            {!loading && !error && (
              <div className="space-y-8">
                {/* Search Slots */}
                <div className={`grid grid-cols-1 ${selected.length >= 2 ? 'md:grid-cols-2' : ''} gap-4`}>
                  {selected.map((slot, i) => (
                    <ValidatorSearch
                      key={slot.id}
                      validators={validators.filter(val => !selectedPubkeys.has(val.vote_account_pubkey) || val.vote_account_pubkey === slot.validator?.vote_account_pubkey)}
                      selected={slot.validator}
                      onSelect={(val) => handleSelect(slot.id, val)}
                      onRemove={selected.length > 1 ? () => handleSelect(slot.id, null) : undefined}
                      placeholder="Search by name or pubkey..."
                      label={`Validator ${i + 1}`}
                    />
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  {activeValidators.length > 0 && (
                    <ShareButton pubkeys={activeValidators.map(v => v.vote_account_pubkey)} names={activeValidators.map(v => v.name || 'Unknown')} />
                  )}
                  {!hasNetworkAvg && networkAvg && (
                    <button
                      onClick={addNetworkAverage}
                      aria-label="Compare to network average"
                      className="px-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      + Compare to Network Average
                    </button>
                  )}
                  {selected.length < MAX_VALIDATORS && selected.every(s => s.validator !== null) && (
                    <button
                      onClick={addSlot}
                      aria-label="Add another validator slot"
                      className="px-4 py-2.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      + Add another validator (up to {MAX_VALIDATORS})
                    </button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  {validators.length.toLocaleString()} validators loaded — 10-epoch weighted averages
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
