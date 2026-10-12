import { useState } from 'react'
import { cn } from '@/lib/utils'

export type BarDatum = { key: string; label: string; value: number; isToday?: boolean }

type BarChartProps = {
  title: string
  data: BarDatum[]
  tone: 'water' | 'move' | 'neutral'
  formatValue?: (v: number) => string
  goal?: { value: number; label: string }
}

const HEIGHT = 112

const toneClass = {
  water: 'bg-water',
  move: 'bg-move',
  neutral: 'bg-neutral-strong',
} as const

/**
 * Single-series column chart: one hue (identity comes from the title, so no legend),
 * thin bars with rounded data-ends, recessive baseline, hover/focus tooltip per bar.
 */
export function BarChart({ title, data, tone, formatValue = String, goal }: BarChartProps) {
  const [active, setActive] = useState<string | null>(null)
  const max = Math.max(1, goal?.value ?? 0, ...data.map((d) => d.value))
  const goalY = goal ? HEIGHT - (goal.value / max) * HEIGHT : null

  return (
    <figure className="space-y-2">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">{title}</span>
        {goal && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="inline-block w-4 border-t-2 border-dashed border-muted-foreground/60"
              aria-hidden
            />
            {goal.label} · <span className="tabular-nums">{formatValue(goal.value)}</span>
          </span>
        )}
      </figcaption>

      <div className="relative" style={{ height: HEIGHT }}>
        {goalY !== null && (
          <div
            className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-muted-foreground/40"
            style={{ top: goalY }}
            aria-hidden
          />
        )}
        <div className="absolute inset-0 flex items-end gap-0.5 border-b border-border">
          {data.map((d) => {
            const h = (d.value / max) * HEIGHT
            const isActive = active === d.key
            return (
              <button
                key={d.key}
                type="button"
                className="group relative flex h-full flex-1 items-end justify-center focus-visible:outline-none"
                onMouseEnter={() => setActive(d.key)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(d.key)}
                onBlur={() => setActive(null)}
                aria-label={`${d.label}: ${formatValue(d.value)}`}
              >
                <span
                  className={cn(
                    'block w-full max-w-7 rounded-t-[4px] transition-[height,opacity] duration-300',
                    toneClass[tone],
                    active && !isActive && 'opacity-50',
                    'group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-ring',
                  )}
                  style={{ height: d.value > 0 ? Math.max(3, h) : 0 }}
                />
                {isActive && (
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute z-10 -translate-y-1 whitespace-nowrap rounded-md border bg-card px-2 py-1 text-xs shadow-md"
                    style={{ bottom: Math.min(HEIGHT - 8, h + 4) }}
                  >
                    <span className="text-muted-foreground">{d.label}</span>{' '}
                    <span className="font-semibold tabular-nums">{formatValue(d.value)}</span>
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex gap-0.5" aria-hidden>
        {data.map((d) => (
          <span
            key={d.key}
            className={cn(
              'flex-1 text-center text-[11px] text-muted-foreground',
              d.isToday && 'font-semibold text-foreground',
            )}
          >
            {d.label}
          </span>
        ))}
      </div>
    </figure>
  )
}
