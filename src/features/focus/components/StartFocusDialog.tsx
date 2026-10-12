import { useTranslation } from 'react-i18next'
import { Timer } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { FOCUS_DURATIONS, useFocus } from '../store'

type StartFocusDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: { id: string; title: string } | null
}

export function StartFocusDialog({ open, onOpenChange, task }: StartFocusDialogProps) {
  const { t } = useTranslation()
  const start = useFocus((s) => s.start)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t('common.close')}>
        <DialogTitle className="flex items-center gap-2 pr-8">
          <Timer className="size-4 text-water" aria-hidden />
          <span className="truncate">{task?.title ?? t('focus.start')}</span>
        </DialogTitle>
        <DialogDescription className="mt-1">{t('focus.hint')}</DialogDescription>
        <p className="mt-4 mb-2 text-sm font-medium">{t('focus.pickDuration')}</p>
        <div className="grid grid-cols-2 gap-2">
          {FOCUS_DURATIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                start({ taskId: task?.id, title: task?.title, durationMin: m })
                onOpenChange(false)
              }}
              className="h-14 rounded-lg border bg-card text-base font-semibold tabular-nums transition-colors hover:border-water hover:bg-water-soft hover:text-water-soft-foreground"
            >
              {t('focus.durationOption', { count: m })}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
