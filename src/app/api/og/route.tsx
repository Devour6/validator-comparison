import { ImageResponse } from 'next/og'
import { gradeValidator, buildAverageValidator, NETWORK_AVERAGE_PUBKEY, VALIDATOR_COLORS } from '@/lib/grading'
import type { ValidatorRaw } from '@/lib/types'

const TRILLIUM_URL = 'https://api.trillium.so/recency_weighted_average_validator_rewards'

const CATEGORIES = [
  { key: 'performance', label: 'Performance' },
  { key: 'rewards', label: 'APY & Rewards' },
  { key: 'stake', label: 'Stake Div.' },
  { key: 'commission', label: 'Commission' },
  { key: 'decentralization', label: 'Decentral.' },
  { key: 'reliability', label: 'Reliability' },
]

async function loadFont(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return res.arrayBuffer()
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const PUBKEY_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
  const pubkeys = searchParams.getAll('v').slice(0, 4)
    .filter(pk => pk === NETWORK_AVERAGE_PUBKEY || PUBKEY_RE.test(pk))

  const [audiowide, outfit] = await Promise.all([
    loadFont('https://fonts.gstatic.com/s/audiowide/v22/l7gdbjpo0cum0ckerWCtkQ.ttf'),
    loadFont('https://fonts.gstatic.com/s/outfit/v15/QGYyz_MVcBeNP4NjuGObqx1XmO1I4TC1C4E.ttf'),
  ])

  let allValidators: ValidatorRaw[] = []
  try {
    const res = await fetch(TRILLIUM_URL, { next: { revalidate: 300 } })
    if (res.ok) {
      allValidators = await res.json()
    }
  } catch (e) {
    console.error('OG route: Trillium fetch failed', e)
  }

  const networkAvg = allValidators.length > 0 ? buildAverageValidator(allValidators) : null
  const validators = pubkeys
    .map(pk => {
      if (pk === NETWORK_AVERAGE_PUBKEY) return networkAvg
      return allValidators.find(v => v.vote_account_pubkey === pk) || null
    })
    .filter((v): v is ValidatorRaw => v !== null)

  const grades = validators.map(v => gradeValidator(v, allValidators))
  const count = validators.length

  // Adaptive sizing for card-based layout
  const cardWidth = count === 1 ? 420 : count === 2 ? 360 : count === 3 ? 300 : 240
  const cardGap = count <= 2 ? 28 : count === 3 ? 22 : 16
  const circleSize = count <= 2 ? 96 : count === 3 ? 82 : 64
  const scoreFontSize = count <= 2 ? 36 : count === 3 ? 30 : 24
  const gradeLetterSize = count <= 2 ? 20 : count === 3 ? 18 : 15
  const nameFontSize = count <= 2 ? 16 : count === 3 ? 14 : 12
  const catLabelSize = count <= 2 ? 14 : count === 3 ? 13 : 11
  const catScoreSize = count <= 2 ? 15 : count === 3 ? 14 : 12
  const cardPadX = count <= 2 ? 32 : count === 3 ? 24 : 18
  const cardPadTop = count <= 2 ? 34 : count === 3 ? 28 : 20
  const cardPadBottom = count <= 2 ? 28 : count === 3 ? 22 : 16
  const catRowGap = count <= 2 ? 14 : count === 3 ? 12 : 8
  const sectionGap = count <= 2 ? 22 : count === 3 ? 18 : 14
  const nameMaxLen = count <= 2 ? 22 : count === 3 ? 18 : 14
  const dotSize = count <= 2 ? 7 : count === 3 ? 6 : 5

  const showGeneric = grades.length === 0

  const element = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: '#0F0E0C',
        backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(251, 146, 60, 0.035) 0%, rgba(15, 14, 12, 0) 100%)',
        fontFamily: 'Outfit',
        color: '#F3EED9',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '28px 48px 0',
        }}
      >
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
        <span
          style={{
            fontFamily: 'Audiowide',
            fontSize: 16,
            color: 'rgba(243, 238, 217, 0.45)',
          }}
        >
          Phase
        </span>
      </div>

      {showGeneric ? (
        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 20,
              padding: '44px 72px',
              borderRadius: 20,
              backgroundColor: 'rgba(243, 238, 217, 0.03)',
              border: '1px solid rgba(243, 238, 217, 0.07)',
            }}
          >
            <span style={{ fontFamily: 'Audiowide', fontSize: 44, color: '#F3EED9' }}>
              Phase
            </span>
            <span style={{ fontSize: 18, color: 'rgba(243, 238, 217, 0.5)' }}>
              Compare Solana validators side-by-side
            </span>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            gap: cardGap,
            padding: '16px 48px',
          }}
        >
          {grades.map((g, i) => {
            const name =
              g.validator.vote_account_pubkey === NETWORK_AVERAGE_PUBKEY
                ? 'Network Average'
                : g.validator.name || 'Unknown'
            const truncName = name.length > nameMaxLen ? name.slice(0, nameMaxLen - 2) + '...' : name
            const validatorColor = VALIDATOR_COLORS[i]
            const gradeColor = g.overall.color

            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: cardWidth,
                  backgroundColor: 'rgba(243, 238, 217, 0.025)',
                  border: '1px solid rgba(243, 238, 217, 0.06)',
                  borderRadius: 16,
                  overflow: 'hidden',
                  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.25)',
                }}
              >
                {/* Top accent bar */}
                <div
                  style={{
                    display: 'flex',
                    height: 4,
                    backgroundColor: validatorColor,
                    width: '100%',
                  }}
                />

                {/* Card content */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: `${cardPadTop}px ${cardPadX}px ${cardPadBottom}px`,
                  }}
                >
                  {/* Grade circle with filled background and glow */}
                  <div
                    style={{
                      width: circleSize,
                      height: circleSize,
                      borderRadius: '50%',
                      border: `2.5px solid ${gradeColor}`,
                      backgroundColor: `${gradeColor}1A`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 0 20px ${gradeColor}25`,
                    }}
                  >
                    <span
                      style={{
                        fontSize: scoreFontSize,
                        fontWeight: 700,
                        color: gradeColor,
                        lineHeight: 1,
                      }}
                    >
                      {g.overallScore.toFixed(1)}
                    </span>
                  </div>

                  {/* Grade letter */}
                  <span
                    style={{
                      fontSize: gradeLetterSize,
                      fontWeight: 600,
                      color: gradeColor,
                      marginTop: 10,
                    }}
                  >
                    {g.overall.label}
                  </span>

                  {/* Validator name */}
                  <span
                    style={{
                      fontFamily: 'Audiowide',
                      fontSize: nameFontSize,
                      color: validatorColor,
                      marginTop: count <= 2 ? 14 : 10,
                      textAlign: 'center',
                    }}
                  >
                    {truncName}
                  </span>

                  {/* Divider */}
                  <div
                    style={{
                      display: 'flex',
                      width: '100%',
                      height: 1,
                      backgroundColor: 'rgba(243, 238, 217, 0.08)',
                      marginTop: sectionGap,
                      marginBottom: sectionGap,
                    }}
                  />

                  {/* Category scores */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      width: '100%',
                      gap: catRowGap,
                    }}
                  >
                    {CATEGORIES.map(cat => {
                      const catData = g.categories[cat.key]
                      const score = catData?.score ?? 0
                      const catColor = catData?.grade?.color ?? '#F3EED9'
                      return (
                        <div
                          key={cat.key}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span
                            style={{
                              fontSize: catLabelSize,
                              color: 'rgba(243, 238, 217, 0.4)',
                            }}
                          >
                            {cat.label}
                          </span>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                width: dotSize,
                                height: dotSize,
                                borderRadius: '50%',
                                backgroundColor: catColor,
                              }}
                            />
                            <span
                              style={{
                                fontSize: catScoreSize,
                                fontWeight: 600,
                                color: catColor,
                              }}
                            >
                              {score.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 48px 24px',
        }}
      >
        <span style={{ fontSize: 13, color: 'rgba(243, 238, 217, 0.25)' }}>
          validator-comparison.vercel.app
        </span>
      </div>
    </div>
  )

  return new ImageResponse(element, {
    width: 1200,
    height: 630,
    fonts: [
      ...(audiowide ? [{ name: 'Audiowide', data: audiowide, weight: 400 as const, style: 'normal' as const }] : []),
      ...(outfit ? [{ name: 'Outfit', data: outfit, weight: 400 as const, style: 'normal' as const }] : []),
    ],
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
