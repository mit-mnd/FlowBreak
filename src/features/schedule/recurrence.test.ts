import { describe, expect, it } from 'vitest'
import { DAY, HOUR, MINUTE } from '@/lib/time'
import type { Appointment } from './types'
import {
  advanceAppointment,
  isRecurring,
  nextOccurrence,
  nextStart,
  rollForward,
  untilFromInput,
} from './recurrence'

/** Local time; month is 1-based here for readability. */
const at = (y: number, mo: number, d: number, h = 9, mi = 30) =>
  new Date(y, mo - 1, d, h, mi).getTime()
const fmt = (ts: number | null) => {
  if (ts === null) return null
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// 2026-10-12 is a Monday.
const MON = at(2026, 10, 12)

describe('nextOccurrence: none', () => {
  it('never repeats', () => {
    expect(nextOccurrence(MON, 'none', MON - DAY)).toBeNull()
  })
})

describe('nextOccurrence: daily', () => {
  it('returns the anchor itself while it is still ahead', () => {
    expect(fmt(nextOccurrence(MON, 'daily', MON - MINUTE))).toBe('2026-10-12 09:30')
    expect(fmt(nextOccurrence(MON, 'daily', MON - 5 * DAY))).toBe('2026-10-12 09:30')
  })

  it('is strictly after `after`', () => {
    expect(fmt(nextOccurrence(MON, 'daily', MON))).toBe('2026-10-13 09:30')
  })

  it("picks today when `after` is earlier than today's time of day", () => {
    expect(fmt(nextOccurrence(MON, 'daily', at(2026, 10, 15, 8, 0)))).toBe('2026-10-15 09:30')
    expect(fmt(nextOccurrence(MON, 'daily', at(2026, 10, 15, 9, 30)))).toBe('2026-10-16 09:30')
    expect(fmt(nextOccurrence(MON, 'daily', at(2026, 10, 15, 23, 59)))).toBe('2026-10-16 09:30')
  })

  it('crosses month and year ends', () => {
    expect(fmt(nextOccurrence(MON, 'daily', at(2026, 10, 31, 10, 0)))).toBe('2026-11-01 09:30')
    expect(fmt(nextOccurrence(MON, 'daily', at(2026, 12, 31, 10, 0)))).toBe('2027-01-01 09:30')
  })

  it('handles a distant `after` without looping', () => {
    const after = at(2031, 3, 3, 12, 0)
    expect(fmt(nextOccurrence(MON, 'daily', after))).toBe('2031-03-04 09:30')
  })
})

describe('nextOccurrence: weekly', () => {
  it('keeps the anchor weekday and time', () => {
    expect(fmt(nextOccurrence(MON, 'weekly', MON))).toBe('2026-10-19 09:30')
    expect(fmt(nextOccurrence(MON, 'weekly', at(2026, 10, 14)))).toBe('2026-10-19 09:30')
    expect(fmt(nextOccurrence(MON, 'weekly', at(2026, 10, 19, 9, 29)))).toBe('2026-10-19 09:30')
    expect(fmt(nextOccurrence(MON, 'weekly', at(2026, 10, 19, 9, 30)))).toBe('2026-10-26 09:30')
  })

  it('is always on the same weekday far in the future', () => {
    const t = nextOccurrence(MON, 'weekly', at(2029, 6, 20)) as number
    expect(new Date(t).getDay()).toBe(1)
    expect(t).toBeGreaterThan(at(2029, 6, 20))
    expect(t - at(2029, 6, 20)).toBeLessThanOrEqual(7 * DAY)
  })
})

describe('nextOccurrence: weekdays', () => {
  const FRI = at(2026, 10, 16)

  it('skips the weekend', () => {
    expect(fmt(nextOccurrence(FRI, 'weekdays', FRI))).toBe('2026-10-19 09:30') // Fri -> Mon
    expect(fmt(nextOccurrence(FRI, 'weekdays', at(2026, 10, 17)))).toBe('2026-10-19 09:30') // Sat
    expect(fmt(nextOccurrence(FRI, 'weekdays', at(2026, 10, 18, 20)))).toBe('2026-10-19 09:30') // Sun
  })

  it('moves one weekday at a time during the week', () => {
    expect(fmt(nextOccurrence(MON, 'weekdays', MON))).toBe('2026-10-13 09:30')
    expect(fmt(nextOccurrence(MON, 'weekdays', at(2026, 10, 14, 9, 30)))).toBe('2026-10-15 09:30')
    expect(fmt(nextOccurrence(MON, 'weekdays', at(2026, 10, 14, 8)))).toBe('2026-10-14 09:30')
  })

  it('is never on a weekend, even far away', () => {
    for (let i = 0; i < 40; i++) {
      const t = nextOccurrence(MON, 'weekdays', at(2027, 1, 1) + i * 19 * HOUR) as number
      expect([0, 6]).not.toContain(new Date(t).getDay())
    }
  })

  it('starts on the next weekday when the anchor is on a weekend', () => {
    const sat = at(2026, 10, 17)
    expect(fmt(nextOccurrence(sat, 'weekdays', sat - DAY))).toBe('2026-10-19 09:30')
  })
})

describe('nextOccurrence: monthly', () => {
  const JAN31 = at(2026, 1, 31)

  it('clamps to short months and returns to the 31st afterwards (no drift)', () => {
    const seen: string[] = []
    let after = JAN31
    for (let i = 0; i < 6; i++) {
      after = nextOccurrence(JAN31, 'monthly', after) as number
      seen.push(fmt(after)!)
    }
    expect(seen).toEqual([
      '2026-02-28 09:30',
      '2026-03-31 09:30',
      '2026-04-30 09:30',
      '2026-05-31 09:30',
      '2026-06-30 09:30',
      '2026-07-31 09:30',
    ])
  })

  it('uses Feb 29 in a leap year', () => {
    expect(fmt(nextOccurrence(at(2028, 1, 31), 'monthly', at(2028, 1, 31)))).toBe(
      '2028-02-29 09:30',
    )
  })

  it('keeps day 30 after February instead of falling back to 28', () => {
    const jan30 = at(2026, 1, 30)
    const feb = nextOccurrence(jan30, 'monthly', jan30) as number
    expect(fmt(feb)).toBe('2026-02-28 09:30')
    expect(fmt(nextOccurrence(jan30, 'monthly', feb))).toBe('2026-03-30 09:30')
  })

  it('rolls over the year', () => {
    expect(fmt(nextOccurrence(at(2026, 12, 15), 'monthly', at(2026, 12, 15)))).toBe(
      '2027-01-15 09:30',
    )
  })

  it('picks this month when `after` is before the time of day, next month after it', () => {
    const d15 = at(2026, 1, 15)
    expect(fmt(nextOccurrence(d15, 'monthly', at(2026, 6, 15, 8)))).toBe('2026-06-15 09:30')
    expect(fmt(nextOccurrence(d15, 'monthly', at(2026, 6, 15, 9, 30)))).toBe('2026-07-15 09:30')
  })

  it('handles a distant `after`', () => {
    expect(fmt(nextOccurrence(JAN31, 'monthly', at(2034, 2, 1)))).toBe('2034-02-28 09:30')
  })
})

describe('nextStart and the end date', () => {
  const series = (over: Partial<Appointment> = {}) => ({
    repeat: 'daily' as const,
    seriesStart: MON,
    repeatUntil: null,
    ...over,
  })

  it('is null for a one-off or a series without an anchor', () => {
    expect(nextStart(series({ repeat: 'none' }), MON)).toBeNull()
    expect(nextStart(series({ seriesStart: null }), MON)).toBeNull()
  })

  it('stops after the end date, which is inclusive for the whole day', () => {
    const until = untilFromInput('2026-10-14')!
    expect(fmt(nextStart(series({ repeatUntil: until }), at(2026, 10, 13)))).toBe(
      '2026-10-14 09:30',
    )
    expect(nextStart(series({ repeatUntil: until }), at(2026, 10, 14))).toBeNull()
  })

  it('an end date before the next occurrence ends the series', () => {
    expect(nextStart(series({ repeatUntil: MON }), MON)).toBeNull()
  })
})

describe('untilFromInput', () => {
  it('is the last moment of that local day', () => {
    const t = untilFromInput('2026-10-14')!
    const d = new Date(t)
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([
      2026, 9, 14, 23, 59,
    ])
    expect(d.getSeconds()).toBe(59)
  })

  it('rejects malformed and impossible dates', () => {
    expect(untilFromInput('')).toBeNull()
    expect(untilFromInput('abc')).toBeNull()
    expect(untilFromInput('2026-02-30')).toBeNull()
    expect(untilFromInput('2026-13-01')).toBeNull()
  })
})

const appt = (over: Partial<Appointment> = {}): Appointment => ({
  id: 'a',
  title: 'Standup',
  note: '',
  startsAt: MON,
  remindBeforeMin: 10,
  done: false,
  notifiedAt: null,
  snoozedUntil: null,
  repeat: 'daily',
  repeatUntil: null,
  seriesStart: MON,
  createdAt: 0,
  ...over,
})

describe('isRecurring / advanceAppointment', () => {
  it('detects recurrence', () => {
    expect(isRecurring(appt())).toBe(true)
    expect(isRecurring(appt({ repeat: 'none' }))).toBe(false)
  })

  it('moves to the next occurrence and clears notification state', () => {
    const next = advanceAppointment(appt({ notifiedAt: 5, snoozedUntil: 7, done: true }), MON)!
    expect(fmt(next.startsAt)).toBe('2026-10-13 09:30')
    expect(next).toMatchObject({ notifiedAt: null, snoozedUntil: null, done: false })
    expect(next.seriesStart).toBe(MON) // the anchor never moves
  })

  it('is null when the series is over or does not repeat', () => {
    expect(advanceAppointment(appt({ repeatUntil: MON }), MON)).toBeNull()
    expect(advanceAppointment(appt({ repeat: 'none', seriesStart: null }), MON)).toBeNull()
  })
})

describe('rollForward', () => {
  const now = at(2026, 10, 12, 14, 0) // after today's 09:30 occurrence
  const handled = (over: Partial<Appointment> = {}) =>
    appt({ notifiedAt: MON - 10 * MINUTE, ...over })

  it('moves a handled, started occurrence to the next one', () => {
    const [next] = rollForward([handled()], now)
    expect(fmt(next?.startsAt ?? null)).toBe('2026-10-13 09:30')
    expect(next).toMatchObject({ notifiedAt: null, snoozedUntil: null })
  })

  it('jumps over every missed day to the first occurrence after now', () => {
    const later = at(2026, 10, 20, 14)
    const [next] = rollForward([handled()], later)
    expect(fmt(next?.startsAt ?? null)).toBe('2026-10-21 09:30')
  })

  it('leaves alone: one-offs, not-yet-notified, not-yet-started, done', () => {
    const items = [
      handled({ id: 'one', repeat: 'none', seriesStart: null }),
      appt({ id: 'silent' }), // never notified: must be notified (or reported missed) first
      handled({ id: 'future', startsAt: at(2026, 10, 13) }),
      handled({ id: 'done', done: true }),
    ]
    expect(rollForward(items, now)).toEqual([])
  })

  it('a snoozed occurrence (notifiedAt cleared) is not rolled, so the snooze still applies', () => {
    expect(rollForward([appt({ snoozedUntil: now + 5 * MINUTE })], now)).toEqual([])
  })

  it('waits while the reminder is on screen', () => {
    expect(rollForward([handled()], now, new Set(['a']))).toEqual([])
  })

  it("stops waiting once the next occurrence's own reminder is due", () => {
    const nextRemind = at(2026, 10, 13, 9, 20)
    expect(rollForward([handled()], nextRemind - MINUTE, new Set(['a']))).toEqual([])
    expect(rollForward([handled()], nextRemind, new Set(['a']))).toHaveLength(1)
  })

  it('keeps the last occurrence of a finished series in place', () => {
    expect(rollForward([handled({ repeatUntil: MON })], now)).toEqual([])
  })

  it('returns only the appointments that changed', () => {
    const items = [handled({ id: 'x' }), handled({ id: 'y', repeat: 'none', seriesStart: null })]
    expect(rollForward(items, now).map((a) => a.id)).toEqual(['x'])
  })
})
