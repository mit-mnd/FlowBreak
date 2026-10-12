import { describe, expect, it } from 'vitest'
import { SOUND_IDS, isSoundChoice, scoreFor, soundDuration } from './index'

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
        expect(tone.gain).toBeLessThanOrEqual(0.35)
        expect(tone.freq).toBeGreaterThan(100)
      }
      // A reminder sound should be short.
      expect(soundDuration(id)).toBeLessThanOrEqual(1.5)
    }
  })

  it('validates stored choices', () => {
    expect(isSoundChoice('off')).toBe(true)
    expect(isSoundChoice('bell')).toBe(true)
    expect(isSoundChoice('siren')).toBe(false)
    expect(isSoundChoice(undefined)).toBe(false)
  })
})
