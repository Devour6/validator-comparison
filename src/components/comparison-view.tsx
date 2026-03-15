'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { GradeBadge, GradeBar } from '@/components/grade-badge'
import { compareValidators, getCategoryGrades, getClientName } from '@/lib/grading'
import type { ValidatorRaw } from '@/lib/types'

interface ComparisonViewProps {
  validatorA: ValidatorRaw
  validatorB: ValidatorRaw
  allValidators: ValidatorRaw[]
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  performance: { label: 'Performance', icon: '⚡' },
  rewards: { label: 'APY & Rewards', icon: '💰' },
  stake: { label: 'Stake & Trust', icon: '🏦' },
  commission: { label: 'Commission', icon: '📊' },
  decentralization: { label: 'Decentralization', icon: '🌍' },
  reliability: { label: 'Reliability', icon: '🛡️' },
}

export function ComparisonView({ validatorA, validatorB, allValidators }: ComparisonViewProps) {
  const comparison = useMemo(
    () => compareValidators(validatorA, validatorB, allValidators),
    [validatorA, validatorB, allValidators]
  )

  const categoryGrades = useMemo(
    () => getCategoryGrades(validatorA, validatorB, allValidators),
    [validatorA, validatorB, allValidators]
  )

  const comparisonFlipped = useMemo(
    () => compareValidators(validatorB, validatorA, allValidators),
    [validatorA, validatorB, allValidators]
  )

  return (
    <div className="space-y-8">
      {/* Overall Score Header */}
      <Card className="border-border bg-surface">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center gap-2 flex-1">
              <GradeBadge grade={comparison.overallA} size="lg" />
              <p className="font-display text-sm text-center truncate max-w-[200px]">
                {validatorA.name || 'Unknown'}
              </p>
              {comparison.winner === 'A' && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  Winner
                </Badge>
              )}
            </div>

            <div className="flex flex-col items-center gap-1 px-6">
              <span className="text-2xl font-display text-muted-foreground">VS</span>
              {comparison.winner === 'tie' && (
                <Badge variant="secondary" className="text-muted-foreground">
                  Tie
                </Badge>
              )}
            </div>

            <div className="flex flex-col items-center gap-2 flex-1">
              <GradeBadge grade={comparison.overallB} size="lg" />
              <p className="font-display text-sm text-center truncate max-w-[200px]">
                {validatorB.name || 'Unknown'}
              </p>
              {comparison.winner === 'B' && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  Winner
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Grade Bars */}
      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="font-display text-lg">Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(categoryGrades).map(([key, { scoreA, scoreB }]) => (
            <GradeBar
              key={key}
              scoreA={scoreA}
              scoreB={scoreB}
              label={CATEGORY_LABELS[key]?.label || key}
            />
          ))}
        </CardContent>
      </Card>

      {/* Detailed Metric Comparisons */}
      {Object.entries(comparison.categories).map(([key, category]) => {
        const flippedCategory = comparisonFlipped.categories[key as keyof typeof comparisonFlipped.categories]
        const meta = CATEGORY_LABELS[key]
        return (
          <Card key={key} className="border-border bg-surface">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <span>{meta?.icon}</span>
                  {meta?.label || key}
                </CardTitle>
                <div className="flex items-center gap-4">
                  <GradeBadge grade={category.grade} size="sm" />
                  <GradeBadge grade={flippedCategory.grade} size="sm" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {/* Header */}
                <div className="grid grid-cols-[1fr_100px_100px] gap-2 text-xs text-muted-foreground pb-2">
                  <span>Metric</span>
                  <span className="text-right truncate">{validatorA.name || 'Val A'}</span>
                  <span className="text-right truncate">{validatorB.name || 'Val B'}</span>
                </div>
                <Separator />
                {category.metrics.map((metric) => (
                  <div key={metric.label}>
                    <div className="grid grid-cols-[1fr_100px_100px] gap-2 py-2 items-center">
                      <div>
                        <p className="text-sm font-medium">{metric.label}</p>
                        {metric.description && (
                          <p className="text-xs text-muted-foreground">{metric.description}</p>
                        )}
                      </div>
                      <p
                        className="text-sm text-right font-mono tabular-nums"
                        style={{
                          color: metric.winner === 'A' ? '#22c55e' : 'inherit',
                          fontWeight: metric.winner === 'A' ? 600 : 400,
                        }}
                      >
                        {metric.valueA}
                      </p>
                      <p
                        className="text-sm text-right font-mono tabular-nums"
                        style={{
                          color: metric.winner === 'B' ? '#22c55e' : 'inherit',
                          fontWeight: metric.winner === 'B' ? 600 : 400,
                        }}
                      >
                        {metric.valueB}
                      </p>
                    </div>
                    <Separator />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ValidatorInfoCard validator={validatorA} />
        <ValidatorInfoCard validator={validatorB} />
      </div>
    </div>
  )
}

function ValidatorInfoCard({ validator }: { validator: ValidatorRaw }) {
  const location = [validator.city, validator.country].filter(Boolean).join(', ') || 'Unknown'
  const client = getClientName(validator.client_type)

  return (
    <Card className="border-border bg-surface">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-sm truncate">{validator.name || 'Unknown'}</CardTitle>
        <p className="text-xs text-muted-foreground font-mono truncate">{validator.vote_account_pubkey}</p>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <InfoRow label="Location" value={location} />
        <InfoRow label="Client" value={client} />
        <InfoRow label="Stake" value={fmtSol(validator.average_activated_stake)} />
        <InfoRow label="DoubleZero" value={validator.is_dz ? 'Yes' : 'No'} />
        <InfoRow label="SFDP" value={validator.is_sfdp ? 'Yes' : 'No'} />
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
