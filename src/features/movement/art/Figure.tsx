import { cn } from '@/lib/utils'
import type { ArtPose, ExerciseArt, Part, Scene } from './exercise-art'
import { FLOOR_Y, VIEWBOX, solvePose, type Pt, type Skeleton, type View } from './pose'

type FigureProps = {
  art: ExerciseArt
  /** Pose to draw. Pass a blended pose while animating. */
  pose: ArtPose
  className?: string
  /** Accessible description; the figure is decorative when omitted. */
  label?: string
}

/** The front desk view is zoomed in on the person (the rest of the frame is empty). */
const DESK_FRONT_BOX = '10 18 80 80'

const pts = (...p: Pt[]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

/** Static scenery. Coordinates share the figure's 100x100 space. */
function SceneArt({ scene }: { scene: Scene }) {
  const furniture = 'stroke-muted-foreground/50'
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="4" y1={FLOOR_Y} x2="96" y2={FLOOR_Y} className="stroke-border" strokeWidth="1.5" />
      {(scene === 'chair-side' || scene === 'desk-side') && (
        <g className={furniture} strokeWidth="2.5">
          <polyline points="36,40 36,76 62,76" />
          <line x1="39" y1="76" x2="39" y2={FLOOR_Y} />
          <line x1="58" y1="76" x2="58" y2={FLOOR_Y} />
        </g>
      )}
      {scene === 'desk-side' && (
        <g className={furniture} strokeWidth="2.5">
          <line x1="68" y1="62" x2="96" y2="62" />
          <line x1="94" y1="62" x2="94" y2={FLOOR_Y} />
          <rect x="84" y="36" width="3" height="20" rx="1" />
          <line x1="85.5" y1="56" x2="85.5" y2="62" />
        </g>
      )}
      {scene === 'chair-behind' && (
        <g className={furniture} strokeWidth="2.5">
          <polyline points="12,44 12,76 36,76" />
          <line x1="15" y1="76" x2="15" y2={FLOOR_Y} />
          <line x1="33" y1="76" x2="33" y2={FLOOR_Y} />
        </g>
      )}
      {scene === 'desk-lean' && (
        <g className={furniture} strokeWidth="2.5">
          <line x1="66" y1="56" x2="97" y2="56" />
          <line x1="94" y1="56" x2="94" y2={FLOOR_Y} />
        </g>
      )}
    </g>
  )
}

/** The desk seen from the front: a panel that hides the legs behind it. */
function DeskFront() {
  return (
    <rect
      x="10"
      y="62"
      width="80"
      height={FLOOR_Y - 62}
      rx="2"
      strokeWidth="2"
      className="fill-card stroke-muted-foreground/50"
      aria-hidden
    />
  )
}

/** Leg polyline; from the side a short foot is added so a raised heel shows. */
function legPoints(l: Skeleton['ll'], view: View): string {
  const [x, y] = l[2]
  const foot: Pt[] = view === 'side' ? [y < FLOOR_Y - 1 ? [x + 4, FLOOR_Y] : [x + 5, y]] : []
  return pts(l[0], l[1], l[2], ...foot)
}

/**
 * A stick figure for one exercise step. It uses theme classes so it follows light and dark
 * mode; the parts that move in the step use the movement accent color.
 */
export function Figure({ art, pose, className, label }: FigureProps) {
  const s = solvePose(pose, art.view)
  const hl = new Set<Part>(pose.hl ?? [])
  const side = art.view === 'side'
  const hideLegs = art.scene === 'desk-front'

  const limb = (part: Part, points: string, width: number, far = false) => (
    <polyline
      key={part}
      points={points}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        'fill-none transition-colors',
        hl.has(part) ? 'stroke-move' : 'stroke-foreground',
        far && side && !hl.has(part) && 'opacity-45',
      )}
    />
  )

  return (
    <svg
      viewBox={art.scene === 'desk-front' ? DESK_FRONT_BOX : `0 0 ${VIEWBOX} ${VIEWBOX}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('block', className)}
    >
      <SceneArt scene={art.scene} />
      {!hideLegs && limb('ll', legPoints(s.ll, art.view), 3.5, true)}
      {!hideLegs && limb('rl', legPoints(s.rl, art.view), 3.5)}
      {art.scene !== 'desk-front' && limb('la', pts(...s.la), 3.5, true)}
      {limb('torso', pts(s.hip, s.neck), 4.5)}
      <circle
        cx={s.head[0]}
        cy={s.head[1]}
        r={s.headRadius}
        strokeWidth="3"
        className={cn(
          'fill-card transition-colors',
          hl.has('head') ? 'stroke-move' : 'stroke-foreground',
        )}
      />
      {art.scene === 'desk-front' && <DeskFront />}
      {limb('ra', pts(...s.ra), 3.5)}
      {art.scene === 'desk-front' && limb('la', pts(...s.la), 3.5)}
    </svg>
  )
}
