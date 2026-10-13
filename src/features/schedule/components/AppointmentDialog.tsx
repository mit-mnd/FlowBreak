import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarPlus, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { daysAgo } from '@/lib/time'
import { cn } from '@/lib/utils'
import {
  DEFAULT_REMIND_MIN,
  REMIND_OPTIONS,
  defaultStart,
  fromInputs,
  toDateInput,
  toTimeInput,
  validateForm,
  type FormError,
} from '../logic'
import { useAppointments } from '../store'
import type { Appointment } from '../types'
import { useScheduleFormat } from '../useScheduleFormat'

type AppointmentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Appointment to edit; null/undefined creates a new one. */
  appointment?: Appointment | null
}

export function AppointmentDialog({ open, onOpenChange, appointment }: AppointmentDialogProps) {
  const { t } = useTranslation()
  const editing = !!appointment

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t('common.close')} className="max-h-[92vh] overflow-y-auto">
        <DialogTitle className="flex items-center gap-2 pr-8">
          {editing ? (
            <Pencil className="size-4 text-water" aria-hidden />
          ) : (
            <CalendarPlus className="size-4 text-water" aria-hidden />
          )}
          {editing ? t('schedule.edit') : t('schedule.add')}
        </DialogTitle>
        <DialogDescription className="sr-only">{t('schedule.formHint')}</DialogDescription>
        {/* Mounted only while open, so its state starts fresh every time. */}
        <AppointmentForm appointment={appointment ?? null} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function AppointmentForm({
  appointment,
  onDone,
}: {
  appointment: Appointment | null
  onDone: () => void
}) {
  const { t } = useTranslation()
  const fmt = useScheduleFormat()
  const add = useAppointments((s) => s.add)
  const update = useAppointments((s) => s.update)

  const [initial] = useState(() => appointment?.startsAt ?? defaultStart(Date.now()))
  const [title, setTitle] = useState(appointment?.title ?? '')
  const [note, setNote] = useState(appointment?.note ?? '')
  const [date, setDate] = useState(() => toDateInput(initial))
  const [time, setTime] = useState(() => toTimeInput(initial))
  const [remind, setRemind] = useState(appointment?.remindBeforeMin ?? DEFAULT_REMIND_MIN)
  const [error, setError] = useState<FormError | null>(null)

  const titleRef = useRef<HTMLInputElement>(null)
  const ids = { title: useId(), date: useId(), time: useId(), remind: useId(), note: useId() }

  const quickDate = (offsetDays: number) => {
    setDate(toDateInput(daysAgo(Date.now(), -offsetDays)))
    if (error === 'past') setError(null)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const problem = validateForm({ title, date, time }, Date.now(), appointment?.startsAt)
    setError(problem)
    if (problem) {
      if (problem === 'title') titleRef.current?.focus()
      return
    }
    const startsAt = fromInputs(date, time) as number // validated above
    if (appointment) {
      update(appointment.id, { title, note, startsAt, remindBeforeMin: remind })
      toast.success(t('schedule.saved'))
    } else {
      const created = add({ title, note, startsAt, remindBeforeMin: remind })
      if (created) toast.success(t('schedule.created', { title: created.title }))
    }
    onDone()
  }

  const errorText = error ? t(`schedule.errors.${error}`) : null
  const preview = (() => {
    const ts = fromInputs(date, time)
    if (ts === null) return null
    const lead = fmt.remindLabel(remind)
    return `${fmt.dayLabel(new Date(ts).setHours(0, 0, 0, 0), Date.now())} · ${fmt.time(ts)} · ${lead}`
  })()

  return (
    <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor={ids.title} className="text-sm font-medium">
          {t('schedule.form.title')}
        </label>
        <Input
          id={ids.title}
          ref={titleRef}
          autoFocus
          value={title}
          maxLength={120}
          placeholder={t('schedule.form.titlePlaceholder')}
          aria-invalid={error === 'title'}
          onChange={(e) => {
            setTitle(e.target.value)
            if (error === 'title') setError(null)
          }}
        />
      </div>

      <div className="space-y-1.5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor={ids.date} className="text-sm font-medium">
              {t('schedule.form.date')}
            </label>
            <Input
              id={ids.date}
              type="date"
              value={date}
              aria-invalid={error === 'datetime' || error === 'past'}
              onChange={(e) => {
                setDate(e.target.value)
                setError(null)
              }}
              className="tabular-nums"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={ids.time} className="text-sm font-medium">
              {t('schedule.form.time')}
            </label>
            <Input
              id={ids.time}
              type="time"
              value={time}
              aria-invalid={error === 'datetime' || error === 'past'}
              onChange={(e) => {
                setTime(e.target.value)
                setError(null)
              }}
              className="tabular-nums"
            />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          {[
            { label: t('schedule.form.quickToday'), days: 0 },
            { label: t('schedule.form.quickTomorrow'), days: 1 },
            { label: t('schedule.form.quickNextWeek'), days: 7 },
          ].map((q) => (
            <button
              key={q.days}
              type="button"
              onClick={() => quickDate(q.days)}
              className={cn(
                'h-8 rounded-full border px-3 text-xs font-medium transition-colors',
                date === toDateInput(daysAgo(Date.now(), -q.days))
                  ? 'border-water/50 bg-water-soft text-water-soft-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={ids.remind} className="text-sm font-medium">
          {t('schedule.form.remind')}
        </label>
        <Select id={ids.remind} value={remind} onChange={(e) => setRemind(Number(e.target.value))}>
          {REMIND_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {fmt.remindLabel(m)}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={ids.note} className="text-sm font-medium">
          {t('schedule.form.note')}
        </label>
        <Input
          id={ids.note}
          value={note}
          maxLength={200}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {errorText ? (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {errorText}
        </p>
      ) : (
        preview && <p className="text-xs text-muted-foreground">{preview}</p>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="soft" className="flex-1" onClick={onDone}>
          {t('schedule.form.cancel')}
        </Button>
        <Button type="submit" variant="water" className="flex-1">
          {appointment ? t('schedule.form.save') : t('schedule.form.create')}
        </Button>
      </div>
    </form>
  )
}
