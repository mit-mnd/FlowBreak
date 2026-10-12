import type { TFunction } from 'i18next'
import type { ReminderKind } from '@/lib/scheduler'
import { getExercise } from '@/features/movement'
import type { ActiveReminder } from './reminders-store'

export function reminderLine(kind: ReminderKind, r: ActiveReminder, t: TFunction) {
  if (kind === 'water') {
    return {
      title: t('reminders.water.title'),
      body: r.gentle ? t('reminders.water.gentle') : t('reminders.water.body'),
    }
  }
  const ex = getExercise(r.exerciseId)
  const duration =
    ex.durationSec >= 60
      ? t('common.minutes', { count: Math.round(ex.durationSec / 60) })
      : t('common.seconds', { count: ex.durationSec })
  return {
    title: t('reminders.movement.title'),
    body: r.gentle
      ? t('reminders.movement.gentle')
      : t('reminders.movement.body', {
          minutes: r.sittingMin,
          exercise: t(`exercises.${ex.id}.name`),
          duration,
        }),
  }
}

/** Title/body for a single OS notification that groups all due reminders. */
export function notificationText(r: ActiveReminder, t: TFunction) {
  const lines = r.kinds.map((k) => reminderLine(k, r, t))
  if (lines.length === 1 && lines[0]) return lines[0]
  return { title: t('reminders.combinedTitle'), body: lines.map((l) => l.title).join(' · ') }
}
