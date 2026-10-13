import { DAY, HOUR, MINUTE, dayKey, startOfDay } from '@/lib/time'
import type { Appointment } from './types'

/** "Notify me N minutes before" choices, in minutes. */
export const REMIND_OPTIONS = [0, 5, 10, 15, 30, 60, 1440] as const
export const DEFAULT_REMIND_MIN = 10
export const SNOOZE_MIN = 10
/** An appointment this long past its start counts as missed: no late popup. */
export const NOTIFY_GRACE_MS = 6 * HOUR

export type AppointmentDraft = {
  title: string
  note: string
  startsAt: number
  remindBeforeMin: number
}

/** When the reminder for `a` first becomes due. */
export function remindAt(a: Appointment): number {
  return a.startsAt - a.remindBeforeMin * MINUTE
}

/** Due = not done, not yet notified, reminder time reached (and snooze over) but not long missed. */
export function isDue(a: Appointment, now: number): boolean {
  if (a.done || a.notifiedAt !== null) return false
  if (now > a.startsAt + NOTIFY_GRACE_MS) return false
  return now >= Math.max(remindAt(a), a.snoozedUntil ?? 0)
}

export function dueAppointments(items: Appointment[], now: number): Appointment[] {
  return items.filter((a) => isDue(a, now)).sort((a, b) => a.startsAt - b.startsAt)
}

export type AppointmentGroups = {
  /** Started already but not marked done. */
  overdue: Appointment[]
  /** Upcoming, grouped by local day, soonest first. */
  days: { dayStart: number; items: Appointment[] }[]
  done: Appointment[]
}

export function groupAppointments(items: Appointment[], now: number): AppointmentGroups {
  const active = items.filter((a) => !a.done).sort((a, b) => a.startsAt - b.startsAt)
  const overdue = active.filter((a) => a.startsAt < now)

  const days: AppointmentGroups['days'] = []
  const byDay = new Map<string, AppointmentGroups['days'][number]>()
  for (const a of active) {
    if (a.startsAt < now) continue
    const key = dayKey(a.startsAt)
    let group = byDay.get(key)
    if (!group) {
      group = { dayStart: startOfDay(a.startsAt), items: [] }
      byDay.set(key, group)
      days.push(group)
    }
    group.items.push(a)
  }

  const done = items.filter((a) => a.done).sort((a, b) => b.startsAt - a.startsAt)
  return { overdue, days, done }
}

export function upcomingAppointments(items: Appointment[], now: number, limit: number) {
  return items
    .filter((a) => !a.done && a.startsAt >= now)
    .sort((a, b) => a.startsAt - b.startsAt)
    .slice(0, limit)
}

/** Whole local days from today to `dayStart` (0 = today, 1 = tomorrow, -1 = yesterday). */
export function dayOffset(dayStart: number, now: number): number {
  return Math.round((dayStart - startOfDay(now)) / DAY)
}

export type RelativeParts = { value: number; unit: 'minute' | 'hour' | 'day' }

/** Coarse "in 25 minutes" / "2 hours ago" parts for Intl.RelativeTimeFormat. */
export function relativeParts(diffMs: number): RelativeParts {
  const sign = diffMs < 0 ? -1 : 1
  const abs = Math.abs(diffMs)
  if (abs < HOUR) return { value: sign * Math.round(abs / MINUTE) + 0, unit: 'minute' }
  if (abs < DAY) return { value: sign * Math.round(abs / HOUR), unit: 'hour' }
  return { value: sign * Math.round(abs / DAY), unit: 'day' }
}

/* ------------------------------------------------------------------ form */

const pad = (n: number) => String(n).padStart(2, '0')

/** `YYYY-MM-DD` for <input type="date">. */
export function toDateInput(ts: number): string {
  return dayKey(ts)
}

/** `HH:MM` for <input type="time">. */
export function toTimeInput(ts: number): string {
  const d = new Date(ts)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Local date + time inputs to epoch ms; null when either is malformed or impossible. */
export function fromInputs(date: string, time: string): number | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const tm = /^(\d{2}):(\d{2})$/.exec(time)
  if (!dm || !tm) return null
  const y = Number(dm[1])
  const mo = Number(dm[2])
  const d = Number(dm[3])
  const h = Number(tm[1])
  const mi = Number(tm[2])
  const dt = new Date(y, mo - 1, d, h, mi)
  const valid =
    dt.getFullYear() === y &&
    dt.getMonth() === mo - 1 &&
    dt.getDate() === d &&
    dt.getHours() === h &&
    dt.getMinutes() === mi
  return valid ? dt.getTime() : null
}

/** Suggested start for a new appointment: the next :00 or :30 at least ~10 minutes away. */
export function defaultStart(now: number): number {
  const d = new Date(now + 10 * MINUTE)
  d.setSeconds(0, 0)
  const m = d.getMinutes()
  if (m !== 0 && m !== 30) {
    if (m < 30) d.setMinutes(30)
    else {
      d.setHours(d.getHours() + 1)
      d.setMinutes(0)
    }
  }
  return d.getTime()
}

export type FormError = 'title' | 'datetime' | 'past'

/**
 * Validate the appointment form. A start in the past is rejected, except when
 * editing an appointment and leaving its start time unchanged.
 */
export function validateForm(
  input: { title: string; date: string; time: string },
  now: number,
  originalStartsAt?: number,
): FormError | null {
  if (!input.title.trim()) return 'title'
  const ts = fromInputs(input.date, input.time)
  if (ts === null) return 'datetime'
  if (ts <= now && ts !== originalStartsAt) return 'past'
  return null
}
