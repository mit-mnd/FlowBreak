import { useEffect, useRef } from 'react'
import i18n, { type Language } from '@/i18n'
import { tick, type ReminderKind } from '@/lib/scheduler'
import { HOUR, minutesBetween } from '@/lib/time'
import {
  emitAppEvent,
  getIdleSeconds,
  hideReminderPopup,
  isTauri,
  onAppEvent,
  registerGlobalShortcut,
  showMainWindow,
  showReminderPopup,
} from '@/lib/tauri'
import { sendSystemNotification } from '@/lib/notifications'
import { playReminderSound, type SoundChoice } from '@/lib/sound'
import { toSchedulerConfig, useSettings } from '@/features/settings'
import { isFocusActive, useFocus } from '@/features/focus'
import { logWater, useHydration } from '@/features/hydration'
import { pickExercise, useMovement } from '@/features/movement'
import { useTodos } from '@/features/todos'
import { useNavigation } from './navigation'
import { useReminders, type ActiveReminder } from './reminders-store'
import { notificationText } from './reminder-text'
import type { ReminderActionMessage } from './ReminderContent'

const TICK_MS = 30_000
export const WATER_SHORTCUT = 'CommandOrControl+Shift+W'

/** `sound` is 'off' unless the popup is being (re)shown for new reminders. */
export type PopupPayload = ActiveReminder & { lang: Language; dark: boolean; sound: SoundChoice }

function popupHeight(kinds: number): number {
  return kinds > 1 ? 236 : 168
}

async function syncPopup(
  current: ActiveReminder | null,
  dark: boolean,
  chime = false,
): Promise<void> {
  if (!isTauri()) return
  if (!current) {
    await hideReminderPopup()
    return
  }
  const { language, sound } = useSettings.getState().settings
  const payload: PopupPayload = {
    ...current,
    lang: language,
    dark,
    sound: chime ? sound : 'off',
  }
  await showReminderPopup({
    payload: JSON.stringify(payload),
    height: popupHeight(current.kinds.length),
  })
}

/**
 * Drives reminders: ticks the pure scheduler, presents due reminders (corner popup
 * in Tauri, in-app dialog in the browser) and wires tray, shortcut and store events.
 */
export function useReminderEngine(ready: boolean, dark: boolean): void {
  const darkRef = useRef(dark)
  darkRef.current = dark

  useEffect(() => {
    if (!ready) return
    const reminders = useReminders.getState
    let running = false

    const present = async (due: ReminderKind[], gentle: boolean, now: number) => {
      const prev = reminders().current
      const kinds = Array.from(new Set([...(prev?.kinds ?? []), ...due]))
      const current: ActiveReminder = {
        kinds: (['water', 'movement'] as const).filter((k) => kinds.includes(k)),
        gentle,
        exerciseId:
          prev?.exerciseId ?? pickExercise(useMovement.getState().logs.map((l) => l.exerciseId)).id,
        sittingMin: minutesBetween(reminders().state.sittingSince, now),
      }
      reminders().setCurrent(current)
      await syncPopup(current, darkRef.current, true).catch((err) =>
        console.warn('Popup failed', err),
      )
      // In Tauri the popup window plays its own chime; here covers the browser dialog.
      if (!isTauri()) void playReminderSound(useSettings.getState().settings.sound)
      if (useSettings.getState().settings.systemNotify) {
        const { title, body } = notificationText(current, i18n.t)
        await sendSystemNotification(title, body)
      }
    }

    const run = async (naturalBreak = false) => {
      if (running) return
      running = true
      try {
        const idleSec = await getIdleSeconds()
        const now = Date.now()
        const config = toSchedulerConfig(useSettings.getState().settings)
        const focusActive = isFocusActive(useFocus.getState().session, now)
        const result = tick({ now, idleSec, focusActive, naturalBreak }, reminders().state, config)
        reminders().setState(result.state)
        reminders().setAway(result.away)
        if (result.due.length > 0) await present(result.due, result.gentle, now)
      } finally {
        running = false
      }
    }

    /** Remove kinds from the visible reminder; optionally refresh the popup window. */
    const dismiss = (kinds: ReminderKind[], refreshPopup: boolean) => {
      let left = reminders().current
      for (const k of kinds) left = reminders().dismiss(k)
      if (refreshPopup) void syncPopup(left, darkRef.current)
    }

    const handleAction = (msg: ReminderActionMessage, fromPopup: boolean) => {
      const current = reminders().current
      const kinds: ReminderKind[] = msg.kind === 'all' ? (current?.kinds ?? []) : [msg.kind]
      for (const kind of kinds) {
        if (msg.action === 'done' && kind === 'water') {
          logWater(useSettings.getState().settings.cupMl)
        } else if (msg.action === 'start' && kind === 'movement') {
          // Hold movement reminders while exercising; finishing resets the cycle.
          reminders().act('movement', 'snooze')
          useNavigation.getState().setView('today')
          useMovement
            .getState()
            .openSession(
              current?.exerciseId ??
                pickExercise(useMovement.getState().logs.map((l) => l.exerciseId)).id,
            )
          void showMainWindow()
        } else if (msg.action === 'snooze' || msg.action === 'skip') {
          reminders().act(kind, msg.action)
        }
      }
      // The popup window updates itself; only push changes for in-app actions.
      dismiss(kinds, !fromPopup)
    }

    let disposed = false
    const unsubs: Array<() => void> = []
    const addUnsub = (p: Promise<() => void>) =>
      void p.then((u) => (disposed ? u() : unsubs.push(u)))

    // Store watchers ------------------------------------------------------------
    unsubs.push(
      useHydration.subscribe((s, prev) => {
        if (s.lastLoggedAt && s.lastLoggedAt !== prev.lastLoggedAt) {
          reminders().act('water', 'done')
          if (reminders().current?.kinds.includes('water')) dismiss(['water'], true)
        }
      }),
      useMovement.subscribe((s, prev) => {
        if (s.lastLoggedAt && s.lastLoggedAt !== prev.lastLoggedAt) {
          reminders().act('movement', 'done')
          if (reminders().current?.kinds.includes('movement')) dismiss(['movement'], true)
        }
      }),
      useTodos.subscribe((s, prev) => {
        if (s.lastCompleted && s.lastCompleted !== prev.lastCompleted) {
          const focus = useFocus.getState()
          if (focus.session?.taskId === s.lastCompleted.id)
            focus.stop() // focus watcher runs the break
          else void run(true)
        }
      }),
      useFocus.subscribe((s, prev) => {
        if (prev.session && !s.session) void run(true)
      }),
    )

    // Events from the popup window, tray and global shortcut ------------------------
    addUnsub(
      onAppEvent<ReminderActionMessage>('reminder-action', (msg) => handleAction(msg, isTauri())),
    )
    addUnsub(
      onAppEvent<string>('tray-action', (id) => {
        if (id === 'log_water') logWater(useSettings.getState().settings.cupMl)
        if (id === 'pause') reminders().pauseUntil(Date.now() + HOUR)
      }),
    )
    addUnsub(
      registerGlobalShortcut(WATER_SHORTCUT, () => logWater(useSettings.getState().settings.cupMl)),
    )

    void run()
    const id = window.setInterval(() => void run(), TICK_MS)

    return () => {
      disposed = true
      window.clearInterval(id)
      unsubs.forEach((u) => u())
    }
  }, [ready])
}

/** Used by the in-app dialog (browser mode) to send actions through the same path. */
export function sendReminderAction(msg: ReminderActionMessage): void {
  void emitAppEvent('main', 'reminder-action', msg)
}
