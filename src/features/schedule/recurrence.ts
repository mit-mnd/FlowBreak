import { DAY, MINUTE, endOfDay, startOfDay } from '@/lib/time'
import type { RepeatRule } from '@/lib/db'
import type { Appointment } from './types'

/**
 * Recurrence is computed from the series anchor (the first occurrence) every time, never
 * from the previous occurrence, so a monthly series started on the 31st returns to the
 * 31st after a short month instead of drifting to the 28th. Occurrences keep the anchor's
 * local wall-clock time, also across daylight-saving changes.
 */

export const REPEAT_RULES: readonly RepeatRule[] = [
  'none',
  'daily',
  'weekdays',
  'weekly',
  'monthly',
]

/** Anchor's local time of day on the given (possibly overflowing) calendar day. */
function onDay(anchor: Date, year: number, month: number, day: number): number {
  return new Date(year, month, day, anchor.getHours(), anchor.getMinutes()).getTime()
}

/** Whole local calendar days from the anchor's day to `ts`'s day (negative when earlier). */
function daysBetween(anchor: number, ts: number): number {
  return Math.round((startOfDay(ts) - startOfDay(anchor)) / DAY)
}

/**
 * Earliest occurrence of the series strictly after `after`, ignoring any end date.
 * The anchor itself counts as an occurrence (except for `weekdays` on a weekend).
 */
export function nextOccurrence(anchor: number, rule: RepeatRule, after: number): number | null {
  if (rule === 'none') return null
  const a = new Date(anchor)
  const y = a.getFullYear()
  const m = a.getMonth()
  const d = a.getDate()
  const diff = daysBetween(anchor, after)

  if (rule === 'daily' || rule === 'weekly') {
    const step = rule === 'daily' ? 1 : 7
    // Start one step early: `after` may fall before today's time of day.
    for (let k = Math.max(0, Math.floor(diff / step) - 1); ; k++) {
      const t = onDay(a, y, m, d + k * step)
      if (t > after) return t
    }
  }

  if (rule === 'weekdays') {
    for (let i = Math.max(0, diff - 1); i < Math.max(0, diff - 1) + 14; i++) {
      const t = onDay(a, y, m, d + i)
      const weekday = new Date(t).getDay()
      if (weekday !== 0 && weekday !== 6 && t > after) return t
    }
    return null
  }

  // monthly: same day of month, clamped to the last day of shorter months.
  const target = new Date(after)
  const months = target.getFullYear() * 12 + target.getMonth() - (y * 12 + m)
  for (let k = Math.max(0, months - 1); ; k++) {
    const index = y * 12 + m + k
    const year = Math.floor(index / 12)
    const month = index % 12
    const lastDay = new Date(year, month + 1, 0).getDate()
    const t = onDay(a, year, month, Math.min(d, lastDay))
    if (t > after) return t
  }
}

export function isRecurring(a: Pick<Appointment, 'repeat'>): boolean {
  return a.repeat !== 'none'
}

/** Next start of `a`'s series after `after`, or null when it does not repeat or has ended. */
export function nextStart(
  a: Pick<Appointment, 'repeat' | 'seriesStart' | 'repeatUntil'>,
  after: number,
): number | null {
  if (a.repeat === 'none' || a.seriesStart === null) return null
  const t = nextOccurrence(a.seriesStart, a.repeat, after)
  if (t === null) return null
  if (a.repeatUntil !== null && t > a.repeatUntil) return null
  return t
}

/** `YYYY-MM-DD` form value to the last moment of that local day; null when malformed. */
export function untilFromInput(date: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const dt = new Date(y, mo - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return endOfDay(dt.getTime())
}

/**
 * Move to the next occurrence after `after`, ready to be notified again.
 * Null when the series has no further occurrence.
 */
export function advanceAppointment(a: Appointment, after: number): Appointment | null {
  const next = nextStart(a, after)
  if (next === null) return null
  return { ...a, startsAt: next, notifiedAt: null, snoozedUntil: null, done: false }
}

/**
 * Recurring appointments whose occurrence has started and been handled move on to the
 * next one. `held` are ids still on screen in a reminder: they wait so "snooze" still
 * applies to the occurrence the user is looking at, unless the next occurrence's own
 * reminder is already due (then waiting would make us miss it).
 * Returns only the appointments that changed. The last occurrence of a series stays put.
 */
export function rollForward(
  items: readonly Appointment[],
  now: number,
  held: ReadonlySet<string> = new Set(),
): Appointment[] {
  const changed: Appointment[] = []
  for (const a of items) {
    if (!isRecurring(a) || a.done || a.notifiedAt === null || a.startsAt >= now) continue
    const next = advanceAppointment(a, now)
    if (!next) continue
    const nextRemindAt = next.startsAt - next.remindBeforeMin * MINUTE
    if (held.has(a.id) && now < nextRemindAt) continue
    changed.push(next)
  }
  return changed
}
