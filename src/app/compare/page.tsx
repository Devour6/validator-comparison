import type { Metadata } from 'next'
import { ComparePageClient } from './client'

const TRILLIUM_URL = 'https://api.trillium.so/recency_weighted_average_validator_rewards'

interface Props {
  searchParams: Promise<{ v?: string | string[] }>
}

async function resolveNames(pubkeys: string[]): Promise<string[]> {
  try {
    const res = await fetch(TRILLIUM_URL, { next: { revalidate: 300 } })
    if (!res.ok) return pubkeys.map(pk => pk.slice(0, 8) + '...')
    const data = await res.json()
    return pubkeys.map(pk => {
      if (pk === 'network-average-validator') return 'Network Average'
      const v = data.find((d: { vote_account_pubkey: string; name?: string }) => d.vote_account_pubkey === pk)
      return v?.name || pk.slice(0, 8) + '...'
    })
  } catch {
    return pubkeys.map(pk => pk.slice(0, 8) + '...')
  }
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams
  const pubkeys = Array.isArray(params.v) ? params.v : params.v ? [params.v] : []

  const ogParams = new URLSearchParams()
  pubkeys.forEach(pk => ogParams.append('v', pk))
  const ogUrl = `/api/og?${ogParams.toString()}`

  let title = 'Validator Comparison | Phase'
  if (pubkeys.length > 0) {
    const names = await resolveNames(pubkeys)
    title = names.join(' vs ') + ' | Phase'
  }

  return {
    title,
    description: 'Compare Solana validators side-by-side -- performance, APY, decentralization, and more.',
    openGraph: {
      title,
      description: 'Compare Solana validators side-by-side with Phase.',
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: 'Compare Solana validators side-by-side with Phase.',
      images: [ogUrl],
    },
  }
}

export default async function ComparePage({ searchParams }: Props) {
  const params = await searchParams
  const pubkeys = Array.isArray(params.v) ? params.v : params.v ? [params.v] : []
  return <ComparePageClient initialPubkeys={pubkeys} />
}
