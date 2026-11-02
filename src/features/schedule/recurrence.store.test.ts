import { beforeEach, describe, expect, it } from 'vitest'
import { getRepos, setRepos } from '@/lib/db'
import { createMemoryRepos } from '@/lib/db/memory'
import { DAY, HOUR, MINUTE } from '@/lib/time'
import { dueAppointments, missedAppointments } from './logic'
import { untilFromInput } from './recurrence'
import { useAppointments } from './store'

const flush = () => new Promise((r) => setTimeout(r, 0))
const get = () => useAppointments.getState()
const first = () => get().items[0]!

/** Local 09:30 on the day `offset` days from now. */
const dayAt = (offset: number, h = 9, mi = 30) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  d.setHours(h, mi, 0, 0)
  return d.getTime()
}

const add = (over: Record<string, unknown> = {}) =>
  get().add({
    title: 'Standup',
    note: '',
    startsAt: dayAt(1),
    remindBeforeMin: 10,
    repeat: 'daily',
    ...over,
  })!

describe('recurring appointments in the store', () => {
  beforeEach(() => {
    localStorage.clear()
    setRepos(createMemoryRepos(`test-${Math.random()}`))
    useAppointments.setState({ items: [], loaded: true })
  })

  describe('add', () => {
    it('anchors a series at its first start', () => {
      const a = add({ repeatUntil: untilFromInput('2099-01-01') })
      expect(a).toMatchObject({ repeat: 'daily', seriesStart: a.startsAt })
      expect(a.repeatUntil).toBe(untilFromInput('2099-01-01'))
    })

    it('a one-off has no anchor or end date, even if an end date is passed', () => {
      const a = add({ repeat: 'none', repeatUntil: untilFromInput('2099-01-01') })
      expect(a).toMatchObject({ repeat: 'none', seriesStart: null, repeatUntil: null })
    })

    it('defaults to not repeating', () => {
      const a = get().add({ title: 'x', note: '', startsAt: dayAt(1), remindBeforeMin: 0 })!
      expect(a.repeat).toBe('none')
    })
  })

  describe('completing', () => {
    it('moves a future occurrence to the one after it, not done, ready to notify', () => {
      const a = add({ startsAt: dayAt(2) })
      get().markNotified([a.id], Date.now())
      const after = get().toggleDone(a.id)!
      expect(after.done).toBe(false)
      expect(after.startsAt).toBe(dayAt(3))
      expect(after).toMatchObject({ notifiedAt: null, snoozedUntil: null })
      expect(after.seriesStart).toBe(a.startsAt)
    })

    it('an overdue occurrence jumps past today, over every missed day', () => {
      const a = add({ startsAt: dayAt(-5) })
      const after = get().toggleDone(a.id)!
      expect(after.startsAt).toBeGreaterThan(Date.now())
      expect(after.startsAt).toBeLessThanOrEqual(Date.now() + DAY + HOUR)
      expect(after.done).toBe(false)
    })

    it('is done for real on the last occurrence of a series', () => {
      const a = add({
        startsAt: dayAt(1),
        repeatUntil: untilFromInput(new Date(dayAt(1)).toISOString().slice(0, 10)),
      })
      const after = get().toggleDone(a.id)!
      expect(after.done).toBe(true)
      expect(dueAppointments(get().items, dayAt(1))).toEqual([])
    })

    it('a one-off still just flips done and back', () => {
      const a = add({ repeat: 'none' })
      expect(get().toggleDone(a.id)!.done).toBe(true)
      expect(get().toggleDone(a.id)!.done).toBe(false)
    })

    it('un-ticking a finished series brings it back as done=false without moving it', () => {
      const a = add({ startsAt: dayAt(1), repeatUntil: dayAt(1) + 12 * HOUR })
      get().toggleDone(a.id)
      expect(first().done).toBe(true)
      expect(get().toggleDone(a.id)!.done).toBe(false)
      expect(first().startsAt).toBe(dayAt(1))
    })
  })

  describe('editing', () => {
    it('keeps the anchor when only the title changes (monthly day does not drift)', () => {
      const a = add({ repeat: 'monthly', startsAt: dayAt(1) })
      // Simulate a short month having rolled the occurrence earlier in the day.
      useAppointments.setState({ items: [{ ...a, startsAt: a.startsAt + 2 * DAY }] })
      get().update(a.id, { title: 'Renamed', repeat: 'monthly' })
      expect(first()).toMatchObject({ title: 'Renamed', seriesStart: a.seriesStart })
    })

    it('moving the start re-anchors the series there', () => {
      const a = add({ startsAt: dayAt(1) })
      get().update(a.id, { startsAt: dayAt(4, 15, 0) })
      expect(first()).toMatchObject({ startsAt: dayAt(4, 15, 0), seriesStart: dayAt(4, 15, 0) })
    })

    it('turning repetition on anchors at the current start; off clears everything', () => {
      const a = add({ repeat: 'none' })
      get().update(a.id, { repeat: 'weekly', repeatUntil: dayAt(60) })
      expect(first()).toMatchObject({
        repeat: 'weekly',
        seriesStart: a.startsAt,
        repeatUntil: dayAt(60),
      })
      get().update(a.id, { repeat: 'none' })
      expect(first()).toMatchObject({ repeat: 'none', seriesStart: null, repeatUntil: null })
    })

    it('changing the rule keeps the notified state when the time is unchanged', () => {
      const a = add()
      get().markNotified([a.id], 123)
      get().update(a.id, { repeat: 'weekly' })
      expect(first().notifiedAt).toBe(123)
    })

    it('can change or clear the end date', () => {
      const a = add({ repeatUntil: dayAt(30) })
      get().update(a.id, { repeatUntil: null })
      expect(first().repeatUntil).toBeNull()
      get().update(a.id, { repeatUntil: dayAt(10) })
      expect(first().repeatUntil).toBe(dayAt(10))
    })
  })

  describe('roll', () => {
    it('moves a handled, started occurrence on and persists it', async () => {
      const a = add({ startsAt: Date.now() - HOUR })
      get().markNotified([a.id], Date.now() - 2 * HOUR)
      get().roll(Date.now())
      const rolled = first()
      expect(rolled.startsAt).toBeGreaterThan(Date.now())
      expect(rolled.notifiedAt).toBeNull()

      await flush()
      const [stored] = await (await getRepos()).appointments.list()
      expect(stored?.startsAt).toBe(rolled.startsAt)
    })

    it('does nothing when nothing is eligible, keeping the same items array', () => {
      add({ startsAt: dayAt(2) })
      const before = get().items
      get().roll(Date.now())
      expect(get().items).toBe(before)
    })

    it('does not roll an occurrence whose reminder is still on screen', () => {
      const a = add({ startsAt: Date.now() - HOUR })
      get().markNotified([a.id], Date.now() - 2 * HOUR)
      get().roll(Date.now(), new Set([a.id]))
      expect(first().startsAt).toBe(a.startsAt)
    })

    it('REGRESSION: "snooze" on a shown recurring reminder still re-notifies it later', () => {
      // The reminder is on screen (held), so it is not rolled; snoozing then re-arms the
      // very same occurrence instead of losing the snooze to a later one.
      const a = add({ startsAt: Date.now() - 2 * MINUTE })
      get().markNotified([a.id], Date.now() - 12 * MINUTE)
      get().roll(Date.now(), new Set([a.id])) // popup open
      get().snooze([a.id], 10)
      expect(first().startsAt).toBe(a.startsAt)
      expect(dueAppointments(get().items, Date.now() + 9 * MINUTE)).toHaveLength(0)
      expect(dueAppointments(get().items, Date.now() + 10 * MINUTE + 1000)).toHaveLength(1)
      // While snoozed it must not roll away either.
      get().roll(Date.now() + 5 * MINUTE)
      expect(first().startsAt).toBe(a.startsAt)
    })

    it('a long-closed app: missed occurrence is reported once, then the series moves on', () => {
      const a = add({ startsAt: Date.now() - 3 * DAY })
      const missed = missedAppointments(get().items, Date.now())
      expect(missed.map((m) => m.id)).toEqual([a.id])
      get().markNotified([a.id], Date.now())
      get().roll(Date.now())
      expect(first().startsAt).toBeGreaterThan(Date.now())
      expect(missedAppointments(get().items, Date.now())).toEqual([])
    })

    it('after rolling, the next occurrence notifies once its reminder time comes', () => {
      const a = add({ startsAt: Date.now() - HOUR, remindBeforeMin: 10 })
      get().markNotified([a.id], Date.now() - 2 * HOUR)
      get().roll(Date.now())
      const next = first().startsAt
      expect(dueAppointments(get().items, next - 11 * MINUTE)).toHaveLength(0)
      expect(dueAppointments(get().items, next - 10 * MINUTE)).toHaveLength(1)
    })
  })

  it('loads rows saved before recurrence existed as one-offs', async () => {
    const prefix = `legacy-${Math.random()}`
    localStorage.setItem(
      `${prefix}:appointments`,
      JSON.stringify([
        {
          id: 'old',
          title: 'Old appointment',
          note: '',
          startsAt: Date.now() + HOUR,
          remindBeforeMin: 10,
          done: false,
          notifiedAt: null,
          snoozedUntil: null,
          createdAt: 0,
        },
      ]),
    )
    setRepos(createMemoryRepos(prefix))
    await get().load()
    expect(first()).toMatchObject({ repeat: 'none', repeatUntil: null, seriesStart: null })
  })

  it('persists recurrence fields', async () => {
    add({ repeat: 'weekdays', repeatUntil: dayAt(40) })
    await flush()
    await get().load()
    expect(first()).toMatchObject({ repeat: 'weekdays', repeatUntil: dayAt(40) })
  })
})
