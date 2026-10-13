/**
 * Reminder sounds synthesised with the Web Audio API, so no audio assets are
 * shipped. Each sound is a small "score" of tones; `playSound` renders it.
 *
 * Loudness: the loudest tone of every sound has gain 1.0 and `MASTER_VOLUME`
 * (0.5) scales it to the output level. Overlapping tones add up, but the sum
 * stays well below 1.0 at the output, so nothing clips.
 */

export const SOUND_IDS = ['drop', 'bell', 'chime', 'pulse'] as const
export type SoundId = (typeof SOUND_IDS)[number]
/** User choice: one of the sounds, or silence. */
export type SoundChoice = SoundId | 'off'

/** Output level of the loudest moment of any sound (0..1). */
export const MASTER_VOLUME = 0.5

export function isSoundChoice(value: unknown): value is SoundChoice {
  return value === 'off' || (SOUND_IDS as readonly unknown[]).includes(value)
}

export type Tone = {
  freq: number
  /** Optional glide target in Hz, reached at the end of the tone. */
  endFreq?: number
  /** Start offset in seconds from the beginning of the sound. */
  at: number
  /** Length in seconds (the tone decays exponentially over it). */
  dur: number
  type: OscillatorType
  /** Relative level (1.0 = the loudest tone, which plays at `MASTER_VOLUME`). */
  gain: number
}

/** Envelope: quick linear attack, a short hold at full level, then exponential decay. */
const ATTACK_SEC = 0.01
const HOLD_SEC = 0.05
const FLOOR = 0.0001

const SCORES: Record<SoundId, readonly Tone[]> = {
  // Two falling "plip" drops.
  drop: [
    { freq: 1200, endFreq: 520, at: 0, dur: 0.22, type: 'sine', gain: 1 },
    { freq: 900, endFreq: 420, at: 0.2, dur: 0.3, type: 'sine', gain: 0.7 },
  ],
  // Single bell: fundamental plus inharmonic partials.
  bell: [
    { freq: 880, at: 0, dur: 1.3, type: 'sine', gain: 0.6 },
    { freq: 2428.8, at: 0, dur: 0.75, type: 'sine', gain: 0.25 },
    { freq: 4752, at: 0, dur: 0.45, type: 'sine', gain: 0.15 },
  ],
  // Rising four-note arpeggio (C5 E5 G5 C6).
  chime: [
    { freq: 523.25, at: 0, dur: 0.7, type: 'sine', gain: 1 },
    { freq: 659.25, at: 0.13, dur: 0.7, type: 'sine', gain: 1 },
    { freq: 783.99, at: 0.26, dur: 0.7, type: 'sine', gain: 1 },
    { freq: 1046.5, at: 0.39, dur: 0.9, type: 'sine', gain: 1 },
  ],
  // Three short pings: the most attention-grabbing.
  pulse: [
    { freq: 880, at: 0, dur: 0.16, type: 'triangle', gain: 1 },
    { freq: 880, at: 0.22, dur: 0.16, type: 'triangle', gain: 1 },
    { freq: 880, at: 0.44, dur: 0.16, type: 'triangle', gain: 1 },
  ],
}

export function scoreFor(id: SoundId): readonly Tone[] {
  return SCORES[id]
}

/** Total length of a sound in seconds. */
export function soundDuration(id: SoundId): number {
  return Math.max(...SCORES[id].map((t) => t.at + t.dur))
}

/** Level of one tone at time `t` (seconds), matching the automation in `playSound`. */
function envelope(tone: Tone, t: number): number {
  const local = t - tone.at
  if (local < 0 || local > tone.dur) return 0
  if (local < ATTACK_SEC) return tone.gain * (local / ATTACK_SEC)
  if (local < ATTACK_SEC + HOLD_SEC) return tone.gain
  const progress =
    (local - ATTACK_SEC - HOLD_SEC) / Math.max(tone.dur - ATTACK_SEC - HOLD_SEC, 1e-6)
  return tone.gain * Math.pow(FLOOR / tone.gain, progress)
}

/**
 * Highest value of the summed envelopes (before `MASTER_VOLUME`). Used to check
 * that overlapping tones cannot clip at the output.
 */
export function estimatePeak(id: SoundId): number {
  const score = SCORES[id]
  const end = soundDuration(id)
  let peak = 0
  for (let t = 0; t <= end; t += 0.002) {
    peak = Math.max(
      peak,
      score.reduce((sum, tone) => sum + envelope(tone, t), 0),
    )
  }
  return peak
}

/** Ignore repeat reminder chimes inside this window (e.g. StrictMode double effects). */
const DEDUPE_MS = 1000

let ctx: AudioContext | null = null
let lastReminderAt = 0

function getContext(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null
  ctx ??= new AudioContext()
  return ctx
}

/** Play a sound right now (used for previews, so it is never de-duplicated). */
export async function playSound(id: SoundId): Promise<void> {
  try {
    const audio = getContext()
    if (!audio) return
    if (audio.state === 'suspended') await audio.resume()

    const master = audio.createGain()
    master.gain.value = MASTER_VOLUME
    master.connect(audio.destination)

    const start = audio.currentTime + 0.02
    for (const tone of SCORES[id]) {
      const t0 = start + tone.at
      const t1 = t0 + tone.dur
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.type = tone.type
      osc.frequency.setValueAtTime(tone.freq, t0)
      if (tone.endFreq) osc.frequency.exponentialRampToValueAtTime(tone.endFreq, t1)
      // Attack, hold, decay (mirrors `envelope`): a full, steady level for the first
      // moments so the loudness does not depend on where the sine wave starts.
      gain.gain.setValueAtTime(FLOOR, t0)
      gain.gain.linearRampToValueAtTime(tone.gain, t0 + ATTACK_SEC)
      gain.gain.setValueAtTime(tone.gain, t0 + ATTACK_SEC + HOLD_SEC)
      gain.gain.exponentialRampToValueAtTime(FLOOR, t1)
      osc.connect(gain).connect(master)
      osc.start(t0)
      osc.stop(t1 + 0.05)
    }
  } catch (err) {
    console.warn('Sound failed', err)
  }
}

/** Play the user's chosen sound for a reminder; does nothing for 'off'. */
export async function playReminderSound(choice: SoundChoice): Promise<void> {
  if (choice === 'off') return
  const now = Date.now()
  if (now - lastReminderAt < DEDUPE_MS) return
  lastReminderAt = now
  await playSound(choice)
}
