import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@/i18n'
import { setRepos } from '@/lib/db'
import { createMemoryRepos } from '@/lib/db/memory'
import vi18n from '@/i18n/vi.json'
import { EXERCISE_ART, Figure } from '../art'
import { solvePose } from '../art/pose'
import { EXERCISES, getExercise } from '../exercises'
import { useMovement } from '../store'
import { AnimatedFigure } from './ExerciseFigure'
import { ExerciseLibrary } from './ExerciseLibrary'
import { ExerciseSession } from './ExerciseSession'

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn() }) }))

const motion = vi.hoisted(() => ({ reduced: false }))
vi.mock('framer-motion', async (original) => ({
  ...(await original<typeof import('framer-motion')>()),
  useReducedMotion: () => motion.reduced,
}))

const names = vi18n.exercises as Record<string, { name: string; steps: string[] }>
const pointsOf = (svg: Element) =>
  [...svg.querySelectorAll('polyline')].map((p) => p.getAttribute('points'))

beforeEach(() => {
  localStorage.clear()
  motion.reduced = false
  setRepos(createMemoryRepos(`test-${Math.random()}`))
  useMovement.setState({ sessionExerciseId: null, logs: [] })
})

describe('Figure', () => {
  const art = EXERCISE_ART['neck-roll']!

  it('is decorative unless it has a label', () => {
    const { container, rerender } = render(<Figure art={art} pose={art.poses[0]!} />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    rerender(<Figure art={art} pose={art.poses[0]!} label="Thả lỏng cổ" />)
    expect(screen.getByRole('img', { name: 'Thả lỏng cổ' })).toBeInTheDocument()
  })

  it('draws the parts that move in the accent color and the rest in the normal color', () => {
    const plain = render(<Figure art={art} pose={{ ...art.poses[0]!, hl: [] }} />)
    expect(plain.container.querySelectorAll('.stroke-move')).toHaveLength(0)
    plain.unmount()

    const lit = render(<Figure art={art} pose={{ ...art.poses[0]!, hl: ['head'] }} />)
    expect(lit.container.querySelectorAll('.stroke-move')).toHaveLength(1)
  })

  it('draws the figure from its pose', () => {
    const a = EXERCISE_ART['standing-stretch']!
    const { container } = render(<Figure art={a} pose={a.poses[1]!} />)
    const s = solvePose(a.poses[1]!, a.view)
    // The head circle sits where the skeleton says.
    const circle = container.querySelector('circle')!
    expect(Number(circle.getAttribute('cx'))).toBeCloseTo(s.head[0])
    expect(Number(circle.getAttribute('cy'))).toBeCloseTo(s.head[1])
  })

  it('hides the legs behind a desk seen from the front', () => {
    const front = render(
      <Figure art={EXERCISE_ART['neck-roll']!} pose={EXERCISE_ART['neck-roll']!.poses[0]!} />,
    )
    const side = render(
      <Figure art={EXERCISE_ART['march']!} pose={EXERCISE_ART['march']!.poses[0]!} />,
    )
    expect(front.container.querySelectorAll('polyline').length).toBeLessThan(
      side.container.querySelectorAll('polyline').length,
    )
  })
})

describe('AnimatedFigure', () => {
  const pose = (step: number) => EXERCISE_ART['walk']!.poses[step]!

  it('jumps straight to the new pose with reduced motion', () => {
    motion.reduced = true
    const { container, rerender } = render(<AnimatedFigure exerciseId="walk" step={0} />)
    const first = pointsOf(container.querySelector('svg')!)
    rerender(<AnimatedFigure exerciseId="walk" step={2} />)
    const second = pointsOf(container.querySelector('svg')!)
    expect(second).not.toEqual(first)

    const expected = render(<Figure art={EXERCISE_ART['walk']!} pose={pose(2)} />)
    expect(second).toEqual(pointsOf(expected.container.querySelector('svg')!))
  })

  it('glides to the new pose and ends exactly on it', async () => {
    const { container, rerender } = render(<AnimatedFigure exerciseId="walk" step={0} />)
    const start = pointsOf(container.querySelector('svg')!)
    rerender(<AnimatedFigure exerciseId="walk" step={2} />)

    const expected = pointsOf(
      render(<Figure art={EXERCISE_ART['walk']!} pose={pose(2)} />).container.querySelector('svg')!,
    )
    // It starts from the old pose and settles on the new one.
    expect(pointsOf(container.querySelector('svg')!)).toEqual(start)
    await waitFor(() => expect(pointsOf(container.querySelector('svg')!)).toEqual(expected), {
      timeout: 2000,
    })
  })

  it('describes the current step for screen readers', () => {
    render(<AnimatedFigure exerciseId="walk" step={1} />)
    const label = screen.getByRole('img').getAttribute('aria-label')!
    expect(label).toContain(names.walk!.name)
    expect(label).toContain('bước 2')
    expect(label).toContain(names.walk!.steps[1])
  })
})

describe('ExerciseLibrary', () => {
  const renderLibrary = () => {
    const onOpenChange = vi.fn()
    render(<ExerciseLibrary open onOpenChange={onOpenChange} />)
    return onOpenChange
  }
  const rows = () => screen.getAllByRole('listitem')

  it('lists every exercise with its own picture', () => {
    renderLibrary()
    expect(rows()).toHaveLength(EXERCISES.length)
    for (const row of rows()) expect(row.querySelector('svg')).not.toBeNull()
    for (const e of EXERCISES) expect(screen.getByText(names[e.id]!.name)).toBeInTheDocument()
  })

  it('filters by where you can do it', async () => {
    const user = userEvent.setup()
    renderLibrary()
    await user.click(screen.getByRole('radio', { name: 'Tại chỗ ngồi' }))
    expect(rows()).toHaveLength(EXERCISES.filter((e) => e.posture === 'seated').length)
    await user.click(screen.getByRole('radio', { name: 'Đứng dậy' }))
    expect(rows()).toHaveLength(EXERCISES.filter((e) => e.posture === 'standing').length)
    await user.click(screen.getByRole('radio', { name: /Tất cả/ }))
    expect(rows()).toHaveLength(EXERCISES.length)
  })

  it('opens the guided session for the chosen exercise and closes itself', async () => {
    const user = userEvent.setup()
    const onOpenChange = renderLibrary()
    await user.click(
      within(screen.getByText(names['chair-squat']!.name).closest('li')!).getByRole('button'),
    )
    expect(useMovement.getState().sessionExerciseId).toBe('chair-squat')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

describe('ExerciseSession', () => {
  it.each(EXERCISES.map((e) => e.id))(
    '%s: one picture per written step plus the big figure',
    async (id) => {
      useMovement.setState({ sessionExerciseId: id })
      render(<ExerciseSession />)
      const dialog = await screen.findByRole('dialog')
      const ex = getExercise(id)

      expect(within(dialog).getByRole('img')).toBeInTheDocument() // the big figure, labelled
      const items = within(dialog).getAllByRole('listitem')
      expect(items).toHaveLength(ex.stepCount)
      for (const [i, item] of items.entries()) {
        expect(item.querySelector('svg'), `step ${i + 1} picture`).not.toBeNull()
        expect(item).toHaveTextContent(names[id]!.steps[i]!)
      }
    },
  )

  it('moves the big figure on to the next step when asked', async () => {
    const user = userEvent.setup()
    useMovement.setState({ sessionExerciseId: 'tricep-stretch' })
    render(<ExerciseSession />)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('img').getAttribute('aria-label')).toContain('bước 1')

    await user.click(within(dialog).getByRole('button', { name: 'Bước tiếp' }))
    await waitFor(() =>
      expect(within(dialog).getByRole('img').getAttribute('aria-label')).toContain('bước 2'),
    )
    expect(dialog.querySelector('[aria-current="step"]')).toHaveTextContent(
      names['tricep-stretch']!.steps[1]!,
    )
  })
})
