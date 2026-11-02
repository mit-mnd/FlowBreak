import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart3, Table2 } from 'lucide-react'
import {
  getRepos,
  type FocusLog,
  type MovementLog,
  type ReminderEvent,
  type WaterLog,
} from '@/lib/db'
import { daysAgo } from '@/lib/time'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { useSettings } from '@/features/settings'
import { useTodos } from '@/features/todos'
import { useHydration } from '@/features/hydration'
import { useMovement } from '@/features/movement'
import { useFocus } from '@/features/focus'
import { buildDailySeries, compliance, currentStreak, summarize } from '../logic'
import { BarChart, type BarDatum } from './BarChart'

const DAYS = 7
/** History loaded to measure streaks; the charts only show the last `DAYS`. */
const STREAK_DAYS = 90

export function StatsPage() {
  const { t, i18n } = useTranslation()
  const goal = useSettings((s) => s.settings.waterGoalMl)
  const todos = useTodos((s) => s.items)
  // Re-query when today's logs change so the page stays live.
  const waterVersion = useHydration((s) => s.logs.length)
  const moveVersion = useMovement((s) => s.logs.length)
  const focusVersion = useFocus((s) => s.logs.length)
  const [data, setData] = useState<{
    water: WaterLog[]
    movement: MovementLog[]
    events: ReminderEvent[]
    focus: FocusLog[]
  } | null>(null)
  const [showTable, setShowTable] = useState(false)
  const now = Date.now()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const repos = await getRepos()
      const since = daysAgo(Date.now(), STREAK_DAYS - 1)
      const [water, movement, events, focus] = await Promise.all([
        repos.water.listSince(since),
        repos.movement.listSince(since),
        repos.reminderEvents.listSince(daysAgo(Date.now(), DAYS - 1)),
        repos.focus.listSince(daysAgo(Date.now(), DAYS - 1)),
      ])
      if (!cancelled) setData({ water, movement, events, focus })
    })()
    return () => {
      cancelled = true
    }
  }, [waterVersion, moveVersion, focusVersion])

  const longSeries = useMemo(
    () =>
      data ? buildDailySeries(now, STREAK_DAYS, data.water, data.movement, todos, data.focus) : [],
    // `now` intentionally excluded: recomputed whenever data changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, todos],
  )
  const series = useMemo(() => longSeries.slice(-DAYS), [longSeries])
  const summary = summarize(series, goal)
  const waterStreak = currentStreak(longSeries, (d) => d.waterMl >= goal)
  const moveStreak = currentStreak(longSeries, (d) => d.moves > 0)
  const waterRate = data ? compliance(data.events, 'water', now) : null
  const moveRate = data ? compliance(data.events, 'movement', now) : null
  const weekday = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' })
  const dateFmt = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
  })
  const num = new Intl.NumberFormat(i18n.language)
  const percent = new Intl.NumberFormat(i18n.language, {
    style: 'percent',
    maximumFractionDigits: 0,
  })
  const todayKey = series[series.length - 1]?.key

  const bars = (pick: (d: (typeof series)[number]) => number): BarDatum[] =>
    series.map((d) => ({
      key: d.key,
      label: weekday.format(d.dayStart),
      value: pick(d),
      isToday: d.key === todayKey,
    }))

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t('stats.title')}</h1>
        <span className="text-sm text-muted-foreground">{t('stats.range')}</span>
      </div>

      {!data ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-48" />
        </div>
      ) : !summary.hasData ? (
        <Card>
          <EmptyState icon={BarChart3} title={t('stats.emptyTitle')} body={t('stats.emptyBody')} />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatTile label={t('stats.avgWater')} value={`${num.format(summary.avgWaterMl)} ml`} />
            <StatTile label={t('stats.goalDays')} value={`${summary.goalDays}/${DAYS}`} />
            <StatTile label={t('stats.totalMoves')} value={num.format(summary.totalMoves)} />
            <StatTile label={t('stats.totalTasks')} value={num.format(summary.totalTasks)} />
            <StatTile
              className="col-span-2"
              label={t('stats.totalFocus')}
              value={t('common.minutes', { count: summary.totalFocusMin })}
            />
            <StatTile
              label={t('stats.streakWater')}
              value={t('stats.days', { count: waterStreak })}
            />
            <StatTile
              label={t('stats.streakMove')}
              value={t('stats.days', { count: moveStreak })}
            />
            <StatTile
              label={t('stats.complianceWater')}
              value={waterRate?.rate == null ? '—' : percent.format(waterRate.rate)}
            />
            <StatTile
              label={t('stats.complianceMove')}
              value={moveRate?.rate == null ? '—' : percent.format(moveRate.rate)}
            />
          </div>
          <p className="px-1 text-xs text-muted-foreground">{t('stats.complianceHint')}</p>

          <Card>
            <CardContent className="space-y-6">
              <BarChart
                title={t('stats.water')}
                tone="water"
                data={bars((d) => d.waterMl)}
                formatValue={(v) => `${num.format(v)} ml`}
                goal={{ value: goal, label: t('stats.goal') }}
              />
              <BarChart title={t('stats.movement')} tone="move" data={bars((d) => d.moves)} />
              <BarChart title={t('stats.tasks')} tone="neutral" data={bars((d) => d.tasksDone)} />
              <BarChart
                title={t('stats.focus')}
                tone="neutral"
                data={bars((d) => d.focusMin)}
                formatValue={(v) => t('common.minutes', { count: v })}
              />
            </CardContent>
          </Card>

          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setShowTable((v) => !v)}
            aria-expanded={showTable}
          >
            <Table2 aria-hidden />
            {showTable ? t('common.hideTable') : t('common.showTable')}
          </Button>

          {showTable && (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th scope="col" className="px-4 py-2 font-medium">
                      {t('stats.day')}
                    </th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">
                      ml
                    </th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">
                      {t('stats.totalMoves')}
                    </th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">
                      {t('stats.totalTasks')}
                    </th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      {t('stats.focusShort')}
                    </th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {series
                    .slice()
                    .reverse()
                    .map((d) => (
                      <tr key={d.key} className="border-b last:border-0">
                        <th scope="row" className="px-4 py-2 text-left font-normal">
                          {dateFmt.format(d.dayStart)}
                        </th>
                        <td className="px-2 py-2 text-right">{num.format(d.waterMl)}</td>
                        <td className="px-2 py-2 text-right">{d.moves}</td>
                        <td className="px-2 py-2 text-right">{d.tasksDone}</td>
                        <td className="px-4 py-2 text-right">{d.focusMin}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function StatTile({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <Card className={cn('p-3', className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </Card>
  )
}
