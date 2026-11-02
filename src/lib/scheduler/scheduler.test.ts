import { describe, expect, it } from 'vitest'
import { MINUTE } from '@/lib/time'
import {
  applyAction,
  createInitialState,
  isWithinWorkHours,
  nextReminderAt,
  pause,
  renotifyDelayMin,
  tick,
} from './scheduler'
import type { SchedulerConfig } from './types'

// Monday 2026-10-12, local time.
const at = (h: number, m = 0) => new Date(2026, 9, 12, h, m).getTime()

const config: SchedulerConfig = {
  water: { enabled: true, intervalMin: 45 },
  movement: { enabled: true, intervalMin: 50 },
  workHours: { start: '08:00', end: '18:00', days: [1, 2, 3, 4, 5] },
  remindWaterAfterGoal: false,
  idleResetMin: 5,
  focusMaxDelayMin: 15,
  renotifyMin: 15,
  renotifyBackoff: 2,
  renotifyMaxMin: 60,
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

  it('stops water reminders once the daily goal is reached, but not movement', () => {
    const s = createInitialState(at(9))
    const done = { ...active(at(9, 50)), waterGoalReached: true }
    expect(tick(done, s, config).due).toEqual(['movement'])
  })

  it('keeps reminding about water after the goal when opted in', () => {
    const s = createInitialState(at(9))
    const done = { ...active(at(9, 50)), waterGoalReached: true }
    const optIn = { ...config, remindWaterAfterGoal: true }
    expect(tick(done, s, optIn).due).toEqual(['water', 'movement'])
  })

  it('uses the configured idle threshold', () => {
    const s = createInitialState(at(9))
    const relaxed = { ...config, idleResetMin: 15 }
    const input = { now: at(10), idleSec: 6 * 60, focusActive: false }
    expect(tick(input, s, relaxed).away).toBe(false)
    expect(tick({ ...input, idleSec: 15 * 60 }, s, relaxed).away).toBe(true)
  })

  it('skips disabled kinds', () => {
    const s = createInitialState(at(9))
    const off = { ...config, water: { ...config.water, enabled: false } }
    expect(tick(active(at(9, 50)), s, off).due).toEqual(['movement'])
  })
})

describe('backoff for unanswered reminders', () => {
  const waterOnly = { ...config, movement: { ...config.movement, enabled: false } }

  /** Run ticks at each time, feeding the state forward; returns the times it fired. */
  const firedAt = (cfg: SchedulerConfig, from: number, until: number) => {
    let state = createInitialState(at(9))
    const fired: number[] = []
    for (let t = from; t <= until; t += MINUTE) {
      const r = tick(active(t), state, cfg)
      state = r.state
      if (r.due.length > 0) fired.push(t)
    }
    return fired.map((t) => Math.round((t - at(9)) / MINUTE))
  }

  it('waits 15, 30, then 60 minutes when ignored (normal)', () => {
    // First at 45 min after 9:00, then +15, +30, +60, +60 (capped).
    expect(firedAt(waterOnly, at(9), at(14))).toEqual([45, 60, 90, 150, 210, 270])
  })

  it('repeats every 15 minutes when the backoff factor is 1 (frequent)', () => {
    const frequent = { ...waterOnly, renotifyBackoff: 1 }
    expect(firedAt(frequent, at(9), at(10, 50))).toEqual([45, 60, 75, 90, 105])
  })

  it('backs off faster with a larger factor (light): 15, 45, 60', () => {
    const light = { ...waterOnly, renotifyBackoff: 3 }
    expect(firedAt(light, at(9), at(12))).toEqual([45, 60, 105, 165])
  })

  it('counts every unanswered show, per kind', () => {
    const s = createInitialState(at(9))
    const first = tick(active(at(9, 50)), s, config)
    expect(first.due).toEqual(['water', 'movement'])
    expect(first.state.unanswered).toEqual({ water: 1, movement: 1 })
    // Only water is answered; movement keeps backing off.
    const answered = applyAction(first.state, 'water', 'done', at(9, 51))
    expect(answered.unanswered).toEqual({ water: 0, movement: 1 })
  })

  it('resets the backoff on done, skip and snooze', () => {
    const ignored = { ...createInitialState(at(9)), unanswered: { water: 3, movement: 2 } }
    for (const action of ['done', 'skip', 'snooze'] as const) {
      expect(applyAction(ignored, 'water', action, at(10)).unanswered).toEqual({
        water: 0,
        movement: 2,
      })
    }
  })

  it('resets the backoff when the user goes away', () => {
    const ignored = { ...createInitialState(at(9)), unanswered: { water: 3, movement: 3 } }
    const away = tick({ now: at(10), idleSec: 6 * 60, focusActive: false }, ignored, config)
    expect(away.state.unanswered).toEqual({ water: 0, movement: 0 })
  })

  it('resets the backoff outside work hours and while paused, without churning clean state', () => {
    const ignored = { ...createInitialState(at(17)), unanswered: { water: 2, movement: 1 } }
    expect(tick(active(at(19)), ignored, config).state.unanswered).toEqual({
      water: 0,
      movement: 0,
    })
    const paused = pause(ignored, at(11))
    expect(tick(active(at(9)), paused, config).state.unanswered).toEqual({ water: 0, movement: 0 })
    const clean = createInitialState(at(17))
    expect(tick(active(at(19)), clean, config).state).toBe(clean)
  })

  it('never waits less than renotifyMin, even if the cap is lower', () => {
    expect(renotifyDelayMin(5, { ...config, renotifyMaxMin: 5 })).toBe(15)
    expect(renotifyDelayMin(0, config)).toBe(15)
    expect(renotifyDelayMin(1, config)).toBe(30)
    expect(renotifyDelayMin(2, config)).toBe(60)
    expect(renotifyDelayMin(50, config)).toBe(60)
  })

  it('still respects an explicit snooze that is longer than the backoff', () => {
    const s = applyAction(createInitialState(at(9)), 'water', 'snooze', at(9, 45), 120)
    expect(tick(active(at(11)), s, waterOnly).due).toEqual([])
    expect(tick(active(at(11, 45)), s, waterOnly).due).toEqual(['water'])
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
