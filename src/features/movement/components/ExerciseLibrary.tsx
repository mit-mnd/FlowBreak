import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Segmented } from '@/components/Segmented'
import { EXERCISES, type Posture } from '../exercises'
import { useMovement } from '../store'
import { ExerciseThumbnail } from './ExerciseFigure'

type ExerciseLibraryProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Filter = 'all' | Posture

export function ExerciseLibrary({ open, onOpenChange }: ExerciseLibraryProps) {
  const { t } = useTranslation()
  const openSession = useMovement((s) => s.openSession)
  const [filter, setFilter] = useState<Filter>('all')
  const shown = EXERCISES.filter((ex) => filter === 'all' || ex.posture === filter)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t('common.close')} className="max-h-[85vh] overflow-y-auto">
        <DialogTitle>{t('movement.library')}</DialogTitle>
        <DialogDescription className="mt-1">{t('movement.libraryHint')}</DialogDescription>
        <Segmented<Filter>
          label={t('movement.filter.label')}
          value={filter}
          onChange={setFilter}
          className="mt-3"
          options={[
            { value: 'all', label: t('movement.filter.all', { count: EXERCISES.length }) },
            { value: 'seated', label: t('movement.filter.seated') },
            { value: 'standing', label: t('movement.filter.standing') },
          ]}
        />
        <ul className="mt-4 space-y-2">
          {shown.map((ex) => (
            <li key={ex.id}>
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false)
                  openSession(ex.id)
                }}
                className="flex w-full items-center gap-3 rounded-lg border bg-card p-2 text-left transition-colors hover:bg-muted"
              >
                <ExerciseThumbnail
                  exerciseId={ex.id}
                  className="size-16 shrink-0 rounded-lg border bg-card"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{t(`exercises.${ex.id}.name`)}</span>
                  <span className="block text-xs text-muted-foreground">
                    {t(`exercises.${ex.id}.summary`)}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                    {t(`movement.filter.${ex.posture}`)} ·{' '}
                    {ex.durationSec >= 60
                      ? t('common.minutes', { count: Math.round(ex.durationSec / 60) })
                      : t('common.seconds', { count: ex.durationSec })}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
