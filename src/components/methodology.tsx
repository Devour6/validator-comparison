import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

const GRADE_SCALE = [
  { range: '9.0 - 10.0', label: 'S', color: '#22c55e', meaning: 'Exceptional —top-tier across the board' },
  { range: '8.0 - 8.9', label: 'A', color: '#4ade80', meaning: 'Excellent —well above average' },
  { range: '7.0 - 7.9', label: 'B+', color: '#a3e635', meaning: 'Very Good —above average in most areas' },
  { range: '6.0 - 6.9', label: 'B', color: '#facc15', meaning: 'Good —solid performance, some room to improve' },
  { range: '5.0 - 5.9', label: 'C', color: '#fb923c', meaning: 'Average —meets baseline expectations' },
  { range: '4.0 - 4.9', label: 'D', color: '#f87171', meaning: 'Below Average —notable weaknesses' },
  { range: '0.0 - 3.9', label: 'F', color: '#ef4444', meaning: 'Poor —significant issues across metrics' },
]

const CATEGORIES = [
  {
    name: 'Performance',
    weight: '25%',
    description: 'Measures how well a validator executes its core duties: producing blocks, voting on time, and processing transactions.',
    metrics: [
      { name: 'Skip Rate', scoring: 'Scored on a 2-10 scale. Under 1% = 10, under 2% = 9, under 3% = 8, under 5% = 7, under 8% = 6, under 12% = 5, under 18% = 4, under 25% = 3, above = 2. Lower skip rates mean fewer missed leader slots.' },
      { name: 'Tx Success Rate', scoring: 'Scored on a 4-10 scale based on overall transaction success percentage. 95%+ = 10, 90%+ = 9, down to below 60% = 4.' },
      { name: 'Epoch Credits', scoring: 'Scored based on vote credits earned per epoch. 450K+ = 10, 440K+ = 9, 430K+ = 8, down to below 350K = 3. Higher credits indicate consistent, timely voting.' },
      { name: 'Build Time Score', scoring: 'Scored on a 3-10 scale based on block build efficiency (0-100). 99.5+ = 10, 99+ = 9, 98+ = 8, 96+ = 7, 93+ = 6, 90+ = 5. Measures how efficiently the validator constructs blocks during leader slots.' },
      { name: 'User Tx Success', scoring: 'Shown for comparison. Non-vote transaction success rate —indicates how reliably user transactions land.' },
    ],
    formula: 'Category Score = (Skip Rate + Tx Success + Epoch Credits + Build Time) / 4',
  },
  {
    name: 'APY & Rewards',
    weight: '20%',
    description: 'Evaluates the returns a delegator can expect. Uses percentile-based scoring —validators are ranked against all other validators, so even small APY differences produce meaningful grade separation.',
    metrics: [
      { name: 'Delegator APY', scoring: 'Primary metric. Scored by percentile rank among all validators (3-10 scale). A validator at the 90th percentile scores ~9.3 (S), 70th percentile ~7.9 (B+), 50th percentile ~6.5 (B). This ensures realistic grade spread even when APYs cluster tightly.' },
      { name: 'Overall APY', scoring: 'Shown for comparison. The full compound APY before validator/delegator split.' },
      { name: 'MEV APY', scoring: 'Shown for comparison. Delegator APY from Jito MEV tips.' },
      { name: 'Block Rewards APY', scoring: 'Shown for comparison. Delegator APY from priority fee block rewards.' },
      { name: 'Inflation APY', scoring: 'Shown for comparison. Delegator APY from Solana\'s inflation schedule.' },
    ],
    formula: 'Category Score = Delegator APY Percentile Score (3-10 range)',
  },
  {
    name: 'Trust',
    weight: '10%',
    description: 'Measures institutional trust through stake pool diversity, scored by percentile rank. Raw stake amount is intentionally excluded —high stake does not indicate a quality validator. What matters is how many independent stake pools have chosen to delegate.',
    metrics: [
      { name: 'Stake Pool Diversity', scoring: 'Scored by percentile rank among all validators (3-10 scale, rounded to 0.5). A validator trusted by more pools ranks higher. This ensures realistic grade spread —most validators cluster in the middle rather than all scoring 10.' },
      { name: 'Pool Stake / Native Stake / Activated Stake', scoring: 'Shown for context only —not factored into the grade.' },
    ],
    formula: 'Category Score = Pool Diversity Percentile Score (3-10 range)',
  },
  {
    name: 'Commission',
    weight: '15%',
    description: 'Evaluates how much the validator charges delegators. Lower commission means more rewards pass through to stakers.',
    metrics: [
      { name: 'Commission', scoring: 'Scored on a 3-10 scale. 0% = 10, up to 3% = 9, up to 5% = 8, up to 7% = 7, up to 10% = 6, up to 15% = 5, up to 20% = 4, above = 3. This is the validator\'s commission rate on all rewards.' },
    ],
    formula: 'Category Score = Commission Score',
  },
  {
    name: 'Decentralization',
    weight: '10%',
    description: 'Measures how much a validator contributes to network decentralization through software diversity, program participation, and geographic distribution.',
    metrics: [
      { name: 'Minority Client', scoring: 'Running a minority client (Firedancer, Jito_BAM, Sig, Frankendancer, etc.) adds +2 to the base score. Standard Agave and Jito-Solana are majority clients.' },
      { name: 'SFDP Membership', scoring: 'Solana Foundation Delegation Program participation adds +1. Indicates alignment with foundation decentralization goals.' },
      { name: 'Superminority', scoring: 'Being in the superminority (top ~20 validators by stake) applies a -2 penalty. These validators already concentrate too much power.' },
      { name: 'Geographic Diversity', scoring: 'Based on continent. Europe and North America (where most Solana stake lives) get -1. Asia gets 0. South America, Africa, and Oceania get +1 for being in underserved regions.' },
    ],
    formula: 'Category Score = Base (5) + Client Bonus + SFDP + Superminority Penalty + Geography (clamped 0-10)',
  },
  {
    name: 'Reliability',
    weight: '20%',
    description: 'Measures validator consistency and operational quality using on-chain metrics.',
    metrics: [
      { name: 'IBRL Score', scoring: 'Inclusivity/Build Reliability score from Trillium (0-100). Divided by 10 for the 0-10 grading scale. Measures how reliably a validator includes transactions in blocks.' },
      { name: 'Vote Packing', scoring: 'Scored on a 3-10 scale based on vote packing efficiency (0-100). 98+ = 10, 97+ = 9, 96+ = 8, 94+ = 7, 92+ = 6, 90+ = 5. Higher scores mean the validator packs votes more efficiently, reducing overhead.' },
      { name: 'Skip Rate', scoring: 'Same scoring as Performance category. Consistent block production is a reliability signal.' },
      { name: 'Epoch Credits', scoring: 'Same scoring as Performance category. Consistent voting indicates reliable operations.' },
      { name: 'Vote Latency / JIP-25 Rank', scoring: 'Shown for comparison. Additional reliability indicators.' },
    ],
    formula: 'Category Score = (IBRL Score + Vote Packing + Skip Rate + Epoch Credits) / 4',
  },
]

export function Methodology() {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="font-display text-lg">How Grades Are Calculated</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            Each validator is graded independently on a 0-10 scale across six categories. The overall
            score is a weighted average of all category scores. Grades are calculated using 10-epoch
            recency-weighted averages from the Trillium API, which gives more weight to recent
            performance.
          </p>
          <div>
            <p className="font-semibold mb-2">Overall Score Formula:</p>
            <div className="bg-background rounded-lg p-3 font-mono text-xs leading-relaxed border border-border">
              Overall = Performance (25%) + APY & Rewards (20%) + Reliability (20%)<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ Commission (15%) + Trust (10%) + Decentralization (10%)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grade Scale */}
      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="font-display text-base">Grade Scale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="grid grid-cols-[60px_80px_1fr] gap-2 text-xs text-muted-foreground pb-2">
              <span>Score</span>
              <span>Grade</span>
              <span>Meaning</span>
            </div>
            <Separator />
            {GRADE_SCALE.map(g => (
              <div key={g.label}>
                <div className="grid grid-cols-[60px_80px_1fr] gap-2 py-2 items-center">
                  <span className="text-sm font-mono tabular-nums">{g.range}</span>
                  <span className="text-sm font-bold" style={{ color: g.color }}>{g.label}</span>
                  <span className="text-sm text-muted-foreground">{g.meaning}</span>
                </div>
                <Separator />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Details */}
      {CATEGORIES.map(cat => (
        <Card key={cat.name} className="border-border bg-surface">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-base">{cat.name}</CardTitle>
              <span className="text-sm font-semibold text-muted-foreground">{cat.weight} weight</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">{cat.description}</p>

            <div className="space-y-3">
              {cat.metrics.map(m => (
                <div key={m.name} className="space-y-1">
                  <p className="font-medium">{m.name}</p>
                  <p className="text-muted-foreground text-xs">{m.scoring}</p>
                </div>
              ))}
            </div>

            <div className="bg-background rounded-lg p-3 font-mono text-xs border border-border">
              {cat.formula}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Data Source */}
      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="font-display text-base">Data Source</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            All data comes from the <span className="font-semibold">Trillium API</span> —specifically
            the recency-weighted 10-epoch average endpoint. This weights recent epochs more heavily,
            so a validator&apos;s current performance matters more than older data.
          </p>
          <p className="text-muted-foreground">
            The Trillium API is open, requires no authentication, and updates every epoch (~2.5 days).
            Data refreshes in this tool every 5 minutes.
          </p>
          <p className="text-muted-foreground">
            When comparing validators, the best value in each metric row is highlighted in green.
            For metrics marked &quot;lower is better&quot; (like skip rate or commission), the lowest value wins.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
