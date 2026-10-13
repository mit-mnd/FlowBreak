import { describe, expect, it } from 'vitest'
import {
  MASTER_VOLUME,
  SOUND_IDS,
  estimatePeak,
  isSoundChoice,
  scoreFor,
  soundDuration,
} from './index'

describe('sounds', () => {
  it('offers exactly four distinct sounds', () => {
    expect(SOUND_IDS).toHaveLength(4)
    const signatures = SOUND_IDS.map((id) => JSON.stringify(scoreFor(id)))
    expect(new Set(signatures).size).toBe(4)
  })

  it('keeps every tone audible, bounded and non-clipping', () => {
    for (const id of SOUND_IDS) {
      const score = scoreFor(id)
      expect(score.length).toBeGreaterThan(0)
      for (const tone of score) {
        expect(tone.at).toBeGreaterThanOrEqual(0)
        expect(tone.dur).toBeGreaterThan(0)
        expect(tone.gain).toBeGreaterThan(0)
        expect(tone.gain).toBeLessThanOrEqual(1)
        expect(tone.freq).toBeGreaterThan(100)
      }
      // A reminder sound should be short.
      expect(soundDuration(id)).toBeLessThanOrEqual(1.5)
    }
  })

  it('plays at a 0.5 output level without clipping', () => {
    expect(MASTER_VOLUME).toBe(0.5)
    for (const id of SOUND_IDS) {
      const output = estimatePeak(id) * MASTER_VOLUME
      // Loud enough: every sound reaches at least ~0.5 at the output...
      expect(output).toBeGreaterThanOrEqual(0.49)
      // ...while overlapping tones never add up to clipping (1.0).
      expect(output).toBeLessThan(0.9)
    }
  })

  it('validates stored choices', () => {
    expect(isSoundChoice('off')).toBe(true)
    expect(isSoundChoice('bell')).toBe(true)
    expect(isSoundChoice('siren')).toBe(false)
    expect(isSoundChoice(undefined)).toBe(false)
  })
})
