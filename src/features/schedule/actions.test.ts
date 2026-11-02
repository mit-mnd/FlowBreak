import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setRepos } from '@/lib/db'
import { createMemoryRepos } from '@/lib/db/memory'
import { DAY } from '@/lib/time'
import { toggleAppointmentDone } from './actions'
import { useAppointments } from './store'

const toast = vi.hoisted(() => vi.fn())
vi.mock('sonner', () => ({ toast }))

const get = () => useAppointments.getState()

describe('toggleAppointmentDone', () => {
  beforeEach(() => {
    localStorage.clear()
    toast.mockClear()
    setRepos(createMemoryRepos(`test-${Math.random()}`))
    useAppointments.setState({ items: [], loaded: true })
  })

  // Appointments have minute precision, and recurrence keeps the wall-clock minute.
  const tomorrow = () => Math.floor((Date.now() + DAY) / 60_000) * 60_000
  const make = (repeat: 'none' | 'daily', startsAt = tomorrow()) =>
    get().add({ title: 'Standup', note: '', startsAt, remindBeforeMin: 10, repeat })!

  it('tells the user the next occurrence of a recurring one, with an undo that restores it', () => {
    const a = make('daily')
    toggleAppointmentDone(a.id)

    // Same wall-clock time on the next calendar day (a day is 23 or 25 hours across DST).
    const nextDay = new Date(a.startsAt)
    nextDay.setDate(nextDay.getDate() + 1)
    expect(get().items[0]?.startsAt).toBe(nextDay.getTime())
    expect(toast).toHaveBeenCalledTimes(1)
    const [message, options] = toast.mock.calls[0] as [string, { action: { onClick: () => void } }]
    expect(message).toContain('Standup')

    options.action.onClick()
    expect(get().items).toHaveLength(1)
    expect(get().items[0]).toMatchObject({ startsAt: a.startsAt, done: false })
  })

  it('stays quiet for a one-off', () => {
    const a = make('none')
    toggleAppointmentDone(a.id)
    expect(get().items[0]?.done).toBe(true)
    expect(toast).not.toHaveBeenCalled()
  })

  it('stays quiet when the last occurrence of a series is finished (it just becomes done)', () => {
    const a = get().add({
      title: 'Last',
      note: '',
      startsAt: Date.now() + DAY,
      remindBeforeMin: 10,
      repeat: 'daily',
      repeatUntil: Date.now() + DAY + 1000,
    })!
    toggleAppointmentDone(a.id)
    expect(get().items[0]?.done).toBe(true)
    expect(toast).not.toHaveBeenCalled()
  })

  it('ignores an unknown id', () => {
    toggleAppointmentDone('missing')
    expect(toast).not.toHaveBeenCalled()
  })
})
