import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { dayOffset, relativeParts } from './logic'

/** Locale-aware formatters shared by the schedule components. */
export function useScheduleFormat() {
  const { t, i18n } = useTranslation()

  return useMemo(() => {
    const lang = i18n.language
    const timeFmt = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' })
    const dayFmt = new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long' })
    const shortDayFmt = new Intl.DateTimeFormat(lang, {
      weekday: 'short',
      day: 'numeric',
      month: 'numeric',
    })
    const relFmt = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })

    return {
      time: (ts: number) => timeFmt.format(ts),
      /** "Today" / "Tomorrow" / "Thursday, 15 October". */
      dayLabel(dayStart: number, now: number, short = false) {
        const offset = dayOffset(dayStart, now)
        if (offset === 0) return t('schedule.today')
        if (offset === 1) return t('schedule.tomorrow')
        return (short ? shortDayFmt : dayFmt).format(dayStart)
      },
      /** "in 25 minutes" / "2 hours ago". */
      relative(diffMs: number) {
        const { value, unit } = relativeParts(diffMs)
        return relFmt.format(value, unit)
      },
      remindLabel(minutes: number) {
        if (minutes === 0) return t('schedule.remindAt')
        if (minutes === 60) return t('schedule.remindHour')
        if (minutes === 1440) return t('schedule.remindDay')
        return t('schedule.remindMin', { count: minutes })
      },
    }
  }, [i18n.language, t])
}
