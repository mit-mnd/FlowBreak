import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HOUR, MINUTE, parseHHMM, startOfDay } from '@/lib/time'
import { useSettings } from '@/features/settings'
import { useReminders } from './reminders-store'

/** Small dropdown to pause all reminders for a while. */
export function PauseMenu() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pauseUntil = useReminders((s) => s.pauseUntil)
  const workEnd = useSettings((s) => s.settings.workEnd)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const choose = (until: number) => {
    pauseUntil(until)
    setOpen(false)
  }

  const endOfDay = () => {
    const now = Date.now()
    const end = startOfDay(now) + parseHHMM(workEnd) * MINUTE
    return end > now ? end : startOfDay(now) + 24 * HOUR
  }

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label={t('reminders.pause')}
        title={t('reminders.pause')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <BellOff />
      </Button>
      {open && (
        <div
          role="menu"
          aria-label={t('reminders.pause')}
          className="absolute right-0 z-30 mt-1 w-44 rounded-xl border bg-card p-1 shadow-lg"
        >
          <p className="px-3 py-2 text-xs font-medium text-muted-foreground">
            {t('reminders.pause')}
          </p>
          {[
            { label: t('reminders.pause30'), until: () => Date.now() + 30 * MINUTE },
            { label: t('reminders.pause60'), until: () => Date.now() + HOUR },
            { label: t('reminders.pauseToday'), until: endOfDay },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              role="menuitem"
              onClick={() => choose(o.until())}
              className="flex h-9 w-full items-center rounded-lg px-3 text-left text-sm hover:bg-muted focus-visible:bg-muted"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
