import { getRepos, type ReminderEvent, type ReminderOutcome } from '@/lib/db'
import {
  recordOutcome,
  recordShown,
  type EventUpdate,
  type PendingEvents,
  type ReminderKind,
} from '@/lib/scheduler'
import { uid } from '@/lib/utils'

/** Persists what happens to habit reminders; feeds the compliance numbers in Stats. */
let pending: PendingEvents = {}

const commit = (update: EventUpdate) => {
  pending = update.pending
  if (update.writes.length === 0) return
  void getRepos()
    .then((r) => Promise.all(update.writes.map((e: ReminderEvent) => r.reminderEvents.upsert(e))))
    .catch((err) => console.warn('Reminder log failed', err))
}

export function logShown(kinds: readonly ReminderKind[], now: number): void {
  if (kinds.length > 0) commit(recordShown(pending, kinds, now, uid))
}

export function logOutcome(
  kind: ReminderKind,
  outcome: Exclude<ReminderOutcome, 'ignored'>,
  now = Date.now(),
): void {
  commit(recordOutcome(pending, kind, outcome, now))
}

/** Test helper. */
export function resetReminderLog(): void {
  pending = {}
}
