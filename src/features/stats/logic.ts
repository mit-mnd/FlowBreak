import { MINUTE, dayKey, daysAgo } from '@/lib/time'
import type { FocusLog, MovementLog, ReminderEvent, Todo, WaterLog } from '@/lib/db'

export type DayStat = {
  key: string
  dayStart: number
  waterMl: number
  moves: number
  tasksDone: number
  /** Whole minutes of focus sessions that started this day. */
  focusMin: number
}

/** One entry per local day, oldest first, ending today. */
export function buildDailySeries(
  now: number,
  days: number,
  water: WaterLog[],
  movement: MovementLog[],
  todos: Todo[],
  focus: FocusLog[] = [],
): DayStat[] {
  const series: DayStat[] = []
  const index = new Map<string, DayStat>()
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = daysAgo(now, i)
    const stat = {
      key: dayKey(dayStart),
      dayStart,
      waterMl: 0,
      moves: 0,
      tasksDone: 0,
      focusMin: 0,
    }
    series.push(stat)
    index.set(stat.key, stat)
  }
  for (const w of water) {
    const s = index.get(dayKey(w.loggedAt))
    if (s) s.waterMl += w.amountMl
  }
  for (const m of movement) {
    const s = index.get(dayKey(m.loggedAt))
    if (s) s.moves += 1
  }
  for (const t of todos) {
    if (!t.done || t.completedAt === null) continue
    const s = index.get(dayKey(t.completedAt))
    if (s) s.tasksDone += 1
  }
  // Sum the raw durations first so rounding per session does not drift.
  for (const f of focus) {
    const s = index.get(dayKey(f.startedAt))
    if (s) s.focusMin += (f.endedAt - f.startedAt) / MINUTE
  }
  for (const s of series) s.focusMin = Math.round(s.focusMin)
  return series
}

export type StatsSummary = {
  avgWaterMl: number
  goalDays: number
  totalMoves: number
  totalTasks: number
  totalFocusMin: number
  hasData: boolean
}

export function summarize(series: DayStat[], goalMl: number): StatsSummary {
  const totalWater = series.reduce((s, d) => s + d.waterMl, 0)
  const totalMoves = series.reduce((s, d) => s + d.moves, 0)
  const totalTasks = series.reduce((s, d) => s + d.tasksDone, 0)
  const totalFocusMin = series.reduce((s, d) => s + d.focusMin, 0)
  return {
    avgWaterMl: series.length ? Math.round(totalWater / series.length) : 0,
    goalDays: series.filter((d) => d.waterMl >= goalMl).length,
    totalMoves,
    totalTasks,
    totalFocusMin,
    hasData: totalWater + totalMoves + totalTasks + totalFocusMin > 0,
  }
}

/**
 * Consecutive days (oldest first in `series`) that satisfy `met`, counted back from
 * today. Today is still in progress, so it extends a streak but never breaks one.
 */
export function currentStreak(series: DayStat[], met: (day: DayStat) => boolean): number {
  let i = series.length - 1
  const last = series[i]
  if (last && !met(last)) i--
  let streak = 0
  for (; i >= 0; i--) {
    const day = series[i]
    if (!day || !met(day)) break
    streak++
  }
  return streak
}

/** A reminder nobody answered for this long counts as ignored. */
export const PENDING_GRACE_MS = 30 * MINUTE

export type Compliance = {
  /** Reminders that got a final answer (done, skipped or ignored). */
  answered: number
  done: number
  /** `done / answered`, or null when there is nothing to measure yet. */
  rate: number | null
}

/**
 * Share of reminders of `kind` that ended in "done". Snoozed ones are left out: the
 * follow-up reminder carries the real outcome. A pending one only counts once it has
 * waited longer than `PENDING_GRACE_MS`, as ignored.
 */
export function compliance(
  events: ReminderEvent[],
  kind: ReminderEvent['kind'],
  now: number,
): Compliance {
  let answered = 0
  let done = 0
  for (const e of events) {
    if (e.kind !== kind || e.outcome === 'snoozed') continue
    if (e.outcome === null && now - e.shownAt < PENDING_GRACE_MS) continue
    answered++
    if (e.outcome === 'done') done++
  }
  return { answered, done, rate: answered > 0 ? done / answered : null }
}
