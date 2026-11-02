import { create } from 'zustand'
import { getRepos, type FocusLog } from '@/lib/db'
import { kvGet, kvSet } from '@/lib/tauri'
import { uid } from '@/lib/utils'
import { finishSession, isFocusActive } from './logic'
import type { FocusSession } from './types'

export { focusEndsAt, isFocusActive } from './logic'
export type { FocusSession } from './types'

export const FOCUS_DURATIONS = [15, 25, 45, 60] as const

const KEY = 'focus'

type FocusStore = {
  session: FocusSession | null
  /** Finished sessions, oldest first. */
  logs: FocusLog[]
  load(): Promise<void>
  start(opts: { taskId?: string | null; title?: string | null; durationMin: number }): void
  stop(): void
}

export const useFocus = create<FocusStore>((set, get) => {
  /** Record `session` as finished at `now` (no-op for accidental, very short sessions). */
  const finish = (session: FocusSession, now: number) => {
    const log = finishSession(session, now)
    if (!log) return
    set({ logs: [...get().logs.filter((l) => l.id !== log.id), log] })
    void getRepos()
      .then((r) => r.focus.upsert(log))
      .catch((err) => console.warn('Focus log failed', err))
  }

  return {
    session: null,
    logs: [],
    async load() {
      const now = Date.now()
      const [saved, repos] = await Promise.all([kvGet<FocusSession | null>(KEY), getRepos()])
      set({ logs: await repos.focus.listSince(0) })
      if (!saved) return
      // Sessions saved before ids existed get one derived from the start time, so that
      // loading twice (e.g. React StrictMode in dev) still maps to a single log row.
      const session: FocusSession = { ...saved, id: saved.id ?? `legacy-${saved.startedAt}` }
      if (isFocusActive(session, now)) {
        set({ session })
        return
      }
      // It ended while the app was closed: keep the time it covered.
      finish(session, now)
      void kvSet(KEY, null)
    },
    start({ taskId = null, title = null, durationMin }) {
      const now = Date.now()
      const previous = get().session
      if (previous) finish(previous, now)
      const session: FocusSession = { id: uid(), taskId, title, startedAt: now, durationMin }
      set({ session })
      void kvSet(KEY, session)
    },
    stop() {
      const session = get().session
      if (!session) return
      finish(session, Date.now())
      set({ session: null })
      void kvSet(KEY, null)
    },
  }
})
