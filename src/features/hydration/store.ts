import { create } from 'zustand'
import { getRepos } from '@/lib/db'
import { startOfDay } from '@/lib/time'
import { uid } from '@/lib/utils'
import type { WaterLog } from './types'

type HydrationStore = {
  /** Logs since the start of the day the store was loaded (enough for "today"). */
  logs: WaterLog[]
  loaded: boolean
  /** Timestamp of the most recent log; the reminder engine watches this. */
  lastLoggedAt: number | null
  load(): Promise<void>
  add(amountMl: number): WaterLog
  remove(id: string): void
  restore(log: WaterLog): void
}

export const useHydration = create<HydrationStore>((set, get) => ({
  logs: [],
  loaded: false,
  lastLoggedAt: null,
  async load() {
    const repos = await getRepos()
    const logs = await repos.water.listSince(startOfDay(Date.now()))
    set({ logs, loaded: true })
  },
  add(amountMl) {
    const log: WaterLog = { id: uid(), amountMl, loggedAt: Date.now() }
    set({ logs: [...get().logs, log], lastLoggedAt: log.loggedAt })
    void getRepos().then((r) => r.water.add(log))
    return log
  },
  remove(id) {
    set({ logs: get().logs.filter((l) => l.id !== id) })
    void getRepos().then((r) => r.water.remove(id))
  },
  restore(log) {
    set({ logs: [...get().logs, log].sort((a, b) => a.loggedAt - b.loggedAt) })
    void getRepos().then((r) => r.water.add(log))
  },
}))
