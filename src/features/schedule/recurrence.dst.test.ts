import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { nextOccurrence } from './recurrence'

/**
 * Daylight saving: occurrences keep the same local wall-clock time even though the
 * distance between them is 23 or 25 hours. Runs in a timezone that has DST.
 */
const realTz = process.env.TZ
beforeAll(() => {
  process.env.TZ = 'America/New_York'
})
afterAll(() => {
  if (realTz === undefined) delete process.env.TZ
  else process.env.TZ = realTz
})

const local = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ` +
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

describe('recurrence across daylight saving (America/New_York)', () => {
  it('the timezone override is active', () => {
    // 2026-03-08 02:30 does not exist in New York (clocks jump 02:00 -> 03:00).
    expect(local(new Date(2026, 2, 8, 2, 30))).toBe('2026-03-08 03:30')
    expect(new Date(2026, 6, 1, 12).getTimezoneOffset()).toBe(240)
    expect(new Date(2026, 0, 1, 12).getTimezoneOffset()).toBe(300)
  })

  it('daily 09:30 stays at 09:30 over spring-forward and fall-back', () => {
    const anchor = new Date(2026, 2, 6, 9, 30).getTime() // Fri before the change
    let after = anchor
    const seen: string[] = []
    for (let i = 0; i < 4; i++) {
      after = nextOccurrence(anchor, 'daily', after) as number
      seen.push(local(new Date(after)))
    }
    expect(seen).toEqual([
      '2026-03-07 09:30',
      '2026-03-08 09:30',
      '2026-03-09 09:30',
      '2026-03-10 09:30',
    ])

    const fall = new Date(2026, 9, 30, 9, 30).getTime() // Fri; clocks go back on Sun 11-01
    const a2 = nextOccurrence(fall, 'daily', new Date(2026, 9, 31, 12).getTime()) as number
    const a3 = nextOccurrence(fall, 'daily', a2) as number
    const a4 = nextOccurrence(fall, 'daily', a3) as number
    expect([a2, a3, a4].map((t) => local(new Date(t)))).toEqual([
      '2026-11-01 09:30',
      '2026-11-02 09:30',
      '2026-11-03 09:30',
    ])
  })

  it('weekly keeps its weekday and wall-clock time across the change', () => {
    const anchor = new Date(2026, 2, 2, 9, 30).getTime() // Monday
    const next = nextOccurrence(anchor, 'weekly', new Date(2026, 2, 8, 12).getTime()) as number
    expect(local(new Date(next))).toBe('2026-03-09 09:30')
  })

  it('an occurrence inside the missing hour lands right after it, on the same day', () => {
    const anchor = new Date(2026, 2, 7, 2, 30).getTime() // exists the day before
    const next = nextOccurrence(anchor, 'daily', anchor) as number
    expect(local(new Date(next))).toBe('2026-03-08 03:30')
    const after = nextOccurrence(anchor, 'daily', next) as number
    expect(local(new Date(after))).toBe('2026-03-09 02:30') // back to the real time of day
  })
})
