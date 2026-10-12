import { toast } from 'sonner'
import i18n from '@/i18n'
import { useTodos } from './store'

export function toggleTodo(id: string): void {
  const before = useTodos.getState().items.find((t) => t.id === id)
  const updated = useTodos.getState().toggle(id)
  if (updated?.done && before) {
    toast.success(i18n.t('todos.completedToast', { title: updated.title }), {
      action: {
        label: i18n.t('common.undo'),
        onClick: () => useTodos.getState().restore([before]),
      },
    })
  }
}

export function deleteTodo(id: string): void {
  const removed = useTodos.getState().remove(id)
  if (!removed) return
  toast(i18n.t('todos.deleted', { title: removed.title }), {
    action: { label: i18n.t('common.undo'), onClick: () => useTodos.getState().restore([removed]) },
  })
}

export function clearCompletedTodos(): void {
  const removed = useTodos.getState().clearCompleted()
  if (removed.length === 0) return
  toast(i18n.t('todos.cleared', { count: removed.length }), {
    action: { label: i18n.t('common.undo'), onClick: () => useTodos.getState().restore(removed) },
  })
}
