'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ComparisonView } from '@/components/comparison-view'
import { ShareButton } from '@/components/share-button'
import { buildAverageValidator, NETWORK_AVERAGE_PUBKEY } from '@/lib/grading'
import type { ValidatorRaw } from '@/lib/types'

interface Props {
  initialPubkeys: string[]
}

export function ComparePageClient({ initialPubkeys }: Props) {
  const [allValidators, setAllValidators] = useState<ValidatorRaw[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/validators')
        if (!res.ok) throw new Error('Failed to fetch validators')
        const data: ValidatorRaw[] = await res.json()
        setAllValidators(data)
      } catch (err) {
        setError(String(err))
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const networkAvg = useMemo(
    () => allValidators.length > 0 ? buildAverageValidator(allValidators) : null,
    [allValidators]
  )

  const resolvedValidators = useMemo(() => {
    if (allValidators.length === 0) return []
    return initialPubkeys
      .map(pk => {
        if (pk === NETWORK_AVERAGE_PUBKEY) return networkAvg
        return allValidators.find(v => v.vote_account_pubkey === pk) || null
      })
      .filter((v): v is ValidatorRaw => v !== null)
  }, [allValidators, initialPubkeys, networkAvg])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="Phase" width={40} height={40} className="rounded-lg" />
              <div>
                <h1 className="font-display text-2xl md:text-3xl text-foreground">
                  Validator Comparison
                </h1>
                <p className="text-muted-foreground mt-0.5">
                  Compare Solana validators side-by-side
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg border border-border hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              New Comparison
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="space-y-3 text-center">
              <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground">Loading validators...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && resolvedValidators.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Comparing {resolvedValidators.length} validator{resolvedValidators.length > 1 ? 's' : ''} — 10-epoch weighted averages
              </p>
              <ShareButton pubkeys={initialPubkeys} names={resolvedValidators.map(v => v.name || 'Unknown')} />
            </div>
            <ComparisonView
              validators={resolvedValidators}
              allValidators={allValidators}
            />
          </div>
        )}

        {!loading && !error && resolvedValidators.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <p className="text-xl font-display text-muted-foreground">
              No validators found for this comparison
            </p>
            <Link
              href="/"
              className="inline-block text-sm text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded"
            >
              Start a new comparison
            </Link>
          </div>
        )}
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
