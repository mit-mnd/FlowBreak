import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BellRing, Moon, PauseCircle, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isWithinWorkHours, nextReminderAt, type ReminderKind } from '@/lib/scheduler'
import { MINUTE } from '@/lib/time'
import { toSchedulerConfig, useSettings } from '@/features/settings'
import { HydrationCard } from '@/features/hydration'
import { MovementCard } from '@/features/movement'
import { UpcomingCard } from '@/features/schedule'
import { TodayTasksCard } from '@/features/todos'
import { FocusBanner, StartFocusDialog, useFocus } from '@/features/focus'
import { useNow } from './hooks'
import { useNavigation } from './navigation'
import { useReminders } from './reminders-store'
import { PauseMenu } from './PauseMenu'

function greetingKey(now: number) {
  const h = new Date(now).getHours()
  return h < 12 ? 'greeting.morning' : h < 18 ? 'greeting.afternoon' : 'greeting.evening'
}

export function TodayPage() {
  const { t, i18n } = useTranslation()
  const now = useNow()
  const settings = useSettings((s) => s.settings)
  const state = useReminders((s) => s.state)
  const pauseUntil = useReminders((s) => s.pauseUntil)
  const focusActive = useFocus((s) => !!s.session)
  const setView = useNavigation((s) => s.setView)
  const [focusOpen, setFocusOpen] = useState(false)

  const config = toSchedulerConfig(settings)
  const paused = now < state.pausedUntil
  const inHours = isWithinWorkHours(now, config.workHours)
  const quiet = paused || !inHours
  const nextIn = (kind: ReminderKind) =>
    quiet || !config[kind].enabled
      ? null
      : Math.max(0, Math.ceil((nextReminderAt(kind, state, config, now) - now) / MINUTE))

  const timeFmt = new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit' })
  const dateFmt = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground first-letter:uppercase">
            {dateFmt.format(now)}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{t(greetingKey(now))} 👋</h1>
        </div>
        <div className="flex items-center gap-1">
          {!focusActive && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('focus.start')}
              title={t('focus.start')}
              onClick={() => setFocusOpen(true)}
            >
              <Timer />
            </Button>
          )}
          <PauseMenu />
        </div>
      </header>

      {paused ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl bg-warning-soft px-3 py-2 text-sm"
        >
          <PauseCircle className="size-4 shrink-0 text-warning" aria-hidden />
          <span className="flex-1">
            {t('reminders.pausedUntil', { time: timeFmt.format(state.pausedUntil) })}
          </span>
          <Button variant="outline" size="sm" onClick={() => pauseUntil(0)}>
            <BellRing aria-hidden />
            {t('reminders.resume')}
          </Button>
        </div>
      ) : !inHours ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground"
        >
          <Moon className="size-4 shrink-0" aria-hidden />
          {t('reminders.outsideHours')}
        </div>
      ) : null}

      <FocusBanner />
      <UpcomingCard now={now} onViewAll={() => setView('schedule')} />
      <HydrationCard now={now} nextInMin={nextIn('water')} />
      <MovementCard now={now} sittingSince={state.sittingSince} nextInMin={nextIn('movement')} />
      <TodayTasksCard onViewAll={() => setView('tasks')} />

      <StartFocusDialog open={focusOpen} onOpenChange={setFocusOpen} />
    </div>
  )
}
