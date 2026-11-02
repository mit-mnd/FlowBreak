import type { ArtPose, ExerciseArt } from './exercise-art'
import { EXERCISE_ART } from './exercise-art'

export { EXERCISE_ART } from './exercise-art'
export type { ArtPose, ExerciseArt, Part, Scene } from './exercise-art'
export { Figure } from './Figure'
export { useTweenedPose } from './useTweenedPose'

export function getArt(id: string): ExerciseArt | undefined {
  return EXERCISE_ART[id]
}

/** The pose that best identifies an exercise in a list: the first step that is not "stand/sit ready". */
export function previewPose(art: ExerciseArt): ArtPose {
  return art.poses[Math.min(1, art.poses.length - 1)] as ArtPose
}
