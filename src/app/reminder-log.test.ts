import { beforeEach, describe, expect, it } from 'vitest'
import { getRepos, setRepos } from '@/lib/db'
import { createMemoryRepos } from '@/lib/db/memory'
import { logOutcome, logShown, resetReminderLog } from './reminder-log'

const flush = () => new Promise((r) => setTimeout(r, 0))
const all = async () => (await getRepos()).reminderEvents.listSince(0)

describe('reminder log', () => {
  beforeEach(() => {
    setRepos(createMemoryRepos(`test-${Math.random()}`))
    resetReminderLog()
  })

  it('persists a shown reminder and then its outcome as one row', async () => {
    logShown(['water'], 1000)
    await flush()
    expect(await all()).toEqual([expect.objectContaining({ kind: 'water', outcome: null })])

    logOutcome('water', 'done', 1500)
    await flush()
    const rows = await all()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ outcome: 'done', shownAt: 1000, resolvedAt: 1500 })
  })

  it('records an unanswered reminder as ignored when it comes back', async () => {
    logShown(['movement'], 1000)
    logShown(['movement'], 2000)
    await flush()
    const rows = await all()
    expect(rows.map((r) => r.outcome)).toEqual(['ignored', null])
  })

  it('ignores outcomes without a pending reminder', async () => {
    logOutcome('water', 'done', 1500)
    await flush()
    expect(await all()).toEqual([])
  })
})
