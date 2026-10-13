import { create } from 'zustand'

export type View = 'today' | 'tasks' | 'schedule' | 'stats' | 'settings'

export const VIEWS: readonly View[] = ['today', 'tasks', 'schedule', 'stats', 'settings']

export const useNavigation = create<{ view: View; setView(view: View): void }>((set) => ({
  view: 'today',
  setView: (view) => set({ view }),
}))
