import type { Language } from '@/i18n'
import type { SchedulerConfig } from '@/lib/scheduler'
import type { SoundChoice } from '@/lib/sound'

export type ThemePreference = 'light' | 'dark' | 'system'

export type Settings = {
  theme: ThemePreference
  language: Language
  waterEnabled: boolean
  waterGoalMl: number
  cupMl: number
  waterIntervalMin: number
  movementEnabled: boolean
  movementIntervalMin: number
  workStart: string
  workEnd: string
  workDays: number[]
  systemNotify: boolean
  sound: SoundChoice
  autostart: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  language: 'vi',
  waterEnabled: true,
  waterGoalMl: 2000,
  cupMl: 250,
  waterIntervalMin: 45,
  movementEnabled: true,
  movementIntervalMin: 50,
  workStart: '08:00',
  workEnd: '18:00',
  workDays: [1, 2, 3, 4, 5],
  systemNotify: false,
  sound: 'chime',
  autostart: false,
}

export function toSchedulerConfig(s: Settings): SchedulerConfig {
  return {
    water: { enabled: s.waterEnabled, intervalMin: s.waterIntervalMin },
    movement: { enabled: s.movementEnabled, intervalMin: s.movementIntervalMin },
    workHours: { start: s.workStart, end: s.workEnd, days: s.workDays },
    idleResetMin: 5,
    focusMaxDelayMin: 15,
    renotifyMin: 15,
    naturalBreakWindowMin: 10,
  }
}
