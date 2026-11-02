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
    unanswered: { water: 0, movement: 0 },
  }
}

const NONE_UNANSWERED = { water: 0, movement: 0 } as const

/** Wait before showing an unanswered reminder again, given how many went unanswered so far. */
export function renotifyDelayMin(unanswered: number, config: SchedulerConfig): number {
  const cap = Math.max(config.renotifyMin, config.renotifyMaxMin)
  return Math.min(cap, config.renotifyMin * config.renotifyBackoff ** unanswered)
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
  const { now, idleSec, focusActive, naturalBreak = false, waterGoalReached = false } = input

  // Away (idle or screen locked): the user is not sitting, so reset the sitting timer.
  if (idleSec >= config.idleResetMin * 60) {
    const unanswered = { ...NONE_UNANSWERED }
    return {
      state: { ...state, sittingSince: now, unanswered },
      due: [],
      away: true,
      gentle: false,
    }
  }

  const quiet = now < state.pausedUntil || !isWithinWorkHours(now, config.workHours)
  if (quiet) {
    // A fresh start after hours or a pause: do not carry the backoff over.
    const clean = state.unanswered.water === 0 && state.unanswered.movement === 0
    const next = clean ? state : { ...state, unanswered: { ...NONE_UNANSWERED } }
    return { state: next, due: [], away: false, gentle: false }
  }

  const due: ReminderKind[] = []
  let gentle = false

  for (const kind of REMINDER_KINDS) {
    if (!config[kind].enabled) continue
    if (kind === 'water' && waterGoalReached && !config.remindWaterAfterGoal) continue
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

  // Mark as shown: if ignored, show again later, waiting longer each time it goes unanswered.
  const snoozedUntil = { ...state.snoozedUntil }
  const unanswered = { ...state.unanswered }
  for (const kind of due) {
    snoozedUntil[kind] = now + renotifyDelayMin(unanswered[kind], config) * MINUTE
    unanswered[kind] += 1
  }
  return { state: { ...state, snoozedUntil, unanswered }, due, away: false, gentle }
}

export function applyAction(
  state: SchedulerState,
  kind: ReminderKind,
  action: ReminderAction,
  now: number,
  snoozeMin = DEFAULT_SNOOZE_MIN,
): SchedulerState {
  const snoozedUntil = { ...state.snoozedUntil }
  // Any response counts as engaging, so the backoff starts over.
  const unanswered = { ...state.unanswered, [kind]: 0 }
  if (action === 'snooze') {
    snoozedUntil[kind] = now + snoozeMin * MINUTE
    return { ...state, snoozedUntil, unanswered }
  }
  // 'done' and 'skip' both start a fresh cycle; only 'done' is logged elsewhere.
  snoozedUntil[kind] = 0
  return kind === 'water'
    ? { ...state, lastWaterAt: now, snoozedUntil, unanswered }
    : { ...state, sittingSince: now, snoozedUntil, unanswered }
}

export function pause(state: SchedulerState, until: number): SchedulerState {
  return { ...state, pausedUntil: until }
}
