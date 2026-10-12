import { describe, expect, it } from 'vitest'
import { buildDailySeries, summarize } from './logic'

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
})
