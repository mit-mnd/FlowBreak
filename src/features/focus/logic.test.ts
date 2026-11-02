import { describe, expect, it } from 'vitest'
import { MINUTE } from '@/lib/time'
import type { FocusLog } from '@/lib/db'
import {
  finishSession,
  focusEndsAt,
  focusMinutes,
  focusMinutesByTask,
  isFocusActive,
} from './logic'
import type { FocusSession } from './types'

const T0 = new Date(2026, 9, 12, 9, 0).getTime()
const session = (over: Partial<FocusSession> = {}): FocusSession => ({
  id: 's1',
  taskId: 'task',
  title: 'Write report',
  startedAt: T0,
  durationMin: 25,
  ...over,
})

describe('isFocusActive', () => {
  it('is active until the planned end', () => {
    const s = session()
    expect(focusEndsAt(s)).toBe(T0 + 25 * MINUTE)
    expect(isFocusActive(s, T0 + 25 * MINUTE - 1)).toBe(true)
    expect(isFocusActive(s, T0 + 25 * MINUTE)).toBe(false)
    expect(isFocusActive(null, T0)).toBe(false)
  })
})

describe('finishSession', () => {
  it('records an early stop with the real elapsed time, not completed', () => {
    const log = finishSession(session(), T0 + 10 * MINUTE)
    expect(log).toEqual({
      id: 's1',
      taskId: 'task',
      title: 'Write report',
      startedAt: T0,
      endedAt: T0 + 10 * MINUTE,
      plannedMin: 25,
      completed: false,
    })
  })

  it('records a full session as completed, ending exactly at the planned end', () => {
    const log = finishSession(session(), T0 + 25 * MINUTE)
    expect(log).toMatchObject({ endedAt: T0 + 25 * MINUTE, completed: true })
  })

  it('does not count time after the planned end when noticed late', () => {
    // e.g. the app was closed, or the banner was not on screen.
    const log = finishSession(session(), T0 + 5 * 60 * MINUTE)
    expect(log).toMatchObject({ endedAt: T0 + 25 * MINUTE, completed: true })
    expect(focusMinutes(log!)).toBe(25)
  })

  it('drops accidental sessions shorter than a minute', () => {
    expect(finishSession(session(), T0 + 59_000)).toBeNull()
    expect(finishSession(session(), T0)).toBeNull()
    expect(finishSession(session(), T0 + MINUTE)).not.toBeNull()
  })

  it('keeps a session without a task', () => {
    const log = finishSession(session({ taskId: null, title: null }), T0 + 5 * MINUTE)
    expect(log).toMatchObject({ taskId: null, title: null })
  })
})

describe('focus minutes', () => {
  const log = (taskId: string | null, startMin: number, endMin: number): FocusLog => ({
    id: `${taskId}-${startMin}`,
    taskId,
    title: null,
    startedAt: T0 + startMin * MINUTE,
    endedAt: T0 + endMin * MINUTE,
    plannedMin: 25,
    completed: true,
  })

  it('rounds to whole minutes', () => {
    expect(focusMinutes({ startedAt: 0, endedAt: 90_000 })).toBe(2)
    expect(focusMinutes({ startedAt: 0, endedAt: 80_000 })).toBe(1)
  })

  it('sums per task and skips sessions without a task', () => {
    const logs = [log('a', 0, 25), log('a', 60, 70), log('b', 100, 115), log(null, 200, 230)]
    expect(focusMinutesByTask(logs)).toEqual({ a: 35, b: 15 })
  })

  it('rounds the total, not each session, so short sessions do not drift', () => {
    const half = (id: string, start: number): FocusLog => ({
      ...log('a', 0, 0),
      id,
      startedAt: T0 + start,
      endedAt: T0 + start + 90_000, // 1.5 min each
    })
    // Three 1.5-minute sessions = 4.5 min -> 5, not 3 x round(1.5) = 6.
    expect(focusMinutesByTask([half('1', 0), half('2', 1e6), half('3', 2e6)])).toEqual({ a: 5 })
  })

  it('is empty for no logs', () => {
    expect(focusMinutesByTask([])).toEqual({})
  })
})
