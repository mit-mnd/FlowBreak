import { dayKey, daysAgo } from '@/lib/time'
import type { MovementLog, Todo, WaterLog } from '@/lib/db'

export type DayStat = {
  key: string
  dayStart: number
  waterMl: number
  moves: number
  tasksDone: number
}

/** One entry per local day, oldest first, ending today. */
export function buildDailySeries(
  now: number,
  days: number,
  water: WaterLog[],
  movement: MovementLog[],
  todos: Todo[],
): DayStat[] {
  const series: DayStat[] = []
  const index = new Map<string, DayStat>()
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = daysAgo(now, i)
    const stat = { key: dayKey(dayStart), dayStart, waterMl: 0, moves: 0, tasksDone: 0 }
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
  return series
}

export type StatsSummary = {
  avgWaterMl: number
  goalDays: number
  totalMoves: number
  totalTasks: number
  hasData: boolean
}

export function summarize(series: DayStat[], goalMl: number): StatsSummary {
  const totalWater = series.reduce((s, d) => s + d.waterMl, 0)
  const totalMoves = series.reduce((s, d) => s + d.moves, 0)
  const totalTasks = series.reduce((s, d) => s + d.tasksDone, 0)
  return {
    avgWaterMl: series.length ? Math.round(totalWater / series.length) : 0,
    goalDays: series.filter((d) => d.waterMl >= goalMl).length,
    totalMoves,
    totalTasks,
    hasData: totalWater + totalMoves + totalTasks > 0,
  }
}
