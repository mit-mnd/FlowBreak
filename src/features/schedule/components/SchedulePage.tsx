import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, ChevronDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { useNow } from '@/lib/use-now'
import { cn } from '@/lib/utils'
import { groupAppointments } from '../logic'
import { useAppointments } from '../store'
import type { Appointment } from '../types'
import { useScheduleFormat } from '../useScheduleFormat'
import { AppointmentDialog } from './AppointmentDialog'
import { AppointmentItem } from './AppointmentItem'

export function SchedulePage() {
  const { t } = useTranslation()
  const fmt = useScheduleFormat()
  const now = useNow(15_000)
  const items = useAppointments((s) => s.items)
  const [dialog, setDialog] = useState<{ open: boolean; appointment: Appointment | null }>({
    open: false,
    appointment: null,
  })
  const [showDone, setShowDone] = useState(false)

  const groups = useMemo(() => groupAppointments(items, now), [items, now])
  const open = (appointment: Appointment | null) => setDialog({ open: true, appointment })
  const activeCount = groups.overdue.length + groups.days.reduce((n, d) => n + d.items.length, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('schedule.title')}</h1>
          {activeCount > 0 && (
            <p className="text-sm text-muted-foreground tabular-nums">
              {t('schedule.pending', { count: activeCount })}
            </p>
          )}
        </div>
        <Button variant="water" onClick={() => open(null)}>
          <Plus aria-hidden />
          {t('schedule.addShort')}
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={t('schedule.emptyTitle')}
          body={t('schedule.emptyBody')}
          action={
            <Button variant="water" onClick={() => open(null)}>
              {t('schedule.emptyAction')}
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {groups.overdue.length > 0 && (
            <Section title={t('schedule.overdue')} tone="danger">
              {groups.overdue.map((a) => (
                <AppointmentItem key={a.id} appointment={a} now={now} onEdit={open} />
              ))}
            </Section>
          )}

          {groups.days.map((day) => (
            <Section key={day.dayStart} title={fmt.dayLabel(day.dayStart, now)}>
              {day.items.map((a) => (
                <AppointmentItem key={a.id} appointment={a} now={now} onEdit={open} />
              ))}
            </Section>
          ))}

          {activeCount === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t('schedule.allClear')}
            </p>
          )}

          {groups.done.length > 0 && (
            <section>
              <button
                type="button"
                aria-expanded={showDone}
                onClick={() => setShowDone((v) => !v)}
                className="flex min-h-9 items-center gap-1 rounded-md px-1 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <ChevronDown
                  className={cn('size-4 transition-transform', !showDone && '-rotate-90')}
                  aria-hidden
                />
                {t('schedule.doneSection', { count: groups.done.length })}
              </button>
              {showDone && (
                <ul className="mt-2 space-y-1">
                  {groups.done.map((a) => (
                    <AppointmentItem key={a.id} appointment={a} now={now} onEdit={open} />
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}

      <AppointmentDialog
        open={dialog.open}
        appointment={dialog.appointment}
        onOpenChange={(next) => setDialog((d) => ({ ...d, open: next }))}
      />
    </div>
  )
}

function Section({
  title,
  tone,
  children,
}: {
  title: string
  tone?: 'danger'
  children: React.ReactNode
}) {
  return (
    <section>
      <h2
        className={cn(
          'mb-2 px-1 text-xs font-semibold tracking-wide uppercase',
          tone === 'danger' ? 'text-danger' : 'text-muted-foreground',
        )}
      >
        {title}
      </h2>
      <ul className="space-y-2">{children}</ul>
    </section>
  )
}
