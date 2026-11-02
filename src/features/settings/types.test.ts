import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, isReminderLevel, toSchedulerConfig } from './types'

describe('toSchedulerConfig', () => {
  it('maps the reminder level to a backoff factor', () => {
    const factor = (reminderLevel: 'light' | 'normal' | 'frequent') =>
      toSchedulerConfig({ ...DEFAULT_SETTINGS, reminderLevel }).renotifyBackoff
    expect(factor('frequent')).toBe(1)
    expect(factor('normal')).toBe(2)
    expect(factor('light')).toBe(3)
  })

  it('passes the new settings through', () => {
    const cfg = toSchedulerConfig({ ...DEFAULT_SETTINGS, idleResetMin: 12, remindAfterGoal: true })
    expect(cfg.idleResetMin).toBe(12)
    expect(cfg.remindWaterAfterGoal).toBe(true)
    expect(cfg.renotifyMaxMin).toBe(60)
  })

  it('defaults keep the previous behaviour for the first re-notification', () => {
    const cfg = toSchedulerConfig(DEFAULT_SETTINGS)
    expect(cfg.renotifyMin).toBe(15)
    expect(cfg.idleResetMin).toBe(5)
    expect(cfg.remindWaterAfterGoal).toBe(false)
  })
})

describe('isReminderLevel', () => {
  it('accepts only known levels', () => {
    expect(isReminderLevel('light')).toBe(true)
    expect(isReminderLevel('loud')).toBe(false)
    expect(isReminderLevel(undefined)).toBe(false)
  })
})
