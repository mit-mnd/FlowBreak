import { SIT_HIP, STAND_HIP, type PoseSpec, type View } from './pose'

/** Body parts that can be highlighted to show what moves in a step. */
export type Part = 'head' | 'torso' | 'la' | 'ra' | 'll' | 'rl'

export type ArtPose = PoseSpec & { hl?: readonly Part[] }

/** Static things drawn around the figure. */
export type Scene =
  | 'floor' // standing on the ground
  | 'chair-side' // seated on a chair, seen from the side
  | 'desk-side' // chair + a desk in front, seen from the side
  | 'desk-front' // seated behind a desk, seen from the front (legs hidden)
  | 'desk-lean' // standing next to a desk to lean on
  | 'chair-behind' // standing in front of a chair (for sit-to-stand)

export type ExerciseArt = {
  view: View
  scene: Scene
  /** One pose per instruction step, in order. */
  poses: readonly ArtPose[]
}

/* ------------------------------------------------------------------ bases */

// Standing, seen from the front: arms slightly away from the body, feet shoulder width.
const SF: ArtPose = {
  hip: STAND_HIP,
  torso: 0,
  head: 0,
  la: [-8, -8],
  ra: [8, 8],
  ll: [-6, -6],
  rl: [6, 6],
}
// Standing, seen from the side, facing right. `l` is the far side, `r` the near side.
const SS: ArtPose = {
  hip: STAND_HIP,
  torso: 0,
  head: 0,
  la: [0, 0],
  ra: [0, 0],
  ll: [-3, -3],
  rl: [3, 3],
}
// Seated on a chair, from the side, hands resting on the thighs.
const CS: ArtPose = {
  hip: SIT_HIP,
  torso: 0,
  head: 0,
  la: [15, 80],
  ra: [10, 75],
  ll: [86, -4],
  rl: [90, 0],
}
// Seated behind a desk, from the front. Legs are hidden; arms rest on the desk.
const DF: ArtPose = {
  hip: [50, 72],
  torso: 0,
  head: 0,
  la: [-25, 80],
  ra: [25, -80],
  ll: [-6, -6],
  rl: [6, 6],
}

const pose = (base: ArtPose, over: Partial<ArtPose>): ArtPose => ({ ...base, ...over })

/* -------------------------------------------------------------- exercises */

export const EXERCISE_ART: Record<string, ExerciseArt> = {
  'standing-stretch': {
    view: 'front',
    scene: 'floor',
    poses: [
      SF,
      pose(SF, { la: [-170, 145], ra: [170, -145], hl: ['la', 'ra'] }),
      pose(SF, { torso: 22, head: 22, la: [152, 134], ra: [164, 148], hl: ['torso', 'la', 'ra'] }),
      pose(SF, { la: [-18, -12], ra: [18, 12] }),
    ],
  },
  'neck-roll': {
    view: 'front',
    scene: 'desk-front',
    poses: [
      DF,
      pose(DF, { head: 28, hl: ['head'] }),
      pose(DF, { head: -28, hl: ['head'] }),
      pose(DF, { head: 12, hl: ['head'] }),
    ],
  },
  'wrist-stretch': {
    view: 'side',
    scene: 'chair-side',
    poses: [
      pose(CS, { ra: [90, 90], hl: ['ra'] }),
      pose(CS, { ra: [90, 100], la: [60, 115], hl: ['la', 'ra'] }),
      pose(CS, { la: [90, 90], ra: [60, 115], hl: ['la', 'ra'] }),
      pose(CS, { la: [20, 100], ra: [20, 100], hl: ['la', 'ra'] }),
    ],
  },
  'chest-opener': {
    view: 'side',
    scene: 'floor',
    poses: [
      pose(SS, { la: [-10, -5], ra: [-10, -5] }),
      pose(SS, { torso: -6, la: [-35, -25], ra: [-40, -30], hl: ['torso', 'la', 'ra'] }),
      pose(SS, { torso: -8, head: -4, la: [-45, -35], ra: [-50, -40], hl: ['torso', 'la', 'ra'] }),
    ],
  },
  'shoulder-roll': {
    view: 'front',
    scene: 'desk-front',
    poses: [
      pose(DF, { hl: ['la', 'ra'] }),
      pose(DF, { la: [-85, 125], ra: [85, -125], hl: ['la', 'ra'] }),
      pose(DF, { la: [-30, 140], ra: [30, -140], hl: ['la', 'ra'] }),
    ],
  },
  'calf-raise': {
    view: 'side',
    scene: 'desk-lean',
    poses: [
      pose(SS, { ra: [20, 50] }),
      pose(SS, { hip: [50, 52], ra: [20, 50], ll: [0, 0], rl: [0, 0], hl: ['ll', 'rl'] }),
      pose(SS, { hip: [50, 55], ra: [20, 50], hl: ['ll', 'rl'] }),
    ],
  },
  'eye-rest': {
    view: 'side',
    scene: 'desk-side',
    poses: [
      pose(CS, { head: 25, la: [20, 70], ra: [20, 70] }),
      pose(CS, { head: -2, hl: ['head'] }),
      pose(CS, { head: -8, hl: ['head'] }),
    ],
  },
  walk: {
    view: 'side',
    scene: 'floor',
    poses: [
      pose(SS, { ll: [-22, -30], rl: [22, 8], la: [30, 40], ra: [-25, -15], hl: ['ll', 'rl'] }),
      pose(SS, { ll: [22, 8], rl: [-22, -30], la: [-25, -15], ra: [30, 40], hl: ['ll', 'rl'] }),
      pose(SS, { ra: [20, 100], hl: ['ra'] }),
    ],
  },

  /* ----------------------------------------------------------------- new */
  'seated-twist': {
    view: 'side',
    scene: 'chair-side',
    poses: [
      CS,
      pose(CS, {
        head: -22,
        torso: -3,
        ra: [-30, -95],
        la: [60, 100],
        hl: ['torso', 'head', 'ra'],
      }),
      pose(CS, {
        head: -22,
        torso: -3,
        la: [-30, -95],
        ra: [60, 100],
        hl: ['torso', 'head', 'la'],
      }),
    ],
  },
  'side-bend': {
    view: 'front',
    scene: 'desk-front',
    poses: [
      pose(DF, { la: [-12, -5], ra: [12, 5] }),
      pose(DF, { torso: 20, head: 20, ra: [155, 170], la: [-10, -5], hl: ['torso', 'ra'] }),
      pose(DF, { torso: -20, head: -20, la: [-155, -170], ra: [10, 5], hl: ['torso', 'la'] }),
    ],
  },
  'tricep-stretch': {
    view: 'front',
    scene: 'desk-front',
    poses: [
      pose(DF, { ra: [170, 170], la: [-12, -5], hl: ['ra'] }),
      pose(DF, { ra: [165, -20], la: [-70, 100], hl: ['ra', 'la'] }),
      pose(DF, { la: [-170, -170], ra: [12, 5], hl: ['la'] }),
      pose(DF, { la: [-165, 20], ra: [70, -100], hl: ['la', 'ra'] }),
    ],
  },
  'cat-cow': {
    view: 'side',
    scene: 'chair-side',
    poses: [
      CS,
      pose(CS, { torso: -10, head: -14, hl: ['torso'] }),
      pose(CS, { torso: 14, head: 28, hl: ['torso'] }),
    ],
  },
  'chair-squat': {
    view: 'side',
    scene: 'chair-behind',
    poses: [
      pose(SS, { hip: [32, 56], la: [90, 90], ra: [90, 90] }),
      pose(SS, {
        hip: [24, 70.5],
        torso: 25,
        head: 25,
        la: [90, 90],
        ra: [90, 90],
        ll: [80, -5],
        rl: [80, -5],
        hl: ['ll', 'rl'],
      }),
      pose(SS, {
        hip: [27, 63],
        torso: 35,
        head: 35,
        la: [95, 95],
        ra: [95, 95],
        ll: [55, -15],
        rl: [55, -15],
        hl: ['ll', 'rl'],
      }),
      pose(SS, { hip: [32, 56], la: [90, 90], ra: [90, 90], hl: ['ll', 'rl'] }),
    ],
  },
  'desk-pushup': {
    view: 'side',
    scene: 'desk-lean',
    poses: [
      // Body in one line from the feet to the head; hands on the desk edge.
      pose(SS, {
        hip: [38, 61.2],
        torso: 32,
        head: 32,
        la: [48, 58],
        ra: [48, 58],
        ll: [-32, -32],
        rl: [-32, -32],
      }),
      pose(SS, {
        hip: [45.3, 67.3],
        torso: 48,
        head: 48,
        la: [-10, 134],
        ra: [-10, 134],
        ll: [-48, -48],
        rl: [-48, -48],
        hl: ['torso', 'la', 'ra'],
      }),
      pose(SS, {
        hip: [38, 61.2],
        torso: 32,
        head: 32,
        la: [48, 58],
        ra: [48, 58],
        ll: [-32, -32],
        rl: [-32, -32],
        hl: ['la', 'ra'],
      }),
    ],
  },
  'quad-stretch': {
    view: 'side',
    scene: 'desk-lean',
    poses: [
      pose(SS, { la: [20, 50] }),
      pose(SS, { la: [20, 50], rl: [-5, -100], hl: ['rl'] }),
      pose(SS, { la: [20, 50], ra: [-19, -19], rl: [-5, -150], hl: ['rl', 'ra'] }),
      pose(SS, { la: [20, 50], ra: [-15, -18], rl: [-3, -160], hl: ['rl', 'ra'] }),
    ],
  },
  'forward-fold': {
    view: 'side',
    scene: 'floor',
    poses: [
      pose(SS, { la: [-5, -5], ra: [5, 5] }),
      pose(SS, { torso: 60, head: 90, la: [10, 10], ra: [10, 10], hl: ['torso'] }),
      pose(SS, { torso: 110, head: 135, la: [5, 5], ra: [5, 5], hl: ['torso', 'head'] }),
    ],
  },
  march: {
    view: 'side',
    scene: 'floor',
    poses: [
      pose(SS, { ra: [-30, -20], la: [30, 40] }),
      pose(SS, { ll: [-5, -5], rl: [85, 5], ra: [-30, -20], la: [40, 100], hl: ['rl', 'la'] }),
      pose(SS, { rl: [-5, -5], ll: [85, 5], la: [-30, -20], ra: [40, 100], hl: ['ll', 'ra'] }),
    ],
  },
  'ankle-circles': {
    view: 'side',
    scene: 'chair-side',
    poses: [
      pose(CS, { rl: [60, 60], hl: ['rl'] }),
      pose(CS, { rl: [60, 85], hl: ['rl'] }),
      pose(CS, { ll: [60, 60], rl: [90, 0], hl: ['ll'] }),
    ],
  },
  'deep-breathing': {
    view: 'side',
    scene: 'chair-side',
    poses: [
      CS,
      pose(CS, { torso: -3, head: -3, la: [20, 70], ra: [20, 70], hl: ['torso'] }),
      pose(CS, { torso: -6, head: -6, la: [40, 120], ra: [40, 120], hl: ['torso'] }),
      pose(CS, { torso: 2, head: 4, hl: ['torso'] }),
    ],
  },
  'leg-raise': {
    view: 'side',
    scene: 'chair-side',
    poses: [
      CS,
      pose(CS, { rl: [90, 90], hl: ['rl'] }),
      pose(CS, { rl: [90, 0], ll: [90, 90], hl: ['ll'] }),
    ],
  },
}
