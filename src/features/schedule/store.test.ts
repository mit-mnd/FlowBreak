import { beforeEach, describe, expect, it } from 'vitest'
import { setRepos } from '@/lib/db'
import { createMemoryRepos } from '@/lib/db/memory'
import { MINUTE } from '@/lib/time'
import { dueAppointments } from './logic'
import { useAppointments } from './store'

const inMinutes = (m: number) => Date.now() + m * MINUTE
const draft = (
  over: Partial<Parameters<ReturnType<typeof useAppointments.getState>['add']>[0]> = {},
) => ({
  title: 'Dentist',
  note: '',
  startsAt: inMinutes(60),
  remindBeforeMin: 10,
  ...over,
})

describe('appointments store', () => {
  beforeEach(() => {
    localStorage.clear()
    setRepos(createMemoryRepos(`test-${Math.random()}`))
    useAppointments.setState({ items: [], loaded: true })
  })

  it('adds trimmed appointments and ignores a blank title', () => {
    const s = useAppointments.getState()
    expect(s.add(draft({ title: '   ' }))).toBeNull()
    s.add(draft({ title: '  Team sync ', note: ' room 3 ' }))
    expect(useAppointments.getState().items[0]).toMatchObject({
      title: 'Team sync',
      note: 'room 3',
    })
  })

  it('notifies once, then stays quiet after being marked notified', () => {
    const a = useAppointments.getState().add(draft({ startsAt: inMinutes(5) }))!
    expect(dueAppointments(useAppointments.getState().items, Date.now())).toHaveLength(1)
    useAppointments.getState().markNotified([a.id], Date.now())
    expect(dueAppointments(useAppointments.getState().items, Date.now())).toHaveLength(0)
  })

  it('snooze makes it due again later', () => {
    const a = useAppointments.getState().add(draft({ startsAt: inMinutes(5) }))!
    useAppointments.getState().markNotified([a.id], Date.now())
    useAppointments.getState().snooze([a.id], 10)
    const items = useAppointments.getState().items
    expect(dueAppointments(items, Date.now())).toHaveLength(0)
    expect(dueAppointments(items, Date.now() + 10 * MINUTE + 1000)).toHaveLength(1)
  })

  it('changing the time re-arms a notified appointment', () => {
    const a = useAppointments.getState().add(draft({ startsAt: inMinutes(5) }))!
    useAppointments.getState().markNotified([a.id], Date.now())
    useAppointments.getState().update(a.id, { startsAt: inMinutes(120) })
    expect(useAppointments.getState().items[0]?.notifiedAt).toBeNull()
  })

  it('editing only the title keeps the notified state', () => {
    const a = useAppointments.getState().add(draft({ startsAt: inMinutes(5) }))!
    useAppointments.getState().markNotified([a.id], 123)
    useAppointments.getState().update(a.id, { title: 'Renamed' })
    expect(useAppointments.getState().items[0]).toMatchObject({ title: 'Renamed', notifiedAt: 123 })
  })

  it('marking done silences it; undoing a delete restores it', () => {
    const a = useAppointments.getState().add(draft({ startsAt: inMinutes(5) }))!
    useAppointments.getState().toggleDone(a.id)
    expect(dueAppointments(useAppointments.getState().items, Date.now())).toHaveLength(0)

    const removed = useAppointments.getState().remove(a.id)!
    expect(useAppointments.getState().items).toHaveLength(0)
    useAppointments.getState().restore(removed)
    expect(useAppointments.getState().items).toHaveLength(1)
  })

  it('persists to the repository', async () => {
    useAppointments.getState().add(draft({ title: 'Persisted' }))
    await new Promise((r) => setTimeout(r, 0))
    await useAppointments.getState().load()
    expect(useAppointments.getState().items.map((a) => a.title)).toEqual(['Persisted'])
  })
})
