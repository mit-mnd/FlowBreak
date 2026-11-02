import { toast } from 'sonner'
import i18n from '@/i18n'
import { useAppointments } from './store'

export function deleteAppointment(id: string): void {
  const removed = useAppointments.getState().remove(id)
  if (!removed) return
  toast(i18n.t('schedule.deleted', { title: removed.title }), {
    action: {
      label: i18n.t('common.undo'),
      onClick: () => useAppointments.getState().restore(removed),
    },
  })
}

/**
 * Tick an appointment off. A recurring one moves to its next occurrence, which is said in a
 * toast with an undo; a one-off simply flips to done (and back).
 */
export function toggleAppointmentDone(id: string): void {
  const store = useAppointments.getState()
  const before = store.items.find((a) => a.id === id)
  if (!before) return
  const after = store.toggleDone(id)
  if (!after || before.repeat === 'none' || before.done || after.done) return
  toast(
    i18n.t('schedule.nextOccurrence', {
      title: after.title,
      when: new Intl.DateTimeFormat(i18n.language, {
        weekday: 'short',
        day: 'numeric',
        month: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(after.startsAt),
    }),
    {
      action: {
        label: i18n.t('common.undo'),
        onClick: () => useAppointments.getState().restore(before),
      },
    },
  )
}
