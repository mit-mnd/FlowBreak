import {
  Accessibility,
  Eye,
  Footprints,
  Hand,
  MoveVertical,
  PersonStanding,
  RotateCcw,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

export type Exercise = {
  id: string
  durationSec: number
  /** Number of instruction steps in i18n `exercises.<id>.steps`. */
  stepCount: number
  icon: LucideIcon
}

export const EXERCISES: readonly Exercise[] = [
  { id: 'standing-stretch', durationSec: 45, stepCount: 4, icon: PersonStanding },
  { id: 'neck-roll', durationSec: 40, stepCount: 4, icon: RotateCcw },
  { id: 'wrist-stretch', durationSec: 40, stepCount: 4, icon: Hand },
  { id: 'chest-opener', durationSec: 45, stepCount: 3, icon: Sparkles },
  { id: 'shoulder-roll', durationSec: 30, stepCount: 3, icon: Accessibility },
  { id: 'calf-raise', durationSec: 60, stepCount: 3, icon: MoveVertical },
  { id: 'eye-rest', durationSec: 30, stepCount: 3, icon: Eye },
  { id: 'walk', durationSec: 120, stepCount: 3, icon: Footprints },
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
