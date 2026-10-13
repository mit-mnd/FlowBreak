import { create } from 'zustand'
import {
  applyAction,
  createInitialState,
  pause,
  type ReminderAction,
  type ReminderKind,
  type SchedulerState,
} from '@/lib/scheduler'
import { kvGet, kvSet } from '@/lib/tauri'

const KEY = 'scheduler'

/** The slice of an appointment the popup needs (kept small: it crosses windows as JSON). */
export type ReminderAppointment = {
  id: string
  title: string
  note: string
  startsAt: number
}

export type ActiveReminder = {
  kinds: ReminderKind[]
  gentle: boolean
  exerciseId: string
  sittingMin: number
  appointments: ReminderAppointment[]
}

/** What the user chose in the popup (or in-app dialog). */
export type ReminderActionMessage =
  | { kind: ReminderKind | 'all'; action: 'done' | 'start' | 'snooze' | 'skip' }
  | { kind: 'appointment'; id: string; action: 'dismiss' | 'snooze' }

/** What is left of a reminder after an action; null when nothing remains to show. */
export function afterAction(
  cur: ActiveReminder,
  msg: Pick<ReminderActionMessage, 'kind'> & { id?: string },
): ActiveReminder | null {
  if (msg.kind === 'all') return null
  const next =
    msg.kind === 'appointment'
      ? { ...cur, appointments: cur.appointments.filter((a) => a.id !== msg.id) }
      : { ...cur, kinds: cur.kinds.filter((k) => k !== msg.kind) }
  return next.kinds.length > 0 || next.appointments.length > 0 ? next : null
}

type RemindersStore = {
  state: SchedulerState
  away: boolean
  /** Reminder currently on screen (popup or in-app dialog). */
  current: ActiveReminder | null
  load(): Promise<void>
  setState(state: SchedulerState): void
  setAway(away: boolean): void
  act(kind: ReminderKind, action: ReminderAction): void
  pauseUntil(ts: number): void
  setCurrent(current: ActiveReminder | null): void
  /** Remove a kind from the visible reminder; returns what is left. */
  dismiss(kind: ReminderKind): ActiveReminder | null
  dismissAppointment(id: string): ActiveReminder | null
  dismissAppointments(): ActiveReminder | null
}

export const useReminders = create<RemindersStore>((set, get) => {
  const save = (state: SchedulerState) => {
    if (state === get().state) return
    set({ state })
    void kvSet(KEY, state)
  }
  const apply = (fn: (cur: ActiveReminder) => ActiveReminder | null) => {
    const cur = get().current
    if (!cur) return null
    const next = fn(cur)
    set({ current: next })
    return next
  }

  return {
    state: createInitialState(Date.now()),
    away: false,
    current: null,
    async load() {
      const now = Date.now()
      const saved = await kvGet<SchedulerState>(KEY)
      // The app just started, so the user has (re)started a sitting session now.
      const state = saved ? { ...saved, sittingSince: now } : createInitialState(now)
      set({ state })
    },
    setState: save,
    setAway(away) {
      if (away !== get().away) set({ away })
    },
    act(kind, action) {
      save(applyAction(get().state, kind, action, Date.now()))
    },
    pauseUntil(ts) {
      save(pause(get().state, ts))
    },
    setCurrent(current) {
      set({ current })
    },
    dismiss: (kind) => apply((cur) => afterAction(cur, { kind })),
    dismissAppointment: (id) => apply((cur) => afterAction(cur, { kind: 'appointment', id })),
    dismissAppointments: () =>
      apply((cur) => {
        const next = { ...cur, appointments: [] }
        return next.kinds.length > 0 ? next : null
      }),
  }
})
