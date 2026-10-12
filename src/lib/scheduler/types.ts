export type ReminderKind = 'water' | 'movement'

export const REMINDER_KINDS: readonly ReminderKind[] = ['water', 'movement']

export type WorkHours = {
  /** `HH:MM`, local time. If start > end the window spans midnight. */
  start: string
  end: string
  /** Active weekdays, 0 = Sunday ... 6 = Saturday. */
  days: number[]
}

export type SchedulerConfig = {
  water: { enabled: boolean; intervalMin: number }
  movement: { enabled: boolean; intervalMin: number }
  workHours: WorkHours
  /** Idle this long counts as "stood up / away": sitting timer resets, no reminders. */
  idleResetMin: number
  /** During focus mode a due reminder waits at most this long. */
  focusMaxDelayMin: number
  /** An ignored reminder is shown again after this many minutes. */
  renotifyMin: number
  /** A natural break (task completed) fires reminders due within this window early. */
  naturalBreakWindowMin: number
}

export type SchedulerState = {
  lastWaterAt: number
  sittingSince: number
  /** Per-kind "do not remind before" timestamp; 0 = none. */
  snoozedUntil: Record<ReminderKind, number>
  /** Global pause for all reminders; 0 = not paused. */
  pausedUntil: number
}

export type TickInput = {
  now: number
  idleSec: number
  focusActive: boolean
  naturalBreak?: boolean
}

export type TickResult = {
  state: SchedulerState
  due: ReminderKind[]
  away: boolean
  /** True when reminders are delayed because of focus mode (gentle tone). */
  gentle: boolean
}

export type ReminderAction = 'done' | 'snooze' | 'skip'
