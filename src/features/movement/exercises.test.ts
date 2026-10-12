import { describe, expect, it } from 'vitest'
import { EXERCISES, getExercise, pickExercise, stepAt } from './exercises'

describe('exercises', () => {
  it('suggests never-done exercises first, in list order', () => {
    expect(pickExercise([]).id).toBe(EXERCISES[0]?.id)
    expect(pickExercise([EXERCISES[0]!.id]).id).toBe(EXERCISES[1]?.id)
  })

  it('rotates to the least recently done one', () => {
    const all = EXERCISES.map((e) => e.id)
    const history = [...all, all[0]!] // first exercise repeated last
    expect(pickExercise(history).id).toBe(all[1])
  })

  it('maps elapsed time to steps and clamps', () => {
    const ex = getExercise('standing-stretch') // 45s, 4 steps
    expect(stepAt(ex, 0)).toBe(0)
    expect(stepAt(ex, 12)).toBe(1)
    expect(stepAt(ex, 44)).toBe(3)
    expect(stepAt(ex, 999)).toBe(3)
  })

  it('falls back to the first exercise for unknown ids', () => {
    expect(getExercise('nope').id).toBe(EXERCISES[0]?.id)
  })
})
