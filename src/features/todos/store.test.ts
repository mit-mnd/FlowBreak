import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryRepos } from '@/lib/db/memory'
import { setRepos } from '@/lib/db'
import { activeTodos, completedTodos } from './logic'
import { useTodos } from './store'

const titles = () => activeTodos(useTodos.getState().items).map((t) => t.title)

describe('todos store', () => {
  beforeEach(() => {
    localStorage.clear()
    setRepos(createMemoryRepos(`test-${Math.random()}`))
    useTodos.setState({ items: [], loaded: true, lastCompleted: null })
  })

  it('adds trimmed tasks and ignores blank input', () => {
    const s = useTodos.getState()
    expect(s.add('   ')).toBeNull()
    s.add('  Write report ')
    s.add('Reply emails')
    expect(titles()).toEqual(['Write report', 'Reply emails'])
  })

  it('completing a task records a natural break and moves it to completed', () => {
    const todo = useTodos.getState().add('Deploy')!
    useTodos.getState().toggle(todo.id)
    const s = useTodos.getState()
    expect(s.lastCompleted?.id).toBe(todo.id)
    expect(completedTodos(s.items).map((t) => t.id)).toEqual([todo.id])
    expect(activeTodos(s.items)).toEqual([])
  })

  it('moves and reorders active tasks', () => {
    const s = useTodos.getState()
    const a = s.add('A')!
    s.add('B')
    const c = s.add('C')!
    useTodos.getState().move(c.id, -1)
    expect(titles()).toEqual(['A', 'C', 'B'])
    useTodos.getState().move(a.id, -1) // already first: no-op
    expect(titles()).toEqual(['A', 'C', 'B'])
  })

  it('remove + restore supports undo', () => {
    const t = useTodos.getState().add('Temp')!
    const removed = useTodos.getState().remove(t.id)!
    expect(titles()).toEqual([])
    useTodos.getState().restore([removed])
    expect(titles()).toEqual(['Temp'])
  })

  it('persists to the repository', async () => {
    useTodos.getState().add('Persisted')
    await new Promise((r) => setTimeout(r, 0))
    await useTodos.getState().load()
    expect(titles()).toEqual(['Persisted'])
  })
})
