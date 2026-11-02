import { describe, expect, it } from 'vitest'
import { createMemoryRepos } from './memory'
import type { FocusLog, ReminderEvent } from './types'

const event = (over: Partial<ReminderEvent> = {}): ReminderEvent => ({
  id: 'a',
  kind: 'water',
  shownAt: 1000,
  outcome: null,
  resolvedAt: null,
  ...over,
})

describe('reminder event repo (memory)', () => {
  const fresh = () => createMemoryRepos(`test-${Math.random()}`).reminderEvents

  it('lists events since a timestamp, oldest first', async () => {
    const repo = fresh()
    await repo.upsert(event({ id: 'late', shownAt: 3000 }))
    await repo.upsert(event({ id: 'early', shownAt: 1000 }))
    await repo.upsert(event({ id: 'old', shownAt: 10 }))
    expect((await repo.listSince(500)).map((e) => e.id)).toEqual(['early', 'late'])
  })

  it('upsert updates an existing event instead of duplicating it', async () => {
    const repo = fresh()
    await repo.upsert(event())
    await repo.upsert(event({ outcome: 'done', resolvedAt: 2000 }))
    const rows = await repo.listSince(0)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ outcome: 'done', resolvedAt: 2000 })
  })
})

describe('focus repo (memory)', () => {
  const log = (over: Partial<FocusLog> = {}): FocusLog => ({
    id: 'f',
    taskId: 't',
    title: 'Task',
    startedAt: 1000,
    endedAt: 2000,
    plannedMin: 25,
    completed: false,
    ...over,
  })
  const fresh = () => createMemoryRepos(`test-${Math.random()}`).focus

  it('lists sessions since a timestamp, oldest first', async () => {
    const repo = fresh()
    await repo.upsert(log({ id: 'b', startedAt: 3000 }))
    await repo.upsert(log({ id: 'a', startedAt: 1000 }))
    await repo.upsert(log({ id: 'old', startedAt: 5 }))
    expect((await repo.listSince(100)).map((f) => f.id)).toEqual(['a', 'b'])
  })

  it('upsert replaces a session with the same id', async () => {
    const repo = fresh()
    await repo.upsert(log())
    await repo.upsert(log({ endedAt: 9000, completed: true }))
    const rows = await repo.listSince(0)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ endedAt: 9000, completed: true })
  })
})
