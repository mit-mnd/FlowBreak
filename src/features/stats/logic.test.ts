import { describe, expect, it } from 'vitest'
import type { ReminderEvent } from '@/lib/db'
import {
  PENDING_GRACE_MS,
  buildDailySeries,
  compliance,
  currentStreak,
  summarize,
  type DayStat,
} from './logic'

const at = (d: number, h: number) => new Date(2026, 9, d, h).getTime()
const now = at(12, 15)

describe('stats', () => {
  const water = [
    { id: '1', amountMl: 2000, loggedAt: at(12, 9) },
    { id: '2', amountMl: 500, loggedAt: at(10, 9) },
    { id: '3', amountMl: 999, loggedAt: at(1, 9) }, // outside range
  ]
  const movement = [
    { id: 'm', exerciseId: 'walk', durationSec: 60, loggedAt: at(12, 10) },
    { id: 'n', exerciseId: 'walk', durationSec: 60, loggedAt: at(12, 11) },
  ]
  const todos = [
    {
      id: 'a',
      title: 'A',
      done: true,
      priority: 0 as const,
      position: 1,
      createdAt: 0,
      completedAt: at(11, 9),
    },
    {
      id: 'b',
      title: 'B',
      done: false,
      priority: 0 as const,
      position: 2,
      createdAt: 0,
      completedAt: null,
    },
  ]

  it('builds a 7-day series ending today', () => {
    const s = buildDailySeries(now, 7, water, movement, todos)
    expect(s).toHaveLength(7)
    expect(s[0]?.key).toBe('2026-10-06')
    expect(s[6]).toMatchObject({ key: '2026-10-12', waterMl: 2000, moves: 2, tasksDone: 0 })
    expect(s[5]).toMatchObject({ key: '2026-10-11', tasksDone: 1 })
    expect(s[4]).toMatchObject({ key: '2026-10-10', waterMl: 500 })
  })

  it('summarizes averages and goal days', () => {
    const sum = summarize(buildDailySeries(now, 7, water, movement, todos), 2000)
    expect(sum).toEqual({
      avgWaterMl: 357,
      goalDays: 1,
      totalMoves: 2,
      totalTasks: 1,
      hasData: true,
    })
    expect(summarize(buildDailySeries(now, 7, [], [], []), 2000).hasData).toBe(false)
  })

  it('measures a streak over a long real series, today still in progress', () => {
    const logs = [
      { id: 'a', amountMl: 2000, loggedAt: at(10, 9) },
      { id: 'b', amountMl: 2000, loggedAt: at(11, 9) },
      { id: 'c', amountMl: 800, loggedAt: at(12, 9) }, // today, below goal so far
    ]
    const series = buildDailySeries(now, 90, logs, [], [])
    expect(series).toHaveLength(90)
    expect(currentStreak(series, (d) => d.waterMl >= 2000)).toBe(2)
  })
})

describe('currentStreak', () => {
  const day = (waterMl: number, moves = 0): DayStat => ({
    key: '',
    dayStart: 0,
    waterMl,
    moves,
    tasksDone: 0,
  })
  const goal = (d: DayStat) => d.waterMl >= 2000

  it('counts consecutive days ending today', () => {
    expect(currentStreak([day(0), day(2000), day(2500), day(2000)], goal)).toBe(3)
  })

  it('does not break the streak while today is still in progress', () => {
    expect(currentStreak([day(2000), day(2000), day(500)], goal)).toBe(2)
  })

  it('breaks on a missed day before today', () => {
    expect(currentStreak([day(2000), day(100), day(2000), day(500)], goal)).toBe(1)
    expect(currentStreak([day(2000), day(100), day(2000), day(2000)], goal)).toBe(2)
  })

  it('is zero with no qualifying day, and for an empty series', () => {
    expect(currentStreak([day(0), day(0)], goal)).toBe(0)
    expect(currentStreak([], goal)).toBe(0)
  })

  it('works for movement days too', () => {
    expect(currentStreak([day(0, 1), day(0, 3), day(0, 0)], (d) => d.moves > 0)).toBe(2)
  })
})

describe('compliance', () => {
  const HOUR_MS = 3_600_000
  const t = 10 * HOUR_MS
  const ev = (over: Partial<ReminderEvent>): ReminderEvent => ({
    id: String(Math.random()),
    kind: 'water',
    shownAt: t - HOUR_MS,
    outcome: 'done',
    resolvedAt: t - HOUR_MS + 60_000,
    ...over,
  })

  it('is null when there is nothing to measure', () => {
    expect(compliance([], 'water', t)).toEqual({ answered: 0, done: 0, rate: null })
  })

  it('divides done by answered for the requested kind only', () => {
    const events = [
      ev({}),
      ev({ outcome: 'skipped' }),
      ev({ outcome: 'ignored' }),
      ev({ outcome: 'done', kind: 'movement' }),
    ]
    expect(compliance(events, 'water', t)).toEqual({ answered: 3, done: 1, rate: 1 / 3 })
    expect(compliance(events, 'movement', t)).toEqual({ answered: 1, done: 1, rate: 1 })
  })

  it('leaves snoozed reminders out of both sides', () => {
    const events = [ev({ outcome: 'snoozed' }), ev({ outcome: 'done' })]
    expect(compliance(events, 'water', t)).toEqual({ answered: 1, done: 1, rate: 1 })
  })

  it('counts a long-pending reminder as ignored but not a fresh one', () => {
    const fresh = ev({ outcome: null, shownAt: t - 5 * 60_000 })
    const stale = ev({ outcome: null, shownAt: t - PENDING_GRACE_MS })
    expect(compliance([fresh], 'water', t).answered).toBe(0)
    expect(compliance([stale], 'water', t)).toEqual({ answered: 1, done: 0, rate: 0 })
  })
})
