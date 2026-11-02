import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import type { ArtPose } from './exercise-art'
import { lerpPose } from './pose'

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

/**
 * The pose to draw: glides from the previously shown pose to `target` whenever the target
 * changes. With reduced motion it jumps straight to the target.
 */
export function useTweenedPose(target: ArtPose, durationMs = 500): ArtPose {
  const reduced = useReducedMotion()
  const [shown, setShown] = useState<ArtPose>(target)
  const current = useRef<ArtPose>(target)
  const frame = useRef(0)

  useEffect(() => {
    cancelAnimationFrame(frame.current)
    const from = current.current
    if (reduced || from === target) {
      current.current = target
      setShown(target)
      return
    }
    const start = performance.now()
    // Read the clock ourselves: the frame timestamp can come from a different origin (or sit a
    // hair before `start`), which would make t negative and overshoot the pose.
    const tick = () => {
      const t = Math.min(1, Math.max(0, (performance.now() - start) / durationMs))
      // The highlight belongs to the step being shown, so it switches right away.
      const next: ArtPose = { ...lerpPose(from, target, ease(t)), hl: target.hl }
      current.current = t === 1 ? target : next
      setShown(current.current)
      if (t < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [target, reduced, durationMs])

  return shown
}
