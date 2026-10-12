export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

/** Local calendar day as `YYYY-MM-DD`. */
export function dayKey(ts: number | Date): string {
  const d = typeof ts === 'number' ? new Date(ts) : ts
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Start of the local day `n` days before `ts` (n = 0 is today). */
export function daysAgo(ts: number, n: number): number {
  const d = new Date(startOfDay(ts))
  d.setDate(d.getDate() - n)
  return d.getTime()
}

/** Parse `HH:MM` into minutes after midnight. Invalid input returns 0. */
export function parseHHMM(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (!match) return 0
  return Number(match[1]) * 60 + Number(match[2])
}

export function minutesOfDay(ts: number): number {
  const d = new Date(ts)
  return d.getHours() * 60 + d.getMinutes()
}

/** Whole minutes from `from` to `to`, never negative. */
export function minutesBetween(from: number, to: number): number {
  return Math.max(0, Math.floor((to - from) / MINUTE))
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
