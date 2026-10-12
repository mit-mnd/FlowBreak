import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { Target } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/ProgressBar'
import { formatClock } from '@/lib/time'
import { focusEndsAt, useFocus } from '../store'

export function FocusBanner() {
  const { t } = useTranslation()
  const session = useFocus((s) => s.session)
  const stop = useFocus((s) => s.stop)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!session) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [session])

  const remainingSec = session ? (focusEndsAt(session) - now) / 1000 : 0

  useEffect(() => {
    if (session && remainingSec <= 0) {
      stop()
      toast(t('focus.finished'))
    }
  }, [session, remainingSec, stop, t])

  return (
    <AnimatePresence initial={false}>
      {session && remainingSec > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div
            role="status"
            className="rounded-xl border border-water/30 bg-water-soft p-3 text-water-soft-foreground"
          >
            <div className="flex items-center gap-3">
              <Target className="size-5 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium opacity-80">{t('focus.active')}</p>
                <p className="truncate text-sm font-semibold">
                  {session.title ?? t('focus.general')}
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {t('focus.remaining', { time: formatClock(remainingSec) })}
              </span>
              <Button variant="outline" size="sm" onClick={stop}>
                {t('focus.end')}
              </Button>
            </div>
            <ProgressBar
              className="mt-2 h-1.5 bg-card/60"
              tone="water"
              value={1 - remainingSec / (session.durationMin * 60)}
              label={t('focus.active')}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
