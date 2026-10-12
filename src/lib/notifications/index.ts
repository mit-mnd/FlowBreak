import { isTauri } from '@/lib/tauri'

/** Native OS notification. Silently does nothing if permission is denied. */
export async function sendSystemNotification(title: string, body: string): Promise<void> {
  try {
    if (isTauri()) {
      const n = await import('@tauri-apps/plugin-notification')
      let granted = await n.isPermissionGranted()
      if (!granted) granted = (await n.requestPermission()) === 'granted'
      if (granted) n.sendNotification({ title, body })
      return
    }
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'default') await Notification.requestPermission()
    if (Notification.permission === 'granted') new Notification(title, { body })
  } catch (err) {
    console.warn('Notification failed', err)
  }
}
