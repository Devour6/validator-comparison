'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { GradeBadge } from '@/components/grade-badge'
import { gradeValidator, buildCategoryData, getClientName, NETWORK_AVERAGE_PUBKEY } from '@/lib/grading'
import type { ValidatorRaw } from '@/lib/types'

interface ComparisonViewProps {
  validators: ValidatorRaw[]
  allValidators: ValidatorRaw[]
}

const VALIDATOR_COLORS = ['#F3EED9', '#3b82f6', '#f59e0b', '#8b5cf6']

export function ComparisonView({ validators, allValidators }: ComparisonViewProps) {
  const grades = useMemo(
    () => validators.map(v => gradeValidator(v, allValidators)),
    [validators, allValidators]
  )

  const categories = useMemo(
    () => buildCategoryData(validators, allValidators),
    [validators, allValidators]
  )

  const colTemplate = validators.length === 1
    ? 'grid-cols-[1fr_110px]'
    : validators.length === 2
    ? 'grid-cols-[1fr_100px_100px]'
    : validators.length === 3
    ? 'grid-cols-[1fr_90px_90px_90px]'
    : 'grid-cols-[1fr_80px_80px_80px_80px]'

  // Find best overall
  const bestOverallIdx = validators.length > 1
    ? grades.reduce((best, g, i) => g.overallScore > grades[best].overallScore ? i : best, 0)
    : null

  return (
    <div className="space-y-6">
      {/* Overall Scores */}
      <Card className="border-border bg-surface">
        <CardContent className="pt-6">
          <div className="flex items-center justify-around gap-4 flex-wrap">
            {grades.map((g, i) => (
              <div key={g.validator.vote_account_pubkey} className="flex flex-col items-center gap-2">
                <GradeBadge grade={g.overall} size={validators.length <= 2 ? 'lg' : 'md'} />
                <p
                  className="font-display text-sm text-center truncate max-w-[160px]"
                  style={{ color: VALIDATOR_COLORS[i] }}
                >
                  {g.validator.name || 'Unknown'}
                </p>
                {bestOverallIdx === i && validators.length > 1 && (
                  <span className="text-xs font-medium text-green-400 border border-green-500/30 rounded px-2 py-0.5">
                    Best Overall
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Overview Bars */}
      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="font-display text-lg">Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {categories.map(cat => (
            <div key={cat.key} className="space-y-1.5">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {cat.label}
              </span>
              <div className="flex gap-1">
                {cat.grades.map((g, i) => (
                  <div key={i} className="flex-1 space-y-1">
                    <div className="flex justify-end pr-1">
                      <span
                        className="text-xs font-semibold tabular-nums"
                        style={{ color: g.score === Math.max(...cat.grades.map(x => x.score)) && validators.length > 1 ? '#22c55e' : VALIDATOR_COLORS[i] }}
                      >
                        {g.score.toFixed(1)}
                      </span>
                    </div>
                    <div className="rounded-full bg-secondary overflow-hidden h-2">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(g.score / 10) * 100}%`,
                          backgroundColor: g.score === Math.max(...cat.grades.map(x => x.score)) && validators.length > 1
                            ? '#22c55e'
                            : VALIDATOR_COLORS[i] + '80',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Detailed Category Cards */}
      {categories.map(cat => (
        <Card key={cat.key} className="border-border bg-surface">
          <CardHeader>
            <CardTitle className="font-display text-base">{cat.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {/* Grade badges row - aligned to columns */}
              <div className={`grid ${colTemplate} gap-2 pb-3`}>
                <span />
                {cat.grades.map((g, i) => (
                  <div key={i} className="flex justify-end">
                    <GradeBadge grade={g.grade} size="sm" />
                  </div>
                ))}
              </div>
              {/* Column headers */}
              <div className={`grid ${colTemplate} gap-2 text-xs text-muted-foreground pb-2`}>
                <span>Metric</span>
                {validators.map((v, i) => (
                  <span key={v.vote_account_pubkey} className="text-right truncate" style={{ color: VALIDATOR_COLORS[i] }}>
                    {v.name || `Val ${i + 1}`}
                  </span>
                ))}
              </div>
              <Separator />
              {cat.metrics.map(metric => (
                <div key={metric.label}>
                  <div className={`grid ${colTemplate} gap-2 py-2 items-center`}>
                    <div>
                      <p className="text-sm font-medium">{metric.label}</p>
                      <p className="text-xs text-muted-foreground">{metric.description}</p>
                    </div>
                    {metric.values.map((val, i) => (
                      <p
                        key={i}
                        className="text-sm text-right font-mono tabular-nums"
                        style={{
                          color: metric.bestIdx === i ? '#22c55e' : 'inherit',
                          fontWeight: metric.bestIdx === i ? 600 : 400,
                        }}
                      >
                        {val.formatted}
                      </p>
                    ))}
                  </div>
                  <Separator />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Validator Info Cards */}
      <div className={`grid grid-cols-1 ${validators.length >= 2 ? 'md:grid-cols-2' : ''} gap-4`}>
        {validators.map((v, i) => (
          <ValidatorInfoCard key={v.vote_account_pubkey} validator={v} color={VALIDATOR_COLORS[i]} />
        ))}
      </div>
    </div>
  )
}

function ValidatorInfoCard({ validator, color }: { validator: ValidatorRaw; color: string }) {
  const isNetworkAvg = validator.vote_account_pubkey === NETWORK_AVERAGE_PUBKEY

  if (isNetworkAvg) {
    return (
      <Card className="border-border bg-surface">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-sm truncate" style={{ color }}>Network Average</CardTitle>
          <p className="text-xs text-muted-foreground">Computed average across all validators</p>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <InfoRow label="Avg Stake" value={fmtSol(validator.average_activated_stake)} />
          <InfoRow label="Avg Commission" value={(validator.average_commission ?? 0).toFixed(1) + '%'} />
          <InfoRow label="Majority Client" value={getClientName(validator.client_type)} />
          <InfoRow label="Majority Region" value={validator.continent || 'Unknown'} />
        </CardContent>
      </Card>
    )
  }

  const location = [validator.city, validator.country].filter(Boolean).join(', ') || 'Unknown'
  const client = getClientName(validator.client_type)

  return (
    <Card className="border-border bg-surface">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-sm truncate" style={{ color }}>{validator.name || 'Unknown'}</CardTitle>
        <p className="text-xs text-muted-foreground font-mono truncate">{validator.vote_account_pubkey}</p>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <InfoRow label="Location" value={location} />
        <InfoRow label="Client" value={client} />
        <InfoRow label="Stake" value={fmtSol(validator.average_activated_stake)} />
        <InfoRow label="DoubleZero" value={validator.is_dz ? 'Yes' : 'No'} />
        <InfoRow label="SFDP" value={validator.is_sfdp ? 'Yes' : 'No'} />
        {validator.version && <InfoRow label="Version" value={validator.version} />}
        {validator.epoch_range && <InfoRow label="Epoch Range" value={validator.epoch_range} />}
      </CardContent>
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}

function fmtSol(v: number | undefined | null): string {
  const n = v ?? 0
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M SOL'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K SOL'
  return n.toFixed(0) + ' SOL'
}
