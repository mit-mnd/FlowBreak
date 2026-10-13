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
