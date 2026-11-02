import { beforeEach, describe, expect, it } from 'vitest'
import { kvSet } from '@/lib/tauri'
import { useReminders } from './reminders-store'

describe('useReminders.load', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('fills in fields missing from a state saved by an older version', async () => {
    // Saved before the backoff counters existed.
    await kvSet('scheduler', {
      lastWaterAt: 1000,
      sittingSince: 500,
      snoozedUntil: { water: 0, movement: 0 },
      pausedUntil: 0,
    })
    await useReminders.getState().load()
    const { state } = useReminders.getState()
    expect(state.unanswered).toEqual({ water: 0, movement: 0 })
    expect(state.lastWaterAt).toBe(1000)
    expect(state.sittingSince).toBeGreaterThan(500)
  })

  it('keeps saved counters', async () => {
    await kvSet('scheduler', {
      lastWaterAt: 1,
      sittingSince: 1,
      snoozedUntil: { water: 0, movement: 0 },
      pausedUntil: 0,
      unanswered: { water: 2, movement: 1 },
    })
    await useReminders.getState().load()
    expect(useReminders.getState().state.unanswered).toEqual({ water: 2, movement: 1 })
  })
})
