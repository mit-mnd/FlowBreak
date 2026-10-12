import { create } from 'zustand'
import { kvGet, kvSet, setAutostart } from '@/lib/tauri'
import { DEFAULT_SETTINGS, type Settings } from './types'

const KEY = 'settings'

type SettingsStore = {
  settings: Settings
  loaded: boolean
  load(): Promise<void>
  update(patch: Partial<Settings>): void
}

export const useSettings = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  async load() {
    const saved = await kvGet<Partial<Settings>>(KEY)
    set({ settings: { ...DEFAULT_SETTINGS, ...saved }, loaded: true })
  },
  update(patch) {
    const settings = { ...get().settings, ...patch }
    set({ settings })
    void kvSet(KEY, settings)
    if (patch.autostart !== undefined) {
      void setAutostart(patch.autostart).catch((err) => console.warn('Autostart failed', err))
    }
  },
}))
