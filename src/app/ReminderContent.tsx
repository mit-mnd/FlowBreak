import { useTranslation } from 'react-i18next'
import { CalendarClock, Droplets, PersonStanding, Play, Check, Clock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ActiveReminder, ReminderActionMessage } from './reminders-store'
import { appointmentLine, reminderLine } from './reminder-text'

export type { ReminderActionMessage } from './reminders-store'

type ReminderContentProps = {
  reminder: ActiveReminder
  onAction: (msg: ReminderActionMessage) => void
  className?: string
}

/** Shared body of the corner popup window and the in-app reminder dialog. */
export function ReminderContent({ reminder, onAction, className }: ReminderContentProps) {
  const { t, i18n } = useTranslation()

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {reminder.appointments.map((a) => {
        const line = appointmentLine(a, t, i18n.language)
        return (
          <div key={a.id} className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning">
              <CalendarClock className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-semibold break-words">{line.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed break-words text-muted-foreground">
                {line.body}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction({ kind: 'appointment', id: a.id, action: 'dismiss' })}
            >
              <Check aria-hidden />
              {t('reminders.appointment.gotIt')}
            </Button>
          </div>
        )
      })}
      {reminder.kinds.map((kind) => {
        const line = reminderLine(kind, reminder, t)
        const water = kind === 'water'
        const Icon = water ? Droplets : PersonStanding
        return (
          <div key={kind} className="flex items-start gap-3">
            <span
              className={cn(
                'grid size-10 shrink-0 place-items-center rounded-xl',
                water
                  ? 'bg-water-soft text-water-soft-foreground'
                  : 'bg-move-soft text-move-soft-foreground',
              )}
            >
              <Icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{line.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{line.body}</p>
            </div>
            <Button
              size="sm"
              variant={water ? 'water' : 'move'}
              onClick={() => onAction({ kind, action: water ? 'done' : 'start' })}
            >
              {water ? <Check aria-hidden /> : <Play aria-hidden />}
              {water ? t('reminders.drank') : t('reminders.start')}
            </Button>
          </div>
        )
      })}
      <div className="flex gap-2 border-t pt-3">
        <Button
          variant="soft"
          size="sm"
          className="flex-1"
          onClick={() => onAction({ kind: 'all', action: 'snooze' })}
        >
          <Clock aria-hidden />
          {t('reminders.snooze')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1"
          onClick={() => onAction({ kind: 'all', action: 'skip' })}
        >
          <X aria-hidden />
          {t('reminders.skip')}
        </Button>
      </div>
    </div>
  )
}
