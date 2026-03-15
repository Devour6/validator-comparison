import type { ValidatorRaw, Grade, ValidatorGrades, MetricRow, CategoryData } from './types'

function toGrade(score: number): Grade {
  const s = Math.max(0, Math.min(10, score))
  if (s >= 9) return { score: s, label: 'S', color: '#22c55e' }
  if (s >= 8) return { score: s, label: 'A', color: '#4ade80' }
  if (s >= 7) return { score: s, label: 'B+', color: '#a3e635' }
  if (s >= 6) return { score: s, label: 'B', color: '#facc15' }
  if (s >= 5) return { score: s, label: 'C', color: '#fb923c' }
  if (s >= 4) return { score: s, label: 'D', color: '#f87171' }
  return { score: s, label: 'F', color: '#ef4444' }
}

function num(v: number | undefined | null, fallback = 0): number {
  return v != null && isFinite(v) ? v : fallback
}

function pct(v: number): string {
  return v.toFixed(2) + '%'
}

function fmtSol(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M SOL'
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K SOL'
  return v.toFixed(0) + ' SOL'
}

function fmtNum(v: number, decimals = 2): string {
  return v.toFixed(decimals)
}

function fmtApy(v: number): string {
  return v.toFixed(2) + '%'
}

function bestIndex(values: number[], lowerBetter: boolean): number | null {
  if (values.length <= 1) return null
  let bestIdx = 0
  let allSame = true
  for (let i = 1; i < values.length; i++) {
    if (Math.abs(values[i] - values[0]) > 0.0001) allSame = false
    if (lowerBetter ? values[i] < values[bestIdx] : values[i] > values[bestIdx]) {
      bestIdx = i
    }
  }
  return allSame ? null : bestIdx
}

function scoreSkipRate(skipRate: number): number {
  if (skipRate <= 1) return 10
  if (skipRate <= 2) return 9
  if (skipRate <= 3) return 8
  if (skipRate <= 5) return 7
  if (skipRate <= 8) return 6
  if (skipRate <= 12) return 5
  if (skipRate <= 18) return 4
  if (skipRate <= 25) return 3
  return 2
}

function scoreApy(apy: number, allValidators: ValidatorRaw[]): number {
  // Percentile-based scoring -- spreads validators across the full grade range
  // based on where they rank against all other validators
  const apys = allValidators
    .map(v => num(v.average_delegator_compound_total_apy))
    .filter(a => a > 0)
    .sort((a, b) => a - b)
  if (apys.length === 0) return 5
  const idx = apys.findIndex(a => a >= apy)
  const percentile = (idx >= 0 ? idx : apys.length) / apys.length
  // Scale from 3 to 10 based on percentile position
  return Math.round((3 + percentile * 7) * 10) / 10
}

function scoreCommission(commission: number): number {
  if (commission <= 0) return 10
  if (commission <= 3) return 9
  if (commission <= 5) return 8
  if (commission <= 7) return 7
  if (commission <= 10) return 6
  if (commission <= 15) return 5
  if (commission <= 20) return 4
  return 3
}

function scoreTxSuccess(rate: number): number {
  if (rate >= 95) return 10
  if (rate >= 90) return 9
  if (rate >= 85) return 8
  if (rate >= 80) return 7
  if (rate >= 70) return 6
  if (rate >= 60) return 5
  return 4
}

function scoreStake(stake: number, allValidators: ValidatorRaw[]): number {
  const sorted = allValidators.map(v => num(v.average_activated_stake)).sort((a, b) => a - b)
  const idx = sorted.findIndex(s => s >= stake)
  const percentile = (idx >= 0 ? idx : sorted.length) / sorted.length
  return Math.min(10, 3 + percentile * 7)
}

function scoreStakePoolDiversity(pools: Record<string, number> | undefined): number {
  if (!pools) return 3
  const entries = Object.entries(pools).filter(([, v]) => v > 0)
  if (entries.length >= 5) return 10
  if (entries.length >= 4) return 9
  if (entries.length >= 3) return 8
  if (entries.length >= 2) return 7
  if (entries.length >= 1) return 5
  return 3
}

function scoreEpochCredits(credits: number): number {
  if (credits >= 450000) return 10
  if (credits >= 440000) return 9
  if (credits >= 430000) return 8
  if (credits >= 420000) return 7
  if (credits >= 400000) return 6
  if (credits >= 380000) return 5
  if (credits >= 350000) return 4
  return 3
}

function getClientName(clientType: number | undefined): string {
  if (clientType == null) return 'Unknown'
  const types: Record<number, string> = {
    0: 'Agave', 1: 'Jito', 2: 'Frankendancer', 3: 'Firedancer',
    4: 'Paladin', 5: 'Anza SVM', 6: 'Sig', 7: 'Mithril',
    8: 'Solang', 9: 'RPC Node', 10: 'Pyth', 11: 'Unknown',
  }
  return types[clientType] || `Type ${clientType}`
}

function scoreDecentralization(v: ValidatorRaw, allValidators: ValidatorRaw[]): number {
  let score = 5
  const ct = num(v.client_type)
  if (ct >= 2 && ct <= 8) score += 2
  if (v.is_sfdp) score += 1
  if (v.superminority) score -= 2
  const cityCount: Record<string, number> = {}
  for (const val of allValidators) {
    const key = (val.city || '') + ',' + (val.country || '')
    cityCount[key] = (cityCount[key] || 0) + 1
  }
  const myCity = (v.city || '') + ',' + (v.country || '')
  const myCityCount = cityCount[myCity] || 0
  if (myCityCount <= 5) score += 2
  else if (myCityCount <= 20) score += 1
  else if (myCityCount > 100) score -= 1
  return Math.max(0, Math.min(10, score))
}

export function gradeValidator(v: ValidatorRaw, allValidators: ValidatorRaw[]): ValidatorGrades {
  const skip = num(v.avg_skip_rate)
  const credits = num(v.average_epoch_credits)
  const txSuccess = num(v.average_avg_tx_success_rate)
  const perfScore = (scoreSkipRate(skip) + scoreTxSuccess(txSuccess) + scoreEpochCredits(credits)) / 3

  const delegatorApy = num(v.average_delegator_compound_total_apy)
  const rewardsScore = scoreApy(delegatorApy, allValidators)

  // Trust scored purely on pool diversity -- raw stake amount doesn't indicate quality
  const stakeScore = scoreStakePoolDiversity(v.stake_pools)

  const comm = num(v.average_commission)
  const commScore = scoreCommission(comm)

  const decentScore = scoreDecentralization(v, allValidators)

  const ibrl = num(v.average_ibrl_score)
  const reliScore = (Math.min(10, ibrl / 10) + scoreSkipRate(skip) + scoreEpochCredits(credits)) / 3

  const weights = { performance: 0.25, rewards: 0.25, stake: 0.1, commission: 0.15, decentralization: 0.1, reliability: 0.15 }
  const overallScore = perfScore * weights.performance + rewardsScore * weights.rewards +
    stakeScore * weights.stake + commScore * weights.commission +
    decentScore * weights.decentralization + reliScore * weights.reliability

  return {
    validator: v,
    overall: toGrade(overallScore),
    overallScore,
    categories: {
      performance: { grade: toGrade(perfScore), score: perfScore },
      rewards: { grade: toGrade(rewardsScore), score: rewardsScore },
      stake: { grade: toGrade(stakeScore), score: stakeScore },
      commission: { grade: toGrade(commScore), score: commScore },
      decentralization: { grade: toGrade(decentScore), score: decentScore },
      reliability: { grade: toGrade(reliScore), score: reliScore },
    },
  }
}

export function buildCategoryData(
  validators: ValidatorRaw[],
  allValidators: ValidatorRaw[]
): CategoryData[] {
  const grades = validators.map(v => gradeValidator(v, allValidators))

  function row(label: string, getter: (v: ValidatorRaw) => number, formatter: (n: number) => string, lowerBetter: boolean, description: string): MetricRow {
    const values = validators.map(v => ({ formatted: formatter(getter(v)), raw: getter(v) }))
    return { label, values, bestIdx: bestIndex(values.map(x => x.raw), lowerBetter), lowerBetter, description }
  }

  function textRow(label: string, getter: (v: ValidatorRaw) => string, description: string): MetricRow {
    const values = validators.map(v => ({ formatted: getter(v), raw: 0 }))
    return { label, values, bestIdx: null, lowerBetter: false, description }
  }

  return [
    {
      key: 'performance',
      label: 'Performance',
      grades: grades.map(g => g.categories.performance),
      metrics: [
        row('Skip Rate', v => num(v.avg_skip_rate), pct, true, 'Lower is better -- % of leader slots missed'),
        row('Epoch Credits', v => num(v.average_epoch_credits), v => fmtNum(v, 0), false, 'Higher is better -- vote credits earned per epoch'),
        row('Tx Success Rate', v => num(v.average_avg_tx_success_rate), pct, false, 'Higher is better -- overall transaction success rate'),
        row('User Tx Success', v => num(v.average_avg_user_tx_success_rate), pct, false, 'Higher is better -- non-vote transaction success rate'),
        row('Build Time Score', v => num(v.average_build_time_score), v => fmtNum(v, 1), false, 'Higher is better -- block build efficiency score'),
      ],
    },
    {
      key: 'rewards',
      label: 'APY & Rewards',
      grades: grades.map(g => g.categories.rewards),
      metrics: [
        row('Overall APY', v => num(v.average_compound_overall_apy), fmtApy, false, 'Compound overall APY including all sources'),
        row('Delegator APY', v => num(v.average_delegator_compound_total_apy), fmtApy, false, 'Total compound APY earned by delegators'),
        row('MEV APY', v => num(v.average_delegator_compound_mev_apy), fmtApy, false, 'Delegator APY from MEV (Jito tips)'),
        row('Block Rewards APY', v => num(v.average_delegator_compound_block_rewards_apy), fmtApy, false, 'Delegator APY from block rewards'),
        row('Inflation APY', v => num(v.average_delegator_compound_inflation_apy), fmtApy, false, 'Delegator APY from Solana inflation'),
      ],
    },
    {
      key: 'stake',
      label: 'Stake & Trust',
      grades: grades.map(g => g.categories.stake),
      metrics: [
        row('Activated Stake', v => num(v.average_activated_stake), fmtSol, false, 'Total active stake delegated to validator'),
        row('Pool Stake', v => num(v.total_from_stake_pools), fmtSol, false, 'Stake from pools (Jito, Marinade, etc.)'),
        row('Native Stake', v => num(v.total_not_from_stake_pools), fmtSol, false, 'Direct delegator stake (non-pool)'),
        row('Stake Pools', v => v.stake_pools ? Object.values(v.stake_pools).filter(x => x > 0).length : 0, v => fmtNum(v, 0), false, 'Number of pools delegating to this validator'),
      ],
    },
    {
      key: 'commission',
      label: 'Commission',
      grades: grades.map(g => g.categories.commission),
      metrics: [
        row('Commission', v => num(v.average_commission), pct, true, 'Lower is better -- validator commission on rewards'),
      ],
    },
    {
      key: 'decentralization',
      label: 'Decentralization',
      grades: grades.map(g => g.categories.decentralization),
      metrics: [
        textRow('Client', v => getClientName(v.client_type), 'Minority clients benefit network health'),
        textRow('Location', v => [v.city, v.country].filter(Boolean).join(', ') || 'Unknown', 'Geographic location of the validator'),
        textRow('SFDP', v => v.is_sfdp ? 'Yes' : 'No', 'Solana Foundation Delegation Program member'),
        textRow('Superminority', v => v.superminority ? 'Yes' : 'No', 'Not in superminority is better for decentralization'),
      ],
    },
    {
      key: 'reliability',
      label: 'Reliability',
      grades: grades.map(g => g.categories.reliability),
      metrics: [
        row('IBRL Score', v => num(v.average_ibrl_score), v => fmtNum(v, 1), false, 'Higher is better -- inclusivity/build reliability score'),
        row('Vote Packing', v => num(v.average_vote_packing_score), v => fmtNum(v, 1), false, 'Higher is better -- vote transaction packing efficiency'),
        row('Vote Latency', v => num(v.average_mean_vote_latency), v => fmtNum(v, 3) + ' slots', true, 'Lower is better -- mean vote latency in slots'),
        row('JIP-25 Rank', v => num(v.jip25_rank), v => v > 0 ? '#' + fmtNum(v, 0) : 'N/A', true, 'Lower rank is better -- Jito StakeNet eligibility'),
      ],
    },
  ]
}

export { toGrade, getClientName, num }
