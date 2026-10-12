import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ListChecks, ListTodo, PartyPopper } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { StartFocusDialog, useFocus } from '@/features/focus'
import { activeTodos } from '../logic'
import { useTodos } from '../store'
import type { Todo } from '../types'
import { TaskItem } from './TaskItem'
import { TaskQuickAdd } from './TaskQuickAdd'

const LIMIT = 5

export function TodayTasksCard({ onViewAll }: { onViewAll: () => void }) {
  const { t } = useTranslation()
  const items = useTodos((s) => s.items)
  const focusTaskId = useFocus((s) => s.session?.taskId ?? null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [focusTarget, setFocusTarget] = useState<Todo | null>(null)
  const active = useMemo(() => activeTodos(items), [items])

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="grid size-7 place-items-center rounded-lg bg-muted text-foreground">
            <ListChecks className="size-4" aria-hidden />
          </span>
          {t('todos.today')}
        </CardTitle>
        {active.length > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {t('todos.remaining', { count: active.length })}
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <TaskQuickAdd ref={inputRef} />
        {items.length === 0 ? (
          <EmptyState
            className="py-4"
            icon={ListTodo}
            title={t('todos.emptyTitle')}
            body={t('todos.emptyBody')}
          />
        ) : active.length === 0 ? (
          <EmptyState className="py-4" icon={PartyPopper} title={t('todos.allDone')} />
        ) : (
          <ul className="space-y-2">
            {active.slice(0, LIMIT).map((todo) => (
              <TaskItem
                key={todo.id}
                todo={todo}
                focused={todo.id === focusTaskId}
                onFocusTask={setFocusTarget}
              />
            ))}
          </ul>
        )}
        {items.length > 0 && (
          <Button variant="ghost" size="sm" className="w-full" onClick={onViewAll}>
            {t('todos.viewAll')}
            <ArrowRight aria-hidden />
          </Button>
        )}
      </CardContent>
      <StartFocusDialog
        open={!!focusTarget}
        onOpenChange={(open) => !open && setFocusTarget(null)}
        task={focusTarget}
      />
    </Card>
  )
}
