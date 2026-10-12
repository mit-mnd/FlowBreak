import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Reorder, motion, useDragControls } from 'framer-motion'
import { Check, GripVertical, Star, Target, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useTodos } from '../store'
import { deleteTodo, toggleTodo } from '../actions'
import type { Todo } from '../types'

type TaskItemProps = {
  todo: Todo
  /** Full-list mode: drag handle, move buttons, priority and delete. */
  reorderable?: boolean
  isFirst?: boolean
  isLast?: boolean
  focused?: boolean
  onFocusTask?: (todo: Todo) => void
}

export function TaskItem({
  todo,
  reorderable,
  isFirst,
  isLast,
  focused,
  onFocusTask,
}: TaskItemProps) {
  const controls = useDragControls()
  const content = (
    <TaskRow
      todo={todo}
      full={!!reorderable}
      isFirst={isFirst}
      isLast={isLast}
      focused={focused}
      onFocusTask={onFocusTask}
      onDragStart={reorderable ? (e) => controls.start(e) : undefined}
    />
  )

  if (reorderable && !todo.done) {
    return (
      <Reorder.Item
        value={todo.id}
        dragListener={false}
        dragControls={controls}
        className="list-none"
      >
        {content}
      </Reorder.Item>
    )
  }
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="list-none"
    >
      {content}
    </motion.li>
  )
}

type TaskRowProps = {
  todo: Todo
  full: boolean
  isFirst?: boolean
  isLast?: boolean
  focused?: boolean
  onFocusTask?: (todo: Todo) => void
  onDragStart?: (e: React.PointerEvent) => void
}

function TaskRow({ todo, full, isFirst, isLast, focused, onFocusTask, onDragStart }: TaskRowProps) {
  const { t } = useTranslation()
  const rename = useTodos((s) => s.rename)
  const togglePriority = useTodos((s) => s.togglePriority)
  const move = useTodos((s) => s.move)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(todo.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const commit = () => {
    rename(todo.id, draft)
    setEditing(false)
  }

  const title = todo.title
  return (
    <div
      className={cn(
        'group flex min-h-12 items-center gap-1 rounded-lg border bg-card px-1.5 py-1 transition-colors',
        focused && 'border-water/50 ring-1 ring-water/30',
        todo.done && 'bg-transparent',
      )}
    >
      {full && !todo.done && (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          onPointerDown={onDragStart}
          className="grid h-9 w-5 cursor-grab touch-none place-items-center text-muted-foreground/60 hover:text-muted-foreground active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
      )}

      <button
        type="button"
        role="checkbox"
        aria-checked={todo.done}
        aria-label={todo.done ? t('todos.markUndone', { title }) : t('todos.markDone', { title })}
        onClick={() => toggleTodo(todo.id)}
        className="grid size-9 shrink-0 place-items-center rounded-full"
      >
        <span
          className={cn(
            'grid size-5 place-items-center rounded-full border-2 transition-colors',
            todo.done
              ? 'border-move bg-move text-move-foreground dark:text-background'
              : 'border-input group-hover:border-move',
          )}
        >
          {todo.done && <Check className="size-3" strokeWidth={3} aria-hidden />}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            aria-label={t('todos.editAria')}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') {
                setDraft(todo.title)
                setEditing(false)
              }
            }}
            className="w-full rounded-md bg-muted px-2 py-1 text-sm outline-none ring-2 ring-ring/60"
          />
        ) : (
          <p
            onDoubleClick={() => {
              if (todo.done) return
              setDraft(todo.title)
              setEditing(true)
            }}
            onKeyDown={(e) => {
              if (todo.done) return
              if (e.key === 'F2' || e.key === 'Enter') {
                setDraft(todo.title)
                setEditing(true)
              } else if (e.altKey && e.key === 'ArrowUp' && !isFirst) {
                e.preventDefault()
                move(todo.id, -1)
              } else if (e.altKey && e.key === 'ArrowDown' && !isLast) {
                e.preventDefault()
                move(todo.id, 1)
              }
            }}
            tabIndex={full && !todo.done ? 0 : undefined}
            title={full && !todo.done ? t('todos.reorderHint') : undefined}
            className={cn(
              'px-1 text-sm break-words',
              todo.done && 'text-muted-foreground line-through',
            )}
          >
            {todo.priority === 1 && !todo.done && (
              <span className="sr-only">{t('todos.important')}: </span>
            )}
            {title}
          </p>
        )}
      </div>

      {!todo.done && full && (
        <Button
          variant="ghost"
          size="icon"
          aria-pressed={todo.priority === 1}
          aria-label={t('todos.toggleImportant', { title })}
          onClick={() => togglePriority(todo.id)}
          className={cn(todo.priority === 1 && 'text-warning hover:text-warning')}
        >
          <Star className={cn(todo.priority === 1 && 'fill-current')} />
        </Button>
      )}
      {!full && todo.priority === 1 && !todo.done && (
        <Star className="mr-2 size-4 fill-current text-warning" aria-hidden />
      )}

      {!todo.done && onFocusTask && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('todos.focus', { title })}
          onClick={() => onFocusTask(todo)}
          className="opacity-60 group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Target />
        </Button>
      )}

      {full && (
        <Button
          variant="danger"
          size="icon"
          aria-label={t('todos.delete', { title })}
          onClick={() => deleteTodo(todo.id)}
          className="opacity-60 group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Trash2 />
        </Button>
      )}
    </div>
  )
}
