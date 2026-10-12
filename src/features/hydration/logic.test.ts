import { describe, expect, it } from 'vitest'
import { goalProgress, remainingMl, totalForDay } from './logic'

const at = (d: number, h: number) => new Date(2026, 9, d, h).getTime()

describe('hydration logic', () => {
  const logs = [
    { id: 'a', amountMl: 250, loggedAt: at(11, 22) },
    { id: 'b', amountMl: 250, loggedAt: at(12, 9) },
    { id: 'c', amountMl: 350, loggedAt: at(12, 14) },
  ]

  it('sums only the given local day', () => {
    expect(totalForDay(logs, at(12, 18))).toBe(600)
    expect(totalForDay(logs, at(11, 8))).toBe(250)
    expect(totalForDay(logs, at(13, 8))).toBe(0)
  })

  it('clamps progress and remaining', () => {
    expect(goalProgress(500, 2000)).toBe(0.25)
    expect(goalProgress(2500, 2000)).toBe(1)
    expect(goalProgress(100, 0)).toBe(0)
    expect(remainingMl(2500, 2000)).toBe(0)
    expect(remainingMl(600, 2000)).toBe(1400)
  })
})
