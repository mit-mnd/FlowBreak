/** Where the exercise can be done: at the desk, or after getting up. */
export type Posture = 'seated' | 'standing'

export type Exercise = {
  id: string
  durationSec: number
  /** Number of instruction steps in i18n `exercises.<id>.steps` (and of poses in the art). */
  stepCount: number
  posture: Posture
}

export const EXERCISES: readonly Exercise[] = [
  { id: 'standing-stretch', durationSec: 45, stepCount: 4, posture: 'standing' },
  { id: 'neck-roll', durationSec: 40, stepCount: 4, posture: 'seated' },
  { id: 'wrist-stretch', durationSec: 40, stepCount: 4, posture: 'seated' },
  { id: 'chest-opener', durationSec: 45, stepCount: 3, posture: 'standing' },
  { id: 'shoulder-roll', durationSec: 30, stepCount: 3, posture: 'seated' },
  { id: 'calf-raise', durationSec: 60, stepCount: 3, posture: 'standing' },
  { id: 'eye-rest', durationSec: 30, stepCount: 3, posture: 'seated' },
  { id: 'walk', durationSec: 120, stepCount: 3, posture: 'standing' },
  { id: 'seated-twist', durationSec: 40, stepCount: 3, posture: 'seated' },
  { id: 'side-bend', durationSec: 30, stepCount: 3, posture: 'seated' },
  { id: 'tricep-stretch', durationSec: 40, stepCount: 4, posture: 'seated' },
  { id: 'cat-cow', durationSec: 40, stepCount: 3, posture: 'seated' },
  { id: 'chair-squat', durationSec: 60, stepCount: 4, posture: 'standing' },
  { id: 'desk-pushup', durationSec: 45, stepCount: 3, posture: 'standing' },
  { id: 'quad-stretch', durationSec: 60, stepCount: 4, posture: 'standing' },
  { id: 'forward-fold', durationSec: 45, stepCount: 3, posture: 'standing' },
  { id: 'march', durationSec: 60, stepCount: 3, posture: 'standing' },
  { id: 'ankle-circles', durationSec: 30, stepCount: 3, posture: 'seated' },
  { id: 'deep-breathing', durationSec: 60, stepCount: 4, posture: 'seated' },
  { id: 'leg-raise', durationSec: 45, stepCount: 3, posture: 'seated' },
]

export function getExercise(id: string | null | undefined): Exercise {
  return EXERCISES.find((e) => e.id === id) ?? (EXERCISES[0] as Exercise)
}

/**
 * Suggest the exercise done least recently, so suggestions rotate.
 * `history` is exercise ids in chronological order.
 */
export function pickExercise(history: readonly string[]): Exercise {
  const lastIndex = new Map<string, number>()
  history.forEach((id, i) => lastIndex.set(id, i))
  let best = EXERCISES[0] as Exercise
  let bestScore = Infinity
  for (const ex of EXERCISES) {
    const score = lastIndex.get(ex.id) ?? -1
    if (score < bestScore) {
      best = ex
      bestScore = score
    }
  }
  return best
}

/** Current step for an elapsed time; steps share the duration equally. */
export function stepAt(ex: Exercise, elapsedSec: number): number {
  const per = ex.durationSec / ex.stepCount
  return Math.min(ex.stepCount - 1, Math.max(0, Math.floor(elapsedSec / per)))
}
