import type { ReminderEvent, ReminderOutcome } from '@/lib/db'
import type { ReminderKind } from './types'

/**
 * Pure bookkeeping for the reminder log. At most one event per kind is "pending"
 * (shown, no response yet). Showing the kind again turns the old one into `ignored`.
 * Every function returns the next pending map plus the events that must be persisted.
 */

export type PendingEvents = Partial<Record<ReminderKind, ReminderEvent>>

export type EventUpdate = { pending: PendingEvents; writes: ReminderEvent[] }

export function recordShown(
  pending: PendingEvents,
  kinds: readonly ReminderKind[],
  now: number,
  newId: () => string,
): EventUpdate {
  const next: PendingEvents = { ...pending }
  const writes: ReminderEvent[] = []
  for (const kind of kinds) {
    const prev = next[kind]
    if (prev) writes.push({ ...prev, outcome: 'ignored', resolvedAt: now })
    const event: ReminderEvent = {
      id: newId(),
      kind,
      shownAt: now,
      outcome: null,
      resolvedAt: null,
    }
    next[kind] = event
    writes.push(event)
  }
  return { pending: next, writes }
}

/** Resolve the pending event of `kind`; a no-op when nothing is waiting. */
export function recordOutcome(
  pending: PendingEvents,
  kind: ReminderKind,
  outcome: Exclude<ReminderOutcome, 'ignored'>,
  now: number,
): EventUpdate {
  const prev = pending[kind]
  if (!prev) return { pending, writes: [] }
  const next = { ...pending }
  delete next[kind]
  return { pending: next, writes: [{ ...prev, outcome, resolvedAt: now }] }
}
