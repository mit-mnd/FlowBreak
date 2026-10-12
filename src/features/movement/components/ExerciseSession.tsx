import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Pause, Play, SkipForward, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ProgressRing } from '@/components/ProgressRing'
import { formatClock } from '@/lib/time'
import { cn } from '@/lib/utils'
import { getExercise, stepAt } from '../exercises'
import { useMovement } from '../store'

/** Full-screen guided exercise with step-by-step instructions and a countdown. */
export function ExerciseSession() {
  const exerciseId = useMovement((s) => s.sessionExerciseId)
  return (
    <AnimatePresence>
      {exerciseId && <SessionView key={exerciseId} exerciseId={exerciseId} />}
    </AnimatePresence>
  )
}

function SessionView({ exerciseId }: { exerciseId: string }) {
  const { t } = useTranslation()
  const ex = getExercise(exerciseId)
  const close = useMovement((s) => s.closeSession)
  const add = useMovement((s) => s.add)

  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(true)
  const lastTick = useRef(Date.now())
  const finished = elapsed >= ex.durationSec
  const finishRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!running || finished) return
    lastTick.current = Date.now()
    const id = window.setInterval(() => {
      const now = Date.now()
      const delta = (now - lastTick.current) / 1000
      lastTick.current = now
      setElapsed((e) => Math.min(ex.durationSec, e + delta))
    }, 250)
    return () => window.clearInterval(id)
  }, [running, finished, ex.durationSec])

  useEffect(() => {
    if (finished) finishRef.current?.focus()
  }, [finished])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  const step = stepAt(ex, elapsed)
  const per = ex.durationSec / ex.stepCount
  const name = t(`exercises.${ex.id}.name`)

  const complete = () => {
    add(ex.id, Math.max(1, Math.round(elapsed)))
    toast.success(t('movement.session.logged'))
    close()
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={name}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="fixed inset-0 z-40 flex flex-col bg-background"
    >
      <header className="flex items-center justify-between px-4 pt-4">
        <span className="text-xs font-medium text-muted-foreground tabular-nums">
          {t('movement.session.step', { current: step + 1, total: ex.stepCount })}
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('movement.session.close')}
          onClick={close}
        >
          <X />
        </Button>
      </header>

      <div className="flex flex-1 flex-col items-center overflow-y-auto px-6 pb-6">
        <h2 className="mt-2 text-center text-2xl font-semibold tracking-tight">{name}</h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {t(`exercises.${ex.id}.summary`)}
        </p>

        <ProgressRing
          value={elapsed / ex.durationSec}
          size={196}
          stroke={12}
          tone="move"
          label={t('movement.session.timeLeft')}
          className="my-6"
        >
          {finished ? (
            <Check className="size-14 text-move" aria-hidden />
          ) : (
            <div>
              <div className="text-4xl font-semibold tabular-nums" aria-live="off">
                {formatClock(ex.durationSec - elapsed)}
              </div>
              <div className="text-xs text-muted-foreground">{t('movement.session.timeLeft')}</div>
            </div>
          )}
        </ProgressRing>

        {finished ? (
          <div className="text-center" aria-live="polite">
            <p className="text-xl font-semibold">{t('movement.session.completeTitle')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('movement.session.completeBody')}
            </p>
          </div>
        ) : (
          <ol className="w-full max-w-sm space-y-2" aria-live="polite">
            {Array.from({ length: ex.stepCount }, (_, i) => (
              <li
                key={i}
                aria-current={i === step ? 'step' : undefined}
                className={cn(
                  'flex gap-3 rounded-lg border p-3 text-sm transition-colors duration-200',
                  i === step
                    ? 'border-move/50 bg-move-soft text-move-soft-foreground'
                    : i < step
                      ? 'border-transparent text-muted-foreground line-through decoration-muted-foreground/50'
                      : 'border-transparent text-muted-foreground',
                )}
              >
                <span className="font-semibold tabular-nums">{i + 1}.</span>
                <span>{t(`exercises.${ex.id}.steps.${i}`)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <footer className="flex gap-2 border-t bg-card px-4 py-3">
        {!finished && (
          <>
            <Button variant="soft" onClick={() => setRunning((r) => !r)} className="flex-1">
              {running ? <Pause aria-hidden /> : <Play aria-hidden />}
              {running ? t('movement.session.pause') : t('movement.session.resume')}
            </Button>
            {step < ex.stepCount - 1 && (
              <Button
                variant="soft"
                size="icon"
                className="size-10"
                aria-label={t('movement.session.next')}
                onClick={() => setElapsed((step + 1) * per)}
              >
                <SkipForward />
              </Button>
            )}
          </>
        )}
        <Button ref={finishRef} variant="move" className="flex-1" onClick={complete}>
          <Check aria-hidden />
          {t('movement.session.finish')}
        </Button>
      </footer>
    </motion.div>
  )
}
