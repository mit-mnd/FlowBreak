import { describe, expect, it } from 'vitest'
import {
  BONE,
  FLOOR_Y,
  SIT_HIP,
  STAND_HIP,
  lerpPose,
  skeletonPoints,
  solvePose,
  type Pt,
  type PoseSpec,
} from './pose'

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1])
const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps

const base: PoseSpec = {
  torso: 0,
  head: 0,
  la: [0, 0],
  ra: [0, 0],
  ll: [0, 0],
  rl: [0, 0],
}

describe('solvePose', () => {
  it('stands with the feet exactly on the floor', () => {
    const s = solvePose(base, 'side')
    expect(s.ll[2][1]).toBeCloseTo(FLOOR_Y)
    expect(s.rl[2][1]).toBeCloseTo(FLOOR_Y)
    expect(STAND_HIP[1] + BONE.thigh + BONE.shin).toBe(FLOOR_Y)
  })

  it('sits with horizontal thighs and the feet on the floor', () => {
    const s = solvePose({ ...base, hip: SIT_HIP, ll: [90, 0], rl: [90, 0] }, 'side')
    expect(s.rl[1][1]).toBeCloseTo(SIT_HIP[1]) // knee at hip height
    expect(s.rl[1][0]).toBeCloseTo(SIT_HIP[0] + BONE.thigh) // knee in front of the hip
    expect(s.rl[2][1]).toBeCloseTo(FLOOR_Y)
  })

  it('measures torso and head from straight up, + to the right', () => {
    const up = solvePose(base, 'side')
    expect(up.neck[0]).toBeCloseTo(up.hip[0])
    expect(up.neck[1]).toBeCloseTo(up.hip[1] - BONE.torso)

    const lean = solvePose({ ...base, torso: 90 }, 'side')
    expect(lean.neck[0]).toBeCloseTo(lean.hip[0] + BONE.torso)
    expect(lean.neck[1]).toBeCloseTo(lean.hip[1])

    const back = solvePose({ ...base, torso: -30 }, 'side')
    expect(back.neck[0]).toBeLessThan(back.hip[0])
  })

  it('measures arms and legs from straight down: 0 down, 90 right, 180 up, -90 left', () => {
    const arm = (deg: number) => solvePose({ ...base, ra: [deg, deg] }, 'side').ra[1]
    const shoulder = solvePose(base, 'side').neck
    expect(arm(0)[0]).toBeCloseTo(shoulder[0])
    expect(arm(0)[1]).toBeGreaterThan(shoulder[1])
    expect(arm(90)[0]).toBeGreaterThan(shoulder[0])
    expect(arm(90)[1]).toBeCloseTo(shoulder[1])
    expect(arm(180)[1]).toBeLessThan(shoulder[1])
    expect(arm(-90)[0]).toBeLessThan(shoulder[0])
  })

  it('keeps every bone at its fixed length, whatever the angles', () => {
    const spec: PoseSpec = {
      hip: [41, 63],
      torso: 37,
      head: -80,
      la: [143, -22],
      ra: [-77, 301],
      ll: [12, 175],
      rl: [-140, 60],
    }
    for (const view of ['side', 'front'] as const) {
      const s = solvePose(spec, view)
      expect(dist(s.hip, s.neck)).toBeCloseTo(BONE.torso)
      expect(dist(s.neck, s.head)).toBeCloseTo(BONE.headOffset)
      for (const arm of [s.la, s.ra]) {
        expect(dist(arm[0], arm[1])).toBeCloseTo(BONE.upperArm)
        expect(dist(arm[1], arm[2])).toBeCloseTo(BONE.forearm)
      }
      for (const leg of [s.ll, s.rl]) {
        expect(dist(leg[0], leg[1])).toBeCloseTo(BONE.thigh)
        expect(dist(leg[1], leg[2])).toBeCloseTo(BONE.shin)
      }
    }
  })

  it('from the front the shoulders and hips are set apart; from the side they coincide', () => {
    const front = solvePose(base, 'front')
    expect(front.ra[0][0] - front.la[0][0]).toBeGreaterThan(0)
    expect(front.rl[0][0] - front.ll[0][0]).toBeGreaterThan(0)
    const side = solvePose(base, 'side')
    expect(side.ra[0]).toEqual(side.la[0])
    expect(side.rl[0]).toEqual(side.ll[0])
  })
})

describe('lerpPose', () => {
  const a: PoseSpec = { ...base, hip: [40, 60], torso: 10, la: [20, 30] }
  const b: PoseSpec = { ...base, hip: [60, 50], torso: 50, la: [100, 130] }

  it('returns the endpoints at t = 0 and t = 1', () => {
    expect(lerpPose(a, b, 0)).toEqual(
      expect.objectContaining({ torso: 10, hip: [40, 60], la: [20, 30] }),
    )
    expect(lerpPose(a, b, 1)).toEqual(
      expect.objectContaining({ torso: 50, hip: [60, 50], la: [100, 130] }),
    )
  })

  it('blends halfway', () => {
    const m = lerpPose(a, b, 0.5)
    expect(m.torso).toBeCloseTo(30)
    expect(m.hip).toEqual([50, 55])
    expect(m.la[0]).toBeCloseTo(60)
  })

  it('takes the short way round an angle (350 to 10 passes through 0, not 180)', () => {
    const m = lerpPose({ ...base, torso: 350 }, { ...base, torso: 10 }, 0.5)
    expect(near(((m.torso % 360) + 360) % 360, 0)).toBe(true)
    const m2 = lerpPose({ ...base, torso: 10 }, { ...base, torso: 350 }, 0.5)
    expect(near(((m2.torso % 360) + 360) % 360, 0)).toBe(true)
  })

  it('never stretches a limb while blending, because it blends angles', () => {
    for (let i = 0; i <= 10; i++) {
      const s = solvePose(lerpPose(a, b, i / 10), 'side')
      expect(dist(s.la[0], s.la[1])).toBeCloseTo(BONE.upperArm)
      expect(dist(s.la[1], s.la[2])).toBeCloseTo(BONE.forearm)
    }
  })

  it('treats a missing hip as the standing hip', () => {
    const m = lerpPose({ ...base }, { ...base }, 0.3)
    expect(m.hip).toEqual([...STAND_HIP])
  })
})

describe('skeletonPoints', () => {
  it('lists the hip, neck, head and every limb joint', () => {
    expect(skeletonPoints(solvePose(base, 'side'))).toHaveLength(3 + 3 * 4)
  })
})
