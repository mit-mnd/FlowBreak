import { describe, expect, it } from 'vitest'
import { HOUR, MINUTE } from '@/lib/time'
import type { Appointment } from './types'
import {
  NOTIFY_GRACE_MS,
  defaultStart,
  dueAppointments,
  fromInputs,
  groupAppointments,
  isDue,
  relativeParts,
  remindAt,
  toDateInput,
  toTimeInput,
  upcomingAppointments,
  validateForm,
} from './logic'

// Monday 2026-10-12 10:00 local.
const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).getTime()
const now = at(12, 10)

const appt = (over: Partial<Appointment> = {}): Appointment => ({
  id: 'a',
  title: 'Meeting',
  note: '',
  startsAt: at(12, 14),
  remindBeforeMin: 10,
  done: false,
  notifiedAt: null,
  snoozedUntil: null,
  createdAt: 0,
  ...over,
})

describe('notification timing', () => {
  it('becomes due exactly remindBeforeMin before the start', () => {
    const a = appt()
    expect(remindAt(a)).toBe(at(12, 13, 50))
    expect(isDue(a, at(12, 13, 49))).toBe(false)
    expect(isDue(a, at(12, 13, 50))).toBe(true)
    expect(isDue(appt({ remindBeforeMin: 0 }), at(12, 14))).toBe(true)
  })

  it('fires once: notified or done appointments are not due', () => {
    expect(isDue(appt({ notifiedAt: at(12, 13, 50) }), at(12, 14))).toBe(false)
    expect(isDue(appt({ done: true }), at(12, 14))).toBe(false)
  })

  it('waits for a snooze to end', () => {
    const a = appt({ snoozedUntil: at(12, 14, 5) })
    expect(isDue(a, at(12, 14, 4))).toBe(false)
    expect(isDue(a, at(12, 14, 5))).toBe(true)
  })

  it('does not fire for long-missed appointments', () => {
    const a = appt()
    expect(isDue(a, a.startsAt + NOTIFY_GRACE_MS)).toBe(true)
    expect(isDue(a, a.startsAt + NOTIFY_GRACE_MS + MINUTE)).toBe(false)
  })

  it('lists due appointments soonest first', () => {
    const late = appt({ id: 'late', startsAt: at(12, 15), remindBeforeMin: 120 })
    const soon = appt({ id: 'soon', startsAt: at(12, 11) })
    expect(dueAppointments([late, soon], at(12, 13)).map((a) => a.id)).toEqual(['soon', 'late'])
  })
})

describe('grouping', () => {
  const items = [
    appt({ id: 'past', startsAt: at(12, 8) }),
    appt({ id: 'today2', startsAt: at(12, 16) }),
    appt({ id: 'today1', startsAt: at(12, 11) }),
    appt({ id: 'tomorrow', startsAt: at(13, 9) }),
    appt({ id: 'finished', startsAt: at(12, 9), done: true }),
  ]

  it('splits overdue / upcoming by day / done', () => {
    const g = groupAppointments(items, now)
    expect(g.overdue.map((a) => a.id)).toEqual(['past'])
    expect(g.days.map((d) => d.items.map((a) => a.id))).toEqual([
      ['today1', 'today2'],
      ['tomorrow'],
    ])
    expect(g.done.map((a) => a.id)).toEqual(['finished'])
  })

  it('returns only upcoming items, limited, for the dashboard', () => {
    expect(upcomingAppointments(items, now, 2).map((a) => a.id)).toEqual(['today1', 'today2'])
  })
})

describe('relativeParts', () => {
  it('picks a coarse unit and keeps the sign', () => {
    expect(relativeParts(25 * MINUTE)).toEqual({ value: 25, unit: 'minute' })
    expect(relativeParts(-2 * HOUR)).toEqual({ value: -2, unit: 'hour' })
    expect(relativeParts(3 * 24 * HOUR)).toEqual({ value: 3, unit: 'day' })
    expect(relativeParts(10_000).value).toBe(0)
  })
})

describe('form helpers', () => {
  it('round-trips local date and time inputs', () => {
    const ts = at(15, 9, 5)
    expect(toDateInput(ts)).toBe('2026-10-15')
    expect(toTimeInput(ts)).toBe('09:05')
    expect(fromInputs('2026-10-15', '09:05')).toBe(ts)
  })

  it('rejects malformed or impossible values', () => {
    expect(fromInputs('', '09:05')).toBeNull()
    expect(fromInputs('2026-10-15', '')).toBeNull()
    expect(fromInputs('2026-02-30', '09:00')).toBeNull()
    expect(fromInputs('2026-10-15', '25:00')).toBeNull()
  })

  it('suggests the next half hour at least ~10 minutes ahead', () => {
    expect(defaultStart(at(12, 10, 0))).toBe(at(12, 10, 30))
    expect(defaultStart(at(12, 10, 25))).toBe(at(12, 11, 0))
    expect(defaultStart(at(12, 10, 45))).toBe(at(12, 11, 0))
    expect(defaultStart(at(12, 10, 55))).toBe(at(12, 11, 30))
  })

  it('validates title, date/time and past times', () => {
    const ok = { title: 'Dentist', date: '2026-10-13', time: '09:00' }
    expect(validateForm(ok, now)).toBeNull()
    expect(validateForm({ ...ok, title: '   ' }, now)).toBe('title')
    expect(validateForm({ ...ok, time: '' }, now)).toBe('datetime')
    expect(validateForm({ ...ok, date: '2026-10-11' }, now)).toBe('past')
    // Editing without touching the time keeps a past start valid.
    const past = { title: 'Old', date: '2026-10-12', time: '08:00' }
    expect(validateForm(past, now, at(12, 8))).toBeNull()
  })
})
