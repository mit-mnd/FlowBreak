/**
 * Single entry point for every Tauri API call. Each function has a browser
 * fallback so `pnpm dev` and tests work without the Tauri runtime.
 */

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const core = await import('@tauri-apps/api/core')
  return core.invoke<T>(cmd, args)
}

/* ------------------------------------------------------------------ windows */

export function currentWindowLabel(): string {
  if (!isTauri()) {
    return new URLSearchParams(window.location.search).get('window') ?? 'main'
  }
  // Tauri injects window metadata synchronously, so this is safe at startup.
  const internals = (
    window as unknown as {
      __TAURI_INTERNALS__: { metadata?: { currentWindow?: { label?: string } } }
    }
  ).__TAURI_INTERNALS__
  return internals.metadata?.currentWindow?.label ?? 'main'
}

export async function showMainWindow(): Promise<void> {
  if (isTauri()) await invoke('show_main_window')
}

export type ReminderPopupRequest = { payload: string; height: number }

export async function showReminderPopup(req: ReminderPopupRequest): Promise<boolean> {
  if (!isTauri()) return false
  await invoke('show_reminder', { payload: req.payload, height: req.height })
  return true
}

/** Resize the popup to `height` logical px, keeping it anchored bottom-right. */
export async function resizeReminderPopup(height: number): Promise<void> {
  if (isTauri() && height > 0) await invoke('resize_reminder', { height })
}

export async function hideReminderPopup(): Promise<void> {
  if (isTauri()) await invoke('hide_reminder')
}

export async function getReminderPayload(): Promise<string | null> {
  if (!isTauri()) return null
  return invoke<string | null>('get_reminder_payload')
}

export async function setTrayLabels(labels: Record<'show' | 'water' | 'pause' | 'quit', string>) {
  if (isTauri()) await invoke('set_tray_labels', { labels })
}

/* ------------------------------------------------------------------- events */

type Unlisten = () => void
const browserBus = typeof window !== 'undefined' ? new EventTarget() : null

/** Listen to an app event emitted from Rust, another window, or the browser bus. */
export async function onAppEvent<T>(
  name: string,
  handler: (payload: T) => void,
): Promise<Unlisten> {
  if (isTauri()) {
    const { listen } = await import('@tauri-apps/api/event')
    return listen<T>(name, (e) => handler(e.payload))
  }
  const listener = (e: Event) => handler((e as CustomEvent<T>).detail)
  browserBus?.addEventListener(name, listener)
  return () => browserBus?.removeEventListener(name, listener)
}

export async function emitAppEvent<T>(target: string, name: string, payload: T): Promise<void> {
  if (isTauri()) {
    const { emitTo } = await import('@tauri-apps/api/event')
    await emitTo(target, name, payload)
    return
  }
  browserBus?.dispatchEvent(new CustomEvent(name, { detail: payload }))
}

/* --------------------------------------------------------------------- idle */

let lastBrowserActivity = Date.now()
if (typeof window !== 'undefined') {
  for (const evt of ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart']) {
    window.addEventListener(evt, () => (lastBrowserActivity = Date.now()), { passive: true })
  }
}

/** Seconds since the last keyboard/mouse input anywhere on the system. */
export async function getIdleSeconds(): Promise<number> {
  if (isTauri()) {
    try {
      return await invoke<number>('get_idle_seconds')
    } catch {
      return 0
    }
  }
  return Math.floor((Date.now() - lastBrowserActivity) / 1000)
}

/* --------------------------------------------------------------- key/value */

const STORE_FILE = 'settings.json'
type KvStore = {
  get<T>(k: string): Promise<T | undefined>
  set(k: string, v: unknown): Promise<void>
}
let storePromise: Promise<KvStore> | null = null

function getStore(): Promise<KvStore> {
  if (!storePromise) {
    storePromise = (async (): Promise<KvStore> => {
      if (isTauri()) {
        const { load } = await import('@tauri-apps/plugin-store')
        const store = await load(STORE_FILE, { defaults: {}, autoSave: 300 })
        return { get: (k) => store.get(k), set: (k, v) => store.set(k, v) }
      }
      return {
        async get<T>(k: string) {
          try {
            const raw = localStorage.getItem(`flowbreak:kv:${k}`)
            return raw ? (JSON.parse(raw) as T) : undefined
          } catch {
            return undefined
          }
        },
        async set(k, v) {
          try {
            localStorage.setItem(`flowbreak:kv:${k}`, JSON.stringify(v))
          } catch {
            // ignore: storage unavailable
          }
        },
      }
    })()
  }
  return storePromise
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  return (await getStore()).get<T>(key)
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await (await getStore()).set(key, value)
}

/* ---------------------------------------------------------------- shortcut */

export async function registerGlobalShortcut(
  accelerator: string,
  handler: () => void,
): Promise<Unlisten> {
  if (!isTauri()) {
    // Browser fallback: only works while the page has focus.
    const parts = accelerator.toLowerCase().split('+')
    const key = parts[parts.length - 1]
    const listener = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === key) {
        e.preventDefault()
        handler()
      }
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }
  const gs = await import('@tauri-apps/plugin-global-shortcut')
  try {
    if (await gs.isRegistered(accelerator)) await gs.unregister(accelerator)
    await gs.register(accelerator, (e) => {
      if (e.state === 'Pressed') handler()
    })
  } catch (err) {
    console.warn('Global shortcut unavailable', err)
  }
  return () => {
    void gs.unregister(accelerator).catch(() => undefined)
  }
}

/* --------------------------------------------------------------- autostart */

export async function setAutostart(enabled: boolean): Promise<void> {
  if (!isTauri()) return
  const a = await import('@tauri-apps/plugin-autostart')
  const current = await a.isEnabled()
  if (enabled && !current) await a.enable()
  if (!enabled && current) await a.disable()
}

export async function isAutostartEnabled(): Promise<boolean> {
  if (!isTauri()) return false
  const a = await import('@tauri-apps/plugin-autostart')
  return a.isEnabled()
}
