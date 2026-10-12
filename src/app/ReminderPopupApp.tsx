import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Leaf, X } from 'lucide-react'
import { setLanguage } from '@/i18n'
import { playReminderSound } from '@/lib/sound'
import {
  emitAppEvent,
  getReminderPayload,
  hideReminderPopup,
  onAppEvent,
  resizeReminderPopup,
} from '@/lib/tauri'
import { ReminderContent, type ReminderActionMessage } from './ReminderContent'
import type { PopupPayload } from './useReminderEngine'

function parse(raw: string | null): PopupPayload | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as PopupPayload
  } catch {
    return null
  }
}

/** Root component of the small always-on-top reminder window (label "reminder"). */
export function ReminderPopupApp() {
  const { t } = useTranslation()
  const [payload, setPayload] = useState<PopupPayload | null>(null)

  useEffect(() => {
    const receive = (raw: string | null) => {
      const next = parse(raw)
      setPayload(next)
      if (next) void playReminderSound(next.sound)
    }
    void getReminderPayload().then(receive)
    const off = onAppEvent<string>('reminder-update', receive)
    return () => void off.then((u) => u())
  }, [])

  useEffect(() => {
    if (!payload) return
    setLanguage(payload.lang)
    document.documentElement.classList.toggle('dark', payload.dark)
    document.documentElement.style.colorScheme = payload.dark ? 'dark' : 'light'
  }, [payload])

  const onAction = (msg: ReminderActionMessage) => {
    void emitAppEvent('main', 'reminder-action', msg)
    const left = msg.kind === 'all' ? [] : (payload?.kinds ?? []).filter((k) => k !== msg.kind)
    if (left.length === 0) {
      void hideReminderPopup()
      setPayload(null)
    } else if (payload) {
      setPayload({ ...payload, kinds: left })
    }
  }

  // Fit the window to its content (text length varies by language and exercise).
  const rootRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    void resizeReminderPopup(Math.ceil(el.getBoundingClientRect().height))
  }, [payload])

  if (!payload) return null

  return (
    <div ref={rootRef} className="flex flex-col bg-card text-card-foreground">
      <header data-tauri-drag-region className="flex items-center justify-between px-4 pt-3 pb-2">
        <span
          data-tauri-drag-region
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
        >
          <Leaf className="size-3.5 text-move" aria-hidden />
          FlowBreak
        </span>
        <button
          type="button"
          aria-label={t('reminders.snooze')}
          title={t('reminders.snooze')}
          onClick={() => onAction({ kind: 'all', action: 'snooze' })}
          className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </header>
      <ReminderContent reminder={payload} onAction={onAction} className="px-4 pb-4" />
    </div>
  )
}
