import { create } from 'zustand'
import { getRepos } from '@/lib/db'
import { uid } from '@/lib/utils'
import { activeTodos, moveId, nextPosition, reposition } from './logic'
import type { Todo } from './types'

type TodosStore = {
  items: Todo[]
  loaded: boolean
  /** Set when a task is completed; the reminder engine treats it as a natural break. */
  lastCompleted: { id: string; at: number } | null
  load(): Promise<void>
  add(title: string): Todo | null
  toggle(id: string): Todo | undefined
  rename(id: string, title: string): void
  togglePriority(id: string): void
  remove(id: string): Todo | undefined
  restore(todos: Todo[]): void
  reorder(orderedActiveIds: string[]): void
  move(id: string, dir: -1 | 1): void
  clearCompleted(): Todo[]
}

const persist = (todo: Todo) => void getRepos().then((r) => r.todos.upsert(todo))

export const useTodos = create<TodosStore>((set, get) => {
  const patch = (id: string, fn: (t: Todo) => Todo): Todo | undefined => {
    let updated: Todo | undefined
    set({
      items: get().items.map((t) => {
        if (t.id !== id) return t
        updated = fn(t)
        return updated
      }),
    })
    if (updated) persist(updated)
    return updated
  }

  return {
    items: [],
    loaded: false,
    lastCompleted: null,
    async load() {
      const repos = await getRepos()
      set({ items: await repos.todos.list(), loaded: true })
    },
    add(title) {
      const clean = title.trim()
      if (!clean) return null
      const todo: Todo = {
        id: uid(),
        title: clean,
        done: false,
        priority: 0,
        position: nextPosition(get().items),
        createdAt: Date.now(),
        completedAt: null,
      }
      set({ items: [...get().items, todo] })
      persist(todo)
      return todo
    },
    toggle(id) {
      const now = Date.now()
      const updated = patch(id, (t) => ({
        ...t,
        done: !t.done,
        completedAt: t.done ? null : now,
        // Re-opened tasks go to the bottom of the active list.
        position: t.done ? nextPosition(get().items) : t.position,
      }))
      if (updated?.done) set({ lastCompleted: { id, at: now } })
      return updated
    },
    rename(id, title) {
      const clean = title.trim()
      if (clean) patch(id, (t) => ({ ...t, title: clean }))
    },
    togglePriority(id) {
      patch(id, (t) => ({ ...t, priority: t.priority === 1 ? 0 : 1 }))
    },
    remove(id) {
      const todo = get().items.find((t) => t.id === id)
      if (!todo) return undefined
      set({ items: get().items.filter((t) => t.id !== id) })
      void getRepos().then((r) => r.todos.remove(id))
      return todo
    },
    restore(todos) {
      const ids = new Set(todos.map((t) => t.id))
      set({ items: [...get().items.filter((t) => !ids.has(t.id)), ...todos] })
      todos.forEach(persist)
    },
    reorder(orderedActiveIds) {
      const changed = reposition(get().items, orderedActiveIds)
      if (changed.length === 0) return
      const byId = new Map(changed.map((t) => [t.id, t]))
      set({ items: get().items.map((t) => byId.get(t.id) ?? t) })
      void getRepos().then((r) => r.todos.savePositions(changed))
    },
    move(id, dir) {
      get().reorder(moveId(activeTodos(get().items), id, dir))
    },
    clearCompleted() {
      const removed = get().items.filter((t) => t.done)
      set({ items: get().items.filter((t) => !t.done) })
      void getRepos().then(async (r) => {
        for (const t of removed) await r.todos.remove(t.id)
      })
      return removed
    },
  }
})
