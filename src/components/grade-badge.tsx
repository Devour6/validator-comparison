import type { Grade } from '@/lib/types'

interface GradeBadgeProps {
  grade: Grade
  size?: 'sm' | 'md' | 'lg'
  showScore?: boolean
}

export function GradeBadge({ grade, size = 'md', showScore = true }: GradeBadgeProps) {
  const sizes = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-14 h-14 text-lg',
    lg: 'w-20 h-20 text-2xl',
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`${sizes[size]} rounded-full flex items-center justify-center font-bold border-2`}
        style={{ borderColor: grade.color, color: grade.color }}
      >
        {grade.score.toFixed(1)}
      </div>
      {showScore && (
        <span className="text-xs font-medium" style={{ color: grade.color }}>
          {grade.label}
        </span>
      )}
    </div>
  )
}

interface GradeBarProps {
  scoreA: number
  scoreB: number
  label: string
}

export function GradeBar({ scoreA, scoreB, label }: GradeBarProps) {
  const maxScore = 10
  const pctA = (scoreA / maxScore) * 100
  const pctB = (scoreB / maxScore) * 100
  const aWins = scoreA > scoreB + 0.3
  const bWins = scoreB > scoreA + 0.3

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span
          className="text-sm font-semibold tabular-nums"
          style={{ color: aWins ? '#22c55e' : '#F3EED9' }}
        >
          {scoreA.toFixed(1)}
        </span>
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          {label}
        </span>
        <span
          className="text-sm font-semibold tabular-nums"
          style={{ color: bWins ? '#22c55e' : '#F3EED9' }}
        >
          {scoreB.toFixed(1)}
        </span>
      </div>
      <div className="flex gap-1 h-2">
        <div className="flex-1 rounded-full bg-secondary overflow-hidden flex justify-end">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pctA}%`,
              background: aWins
                ? 'linear-gradient(90deg, transparent, #22c55e)'
                : 'linear-gradient(90deg, transparent, rgba(243, 238, 217, 0.3))',
            }}
          />
        </div>
        <div className="flex-1 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pctB}%`,
              background: bWins
                ? 'linear-gradient(270deg, transparent, #22c55e)'
                : 'linear-gradient(270deg, transparent, rgba(243, 238, 217, 0.3))',
            }}
          />
        </div>
      </div>
    </div>
  )
}
