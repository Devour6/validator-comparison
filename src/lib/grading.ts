import type { ValidatorRaw, Grade, CategoryGrade, MetricComparison, ComparisonResult } from './types'

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

function winner(a: number, b: number, lowerBetter = false): 'A' | 'B' | 'tie' {
  if (Math.abs(a - b) < 0.0001) return 'tie'
  if (lowerBetter) return a < b ? 'A' : 'B'
  return a > b ? 'A' : 'B'
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

function scoreApy(apy: number): number {
  if (apy >= 9) return 10
  if (apy >= 8.5) return 9
  if (apy >= 8) return 8.5
  if (apy >= 7.5) return 8
  if (apy >= 7) return 7
  if (apy >= 6.5) return 6
  if (apy >= 6) return 5
  if (apy >= 5) return 4
  return 3
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
  // Typical range ~400K-460K for weighted averages
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

  // Client diversity: non-Agave/Jito bonus
  const ct = num(v.client_type)
  if (ct >= 2 && ct <= 8) score += 2

  // SFDP participation
  if (v.is_sfdp) score += 1

  // Superminority penalty
  if (v.superminority) score -= 2

  // Geographic diversity
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

function buildComparison(
  a: ValidatorRaw,
  b: ValidatorRaw,
  allValidators: ValidatorRaw[]
): {
  categories: ComparisonResult['categories']
  overallScore: number
} {
  // --- Performance ---
  const skipA = num(a.avg_skip_rate)
  const skipB = num(b.avg_skip_rate)
  const creditsA = num(a.average_epoch_credits)
  const creditsB = num(b.average_epoch_credits)
  const txSuccessA = num(a.average_avg_tx_success_rate)
  const txSuccessB = num(b.average_avg_tx_success_rate)
  const userTxSuccessA = num(a.average_avg_user_tx_success_rate)
  const userTxSuccessB = num(b.average_avg_user_tx_success_rate)
  const buildTimeA = num(a.average_build_time_score)
  const buildTimeB = num(b.average_build_time_score)

  const perfMetrics: MetricComparison[] = [
    {
      label: 'Skip Rate',
      valueA: pct(skipA), valueB: pct(skipB),
      rawA: skipA, rawB: skipB,
      winner: winner(skipA, skipB, true),
      description: 'Lower is better — % of leader slots missed',
    },
    {
      label: 'Epoch Credits',
      valueA: fmtNum(creditsA, 0), valueB: fmtNum(creditsB, 0),
      rawA: creditsA, rawB: creditsB,
      winner: winner(creditsA, creditsB),
      description: 'Higher is better — vote credits earned per epoch',
    },
    {
      label: 'Tx Success Rate',
      valueA: pct(txSuccessA), valueB: pct(txSuccessB),
      rawA: txSuccessA, rawB: txSuccessB,
      winner: winner(txSuccessA, txSuccessB),
      description: 'Higher is better — overall transaction success rate',
    },
    {
      label: 'User Tx Success',
      valueA: pct(userTxSuccessA), valueB: pct(userTxSuccessB),
      rawA: userTxSuccessA, rawB: userTxSuccessB,
      winner: winner(userTxSuccessA, userTxSuccessB),
      description: 'Higher is better — non-vote transaction success rate',
    },
    {
      label: 'Build Time Score',
      valueA: fmtNum(buildTimeA, 1), valueB: fmtNum(buildTimeB, 1),
      rawA: buildTimeA, rawB: buildTimeB,
      winner: winner(buildTimeA, buildTimeB),
      description: 'Higher is better — block build efficiency score',
    },
  ]
  const perfScore = (scoreSkipRate(skipA) + scoreTxSuccess(txSuccessA) + scoreEpochCredits(creditsA)) / 3

  // --- Rewards & APY ---
  const overallApyA = num(a.average_compound_overall_apy)
  const overallApyB = num(b.average_compound_overall_apy)
  const mevApyA = num(a.average_delegator_compound_mev_apy)
  const mevApyB = num(b.average_delegator_compound_mev_apy)
  const blockApyA = num(a.average_delegator_compound_block_rewards_apy)
  const blockApyB = num(b.average_delegator_compound_block_rewards_apy)
  const inflApyA = num(a.average_delegator_compound_inflation_apy)
  const inflApyB = num(b.average_delegator_compound_inflation_apy)
  const delegatorTotalApyA = num(a.average_delegator_compound_total_apy)
  const delegatorTotalApyB = num(b.average_delegator_compound_total_apy)

  const rewardsMetrics: MetricComparison[] = [
    {
      label: 'Overall APY',
      valueA: fmtApy(overallApyA), valueB: fmtApy(overallApyB),
      rawA: overallApyA, rawB: overallApyB,
      winner: winner(overallApyA, overallApyB),
      description: 'Compound overall APY including all sources',
    },
    {
      label: 'Delegator APY',
      valueA: fmtApy(delegatorTotalApyA), valueB: fmtApy(delegatorTotalApyB),
      rawA: delegatorTotalApyA, rawB: delegatorTotalApyB,
      winner: winner(delegatorTotalApyA, delegatorTotalApyB),
      description: 'Total compound APY earned by delegators',
    },
    {
      label: 'MEV APY',
      valueA: fmtApy(mevApyA), valueB: fmtApy(mevApyB),
      rawA: mevApyA, rawB: mevApyB,
      winner: winner(mevApyA, mevApyB),
      description: 'Delegator APY from MEV (Jito tips)',
    },
    {
      label: 'Block Rewards APY',
      valueA: fmtApy(blockApyA), valueB: fmtApy(blockApyB),
      rawA: blockApyA, rawB: blockApyB,
      winner: winner(blockApyA, blockApyB),
      description: 'Delegator APY from block rewards',
    },
    {
      label: 'Inflation APY',
      valueA: fmtApy(inflApyA), valueB: fmtApy(inflApyB),
      rawA: inflApyA, rawB: inflApyB,
      winner: winner(inflApyA, inflApyB),
      description: 'Delegator APY from Solana inflation',
    },
  ]
  const rewardsScore = scoreApy(delegatorTotalApyA)

  // --- Stake ---
  const stakeA = num(a.average_activated_stake)
  const stakeB = num(b.average_activated_stake)
  const poolStakeA = num(a.total_from_stake_pools)
  const poolStakeB = num(b.total_from_stake_pools)
  const nativeStakeA = num(a.total_not_from_stake_pools)
  const nativeStakeB = num(b.total_not_from_stake_pools)
  const poolCountA = a.stake_pools ? Object.values(a.stake_pools).filter(v => v > 0).length : 0
  const poolCountB = b.stake_pools ? Object.values(b.stake_pools).filter(v => v > 0).length : 0

  const stakeMetrics: MetricComparison[] = [
    {
      label: 'Activated Stake',
      valueA: fmtSol(stakeA), valueB: fmtSol(stakeB),
      rawA: stakeA, rawB: stakeB,
      winner: winner(stakeA, stakeB),
      description: 'Total active stake delegated to validator',
    },
    {
      label: 'Pool Stake',
      valueA: fmtSol(poolStakeA), valueB: fmtSol(poolStakeB),
      rawA: poolStakeA, rawB: poolStakeB,
      winner: winner(poolStakeA, poolStakeB),
      description: 'Stake from pools (Jito, Marinade, etc.)',
    },
    {
      label: 'Native Stake',
      valueA: fmtSol(nativeStakeA), valueB: fmtSol(nativeStakeB),
      rawA: nativeStakeA, rawB: nativeStakeB,
      winner: winner(nativeStakeA, nativeStakeB),
      description: 'Direct delegator stake (non-pool)',
    },
    {
      label: 'Stake Pools',
      valueA: poolCountA.toString(), valueB: poolCountB.toString(),
      rawA: poolCountA, rawB: poolCountB,
      winner: winner(poolCountA, poolCountB),
      description: 'Number of pools delegating to this validator',
    },
  ]
  const stakeScore = (scoreStake(stakeA, allValidators) + scoreStakePoolDiversity(a.stake_pools)) / 2

  // --- Commission ---
  const commA = num(a.average_commission)
  const commB = num(b.average_commission)
  const prioCommA = num(a.average_priority_fee_commission)
  const prioCommB = num(b.average_priority_fee_commission)
  const mevCommA = num(a.average_mev_commission)
  const mevCommB = num(b.average_mev_commission)

  const commMetrics: MetricComparison[] = [
    {
      label: 'Commission',
      valueA: pct(commA), valueB: pct(commB),
      rawA: commA, rawB: commB,
      winner: winner(commA, commB, true),
      description: 'Lower is better — commission on inflation rewards',
    },
    {
      label: 'Priority Fee Commission',
      valueA: pct(prioCommA), valueB: pct(prioCommB),
      rawA: prioCommA, rawB: prioCommB,
      winner: winner(prioCommA, prioCommB, true),
      description: 'Lower is better — commission on priority fees',
    },
    {
      label: 'MEV Commission',
      valueA: pct(mevCommA), valueB: pct(mevCommB),
      rawA: mevCommA, rawB: mevCommB,
      winner: winner(mevCommA, mevCommB, true),
      description: 'Lower is better — commission on MEV earnings',
    },
  ]
  const commScore = scoreCommission(commA)

  // --- Decentralization ---
  const clientA = getClientName(a.client_type)
  const clientB = getClientName(b.client_type)
  const locationA = [a.city, a.country].filter(Boolean).join(', ') || 'Unknown'
  const locationB = [b.city, b.country].filter(Boolean).join(', ') || 'Unknown'
  const decentScoreA = scoreDecentralization(a, allValidators)

  const decentMetrics: MetricComparison[] = [
    {
      label: 'Client',
      valueA: clientA, valueB: clientB,
      rawA: decentScoreA, rawB: scoreDecentralization(b, allValidators),
      winner: winner(decentScoreA, scoreDecentralization(b, allValidators)),
      description: 'Minority clients benefit network health',
    },
    {
      label: 'Location',
      valueA: locationA, valueB: locationB,
      rawA: 0, rawB: 0,
      winner: 'tie',
      description: 'Geographic location of the validator',
    },
    {
      label: 'SFDP',
      valueA: a.is_sfdp ? 'Yes' : 'No', valueB: b.is_sfdp ? 'Yes' : 'No',
      rawA: a.is_sfdp ? 1 : 0, rawB: b.is_sfdp ? 1 : 0,
      winner: a.is_sfdp === b.is_sfdp ? 'tie' : a.is_sfdp ? 'A' : 'B',
      description: 'Solana Foundation Delegation Program member',
    },
    {
      label: 'Superminority',
      valueA: a.superminority ? 'Yes' : 'No', valueB: b.superminority ? 'Yes' : 'No',
      rawA: a.superminority ? 0 : 1, rawB: b.superminority ? 0 : 1,
      winner: a.superminority === b.superminority ? 'tie' : !a.superminority ? 'A' : 'B',
      description: 'Not in superminority is better for decentralization',
    },
  ]

  // --- Reliability ---
  const ibrlA = num(a.average_ibrl_score)
  const ibrlB = num(b.average_ibrl_score)
  const votePackA = num(a.average_vote_packing_score)
  const votePackB = num(b.average_vote_packing_score)
  const latencyA = num(a.average_mean_vote_latency)
  const latencyB = num(b.average_mean_vote_latency)
  const jip25A = num(a.jip25_rank)
  const jip25B = num(b.jip25_rank)

  const reliabilityMetrics: MetricComparison[] = [
    {
      label: 'IBRL Score',
      valueA: fmtNum(ibrlA, 1), valueB: fmtNum(ibrlB, 1),
      rawA: ibrlA, rawB: ibrlB,
      winner: winner(ibrlA, ibrlB),
      description: 'Higher is better — inclusivity/build reliability score',
    },
    {
      label: 'Vote Packing',
      valueA: fmtNum(votePackA, 1), valueB: fmtNum(votePackB, 1),
      rawA: votePackA, rawB: votePackB,
      winner: winner(votePackA, votePackB),
      description: 'Higher is better — vote transaction packing efficiency',
    },
    {
      label: 'Vote Latency',
      valueA: fmtNum(latencyA, 3) + ' slots', valueB: fmtNum(latencyB, 3) + ' slots',
      rawA: latencyA, rawB: latencyB,
      winner: winner(latencyA, latencyB, true),
      description: 'Lower is better — mean vote latency in slots',
    },
    {
      label: 'JIP-25 Rank',
      valueA: jip25A > 0 ? '#' + fmtNum(jip25A, 0) : 'N/A',
      valueB: jip25B > 0 ? '#' + fmtNum(jip25B, 0) : 'N/A',
      rawA: jip25A, rawB: jip25B,
      winner: jip25A > 0 && jip25B > 0 ? winner(jip25A, jip25B, true) : 'tie',
      description: 'Lower rank is better — Jito StakeNet eligibility',
    },
  ]
  const reliScore = (Math.min(10, ibrlA / 10) + scoreSkipRate(skipA) + scoreEpochCredits(creditsA)) / 3

  // --- Overall ---
  const weights = { performance: 0.25, rewards: 0.25, stake: 0.1, commission: 0.15, decentralization: 0.1, reliability: 0.15 }
  const overallScore = perfScore * weights.performance + rewardsScore * weights.rewards +
    stakeScore * weights.stake + commScore * weights.commission +
    decentScoreA * weights.decentralization + reliScore * weights.reliability

  return {
    categories: {
      performance: { grade: toGrade(perfScore), metrics: perfMetrics },
      rewards: { grade: toGrade(rewardsScore), metrics: rewardsMetrics },
      stake: { grade: toGrade(stakeScore), metrics: stakeMetrics },
      commission: { grade: toGrade(commScore), metrics: commMetrics },
      decentralization: { grade: toGrade(decentScoreA), metrics: decentMetrics },
      reliability: { grade: toGrade(reliScore), metrics: reliabilityMetrics },
    },
    overallScore,
  }
}

export function compareValidators(
  a: ValidatorRaw,
  b: ValidatorRaw,
  allValidators: ValidatorRaw[]
): ComparisonResult {
  const resultA = buildComparison(a, b, allValidators)
  const resultB = buildComparison(b, a, allValidators)

  const diff = resultA.overallScore - resultB.overallScore

  return {
    validatorA: a,
    validatorB: b,
    categories: resultA.categories,
    overallA: toGrade(resultA.overallScore),
    overallB: toGrade(resultB.overallScore),
    winner: Math.abs(diff) < 0.3 ? 'tie' : diff > 0 ? 'A' : 'B',
  }
}

export function getCategoryGrades(
  a: ValidatorRaw,
  b: ValidatorRaw,
  allValidators: ValidatorRaw[]
): Record<string, { scoreA: number; scoreB: number; gradeA: Grade; gradeB: Grade }> {
  const resultA = buildComparison(a, b, allValidators)
  const resultB = buildComparison(b, a, allValidators)

  const out: Record<string, { scoreA: number; scoreB: number; gradeA: Grade; gradeB: Grade }> = {}
  for (const key of Object.keys(resultA.categories) as (keyof typeof resultA.categories)[]) {
    out[key] = {
      scoreA: resultA.categories[key].grade.score,
      scoreB: resultB.categories[key].grade.score,
      gradeA: resultA.categories[key].grade,
      gradeB: resultB.categories[key].grade,
    }
  }
  return out
}

export { toGrade, getClientName }
