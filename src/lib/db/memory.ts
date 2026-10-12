import type { LogRepo, Repos, Todo } from './types'

/**
 * Browser / test implementation. Persists to localStorage when available so
 * `pnpm dev` keeps data across reloads; falls back to memory otherwise.
 */
function table<T extends { id: string }>(key: string) {
  let rows: T[] = []
  try {
    const raw = localStorage.getItem(key)
    if (raw) rows = JSON.parse(raw) as T[]
  } catch {
    rows = []
  }
  const persist = () => {
    try {
      localStorage.setItem(key, JSON.stringify(rows))
    } catch {
      // Storage unavailable: keep data in memory only.
    }
  }
  return {
    all: () => rows.slice(),
    put(row: T) {
      const i = rows.findIndex((r) => r.id === row.id)
      if (i >= 0) rows[i] = row
      else rows.push(row)
      persist()
    },
    remove(id: string) {
      rows = rows.filter((r) => r.id !== id)
      persist()
    },
  }
}

function logRepo<T extends { id: string; loggedAt: number }>(key: string): LogRepo<T> {
  const t = table<T>(key)
  return {
    listSince: async (ts) =>
      t
        .all()
        .filter((r) => r.loggedAt >= ts)
        .sort((a, b) => a.loggedAt - b.loggedAt),
    add: async (e) => t.put(e),
    remove: async (id) => t.remove(id),
  }
}

export function createMemoryRepos(prefix = 'flowbreak'): Repos {
  const todos = table<Todo>(`${prefix}:todos`)
  return {
    todos: {
      list: async () => todos.all().sort((a, b) => a.position - b.position),
      upsert: async (todo) => todos.put(todo),
      remove: async (id) => todos.remove(id),
      async savePositions(items) {
        const byId = new Map(todos.all().map((r) => [r.id, r]))
        for (const item of items) {
          const row = byId.get(item.id)
          if (row) todos.put({ ...row, position: item.position })
        }
      },
    },
    water: logRepo(`${prefix}:water`),
    movement: logRepo(`${prefix}:movement`),
  }
}
