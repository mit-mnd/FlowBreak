import { MINUTE, minutesOfDay, parseHHMM, startOfDay } from '@/lib/time'
import {
  REMINDER_KINDS,
  type ReminderAction,
  type ReminderKind,
  type SchedulerConfig,
  type SchedulerState,
  type TickInput,
  type TickResult,
  type WorkHours,
} from './types'

/**
 * Pure reminder scheduling. Every function takes `now` explicitly so the
 * behaviour is deterministic and unit-testable; nothing here reads the clock.
 */

export const DEFAULT_SNOOZE_MIN = 10

export function createInitialState(now: number): SchedulerState {
  return {
    lastWaterAt: now,
    sittingSince: now,
    snoozedUntil: { water: 0, movement: 0 },
    pausedUntil: 0,
  }
}

export function isWithinWorkHours(now: number, wh: WorkHours): boolean {
  const start = parseHHMM(wh.start)
  const end = parseHHMM(wh.end)
  const minute = minutesOfDay(now)
  const weekday = new Date(now).getDay()

  if (start === end) return wh.days.includes(weekday) // whole day
  if (start < end) return wh.days.includes(weekday) && minute >= start && minute < end

  // Overnight window: the part after midnight belongs to the previous day's shift.
  if (minute >= start) return wh.days.includes(weekday)
  if (minute < end) return wh.days.includes((weekday + 6) % 7)
  return false
}

/** Timestamp when today's work window opened (or `now`'s day start if none). */
function workWindowStart(now: number, wh: WorkHours): number {
  const start = parseHHMM(wh.start)
  const end = parseHHMM(wh.end)
  const dayStart = startOfDay(now)
  if (start > end && minutesOfDay(now) < end) {
    // Overnight shift that began yesterday.
    return dayStart - (24 * 60 - start) * MINUTE
  }
  return dayStart + start * MINUTE
}

/**
 * When `kind` is next due, ignoring snooze. Cycles never count time from
 * before the current work window, so nobody gets nagged the moment work starts.
 */
export function baseDueAt(
  kind: ReminderKind,
  state: SchedulerState,
  config: SchedulerConfig,
  now: number,
): number {
  const windowStart = workWindowStart(now, config.workHours)
  const last = kind === 'water' ? state.lastWaterAt : state.sittingSince
  return Math.max(last, windowStart) + config[kind].intervalMin * MINUTE
}

export function nextReminderAt(
  kind: ReminderKind,
  state: SchedulerState,
  config: SchedulerConfig,
  now: number,
): number {
  return Math.max(baseDueAt(kind, state, config, now), state.snoozedUntil[kind])
}

export function tick(input: TickInput, state: SchedulerState, config: SchedulerConfig): TickResult {
  const { now, idleSec, focusActive, naturalBreak = false } = input

  // Away (idle or screen locked): the user is not sitting, so reset the sitting timer.
  if (idleSec >= config.idleResetMin * 60) {
    return { state: { ...state, sittingSince: now }, due: [], away: true, gentle: false }
  }

  const quiet = now < state.pausedUntil || !isWithinWorkHours(now, config.workHours)
  if (quiet) return { state, due: [], away: false, gentle: false }

  const due: ReminderKind[] = []
  let gentle = false

  for (const kind of REMINDER_KINDS) {
    if (!config[kind].enabled) continue
    const base = baseDueAt(kind, state, config, now)
    const snooze = state.snoozedUntil[kind]
    let target = Math.max(base, snooze)

    if (naturalBreak) {
      // Pull a nearly-due reminder forward into the break, but never past a snooze.
      target = Math.max(base - config.naturalBreakWindowMin * MINUTE, snooze)
    } else if (focusActive) {
      target = Math.max(base + config.focusMaxDelayMin * MINUTE, snooze)
      if (now >= target) gentle = true
    }

    if (now >= target) due.push(kind)
  }

  if (due.length === 0) return { state, due, away: false, gentle: false }

  // Mark as shown: if ignored, show again after `renotifyMin`.
  const snoozedUntil = { ...state.snoozedUntil }
  for (const kind of due) snoozedUntil[kind] = now + config.renotifyMin * MINUTE
  return { state: { ...state, snoozedUntil }, due, away: false, gentle }
}

export function applyAction(
  state: SchedulerState,
  kind: ReminderKind,
  action: ReminderAction,
  now: number,
  snoozeMin = DEFAULT_SNOOZE_MIN,
): SchedulerState {
  const snoozedUntil = { ...state.snoozedUntil }
  if (action === 'snooze') {
    snoozedUntil[kind] = now + snoozeMin * MINUTE
    return { ...state, snoozedUntil }
  }
  // 'done' and 'skip' both start a fresh cycle; only 'done' is logged elsewhere.
  snoozedUntil[kind] = 0
  return kind === 'water'
    ? { ...state, lastWaterAt: now, snoozedUntil }
    : { ...state, sittingSince: now, snoozedUntil }
}

export function pause(state: SchedulerState, until: number): SchedulerState {
  return { ...state, pausedUntil: until }
}
