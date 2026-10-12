import { useTranslation } from 'react-i18next'
import { Droplets, BellRing, BellOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProgressRing } from '@/components/ProgressRing'
import { useSettings } from '@/features/settings'
import { goalProgress, remainingMl, totalForDay } from '../logic'
import { logWater } from '../actions'
import { useHydration } from '../store'

type HydrationCardProps = {
  now: number
  /** Minutes until the next water reminder; null when reminders are off or quiet. */
  nextInMin: number | null
}

const EXTRA_AMOUNTS = [100, 500]

export function HydrationCard({ now, nextInMin }: HydrationCardProps) {
  const { t } = useTranslation()
  const logs = useHydration((s) => s.logs)
  const { waterGoalMl, cupMl, waterEnabled } = useSettings((s) => s.settings)
  const total = totalForDay(logs, now)
  const progress = goalProgress(total, waterGoalMl)
  const reached = total >= waterGoalMl

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="grid size-7 place-items-center rounded-lg bg-water-soft text-water-soft-foreground">
            <Droplets className="size-4" aria-hidden />
          </span>
          {t('hydration.title')}
        </CardTitle>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {!waterEnabled ? (
            <>
              <BellOff className="size-3.5" aria-hidden /> {t('hydration.disabled')}
            </>
          ) : nextInMin !== null ? (
            <>
              <BellRing className="size-3.5" aria-hidden />
              {nextInMin <= 1
                ? t('hydration.nextSoon')
                : t('hydration.nextIn', { minutes: nextInMin })}
            </>
          ) : null}
        </span>
      </CardHeader>
      <CardContent className="flex items-center gap-5">
        <ProgressRing
          value={progress}
          tone="water"
          label={t('hydration.progressLabel', { current: total, goal: waterGoalMl })}
        >
          <div>
            <div className="text-2xl font-semibold tabular-nums">{total}</div>
            <div className="text-xs text-muted-foreground tabular-nums">
              {t('hydration.ofGoal', { goal: waterGoalMl })}
            </div>
          </div>
        </ProgressRing>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <p className="text-sm font-medium" aria-live="polite">
            {reached
              ? t('hydration.goalReached')
              : t('hydration.remaining', { ml: remainingMl(total, waterGoalMl) })}
          </p>
          <Button
            variant="water"
            size="lg"
            className="w-full"
            onClick={() => logWater(cupMl)}
            aria-label={t('hydration.addAria', { amount: cupMl })}
          >
            <Droplets aria-hidden />
            <span className="tabular-nums">{t('hydration.add', { amount: cupMl })}</span>
          </Button>
          <div className="flex gap-2">
            {EXTRA_AMOUNTS.filter((a) => a !== cupMl).map((a) => (
              <Button
                key={a}
                variant="waterSoft"
                size="sm"
                className="flex-1 tabular-nums"
                onClick={() => logWater(a)}
                aria-label={t('hydration.addAria', { amount: a })}
              >
                {t('hydration.add', { amount: a })}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
