import { describe, expect, it } from 'vitest'
import { createMemoryRepos } from './memory'
import type { ReminderEvent } from './types'

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
