import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@/i18n'
import { setRepos } from '@/lib/db'
import { createMemoryRepos } from '@/lib/db/memory'
import { DAY } from '@/lib/time'
import { toDateInput, toTimeInput } from '../logic'
import { useAppointments } from '../store'
import type { Appointment } from '../types'
import { AppointmentDialog } from './AppointmentDialog'
import { AppointmentItem } from './AppointmentItem'

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn() }) }))

const get = () => useAppointments.getState()
const tomorrow = () => Math.floor((Date.now() + DAY) / 60_000) * 60_000

const renderDialog = (appointment: Appointment | null = null) => {
  const onOpenChange = vi.fn()
  render(<AppointmentDialog open onOpenChange={onOpenChange} appointment={appointment} />)
  return onOpenChange
}

/** Fill the form like a user: title, then date and time. */
const fillBasics = async (title: string, startsAt: number) => {
  const user = userEvent.setup()
  await user.clear(screen.getByLabelText('Tiêu đề'))
  await user.type(screen.getByLabelText('Tiêu đề'), title)
  fireEvent.change(screen.getByLabelText('Ngày'), { target: { value: toDateInput(startsAt) } })
  fireEvent.change(screen.getByLabelText('Giờ'), { target: { value: toTimeInput(startsAt) } })
  return user
}

describe('AppointmentDialog: repeat', () => {
  beforeEach(() => {
    localStorage.clear()
    setRepos(createMemoryRepos(`test-${Math.random()}`))
    useAppointments.setState({ items: [], loaded: true })
  })

  it('creates a recurring appointment from the form', async () => {
    const onOpenChange = renderDialog()
    const start = tomorrow()
    const user = await fillBasics('Họp nhóm', start)

    await user.selectOptions(screen.getByLabelText('Lặp lại'), 'weekly')
    expect(screen.getByLabelText('Lặp đến ngày (không bắt buộc)')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Đặt lịch' }))

    expect(get().items).toHaveLength(1)
    expect(get().items[0]).toMatchObject({
      title: 'Họp nhóm',
      repeat: 'weekly',
      startsAt: start,
      seriesStart: start,
      repeatUntil: null,
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('stores the end date as the last moment of that day', async () => {
    renderDialog()
    const user = await fillBasics('Dự án', tomorrow())
    await user.selectOptions(screen.getByLabelText('Lặp lại'), 'daily')
    const until = toDateInput(tomorrow() + 10 * DAY)
    fireEvent.change(screen.getByLabelText('Lặp đến ngày (không bắt buộc)'), {
      target: { value: until },
    })
    await user.click(screen.getByRole('button', { name: 'Đặt lịch' }))

    const end = new Date(get().items[0]!.repeatUntil!)
    expect(toDateInput(end.getTime())).toBe(until)
    expect([end.getHours(), end.getMinutes()]).toEqual([23, 59])
  })

  it('rejects an end date before the start and keeps the form open', async () => {
    const onOpenChange = renderDialog()
    const user = await fillBasics('Sai ngày', tomorrow())
    await user.selectOptions(screen.getByLabelText('Lặp lại'), 'daily')
    fireEvent.change(screen.getByLabelText('Lặp đến ngày (không bắt buộc)'), {
      target: { value: toDateInput(Date.now()) },
    })
    await user.click(screen.getByRole('button', { name: 'Đặt lịch' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ngày kết thúc phải từ ngày bắt đầu trở đi.',
    )
    expect(get().items).toHaveLength(0)
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('hides the end date for a one-off and ignores a stale value', async () => {
    renderDialog()
    expect(screen.queryByLabelText('Lặp đến ngày (không bắt buộc)')).not.toBeInTheDocument()

    const user = await fillBasics('Một lần', tomorrow())
    await user.selectOptions(screen.getByLabelText('Lặp lại'), 'daily')
    fireEvent.change(screen.getByLabelText('Lặp đến ngày (không bắt buộc)'), {
      target: { value: toDateInput(tomorrow() + 5 * DAY) },
    })
    await user.selectOptions(screen.getByLabelText('Lặp lại'), 'none')
    expect(screen.queryByLabelText('Lặp đến ngày (không bắt buộc)')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Đặt lịch' }))

    expect(get().items[0]).toMatchObject({ repeat: 'none', repeatUntil: null, seriesStart: null })
  })

  it('shows the current rule when editing, and renaming keeps the series anchor', async () => {
    const created = get().add({
      title: 'Standup',
      note: '',
      startsAt: tomorrow(),
      remindBeforeMin: 10,
      repeat: 'monthly',
    })!
    // The series has moved on from its anchor (e.g. after a short month).
    const moved = { ...created, startsAt: created.startsAt + 3 * DAY }
    useAppointments.setState({ items: [moved] })
    renderDialog(moved)

    expect(screen.getByLabelText('Lặp lại')).toHaveValue('monthly')
    const user = userEvent.setup()
    await user.clear(screen.getByLabelText('Tiêu đề'))
    await user.type(screen.getByLabelText('Tiêu đề'), 'Standup mới')
    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(get().items[0]).toMatchObject({
      title: 'Standup mới',
      repeat: 'monthly',
      startsAt: moved.startsAt,
      seriesStart: created.startsAt, // not re-anchored
    })
  })

  it('previews the rule next to the time', async () => {
    renderDialog()
    const user = userEvent.setup()
    await user.selectOptions(screen.getByLabelText('Lặp lại'), 'weekdays')
    expect(screen.getByText(/Thứ 2 đến Thứ 6/, { selector: 'p' })).toBeInTheDocument()
  })
})

describe('AppointmentItem: recurring', () => {
  beforeEach(() => {
    localStorage.clear()
    setRepos(createMemoryRepos(`test-${Math.random()}`))
    useAppointments.setState({ items: [], loaded: true })
  })

  it('labels the repeat rule in text, not just with an icon, and ticking moves it on', async () => {
    const a = get().add({
      title: 'Uống thuốc',
      note: '',
      startsAt: tomorrow(),
      remindBeforeMin: 10,
      repeat: 'daily',
    })!
    render(
      <ul>
        <AppointmentItem appointment={a} now={Date.now()} onEdit={() => {}} />
      </ul>,
    )
    expect(screen.getByText('Hằng ngày')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('checkbox', { name: /Uống thuốc/ }))
    expect(get().items[0]!.startsAt).toBeGreaterThan(a.startsAt)
    expect(get().items[0]!.done).toBe(false)
  })

  it('shows no repeat label for a one-off', () => {
    const a = get().add({ title: 'Một lần', note: '', startsAt: tomorrow(), remindBeforeMin: 10 })!
    render(
      <ul>
        <AppointmentItem appointment={a} now={Date.now()} onEdit={() => {}} />
      </ul>,
    )
    expect(screen.queryByText('Hằng ngày')).not.toBeInTheDocument()
    expect(screen.queryByText('Không lặp')).not.toBeInTheDocument()
  })
})
