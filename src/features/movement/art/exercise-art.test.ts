import { describe, expect, it } from 'vitest'
import vi from '@/i18n/vi.json'
import en from '@/i18n/en.json'
import ko from '@/i18n/ko.json'
import { EXERCISES } from '../exercises'
import { EXERCISE_ART, type Scene } from './exercise-art'
import { FLOOR_Y, skeletonPoints, solvePose } from './pose'

type Exercises = Record<string, { name: string; summary: string; steps: string[] }>
const LANGS = { vi, en, ko } as const

const SEATED_SCENES: Scene[] = ['chair-side', 'desk-side', 'desk-front']
const STANDING_SCENES: Scene[] = ['floor', 'desk-lean', 'chair-behind']

describe('exercise library', () => {
  it('has unique ids and sensible durations (30 seconds to 2 minutes)', () => {
    const ids = EXERCISES.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const e of EXERCISES) {
      expect(e.durationSec).toBeGreaterThanOrEqual(30)
      expect(e.durationSec).toBeLessThanOrEqual(120)
      expect(e.stepCount).toBeGreaterThanOrEqual(3)
    }
  })

  it('offers both desk-friendly and standing exercises, enough of each', () => {
    expect(EXERCISES.filter((e) => e.posture === 'seated').length).toBeGreaterThanOrEqual(8)
    expect(EXERCISES.filter((e) => e.posture === 'standing').length).toBeGreaterThanOrEqual(8)
    expect(EXERCISES.length).toBeGreaterThanOrEqual(20)
  })
})

describe('illustrations', () => {
  it('every exercise has art with exactly one pose per step, and no art is orphaned', () => {
    for (const e of EXERCISES) {
      const art = EXERCISE_ART[e.id]
      expect(art, `art for ${e.id}`).toBeDefined()
      expect(art!.poses, `poses of ${e.id}`).toHaveLength(e.stepCount)
    }
    const known = new Set(EXERCISES.map((e) => e.id))
    for (const id of Object.keys(EXERCISE_ART)) expect(known.has(id), `orphan art ${id}`).toBe(true)
  })

  it('seated exercises are drawn at a desk or chair, standing ones on their feet', () => {
    for (const e of EXERCISES) {
      const scene = EXERCISE_ART[e.id]!.scene
      const allowed = e.posture === 'seated' ? SEATED_SCENES : STANDING_SCENES
      expect(allowed, `${e.id} (${e.posture}) drawn as ${scene}`).toContain(scene)
    }
  })

  it('keeps every drawn joint inside the picture, and no foot below the floor', () => {
    for (const e of EXERCISES) {
      const art = EXERCISE_ART[e.id]!
      art.poses.forEach((pose, i) => {
        const s = solvePose(pose, art.view)
        // Behind a front-view desk the legs are not drawn, so they may hang out of frame.
        const hidden = art.scene === 'desk-front'
        const joints = skeletonPoints(s).filter((p) => !hidden || ![...s.ll, ...s.rl].includes(p))
        for (const [x, y] of joints) {
          expect(x, `${e.id} step ${i + 1} x=${x.toFixed(1)}`).toBeGreaterThan(2)
          expect(x, `${e.id} step ${i + 1} x=${x.toFixed(1)}`).toBeLessThan(98)
          expect(y, `${e.id} step ${i + 1} y=${y.toFixed(1)}`).toBeGreaterThan(2)
        }
        if (!hidden) {
          for (const leg of [s.ll, s.rl]) {
            expect(leg[2][1], `${e.id} step ${i + 1} foot`).toBeLessThanOrEqual(FLOOR_Y + 1.5)
          }
        }
      })
    }
  })

  it('shows a different picture for steps that tell the user to do something different', () => {
    for (const e of EXERCISES) {
      const art = EXERCISE_ART[e.id]!
      const distinct = new Set(art.poses.map((p) => JSON.stringify({ ...p, hl: undefined })))
      expect(distinct.size, `${e.id} has some variety`).toBeGreaterThanOrEqual(2)
    }
  })
})

describe.each(Object.entries(LANGS))('exercise texts (%s)', (_lang, messages) => {
  const texts = messages.exercises as Exercises

  it('has a name, a summary and one text per step for every exercise', () => {
    for (const e of EXERCISES) {
      const t = texts[e.id]
      expect(t, `texts for ${e.id}`).toBeDefined()
      expect(t!.name.trim(), `${e.id} name`).not.toBe('')
      expect(t!.summary.trim(), `${e.id} summary`).not.toBe('')
      expect(t!.steps, `${e.id} steps`).toHaveLength(e.stepCount)
      for (const step of t!.steps) expect(step.trim()).not.toBe('')
    }
  })

  it('has no texts for exercises that do not exist', () => {
    const known = new Set(EXERCISES.map((e) => e.id))
    for (const id of Object.keys(texts)) expect(known.has(id), `stale text ${id}`).toBe(true)
  })

  it('gives every exercise its own name', () => {
    const names = EXERCISES.map((e) => texts[e.id]!.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('has the library filter and figure labels', () => {
    const movement = messages.movement as {
      filter: Record<string, string>
      session: Record<string, string>
    }
    for (const key of ['label', 'all', 'seated', 'standing']) {
      expect(movement.filter[key], `filter.${key}`).toBeTruthy()
    }
    expect(movement.session.figureLabel).toContain('{{name}}')
  })
})
