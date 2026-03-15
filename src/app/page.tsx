'use client'

import { useState, useEffect } from 'react'
import { ValidatorSearch } from '@/components/validator-search'
import { ComparisonView } from '@/components/comparison-view'
import type { ValidatorRaw } from '@/lib/types'

export default function Home() {
  const [validators, setValidators] = useState<ValidatorRaw[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [validatorA, setValidatorA] = useState<ValidatorRaw | null>(null)
  const [validatorB, setValidatorB] = useState<ValidatorRaw | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/validators')
        if (!res.ok) throw new Error('Failed to fetch validators')
        const data: ValidatorRaw[] = await res.json()
        // Sort by name for easier searching
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

  return (
    <div className="min-h-screen bg-[#0F0E0C]">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <h1 className="font-display text-2xl md:text-3xl text-[#F3EED9]">
            Validator Comparison
          </h1>
          <p className="text-muted-foreground mt-1">
            Compare Solana validators head-to-head — performance, APY, decentralization, and more.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
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
            {/* Search Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ValidatorSearch
                validators={validators}
                selected={validatorA}
                onSelect={setValidatorA}
                placeholder="Search by name or pubkey..."
                label="Validator A"
              />
              <ValidatorSearch
                validators={validators}
                selected={validatorB}
                onSelect={setValidatorB}
                placeholder="Search by name or pubkey..."
                label="Validator B"
              />
            </div>

            {/* Validator Count */}
            <p className="text-xs text-muted-foreground">
              {validators.length.toLocaleString()} validators loaded — 10-epoch weighted averages
            </p>

            {/* Comparison */}
            {validatorA && validatorB ? (
              <ComparisonView
                validatorA={validatorA}
                validatorB={validatorB}
                allValidators={validators}
              />
            ) : (
              <div className="text-center py-16 space-y-3">
                <p className="text-xl font-display text-muted-foreground">
                  Select two validators to compare
                </p>
                <p className="text-sm text-muted-foreground/60">
                  Search by validator name or vote account pubkey
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Phase Validator Tools</span>
          <span>Data: Trillium API</span>
        </div>
      </footer>
    </div>
  )
}
