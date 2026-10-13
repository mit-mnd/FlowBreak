import { useTranslation } from 'react-i18next'
import { BellRing, Check, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { deleteAppointment } from '../actions'
import { useAppointments } from '../store'
import type { Appointment } from '../types'
import { useScheduleFormat } from '../useScheduleFormat'

type AppointmentItemProps = {
  appointment: Appointment
  now: number
  onEdit: (appointment: Appointment) => void
}

export function AppointmentItem({ appointment: a, now, onEdit }: AppointmentItemProps) {
  const { t } = useTranslation()
  const fmt = useScheduleFormat()
  const toggleDone = useAppointments((s) => s.toggleDone)
  const overdue = !a.done && a.startsAt < now

  return (
    <li
      className={cn(
        'group flex min-h-14 items-center gap-1 rounded-lg border bg-card px-1.5 py-1 transition-colors',
        a.done && 'bg-transparent',
        overdue && 'border-danger/30',
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={a.done}
        aria-label={
          a.done
            ? t('schedule.markUndone', { title: a.title })
            : t('schedule.markDone', { title: a.title })
        }
        onClick={() => toggleDone(a.id)}
        className="grid size-9 shrink-0 place-items-center rounded-full"
      >
        <span
          className={cn(
            'grid size-5 place-items-center rounded-full border-2 transition-colors',
            a.done
              ? 'border-move bg-move text-move-foreground dark:text-background'
              : 'border-input group-hover:border-move',
          )}
        >
          {a.done && <Check className="size-3" strokeWidth={3} aria-hidden />}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onEdit(a)}
        aria-label={t('schedule.editAria', { title: a.title })}
        className="min-w-0 flex-1 rounded-md px-1 py-1 text-left"
      >
        <span
          className={cn(
            'block truncate text-sm font-medium',
            a.done && 'text-muted-foreground line-through',
          )}
        >
          {a.title}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={cn('tabular-nums', overdue && 'font-medium text-danger')}>
            {fmt.time(a.startsAt)}
            {!a.done && ` · ${fmt.relative(a.startsAt - now)}`}
          </span>
          {a.remindBeforeMin > 0 && !a.done && (
            <span className="flex items-center gap-0.5">
              <BellRing className="size-3" aria-hidden />
              <span className="sr-only">{fmt.remindLabel(a.remindBeforeMin)}</span>
            </span>
          )}
        </span>
        {a.note && <span className="block truncate text-xs text-muted-foreground">{a.note}</span>}
      </button>

      <Button
        variant="danger"
        size="icon"
        aria-label={t('schedule.deleteAria', { title: a.title })}
        onClick={() => deleteAppointment(a.id)}
        className="opacity-60 group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Trash2 />
      </Button>
    </li>
  )
}
