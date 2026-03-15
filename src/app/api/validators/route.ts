import { NextResponse } from 'next/server'

const TRILLIUM_URL = 'https://api.trillium.so/recency_weighted_average_validator_rewards'

export async function GET() {
  try {
    const res = await fetch(TRILLIUM_URL, {
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      throw new Error(`Trillium API returned ${res.status}`)
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch validator data', detail: String(error) },
      { status: 500 }
    )
  }
}
