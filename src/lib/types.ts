export interface ValidatorRaw {
  vote_account_pubkey: string
  identity_pubkey?: string
  name: string
  city: string
  country: string
  continent?: string
  region?: string
  epoch_range?: string
  is_dz: boolean
  is_sfdp: boolean
  client_type?: string | number
  stake_pools?: Record<string, number>
  total_from_stake_pools?: number
  total_not_from_stake_pools?: number
  jip25_rank?: number
  jito_steward_overall_rank?: number
  sfdp_state?: string
  fd_scheduler_mode?: string
  scheduler_type?: number
  version?: string
  superminority?: boolean
  average_activated_stake: number
  average_commission?: number
  average_vote_cost?: number
  average_epoch_credits?: number
  average_leader_slots?: number
  average_blocks_produced?: number
  average_votes_cast?: number
  average_vote_credits?: number
  average_vote_credits_rank?: number
  average_signatures?: number
  avg_skip_rate?: number
  average_compound_overall_apy?: number
  average_total_overall_apy?: number
  average_total_compound_inflation_apy?: number
  average_total_inflation_apy?: number
  average_total_compound_mev_apy?: number
  average_total_mev_apy?: number
  average_total_compound_block_rewards_apy?: number
  average_total_block_rewards_apy?: number
  average_delegator_compound_block_rewards_apy?: number
  average_delegator_compound_inflation_apy?: number
  average_delegator_compound_mev_apy?: number
  average_delegator_compound_total_apy?: number
  average_delegator_priority_fees?: number
  average_mev_earned?: number
  average_mev_to_validator?: number
  average_mev_to_stakers?: number
  average_mev_commission?: number
  average_total_jito_tips?: number
  average_avg_jito_tips_per_block?: number
  average_priority_fee_commission?: number
  average_total_priority_fees?: number
  average_validator_priority_fees?: number
  average_avg_tx_success_rate?: number
  average_avg_user_tx_success_rate?: number
  average_build_time_score?: number
  average_ibrl_score?: number
  average_vote_packing_score?: number
  average_non_vote_packing_score?: number
  average_stake_percentage?: number
  average_mean_vote_latency?: number
  average_median_vote_latency?: number
  average_max_vote_latency?: number
  avg_rewards_per_block?: number
  avg_mev_per_block?: number
}

export interface Grade {
  score: number
  label: string
  color: string
}

export interface ValidatorGrades {
  validator: ValidatorRaw
  overall: Grade
  overallScore: number
  categories: Record<string, { grade: Grade; score: number }>
}

export interface MetricRow {
  label: string
  values: { formatted: string; raw: number }[]
  bestIdx: number | null
  lowerBetter: boolean
  description: string
}

export interface CategoryData {
  key: string
  label: string
  metrics: MetricRow[]
  grades: { grade: Grade; score: number }[]
}
