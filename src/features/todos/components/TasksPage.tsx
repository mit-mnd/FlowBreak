import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, Reorder } from 'framer-motion'
import { ChevronDown, ListTodo, PartyPopper } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { StartFocusDialog, useFocus } from '@/features/focus'
import { activeTodos, completedTodos } from '../logic'
import { clearCompletedTodos } from '../actions'
import { useTodos } from '../store'
import type { Todo } from '../types'
import { TaskItem } from './TaskItem'
import { TaskQuickAdd } from './TaskQuickAdd'

export function TasksPage() {
  const { t } = useTranslation()
  const items = useTodos((s) => s.items)
  const reorder = useTodos((s) => s.reorder)
  const focusTaskId = useFocus((s) => s.session?.taskId ?? null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [showDone, setShowDone] = useState(false)
  const [focusTarget, setFocusTarget] = useState<Todo | null>(null)

  const active = useMemo(() => activeTodos(items), [items])
  const done = useMemo(() => completedTodos(items), [items])

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t('todos.title')}</h1>
        {active.length > 0 && (
          <span className="text-sm text-muted-foreground tabular-nums">
            {t('todos.remaining', { count: active.length })}
          </span>
        )}
      </div>

      <TaskQuickAdd ref={inputRef} />

      {items.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title={t('todos.emptyTitle')}
          body={t('todos.emptyBody')}
          action={
            <Button variant="water" onClick={() => inputRef.current?.focus()}>
              {t('todos.emptyAction')}
            </Button>
          }
        />
      ) : active.length === 0 ? (
        <EmptyState icon={PartyPopper} title={t('todos.allDone')} body={t('todos.emptyBody')} />
      ) : (
        <>
          <Reorder.Group
            axis="y"
            values={active.map((t) => t.id)}
            onReorder={reorder}
            className="space-y-2"
          >
            {active.map((todo, i) => (
              <TaskItem
                key={todo.id}
                todo={todo}
                reorderable
                isFirst={i === 0}
                isLast={i === active.length - 1}
                focused={todo.id === focusTaskId}
                onFocusTask={setFocusTarget}
              />
            ))}
          </Reorder.Group>
          <p className="text-center text-xs text-muted-foreground">{t('todos.reorderHint')}</p>
        </>
      )}

      {done.length > 0 && (
        <section className="pt-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-expanded={showDone}
              onClick={() => setShowDone((v) => !v)}
              className="flex min-h-9 items-center gap-1 rounded-md px-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ChevronDown
                className={cn('size-4 transition-transform', !showDone && '-rotate-90')}
                aria-hidden
              />
              {t('todos.completedSection', { count: done.length })}
            </button>
            {showDone && (
              <Button variant="ghost" size="sm" onClick={clearCompletedTodos}>
                {t('todos.clearCompleted')}
              </Button>
            )}
          </div>
          <AnimatePresence initial={false}>
            {showDone && (
              <ul className="mt-2 space-y-1">
                {done.map((todo) => (
                  <TaskItem key={todo.id} todo={todo} reorderable />
                ))}
              </ul>
            )}
          </AnimatePresence>
        </section>
      )}

      <StartFocusDialog
        open={!!focusTarget}
        onOpenChange={(open) => !open && setFocusTarget(null)}
        task={focusTarget}
      />
    </div>
  )
}
