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

export function fmtSol(v: number | undefined | null): string {
  const n = v ?? 0
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M SOL'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K SOL'
  return n.toFixed(0) + ' SOL'
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
  // Percentile-based scoring — spreads validators across the full grade range
  // based on where they rank against all other validators
  const apys = allValidators
    .map(v => num(v.average_delegator_compound_total_apy))
    .filter(a => a > 0)
    .sort((a, b) => a - b)
  if (apys.length === 0) return 5
  const idx = apys.findIndex(a => a >= apy)
  const percentile = (idx >= 0 ? idx : apys.length) / apys.length
  // Scale from 3 to 10 based on percentile, rounded to nearest 0.5
  // Rounding to 0.5 prevents noise (tiny APY differences) from dominating grades
  return Math.round((3 + percentile * 7) * 2) / 2
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


function scoreStakePoolDiversity(pools: Record<string, number> | undefined, allValidators: ValidatorRaw[]): number {
  const count = pools ? Object.values(pools).filter(x => x > 0).length : 0
  // Percentile-based scoring — ranks pool diversity against all validators
  const counts = allValidators
    .map(v => v.stake_pools ? Object.values(v.stake_pools).filter(x => x > 0).length : 0)
    .sort((a, b) => a - b)
  if (counts.length === 0) return 5
  const idx = counts.findIndex(c => c >= count)
  const percentile = (idx >= 0 ? idx : counts.length) / counts.length
  return Math.round((3 + percentile * 7) * 2) / 2
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

function scoreBuildTime(score: number): number {
  // Build time score from Trillium is 0-100
  // Top validators are 99.5+, good ones 98+, average 95+
  if (score >= 99.5) return 10
  if (score >= 99) return 9
  if (score >= 98) return 8
  if (score >= 96) return 7
  if (score >= 93) return 6
  if (score >= 90) return 5
  if (score >= 85) return 4
  return 3
}

function scoreVotePacking(score: number): number {
  // Vote packing score from Trillium is 0-100
  // Top validators are 98+, good ones 96+, average 93+
  if (score >= 98) return 10
  if (score >= 97) return 9
  if (score >= 96) return 8
  if (score >= 94) return 7
  if (score >= 92) return 6
  if (score >= 90) return 5
  if (score >= 85) return 4
  return 3
}

function getClientName(clientType: string | number | undefined): string {
  if (clientType == null) return 'Unknown'
  // Trillium returns strings like "Jito_BAM (6)", "Agave (0)", "Firedancer (3)"
  const s = String(clientType)
  const label = s.split(' (')[0].replace(/_/g, ' ')
  return label || 'Unknown'
}

function isMinorityClient(clientType: string | number | undefined): boolean {
  if (clientType == null) return false
  const s = String(clientType).toLowerCase()
  // Agave and Jito (standard) are majority clients
  // Everything else (Firedancer, Frankendancer, Sig, Jito_BAM, etc.) is minority
  return !s.startsWith('agave') && !s.startsWith('jito (') && !s.startsWith('jito_solana')
}

function scoreDecentralization(v: ValidatorRaw): number {
  let score = 5
  // Minority client bonus — running non-majority software helps the network
  if (isMinorityClient(v.client_type)) score += 2
  // SFDP membership
  if (v.is_sfdp) score += 1
  // Superminority penalty
  if (v.superminority) score -= 2
  // Geographic diversity by continent — most stake is in Europe/NA
  const continent = (v.continent || '').toLowerCase()
  const country = (v.country || '').toLowerCase()
  if (continent === 'europe' || continent === 'north america' || country === 'united states' || country === 'germany' || country === 'netherlands') {
    score -= 1 // majority of validators are here
  } else if (continent === 'south america' || continent === 'africa' || continent === 'oceania') {
    score += 1 // rare locations help decentralization
  }
  // Asia/other: no adjustment (moderate)
  return Math.max(0, Math.min(10, score))
}

export function gradeValidator(v: ValidatorRaw, allValidators: ValidatorRaw[]): ValidatorGrades {
  const skip = num(v.avg_skip_rate)
  const credits = num(v.average_epoch_credits)
  const txSuccess = num(v.average_avg_tx_success_rate)
  const buildTime = num(v.average_build_time_score)
  const perfScore = (scoreSkipRate(skip) + scoreTxSuccess(txSuccess) + scoreEpochCredits(credits) + scoreBuildTime(buildTime)) / 4

  const delegatorApy = num(v.average_delegator_compound_total_apy)
  const rewardsScore = scoreApy(delegatorApy, allValidators)

  // Stake Diversification — scored purely on pool diversity, raw stake amount doesn't indicate quality
  const stakeScore = scoreStakePoolDiversity(v.stake_pools, allValidators)

  const comm = num(v.average_commission)
  const commScore = scoreCommission(comm)

  const decentScore = scoreDecentralization(v)

  const ibrl = num(v.average_ibrl_score)
  const votePacking = num(v.average_vote_packing_score)
  const reliScore = (Math.min(10, ibrl / 10) + scoreSkipRate(skip) + scoreEpochCredits(credits) + scoreVotePacking(votePacking)) / 4

  const weights = { performance: 0.25, rewards: 0.20, stake: 0.1, commission: 0.15, decentralization: 0.1, reliability: 0.20 }
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
        row('Skip Rate', v => num(v.avg_skip_rate), pct, true, 'Lower is better — % of leader slots missed'),
        row('Epoch Credits', v => num(v.average_epoch_credits), v => fmtNum(v, 0), false, 'Higher is better — vote credits earned per epoch'),
        row('Tx Success Rate', v => num(v.average_avg_tx_success_rate), pct, false, 'Higher is better — overall transaction success rate'),
        row('User Tx Success', v => num(v.average_avg_user_tx_success_rate), pct, false, 'Higher is better — non-vote transaction success rate'),
        row('Build Time Score', v => num(v.average_build_time_score), v => fmtNum(v, 1), false, 'Higher is better — block build efficiency score'),
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
      label: 'Stake Diversification',
      grades: grades.map(g => g.categories.stake),
      metrics: [
        row('Stake Pools', v => v.stake_pools ? Object.values(v.stake_pools).filter(x => x > 0).length : 0, v => fmtNum(v, 0), false, 'Number of independent pools delegating — scored by percentile rank'),
        row('Pool Stake', v => num(v.total_from_stake_pools), fmtSol, false, 'Stake from pools (Jito, Marinade, etc.)'),
        row('Native Stake', v => num(v.total_not_from_stake_pools), fmtSol, false, 'Direct delegator stake (non-pool)'),
        row('Activated Stake', v => num(v.average_activated_stake), fmtSol, false, 'Total active stake (shown for context, not scored)'),
      ],
    },
    {
      key: 'commission',
      label: 'Commission',
      grades: grades.map(g => g.categories.commission),
      metrics: [
        row('Commission', v => num(v.average_commission), pct, true, 'Lower is better — validator commission on rewards'),
      ],
    },
    {
      key: 'decentralization',
      label: 'Decentralization',
      grades: grades.map(g => g.categories.decentralization),
      metrics: [
        textRow('Client', v => getClientName(v.client_type), 'Validator software — minority clients help decentralization'),
        textRow('Minority Client', v => isMinorityClient(v.client_type) ? 'Yes' : 'No', 'Non-majority client software (+2 bonus)'),
        textRow('SFDP', v => v.is_sfdp ? 'Yes' : 'No', 'Solana Foundation Delegation Program member (+1 bonus)'),
        textRow('Superminority', v => v.superminority ? 'Yes' : 'No', 'In superminority = -2 penalty'),
        textRow('Location', v => [v.city, v.country].filter(Boolean).join(', ') || 'Unknown', 'Europe/NA = -1, Asia = 0, other = +1'),
      ],
    },
    {
      key: 'reliability',
      label: 'Reliability',
      grades: grades.map(g => g.categories.reliability),
      metrics: [
        row('IBRL Score', v => num(v.average_ibrl_score), v => fmtNum(v, 1), false, 'Higher is better — inclusivity/build reliability score'),
        row('Vote Packing', v => num(v.average_vote_packing_score), v => fmtNum(v, 1), false, 'Higher is better — vote transaction packing efficiency'),
        row('Vote Latency', v => num(v.average_mean_vote_latency), v => fmtNum(v, 3) + ' slots', true, 'Lower is better — mean vote latency in slots'),
        row('JIP-25 Rank', v => num(v.jip25_rank), v => v > 0 ? '#' + fmtNum(v, 0) : 'N/A', true, 'Lower rank is better — Jito StakeNet eligibility'),
      ],
    },
  ]
}

export const NETWORK_AVERAGE_PUBKEY = 'network-average-validator'
export const VALIDATOR_COLORS = ['#F3EED9', '#fb923c', '#facc15', '#22c55e']

export function buildAverageValidator(allValidators: ValidatorRaw[]): ValidatorRaw {
  const n = allValidators.length
  if (n === 0) {
    return { vote_account_pubkey: NETWORK_AVERAGE_PUBKEY, name: 'Network Average', city: '', country: '', is_dz: false, is_sfdp: false, average_activated_stake: 0 }
  }

  function avg(getter: (v: ValidatorRaw) => number | undefined | null): number {
    let sum = 0, count = 0
    for (const v of allValidators) {
      const val = getter(v)
      if (val != null && isFinite(val)) { sum += val; count++ }
    }
    return count > 0 ? sum / count : 0
  }

  // Count average stake pools per validator
  let totalPoolCount = 0
  for (const v of allValidators) {
    if (v.stake_pools) totalPoolCount += Object.values(v.stake_pools).filter(x => x > 0).length
  }
  const avgPoolCount = Math.round(totalPoolCount / n)
  const avgPools: Record<string, number> = {}
  for (let i = 0; i < avgPoolCount; i++) avgPools[`pool_${i}`] = 1

  // Find most common client type for display
  const clientCounts: Record<string, number> = {}
  for (const v of allValidators) {
    const c = String(v.client_type || 'Unknown')
    clientCounts[c] = (clientCounts[c] || 0) + 1
  }
  const majorityClient = Object.entries(clientCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown'

  // Find most common continent
  const continentCounts: Record<string, number> = {}
  for (const v of allValidators) {
    const c = v.continent || 'Unknown'
    continentCounts[c] = (continentCounts[c] || 0) + 1
  }
  const majorityContinent = Object.entries(continentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || ''

  // SFDP: proportion
  const sfdpCount = allValidators.filter(v => v.is_sfdp).length
  const superminorityCount = allValidators.filter(v => v.superminority).length

  return {
    vote_account_pubkey: NETWORK_AVERAGE_PUBKEY,
    name: 'Network Average',
    city: '',
    country: '',
    continent: majorityContinent,
    is_dz: false,
    is_sfdp: sfdpCount > n / 2,
    superminority: superminorityCount > n / 2,
    client_type: majorityClient,
    stake_pools: avgPools,
    total_from_stake_pools: avg(v => v.total_from_stake_pools),
    total_not_from_stake_pools: avg(v => v.total_not_from_stake_pools),
    average_activated_stake: avg(v => v.average_activated_stake),
    average_commission: avg(v => v.average_commission),
    average_epoch_credits: avg(v => v.average_epoch_credits),
    avg_skip_rate: avg(v => v.avg_skip_rate),
    average_compound_overall_apy: avg(v => v.average_compound_overall_apy),
    average_delegator_compound_total_apy: avg(v => v.average_delegator_compound_total_apy),
    average_delegator_compound_mev_apy: avg(v => v.average_delegator_compound_mev_apy),
    average_delegator_compound_block_rewards_apy: avg(v => v.average_delegator_compound_block_rewards_apy),
    average_delegator_compound_inflation_apy: avg(v => v.average_delegator_compound_inflation_apy),
    average_avg_tx_success_rate: avg(v => v.average_avg_tx_success_rate),
    average_avg_user_tx_success_rate: avg(v => v.average_avg_user_tx_success_rate),
    average_build_time_score: avg(v => v.average_build_time_score),
    average_ibrl_score: avg(v => v.average_ibrl_score),
    average_vote_packing_score: avg(v => v.average_vote_packing_score),
    average_mean_vote_latency: avg(v => v.average_mean_vote_latency),
    jip25_rank: 0,
  }
}

export { toGrade, getClientName, num }
