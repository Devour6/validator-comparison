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

