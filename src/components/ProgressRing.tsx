import { motion } from 'framer-motion'
import { clamp, cn } from '@/lib/utils'

type ProgressRingProps = {
  value: number // 0..1
  size?: number
  stroke?: number
  tone?: 'water' | 'move'
  className?: string
  children?: React.ReactNode
  label: string
}

export function ProgressRing({
  value,
  size = 132,
  stroke = 10,
  tone = 'water',
  className,
  children,
  label,
}: ProgressRingProps) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = clamp(value, 0, 1)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className={cn('relative grid place-items-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={tone === 'water' ? 'stroke-water' : 'stroke-move'}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}
