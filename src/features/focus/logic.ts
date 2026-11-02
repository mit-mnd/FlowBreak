import type { FocusLog } from '@/lib/db'
import { MINUTE } from '@/lib/time'
import type { FocusSession } from './types'

/** Sessions shorter than this are accidental starts and are not recorded. */
export const MIN_LOGGED_MS = MINUTE

export function focusEndsAt(session: FocusSession): number {
  return session.startedAt + session.durationMin * MINUTE
}

export function isFocusActive(session: FocusSession | null, now: number): boolean {
  return !!session && now < focusEndsAt(session)
}

/**
 * Turn a session that is over (stopped, expired, or found expired after a restart) into a log.
 * Time past the planned end is not counted, so a session noticed late is not inflated.
 * Returns null when it was too short to count.
 */
export function finishSession(session: FocusSession, now: number): FocusLog | null {
  const endsAt = focusEndsAt(session)
  const endedAt = Math.min(now, endsAt)
  if (endedAt - session.startedAt < MIN_LOGGED_MS) return null
  return {
    id: session.id,
    taskId: session.taskId,
    title: session.title,
    startedAt: session.startedAt,
    endedAt,
    plannedMin: session.durationMin,
    completed: now >= endsAt,
  }
}

/** Whole minutes focused in one log. */
export function focusMinutes(log: Pick<FocusLog, 'startedAt' | 'endedAt'>): number {
  return Math.round((log.endedAt - log.startedAt) / MINUTE)
}

/** Total focused minutes per task id (sessions without a task are skipped). */
export function focusMinutesByTask(logs: readonly FocusLog[]): Record<string, number> {
  const ms: Record<string, number> = {}
  for (const l of logs) {
    if (l.taskId) ms[l.taskId] = (ms[l.taskId] ?? 0) + (l.endedAt - l.startedAt)
  }
  return Object.fromEntries(Object.entries(ms).map(([id, v]) => [id, Math.round(v / MINUTE)]))
}
