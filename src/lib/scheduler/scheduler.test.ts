import { describe, expect, it } from 'vitest'
import { MINUTE } from '@/lib/time'
import {
  applyAction,
  createInitialState,
  isWithinWorkHours,
  nextReminderAt,
  pause,
  tick,
} from './scheduler'
import type { SchedulerConfig } from './types'

// Monday 2026-10-12, local time.
const at = (h: number, m = 0) => new Date(2026, 9, 12, h, m).getTime()

const config: SchedulerConfig = {
  water: { enabled: true, intervalMin: 45 },
  movement: { enabled: true, intervalMin: 50 },
  workHours: { start: '08:00', end: '18:00', days: [1, 2, 3, 4, 5] },
  idleResetMin: 5,
  focusMaxDelayMin: 15,
  renotifyMin: 15,
  naturalBreakWindowMin: 10,
}

const active = (now: number) => ({ now, idleSec: 0, focusActive: false })

describe('isWithinWorkHours', () => {
  it('respects start/end and weekdays', () => {
    expect(isWithinWorkHours(at(9), config.workHours)).toBe(true)
    expect(isWithinWorkHours(at(7, 59), config.workHours)).toBe(false)
    expect(isWithinWorkHours(at(18), config.workHours)).toBe(false)
    const sunday = new Date(2026, 9, 11, 10).getTime()
    expect(isWithinWorkHours(sunday, config.workHours)).toBe(false)
  })

  it('supports overnight windows', () => {
    const wh = { start: '22:00', end: '06:00', days: [1] }
    expect(isWithinWorkHours(at(23), wh)).toBe(true) // Monday night
    expect(isWithinWorkHours(new Date(2026, 9, 13, 2).getTime(), wh)).toBe(true) // Tue 2am
    expect(isWithinWorkHours(at(2), wh)).toBe(false) // Mon 2am belongs to Sunday's shift
  })
})

describe('tick', () => {
  it('fires water after the interval and groups simultaneous reminders', () => {
    const s = createInitialState(at(9))
    expect(tick(active(at(9, 44)), s, config).due).toEqual([])
    expect(tick(active(at(9, 45)), s, config).due).toEqual(['water'])
    expect(tick(active(at(9, 50)), s, config).due).toEqual(['water', 'movement'])
  })

  it('does not count time before work hours started', () => {
    const s = createInitialState(at(6))
    expect(tick(active(at(8, 5)), s, config).due).toEqual([])
    expect(nextReminderAt('water', s, config, at(8, 5))).toBe(at(8, 45))
  })

  it('does not remind outside work hours or while paused', () => {
    const s = createInitialState(at(17))
    expect(tick(active(at(19)), s, config).due).toEqual([])
    const paused = pause(createInitialState(at(9)), at(11))
    expect(tick(active(at(10)), paused, config).due).toEqual([])
    expect(tick(active(at(11)), paused, config).due.length).toBeGreaterThan(0)
  })

  it('treats long idle as away: resets sitting timer and stays silent', () => {
    const s = createInitialState(at(9))
    const r = tick({ now: at(10), idleSec: 6 * 60, focusActive: false }, s, config)
    expect(r.away).toBe(true)
    expect(r.due).toEqual([])
    expect(r.state.sittingSince).toBe(at(10))
  })

  it('renotifies an ignored reminder only after renotifyMin', () => {
    const s = createInitialState(at(9))
    const first = tick(active(at(9, 45)), s, config)
    expect(first.due).toEqual(['water'])
    expect(tick(active(at(9, 46)), first.state, config).due).toEqual([])
    expect(tick(active(at(10)), first.state, config).due).toContain('water')
  })

  it('delays reminders during focus by at most focusMaxDelayMin, gently', () => {
    const s = createInitialState(at(9))
    const focus = (now: number) => ({ now, idleSec: 0, focusActive: true })
    expect(tick(focus(at(9, 45)), s, config).due).toEqual([])
    const r = tick(focus(at(10)), s, config)
    expect(r.due).toEqual(['water'])
    expect(r.gentle).toBe(true)
  })

  it('pulls nearly-due reminders into a natural break', () => {
    const s = createInitialState(at(9))
    const brk = (now: number) => ({ now, idleSec: 0, focusActive: false, naturalBreak: true })
    expect(tick(brk(at(9, 30)), s, config).due).toEqual([])
    expect(tick(brk(at(9, 36)), s, config).due).toEqual(['water'])
  })

  it('skips disabled kinds', () => {
    const s = createInitialState(at(9))
    const off = { ...config, water: { ...config.water, enabled: false } }
    expect(tick(active(at(9, 50)), s, off).due).toEqual(['movement'])
  })
})

describe('applyAction', () => {
  it('snooze postpones by 10 minutes', () => {
    const s = applyAction(createInitialState(at(9)), 'water', 'snooze', at(9, 45))
    expect(tick(active(at(9, 50)), s, config).due).not.toContain('water')
    expect(tick(active(at(9, 55)), s, config).due).toContain('water')
  })

  it('done/skip restart the cycle', () => {
    const s = applyAction(createInitialState(at(9)), 'movement', 'done', at(9, 50))
    expect(s.sittingSince).toBe(at(9, 50))
    expect(nextReminderAt('movement', s, config, at(9, 50))).toBe(at(9, 50) + 50 * MINUTE)
    const w = applyAction(s, 'water', 'skip', at(9, 50))
    expect(w.lastWaterAt).toBe(at(9, 50))
  })
})
