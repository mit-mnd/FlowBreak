import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, CalendarClock, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { startOfDay } from '@/lib/time'
import { upcomingAppointments } from '../logic'
import { useAppointments } from '../store'
import type { Appointment } from '../types'
import { useScheduleFormat } from '../useScheduleFormat'
import { AppointmentDialog } from './AppointmentDialog'

const LIMIT = 3

/** Dashboard card: the next few appointments, with a one-tap way to add one. */
export function UpcomingCard({ now, onViewAll }: { now: number; onViewAll: () => void }) {
  const { t } = useTranslation()
  const fmt = useScheduleFormat()
  const items = useAppointments((s) => s.items)
  const [dialog, setDialog] = useState<{ open: boolean; appointment: Appointment | null }>({
    open: false,
    appointment: null,
  })
  const upcoming = useMemo(() => upcomingAppointments(items, now, LIMIT), [items, now])

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="grid size-7 place-items-center rounded-lg bg-warning-soft text-warning">
            <CalendarClock className="size-4" aria-hidden />
          </span>
          {t('schedule.upcoming')}
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('schedule.add')}
          title={t('schedule.add')}
          onClick={() => setDialog({ open: true, appointment: null })}
        >
          <Plus />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {upcoming.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">{t('schedule.upcomingEmpty')}</p>
        ) : (
          <ul className="space-y-1.5">
            {upcoming.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setDialog({ open: true, appointment: a })}
                  aria-label={t('schedule.editAria', { title: a.title })}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted"
                >
                  <span className="w-14 shrink-0 text-sm font-semibold tabular-nums">
                    {fmt.time(a.startsAt)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{a.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {fmt.dayLabel(startOfDay(a.startsAt), now, true)} ·{' '}
                      {fmt.relative(a.startsAt - now)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {items.some((a) => !a.done) && (
          <Button variant="ghost" size="sm" className="w-full" onClick={onViewAll}>
            {t('schedule.viewAll')}
            <ArrowRight aria-hidden />
          </Button>
        )}
      </CardContent>
      <AppointmentDialog
        open={dialog.open}
        appointment={dialog.appointment}
        onOpenChange={(next) => setDialog((d) => ({ ...d, open: next }))}
      />
    </Card>
  )
}
