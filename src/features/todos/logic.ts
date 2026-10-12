import type { Todo } from './types'

export function activeTodos(items: Todo[]): Todo[] {
  return items.filter((t) => !t.done).sort((a, b) => a.position - b.position)
}

export function completedTodos(items: Todo[]): Todo[] {
  return items.filter((t) => t.done).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
}

export function nextPosition(items: Todo[]): number {
  return items.reduce((max, t) => Math.max(max, t.position), 0) + 1
}

/** Reassign positions 1..n following `orderedIds`; returns only rows that changed. */
export function reposition(items: Todo[], orderedIds: string[]): Todo[] {
  const changed: Todo[] = []
  orderedIds.forEach((id, i) => {
    const item = items.find((t) => t.id === id)
    if (item && item.position !== i + 1) changed.push({ ...item, position: i + 1 })
  })
  return changed
}

/** Ids of active todos after moving `id` one slot up (-1) or down (+1). */
export function moveId(active: Todo[], id: string, dir: -1 | 1): string[] {
  const ids = active.map((t) => t.id)
  const i = ids.indexOf(id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= ids.length) return ids
  ;[ids[i], ids[j]] = [ids[j] as string, ids[i] as string]
  return ids
}
