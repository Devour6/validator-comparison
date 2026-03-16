import { ImageResponse } from 'next/og'
import { gradeValidator, buildAverageValidator, NETWORK_AVERAGE_PUBKEY, VALIDATOR_COLORS } from '@/lib/grading'
import type { ValidatorRaw } from '@/lib/types'

export const runtime = 'edge'

const TRILLIUM_URL = 'https://api.trillium.so/recency_weighted_average_validator_rewards'

const CATEGORIES = [
  { key: 'performance', label: 'Performance' },
  { key: 'rewards', label: 'APY & Rewards' },
  { key: 'reliability', label: 'Reliability' },
  { key: 'commission', label: 'Commission' },
  { key: 'decentralization', label: 'Decentralization' },
  { key: 'stake', label: 'Stake & Trust' },
]

// Cache font fetches at module scope
const audiowideFont = fetch(
  'https://fonts.gstatic.com/s/audiowide/v20/l7gdbjpo0cum0ckerWCtkQXPExpQnw.woff2'
).then(res => res.arrayBuffer())

const outfitFont = fetch(
  'https://fonts.gstatic.com/s/outfit/v11/QGYyz_MVcBeNP4NjuGObqx1XmO1I4TC1O4a0Ew.woff2'
).then(res => res.arrayBuffer())

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const pubkeys = searchParams.getAll('v').slice(0, 4)

  // Fetch fonts and logo in parallel
  const [audiowide, outfit] = await Promise.all([audiowideFont, outfitFont])

  // Fetch logo
  let logoSrc = ''
  try {
    const logoRes = await fetch(new URL('/logo.png', request.url))
    const logoData = await logoRes.arrayBuffer()
    logoSrc = `data:image/png;base64,${Buffer.from(logoData).toString('base64')}`
  } catch { /* use text fallback */ }

  // Fetch all validators
  let allValidators: ValidatorRaw[] = []
  try {
    const res = await fetch(TRILLIUM_URL, { next: { revalidate: 300 } })
    if (res.ok) allValidators = await res.json()
  } catch { /* empty array fallback */ }

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
  const circleSize = count <= 2 ? 72 : count === 3 ? 64 : 56
  const circleFontSize = count <= 2 ? 22 : count === 3 ? 18 : 16
  const circleGap = count <= 2 ? 48 : count === 3 ? 32 : 24
  const labelWidth = count <= 2 ? 130 : count === 3 ? 115 : 100
  const barGap = count <= 2 ? 6 : 4

  // If no valid validators, show generic card
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
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '24px 40px 16px',
        }}
      >
        {logoSrc ? (
          <img src={logoSrc} width={36} height={36} style={{ borderRadius: 8 }} />
        ) : null}
        <span
          style={{
            fontFamily: 'Audiowide',
            fontSize: 22,
            color: '#F3EED9',
            letterSpacing: '0.02em',
          }}
        >
          Validator Comparison
        </span>
      </div>

      {showGeneric ? (
        /* Generic fallback card */
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
          <span
            style={{
              fontFamily: 'Audiowide',
              fontSize: 32,
              color: '#F3EED9',
            }}
          >
            Phase
          </span>
          <span style={{ fontSize: 16, color: 'rgba(243,238,217,0.5)' }}>
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
              padding: '12px 40px 20px',
            }}
          >
            {grades.map((g, i) => {
              const name =
                g.validator.vote_account_pubkey === NETWORK_AVERAGE_PUBKEY
                  ? 'Network Average'
                  : g.validator.name || 'Unknown'
              const truncName = name.length > 18 ? name.slice(0, 16) + '...' : name
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
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
                      flexDirection: 'column',
                      gap: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: circleFontSize,
                        fontWeight: 700,
                        color: g.overall.color,
                        lineHeight: 1.1,
                      }}
                    >
                      {g.overallScore.toFixed(1)}
                    </span>
                  </div>
                  {/* Grade letter */}
                  <span
                    style={{
                      fontSize: 14,
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
                      fontSize: 12,
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
              margin: '0 40px',
              height: 1,
              backgroundColor: 'rgba(243,238,217,0.1)',
            }}
          />

          {/* Category Bars */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              padding: '20px 40px',
              flex: 1,
            }}
          >
            {CATEGORIES.map(cat => (
              <div
                key={cat.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                {/* Category label */}
                <span
                  style={{
                    width: labelWidth,
                    fontSize: 12,
                    color: 'rgba(243,238,217,0.5)',
                    flexShrink: 0,
                  }}
                >
                  {cat.label}
                </span>
                {/* Bars for each validator */}
                <div style={{ display: 'flex', flex: 1, gap: barGap }}>
                  {grades.map((g, i) => {
                    const catData = g.categories[cat.key]
                    const score = catData?.score ?? 0
                    const pct = Math.max(0, Math.min(100, (score / 10) * 100))
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
                        {/* Score label */}
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
                        {/* Bar */}
                        <div
                          style={{
                            display: 'flex',
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: 'rgba(243,238,217,0.06)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              borderRadius: 4,
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
          padding: '12px 40px 20px',
          borderTop: '1px solid rgba(243,238,217,0.08)',
          fontSize: 11,
          color: 'rgba(243,238,217,0.35)',
        }}
      >
        <span>validator-comparison.vercel.app</span>
        <span>Phase</span>
      </div>
    </div>
  )

  return new ImageResponse(element, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Audiowide', data: audiowide, weight: 400, style: 'normal' as const },
      { name: 'Outfit', data: outfit, weight: 400, style: 'normal' as const },
    ],
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
