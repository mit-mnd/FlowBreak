import { describe, expect, it } from 'vitest'
import { recordOutcome, recordShown, type PendingEvents } from './events'

let n = 0
const newId = () => `e${++n}`

describe('recordShown', () => {
  it('creates one pending event per kind', () => {
    const r = recordShown({}, ['water', 'movement'], 1000, newId)
    expect(r.writes).toHaveLength(2)
    expect(r.writes.every((e) => e.outcome === null && e.resolvedAt === null)).toBe(true)
    expect(r.pending.water?.shownAt).toBe(1000)
    expect(r.pending.movement).toBeDefined()
  })

  it('marks the previous pending event ignored when the kind is shown again', () => {
    const first = recordShown({}, ['water'], 1000, newId)
    const prevId = first.pending.water?.id
    const second = recordShown(first.pending, ['water'], 2000, newId)

    const [ignored, fresh] = second.writes
    expect(ignored).toMatchObject({ id: prevId, outcome: 'ignored', resolvedAt: 2000 })
    expect(fresh).toMatchObject({ kind: 'water', shownAt: 2000, outcome: null })
    expect(second.pending.water?.id).toBe(fresh?.id)
  })

  it('does not touch other kinds or mutate its input', () => {
    const base = recordShown({}, ['movement'], 1000, newId)
    const snapshot = structuredClone(base.pending)
    const next = recordShown(base.pending, ['water'], 2000, newId)
    expect(base.pending).toEqual(snapshot)
    expect(next.pending.movement).toEqual(base.pending.movement)
    expect(next.writes).toHaveLength(1)
  })

  it('does nothing for an empty list', () => {
    const pending: PendingEvents = {}
    const r = recordShown(pending, [], 1, newId)
    expect(r.writes).toEqual([])
    expect(r.pending).toEqual({})
  })
})

describe('recordOutcome', () => {
  it('resolves the pending event and clears it', () => {
    const shown = recordShown({}, ['water'], 1000, newId)
    const r = recordOutcome(shown.pending, 'water', 'done', 1500)
    expect(r.writes).toEqual([
      expect.objectContaining({ kind: 'water', outcome: 'done', shownAt: 1000, resolvedAt: 1500 }),
    ])
    expect(r.pending.water).toBeUndefined()
  })

  it('is a no-op when nothing is pending, so a second resolve cannot double count', () => {
    const shown = recordShown({}, ['water'], 1000, newId)
    const once = recordOutcome(shown.pending, 'water', 'done', 1500)
    const twice = recordOutcome(once.pending, 'water', 'skipped', 1600)
    expect(twice.writes).toEqual([])
    expect(twice.pending).toBe(once.pending)
  })

  it('only resolves the requested kind', () => {
    const shown = recordShown({}, ['water', 'movement'], 1000, newId)
    const r = recordOutcome(shown.pending, 'movement', 'snoozed', 1200)
    expect(r.pending.water).toBeDefined()
    expect(r.pending.movement).toBeUndefined()
  })
})
