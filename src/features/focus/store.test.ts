import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getRepos, setRepos } from '@/lib/db'
import { createMemoryRepos } from '@/lib/db/memory'
import { kvGet, kvSet } from '@/lib/tauri'
import { MINUTE } from '@/lib/time'
import { useFocus } from './store'

const T0 = new Date(2026, 9, 12, 9, 0).getTime()
const flush = () => new Promise((r) => setTimeout(r, 0))
const stored = async () => (await getRepos()).focus.listSince(0)
const at = (ms: number) => vi.setSystemTime(T0 + ms)

describe('focus store', () => {
  beforeEach(() => {
    localStorage.clear()
    setRepos(createMemoryRepos(`test-${Math.random()}`))
    useFocus.setState({ session: null, logs: [] })
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(T0)
  })
  afterEach(() => vi.useRealTimers())

  it('logs a session when it is stopped, with the elapsed time', async () => {
    useFocus.getState().start({ taskId: 't1', title: 'Report', durationMin: 25 })
    at(12 * MINUTE)
    useFocus.getState().stop()
    await flush()

    expect(useFocus.getState().session).toBeNull()
    const rows = await stored()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      taskId: 't1',
      title: 'Report',
      plannedMin: 25,
      completed: false,
      startedAt: T0,
      endedAt: T0 + 12 * MINUTE,
    })
    expect(useFocus.getState().logs).toHaveLength(1)
  })

  it('marks a session that ran to the end as completed', async () => {
    useFocus.getState().start({ durationMin: 15 })
    at(15 * MINUTE)
    useFocus.getState().stop()
    await flush()
    expect((await stored())[0]).toMatchObject({ completed: true, taskId: null })
  })

  it('does not log accidental sessions under a minute', async () => {
    useFocus.getState().start({ durationMin: 25 })
    at(20_000)
    useFocus.getState().stop()
    await flush()
    expect(await stored()).toEqual([])
    expect(useFocus.getState().logs).toEqual([])
  })

  it('finishes the previous session when a new one starts over it', async () => {
    useFocus.getState().start({ taskId: 'a', durationMin: 25 })
    at(10 * MINUTE)
    useFocus.getState().start({ taskId: 'b', durationMin: 25 })
    await flush()

    const rows = await stored()
    expect(rows.map((r) => [r.taskId, r.completed])).toEqual([['a', false]])
    expect(useFocus.getState().session?.taskId).toBe('b')
  })

  it('ignores a second stop, so a session is never logged twice', async () => {
    useFocus.getState().start({ durationMin: 25 })
    at(5 * MINUTE)
    useFocus.getState().stop()
    at(9 * MINUTE)
    useFocus.getState().stop()
    await flush()
    expect(await stored()).toHaveLength(1)
  })

  it('restores a session that is still running after a restart', async () => {
    useFocus.getState().start({ taskId: 't', durationMin: 25 })
    const id = useFocus.getState().session?.id
    useFocus.setState({ session: null, logs: [] }) // simulate a fresh process
    at(5 * MINUTE)
    await useFocus.getState().load()

    expect(useFocus.getState().session?.id).toBe(id)
    expect(await stored()).toEqual([])
  })

  it('logs a session that ended while the app was closed, capped at its planned end', async () => {
    useFocus.getState().start({ taskId: 't', durationMin: 25 })
    useFocus.setState({ session: null, logs: [] })
    at(3 * 60 * MINUTE) // app reopened three hours later
    await useFocus.getState().load()
    await flush()

    expect(useFocus.getState().session).toBeNull()
    const rows = await stored()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ endedAt: T0 + 25 * MINUTE, completed: true })
    expect(await kvGet('focus')).toBeNull()
  })

  it('gives sessions saved before ids existed an id', async () => {
    await kvSet('focus', { taskId: null, title: null, startedAt: T0, durationMin: 25 })
    at(MINUTE)
    await useFocus.getState().load()
    expect(useFocus.getState().session?.id).toBeTruthy()
  })

  it('logs an expired session once even if load runs twice at the same time', async () => {
    // Legacy session without an id, as saved by an older version.
    await kvSet('focus', { taskId: 't', title: null, startedAt: T0, durationMin: 25 })
    at(3 * 60 * MINUTE)
    await Promise.all([useFocus.getState().load(), useFocus.getState().load()])
    await flush()
    expect(await stored()).toHaveLength(1)
    expect(useFocus.getState().logs).toHaveLength(1)
  })

  it('does the same for a session that already has an id', async () => {
    useFocus.getState().start({ taskId: 't', durationMin: 25 })
    useFocus.setState({ session: null, logs: [] })
    at(3 * 60 * MINUTE)
    await Promise.all([useFocus.getState().load(), useFocus.getState().load()])
    await flush()
    expect(await stored()).toHaveLength(1)
  })

  it('loads earlier logs from the database', async () => {
    const repos = await getRepos()
    await repos.focus.upsert({
      id: 'old',
      taskId: 'x',
      title: null,
      startedAt: T0 - 1000 * MINUTE,
      endedAt: T0 - 990 * MINUTE,
      plannedMin: 15,
      completed: false,
    })
    await useFocus.getState().load()
    expect(useFocus.getState().logs.map((l) => l.id)).toEqual(['old'])
  })
})
