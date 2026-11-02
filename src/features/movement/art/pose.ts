/**
 * Stick-figure poses for the exercise illustrations.
 *
 * A pose is a set of segment angles (degrees); `solvePose` turns it into joint positions with
 * fixed bone lengths, so every pose keeps the same proportions and tweening between two poses
 * (in angle space) never stretches a limb. Coordinates live in a 100x100 viewBox, y pointing down.
 *
 * Angle conventions (all absolute, in degrees):
 *  - arms and legs: measured from "straight down"; +90 points to the right of the screen,
 *    -90 to the left, 180 straight up.
 *  - torso and head: measured from "straight up"; +90 leans to the right.
 */

export type Pt = readonly [number, number]

export type View = 'side' | 'front'

export type PoseSpec = {
  /** Hip position. Defaults to a standing hip. */
  hip?: Pt
  torso: number
  head: number
  /** [upper arm, forearm] */
  la: readonly [number, number]
  ra: readonly [number, number]
  /** [thigh, shin] */
  ll: readonly [number, number]
  rl: readonly [number, number]
}

export type Skeleton = {
  hip: Pt
  neck: Pt
  head: Pt
  headRadius: number
  /** shoulder, elbow, hand */
  la: readonly [Pt, Pt, Pt]
  ra: readonly [Pt, Pt, Pt]
  /** hip joint, knee, foot */
  ll: readonly [Pt, Pt, Pt]
  rl: readonly [Pt, Pt, Pt]
}

export const VIEWBOX = 100
export const FLOOR_Y = 90

export const BONE = {
  torso: 24,
  headOffset: 9,
  headRadius: 6,
  upperArm: 14,
  forearm: 13,
  thigh: 17,
  shin: 17,
} as const

/** Standing hip: feet (hip + thigh + shin) land exactly on the floor. */
export const STAND_HIP: Pt = [50, FLOOR_Y - BONE.thigh - BONE.shin]
/** Seated hip: thighs horizontal, shins vertical, feet on the floor. */
export const SIT_HIP: Pt = [44, FLOOR_Y - BONE.shin]

const rad = (deg: number) => (deg * Math.PI) / 180
/** Point `len` away from `from` at `deg` measured from straight down. */
const fromDown = (from: Pt, len: number, deg: number): Pt => [
  from[0] + len * Math.sin(rad(deg)),
  from[1] + len * Math.cos(rad(deg)),
]
/** Point `len` away from `from` at `deg` measured from straight up. */
const fromUp = (from: Pt, len: number, deg: number): Pt => [
  from[0] + len * Math.sin(rad(deg)),
  from[1] - len * Math.cos(rad(deg)),
]

const SHOULDER_HALF = 5
const HIP_HALF = 3

export function solvePose(spec: PoseSpec, view: View): Skeleton {
  const hip = spec.hip ?? STAND_HIP
  const neck = fromUp(hip, BONE.torso, spec.torso)
  const head = fromUp(neck, BONE.headOffset, spec.head)
  const front = view === 'front'

  const arm = (side: -1 | 1, [upper, fore]: readonly [number, number]) => {
    const shoulder: Pt = front ? [neck[0] + side * SHOULDER_HALF, neck[1]] : neck
    const elbow = fromDown(shoulder, BONE.upperArm, upper)
    return [shoulder, elbow, fromDown(elbow, BONE.forearm, fore)] as const
  }
  const leg = (side: -1 | 1, [thigh, shin]: readonly [number, number]) => {
    const joint: Pt = front ? [hip[0] + side * HIP_HALF, hip[1]] : hip
    const knee = fromDown(joint, BONE.thigh, thigh)
    return [joint, knee, fromDown(knee, BONE.shin, shin)] as const
  }

  return {
    hip,
    neck,
    head,
    headRadius: BONE.headRadius,
    la: arm(-1, spec.la),
    ra: arm(1, spec.ra),
    ll: leg(-1, spec.ll),
    rl: leg(1, spec.rl),
  }
}

/** Every point of a skeleton, for bounds checks. */
export function skeletonPoints(s: Skeleton): Pt[] {
  return [s.hip, s.neck, s.head, ...s.la, ...s.ra, ...s.ll, ...s.rl]
}

/** Shortest way round from `a` to `b` in degrees, in (-180, 180]. */
function angleDelta(a: number, b: number): number {
  return ((((b - a) % 360) + 540) % 360) - 180
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerpAngle = (a: number, b: number, t: number) => a + angleDelta(a, b) * t
const lerpPair = (
  a: readonly [number, number],
  b: readonly [number, number],
  t: number,
): readonly [number, number] => [lerpAngle(a[0], b[0], t), lerpAngle(a[1], b[1], t)]

/** Blend two poses (t = 0 is `a`, t = 1 is `b`) joint angle by joint angle. */
export function lerpPose(a: PoseSpec, b: PoseSpec, t: number): PoseSpec {
  const ha = a.hip ?? STAND_HIP
  const hb = b.hip ?? STAND_HIP
  return {
    hip: [lerp(ha[0], hb[0], t), lerp(ha[1], hb[1], t)],
    torso: lerpAngle(a.torso, b.torso, t),
    head: lerpAngle(a.head, b.head, t),
    la: lerpPair(a.la, b.la, t),
    ra: lerpPair(a.ra, b.ra, t),
    ll: lerpPair(a.ll, b.ll, t),
    rl: lerpPair(a.rl, b.rl, t),
  }
}
