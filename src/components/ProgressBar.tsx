import { clamp, cn } from '@/lib/utils'

type ProgressBarProps = {
  value: number // 0..1
  tone?: 'water' | 'move'
  label: string
  className?: string
}

export function ProgressBar({ value, tone = 'move', label, className }: ProgressBarProps) {
  const v = clamp(value, 0, 1)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-500 ease-out',
          tone === 'water' ? 'bg-water' : 'bg-move',
        )}
        style={{ width: `${v * 100}%` }}
      />
    </div>
  )
}
