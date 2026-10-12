import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { EXERCISES } from '../exercises'
import { useMovement } from '../store'

type ExerciseLibraryProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExerciseLibrary({ open, onOpenChange }: ExerciseLibraryProps) {
  const { t } = useTranslation()
  const openSession = useMovement((s) => s.openSession)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t('common.close')} className="max-h-[85vh] overflow-y-auto">
        <DialogTitle>{t('movement.library')}</DialogTitle>
        <DialogDescription className="mt-1">{t('movement.libraryHint')}</DialogDescription>
        <ul className="mt-4 space-y-2">
          {EXERCISES.map((ex) => {
            const Icon = ex.icon
            return (
              <li key={ex.id}>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false)
                    openSession(ex.id)
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-move-soft text-move-soft-foreground">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {t(`exercises.${ex.id}.name`)}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {t(`exercises.${ex.id}.summary`)}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {ex.durationSec >= 60
                      ? t('common.minutes', { count: Math.round(ex.durationSec / 60) })
                      : t('common.seconds', { count: ex.durationSec })}
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </button>
              </li>
            )
          })}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
