import { toast } from 'sonner'
import i18n from '@/i18n'
import { useHydration } from './store'

/** Log water and show a toast with Undo. Used by the card, tray, shortcut and popup. */
export function logWater(amountMl: number): void {
  const log = useHydration.getState().add(amountMl)
  toast.success(i18n.t('hydration.logged', { amount: amountMl }), {
    id: `water-${log.id}`,
    action: {
      label: i18n.t('common.undo'),
      onClick: () => useHydration.getState().remove(log.id),
    },
  })
}
