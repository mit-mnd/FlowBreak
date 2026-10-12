/**
 * Reminder sounds synthesised with the Web Audio API, so no audio assets are
 * shipped. Each sound is a small "score" of tones; `playSound` renders it.
 */

export const SOUND_IDS = ['drop', 'bell', 'chime', 'pulse'] as const
export type SoundId = (typeof SOUND_IDS)[number]
/** User choice: one of the sounds, or silence. */
export type SoundChoice = SoundId | 'off'

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
  gain: number
}

const SCORES: Record<SoundId, readonly Tone[]> = {
  // Two falling "plip" drops.
  drop: [
    { freq: 1200, endFreq: 520, at: 0, dur: 0.22, type: 'sine', gain: 0.3 },
    { freq: 900, endFreq: 420, at: 0.2, dur: 0.3, type: 'sine', gain: 0.2 },
  ],
  // Single bell: fundamental plus inharmonic partials.
  bell: [
    { freq: 880, at: 0, dur: 1.3, type: 'sine', gain: 0.22 },
    { freq: 2428.8, at: 0, dur: 0.75, type: 'sine', gain: 0.09 },
    { freq: 4752, at: 0, dur: 0.45, type: 'sine', gain: 0.04 },
  ],
  // Rising four-note arpeggio (C5 E5 G5 C6).
  chime: [
    { freq: 523.25, at: 0, dur: 0.7, type: 'sine', gain: 0.2 },
    { freq: 659.25, at: 0.13, dur: 0.7, type: 'sine', gain: 0.2 },
    { freq: 783.99, at: 0.26, dur: 0.7, type: 'sine', gain: 0.2 },
    { freq: 1046.5, at: 0.39, dur: 0.9, type: 'sine', gain: 0.2 },
  ],
  // Three short pings: the most attention-grabbing.
  pulse: [
    { freq: 880, at: 0, dur: 0.16, type: 'triangle', gain: 0.25 },
    { freq: 880, at: 0.22, dur: 0.16, type: 'triangle', gain: 0.25 },
    { freq: 880, at: 0.44, dur: 0.16, type: 'triangle', gain: 0.25 },
  ],
}

export function scoreFor(id: SoundId): readonly Tone[] {
  return SCORES[id]
}

/** Total length of a sound in seconds. */
export function soundDuration(id: SoundId): number {
  return Math.max(...SCORES[id].map((t) => t.at + t.dur))
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

    const start = audio.currentTime + 0.02
    for (const tone of SCORES[id]) {
      const t0 = start + tone.at
      const t1 = t0 + tone.dur
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.type = tone.type
      osc.frequency.setValueAtTime(tone.freq, t0)
      if (tone.endFreq) osc.frequency.exponentialRampToValueAtTime(tone.endFreq, t1)
      // Fast attack, exponential decay: a soft bell rather than a harsh beep.
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(tone.gain, t0 + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, t1)
      osc.connect(gain).connect(audio.destination)
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
