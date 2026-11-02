import { useTranslation } from 'react-i18next'
import { EXERCISE_ART, Figure, previewPose, useTweenedPose, type ArtPose } from '../art'
import { getExercise } from '../exercises'

type Props = {
  exerciseId: string
  className?: string
}

/** Small static picture for lists: the main pose of the exercise. */
export function ExerciseThumbnail({ exerciseId, className }: Props) {
  const art = EXERCISE_ART[getExercise(exerciseId).id]
  if (!art) return null
  return <Figure art={art} pose={previewPose(art)} className={className} />
}

/** The pose of one step, as a still picture (used next to the written steps). */
export function StepFigure({ exerciseId, step, className }: Props & { step: number }) {
  const art = EXERCISE_ART[getExercise(exerciseId).id]
  const pose = art?.poses[step]
  if (!art || !pose) return null
  return <Figure art={art} pose={pose} className={className} />
}

/** The big animated figure of the guided session: glides to the pose of the current step. */
export function AnimatedFigure({ exerciseId, step, className }: Props & { step: number }) {
  const { t } = useTranslation()
  const ex = getExercise(exerciseId)
  const art = EXERCISE_ART[ex.id]
  const target = (art?.poses[step] ?? art?.poses[0]) as ArtPose
  const pose = useTweenedPose(target)
  if (!art) return null
  return (
    <Figure
      art={art}
      pose={pose}
      className={className}
      label={t('movement.session.figureLabel', {
        name: t(`exercises.${ex.id}.name`),
        step: step + 1,
        text: t(`exercises.${ex.id}.steps.${step}`),
      })}
    />
  )
}
