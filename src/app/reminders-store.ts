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

export type ActiveReminder = {
  kinds: ReminderKind[]
  gentle: boolean
  exerciseId: string
  sittingMin: number
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
}

export const useReminders = create<RemindersStore>((set, get) => {
  const save = (state: SchedulerState) => {
    if (state === get().state) return
    set({ state })
    void kvSet(KEY, state)
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
    dismiss(kind) {
      const cur = get().current
      if (!cur) return null
      const kinds = cur.kinds.filter((k) => k !== kind)
      const next = kinds.length ? { ...cur, kinds } : null
      set({ current: next })
      return next
    },
  }
})
