import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { setLanguage } from '@/i18n'
import { isTauri, setTrayLabels } from '@/lib/tauri'
import { Toaster } from '@/components/ui/sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { SettingsPage, useSettings } from '@/features/settings'
import { useHydration } from '@/features/hydration'
import { ExerciseSession, useMovement } from '@/features/movement'
import { SchedulePage, useAppointments } from '@/features/schedule'
import { TasksPage, useTodos } from '@/features/todos'
import { useFocus } from '@/features/focus'
import { StatsPage } from '@/features/stats'
import { BottomNav } from './BottomNav'
import { InAppReminder } from './InAppReminder'
import { TodayPage } from './TodayPage'
import { useTheme } from './hooks'
import { useNavigation } from './navigation'
import { useReminders } from './reminders-store'
import { useReminderEngine } from './useReminderEngine'

async function bootstrap(): Promise<void> {
  // Settings first so language/theme are right before anything renders.
  await useSettings.getState().load()
  await Promise.all([
    useTodos.getState().load(),
    useAppointments.getState().load(),
    useHydration.getState().load(),
    useMovement.getState().load(),
    useFocus.getState().load(),
    useReminders.getState().load(),
  ])
}

export function App() {
  const { t } = useTranslation()
  const [ready, setReady] = useState(false)
  const settings = useSettings((s) => s.settings)
  const view = useNavigation((s) => s.view)
  const dark = useTheme(settings.theme)

  useEffect(() => {
    bootstrap()
      .catch((err) => console.error('Failed to load data', err))
      .finally(() => setReady(true))
  }, [])

  useEffect(() => {
    setLanguage(settings.language)
  }, [settings.language])

  useEffect(() => {
    if (!ready) return
    void setTrayLabels({
      show: t('tray.show'),
      water: t('tray.water', { amount: settings.cupMl }),
      pause: t('tray.pause'),
      quit: t('tray.quit'),
    }).catch(() => undefined)
  }, [ready, t, settings.language, settings.cupMl])

  useReminderEngine(ready, dark)

  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-x-hidden overflow-y-auto">
        <div className="mx-auto w-full max-w-lg px-4 pt-5 pb-24">
          {!ready ? (
            <LoadingSkeleton />
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                {view === 'today' && <TodayPage />}
                {view === 'tasks' && <TasksPage />}
                {view === 'schedule' && <SchedulePage />}
                {view === 'stats' && <StatsPage />}
                {view === 'settings' && <SettingsPage />}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>
      <BottomNav />
      <ExerciseSession />
      {!isTauri() && <InAppReminder />}
      <Toaster theme={dark ? 'dark' : 'light'} />
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-44" />
      <Skeleton className="h-32" />
      <Skeleton className="h-56" />
    </div>
  )
}
