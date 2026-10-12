import { dayKey } from '@/lib/time'
import { clamp } from '@/lib/utils'
import type { WaterLog } from './types'

export function totalForDay(logs: WaterLog[], day: number): number {
  const key = dayKey(day)
  return logs.reduce((sum, l) => (dayKey(l.loggedAt) === key ? sum + l.amountMl : sum), 0)
}

export function goalProgress(totalMl: number, goalMl: number): number {
  if (goalMl <= 0) return 0
  return clamp(totalMl / goalMl, 0, 1)
}

export function remainingMl(totalMl: number, goalMl: number): number {
  return Math.max(0, goalMl - totalMl)
}
