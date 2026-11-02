import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart3, CalendarDays, House, ListChecks, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNow } from '@/lib/use-now'
import { overdueCount, useAppointments } from '@/features/schedule'
import { useNavigation, VIEWS, type View } from './navigation'

const ICONS: Record<View, LucideIcon> = {
  today: House,
  tasks: ListChecks,
  schedule: CalendarDays,
  stats: BarChart3,
  settings: Settings,
}

export function BottomNav() {
  const { t } = useTranslation()
  const view = useNavigation((s) => s.view)
  const setView = useNavigation((s) => s.setView)
  const now = useNow(30_000)
  const overdue = useAppointments((s) => overdueCount(s.items, now))

  // Ctrl+1..5 switches tabs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.shiftKey || e.altKey) return
      const target = VIEWS[Number(e.key) - 1]
      if (target) {
        e.preventDefault()
        setView(target)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setView])

  return (
    <nav
      aria-label={t('nav.label')}
      className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75"
    >
      <ul className="mx-auto flex max-w-lg">
        {VIEWS.map((v, i) => {
          const Icon = ICONS[v]
          const active = v === view
          return (
            <li key={v} className="flex-1">
              <button
                type="button"
                onClick={() => setView(v)}
                aria-current={active ? 'page' : undefined}
                aria-keyshortcuts={`Control+${i + 1}`}
                className={cn(
                  'flex h-16 w-full flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                  active
                    ? 'text-water-strong dark:text-water'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'relative grid h-7 w-12 place-items-center rounded-full transition-colors',
                    active && 'bg-water-soft',
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  {v === 'schedule' && overdue > 0 && (
                    <span className="absolute -top-1 right-1 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] leading-4 font-semibold text-white tabular-nums">
                      <span aria-hidden>{overdue > 9 ? '9+' : overdue}</span>
                      <span className="sr-only">{t('nav.overdueBadge', { count: overdue })}</span>
                    </span>
                  )}
                </span>
                {t(`nav.${v}`)}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
