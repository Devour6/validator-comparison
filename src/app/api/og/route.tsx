import { ImageResponse } from 'next/og'
import { gradeValidator, buildAverageValidator, NETWORK_AVERAGE_PUBKEY, VALIDATOR_COLORS } from '@/lib/grading'
import type { ValidatorRaw } from '@/lib/types'

const TRILLIUM_URL = 'https://api.trillium.so/recency_weighted_average_validator_rewards'

const CATEGORIES = [
  { key: 'performance', label: 'Performance' },
  { key: 'rewards', label: 'APY & Rewards' },
  { key: 'reliability', label: 'Reliability' },
  { key: 'commission', label: 'Commission' },
  { key: 'decentralization', label: 'Decentralization' },
  { key: 'stake', label: 'Trust' },
]

async function loadFont(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url)
  return res.arrayBuffer()
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const pubkeys = searchParams.getAll('v').slice(0, 4)

  // Fetch fonts in parallel
  const [audiowide, outfit] = await Promise.all([
    loadFont('https://fonts.gstatic.com/s/audiowide/v22/l7gdbjpo0cum0ckerWCtkQ.ttf'),
    loadFont('https://fonts.gstatic.com/s/outfit/v15/QGYyz_MVcBeNP4NjuGObqx1XmO1I4TC1C4E.ttf'),
  ])

  // Fetch all validators from Trillium
  let allValidators: ValidatorRaw[] = []
  try {
    const res = await fetch(TRILLIUM_URL)
    if (res.ok) {
      allValidators = await res.json()
    }
  } catch (e) {
    console.error('OG route: Trillium fetch failed', e)
  }

  // Resolve pubkeys to validators
  const networkAvg = allValidators.length > 0 ? buildAverageValidator(allValidators) : null
  const validators = pubkeys
    .map(pk => {
      if (pk === NETWORK_AVERAGE_PUBKEY) return networkAvg
      return allValidators.find(v => v.vote_account_pubkey === pk) || null
    })
    .filter((v): v is ValidatorRaw => v !== null)

  // Grade each validator
  const grades = validators.map(v => gradeValidator(v, allValidators))

  // Adaptive sizing
  const count = validators.length
  const circleSize = count <= 2 ? 80 : count === 3 ? 68 : 58
  const circleFontSize = count <= 2 ? 26 : count === 3 ? 22 : 18
  const circleGap = count <= 2 ? 60 : count === 3 ? 40 : 28
  const labelWidth = count <= 2 ? 130 : count === 3 ? 120 : 105
  const barGap = count <= 2 ? 8 : 6

  const showGeneric = grades.length === 0

  const element = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: '#0F0E0C',
        fontFamily: 'Outfit',
        color: '#F3EED9',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '28px 48px 0',
          gap: 14,
        }}
      >
        {/* Phase text logo since image loading is unreliable */}
        <div
          style={{
            display: 'flex',
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: 'rgba(243,238,217,0.08)',
            border: '1px solid rgba(243,238,217,0.15)',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Audiowide',
            fontSize: 18,
            color: '#F3EED9',
          }}
        >
          P
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontFamily: 'Audiowide',
              fontSize: 24,
              color: '#F3EED9',
              letterSpacing: '0.02em',
            }}
          >
            Validator Comparison
          </span>
          <span style={{ fontSize: 12, color: 'rgba(243,238,217,0.4)' }}>
            by Phase
          </span>
        </div>
      </div>

      {showGeneric ? (
        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <span style={{ fontFamily: 'Audiowide', fontSize: 36, color: '#F3EED9' }}>
            Phase
          </span>
          <span style={{ fontSize: 18, color: 'rgba(243,238,217,0.5)' }}>
            Compare Solana validators side-by-side
          </span>
        </div>
      ) : (
        <>
          {/* Overall Grades Row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: circleGap,
              padding: '28px 48px 24px',
            }}
          >
            {grades.map((g, i) => {
              const name =
                g.validator.vote_account_pubkey === NETWORK_AVERAGE_PUBKEY
                  ? 'Network Average'
                  : g.validator.name || 'Unknown'
              const truncName = name.length > 20 ? name.slice(0, 18) + '...' : name
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {/* Grade circle */}
                  <div
                    style={{
                      width: circleSize,
                      height: circleSize,
                      borderRadius: '50%',
                      border: `3px solid ${g.overall.color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: circleFontSize,
                        fontWeight: 700,
                        color: g.overall.color,
                      }}
                    >
                      {g.overallScore.toFixed(1)}
                    </span>
                  </div>
                  {/* Grade letter */}
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: g.overall.color,
                    }}
                  >
                    {g.overall.label}
                  </span>
                  {/* Validator name */}
                  <span
                    style={{
                      fontFamily: 'Audiowide',
                      fontSize: 13,
                      color: VALIDATOR_COLORS[i],
                    }}
                  >
                    {truncName}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              margin: '0 48px',
              height: 1,
              backgroundColor: 'rgba(243,238,217,0.1)',
            }}
          />

          {/* Category Bars */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              padding: '20px 48px',
              flex: 1,
            }}
          >
            {CATEGORIES.map(cat => (
              <div
                key={cat.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                {/* Category label */}
                <span
                  style={{
                    width: labelWidth,
                    fontSize: 13,
                    color: 'rgba(243,238,217,0.5)',
                    flexShrink: 0,
                  }}
                >
                  {cat.label}
                </span>
                {/* Bars */}
                <div style={{ display: 'flex', flex: 1, gap: barGap }}>
                  {grades.map((g, i) => {
                    const catData = g.categories[cat.key]
                    const score = catData?.score ?? 0
                    const pct = Math.max(2, Math.min(100, (score / 10) * 100))
                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          flex: 1,
                          gap: 3,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <span
                            style={{
                              fontSize: 11,
                              color: VALIDATOR_COLORS[i],
                              fontWeight: 600,
                            }}
                          >
                            {score.toFixed(1)}
                          </span>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: 'rgba(243,238,217,0.06)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              borderRadius: 5,
                              backgroundColor: VALIDATOR_COLORS[i],
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 48px 22px',
          borderTop: '1px solid rgba(243,238,217,0.08)',
        }}
      >
        <span style={{ fontSize: 12, color: 'rgba(243,238,217,0.35)' }}>
          validator-comparison.vercel.app
        </span>
        <span style={{ fontFamily: 'Audiowide', fontSize: 14, color: 'rgba(243,238,217,0.4)' }}>
          Phase
        </span>
      </div>
    </div>
  )

  return new ImageResponse(element, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Audiowide', data: audiowide, weight: 400 as const, style: 'normal' as const },
      { name: 'Outfit', data: outfit, weight: 400 as const, style: 'normal' as const },
    ],
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
