import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useReminders } from './reminders-store'
import { ReminderContent } from './ReminderContent'
import { sendReminderAction } from './useReminderEngine'

/** Browser-mode fallback for the Tauri corner popup window. */
export function InAppReminder() {
  const { t } = useTranslation()
  const current = useReminders((s) => s.current)

  return (
    <Dialog
      open={!!current}
      onOpenChange={(open) => !open && sendReminderAction({ kind: 'all', action: 'snooze' })}
    >
      <DialogContent closeLabel={t('reminders.snooze')}>
        <DialogTitle className="mb-4 pr-8">{t('reminders.combinedTitle')}</DialogTitle>
        {current && <ReminderContent reminder={current} onAction={sendReminderAction} />}
      </DialogContent>
    </Dialog>
  )
}
