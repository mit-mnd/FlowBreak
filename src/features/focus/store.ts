import { create } from 'zustand'
import { kvGet, kvSet } from '@/lib/tauri'
import { MINUTE } from '@/lib/time'

export type FocusSession = {
  taskId: string | null
  title: string | null
  startedAt: number
  durationMin: number
}

export const FOCUS_DURATIONS = [15, 25, 45, 60] as const

const KEY = 'focus'

export function focusEndsAt(session: FocusSession): number {
  return session.startedAt + session.durationMin * MINUTE
}

export function isFocusActive(session: FocusSession | null, now: number): boolean {
  return !!session && now < focusEndsAt(session)
}

type FocusStore = {
  session: FocusSession | null
  load(): Promise<void>
  start(opts: { taskId?: string | null; title?: string | null; durationMin: number }): void
  stop(): void
}

export const useFocus = create<FocusStore>((set) => ({
  session: null,
  async load() {
    const saved = await kvGet<FocusSession | null>(KEY)
    set({ session: saved && isFocusActive(saved, Date.now()) ? saved : null })
  },
  start({ taskId = null, title = null, durationMin }) {
    const session: FocusSession = { taskId, title, startedAt: Date.now(), durationMin }
    set({ session })
    void kvSet(KEY, session)
  },
  stop() {
    set({ session: null })
    void kvSet(KEY, null)
  },
}))
