import { create } from 'zustand'
import { getRepos } from '@/lib/db'
import { daysAgo } from '@/lib/time'
import { uid } from '@/lib/utils'
import type { MovementLog } from './types'

type MovementStore = {
  /** Recent logs (last 7 days) - used for "today" and exercise rotation. */
  logs: MovementLog[]
  loaded: boolean
  lastLoggedAt: number | null
  /** Exercise currently shown in the guided session, if any. */
  sessionExerciseId: string | null
  load(): Promise<void>
  add(exerciseId: string, durationSec: number): MovementLog
  openSession(exerciseId: string): void
  closeSession(): void
}

export const useMovement = create<MovementStore>((set, get) => ({
  logs: [],
  loaded: false,
  lastLoggedAt: null,
  sessionExerciseId: null,
  async load() {
    const repos = await getRepos()
    const logs = await repos.movement.listSince(daysAgo(Date.now(), 6))
    set({ logs, loaded: true })
  },
  add(exerciseId, durationSec) {
    const log: MovementLog = { id: uid(), exerciseId, durationSec, loggedAt: Date.now() }
    set({ logs: [...get().logs, log], lastLoggedAt: log.loggedAt })
    void getRepos().then((r) => r.movement.add(log))
    return log
  },
  openSession(exerciseId) {
    set({ sessionExerciseId: exerciseId })
  },
  closeSession() {
    set({ sessionExerciseId: null })
  },
}))
