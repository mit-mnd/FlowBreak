import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Droplets,
  Keyboard,
  Monitor,
  Palette,
  PersonStanding,
  Bell,
  Clock,
  ShieldCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { LANGUAGES, type Language } from '@/i18n'
import { cn } from '@/lib/utils'
import { isTauri } from '@/lib/tauri'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Segmented } from '@/components/Segmented'
import { NumberStepper } from '@/components/NumberStepper'
import { useSettings } from '../store'
import type { ThemePreference } from '../types'

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border pt-2">{children}</CardContent>
    </Card>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  )
}

export function SettingsPage() {
  const { t } = useTranslation()
  const settings = useSettings((s) => s.settings)
  const update = useSettings((s) => s.update)
  const weekdays = t('settings.weekdays', { returnObjects: true }) as string[]
  const startId = useId()
  const endId = useId()

  const toggleDay = (day: number) => {
    const days = settings.workDays.includes(day)
      ? settings.workDays.filter((d) => d !== day)
      : [...settings.workDays, day].sort()
    update({ workDays: days })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t('settings.title')}</h1>

      <Section icon={Palette} title={t('settings.appearance')}>
        <div className="space-y-2 py-2.5">
          <span className="text-sm">{t('settings.theme')}</span>
          <Segmented<ThemePreference>
            label={t('settings.theme')}
            value={settings.theme}
            onChange={(theme) => update({ theme })}
            options={[
              { value: 'light', label: t('settings.themeLight') },
              { value: 'dark', label: t('settings.themeDark') },
              { value: 'system', label: t('settings.themeSystem') },
            ]}
          />
        </div>
        <div className="space-y-2 py-2.5">
          <span className="text-sm">{t('settings.language')}</span>
          <Segmented<Language>
            label={t('settings.language')}
            value={settings.language}
            onChange={(language) => update({ language })}
            options={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
          />
        </div>
      </Section>

      <Section icon={Droplets} title={t('settings.water')}>
        <ToggleRow
          label={t('settings.waterEnabled')}
          checked={settings.waterEnabled}
          onChange={(waterEnabled) => update({ waterEnabled })}
        />
        <NumberStepper
          label={t('settings.waterGoal')}
          value={settings.waterGoalMl}
          min={500}
          max={5000}
          step={100}
          onChange={(waterGoalMl) => update({ waterGoalMl })}
        />
        <NumberStepper
          label={t('settings.cupSize')}
          value={settings.cupMl}
          min={50}
          max={1000}
          step={50}
          onChange={(cupMl) => update({ cupMl })}
        />
        <NumberStepper
          label={t('settings.waterInterval')}
          value={settings.waterIntervalMin}
          min={10}
          max={180}
          step={5}
          onChange={(waterIntervalMin) => update({ waterIntervalMin })}
        />
      </Section>

      <Section icon={PersonStanding} title={t('settings.movement')}>
        <ToggleRow
          label={t('settings.movementEnabled')}
          checked={settings.movementEnabled}
          onChange={(movementEnabled) => update({ movementEnabled })}
        />
        <NumberStepper
          label={t('settings.movementInterval')}
          value={settings.movementIntervalMin}
          min={15}
          max={180}
          step={5}
          onChange={(movementIntervalMin) => update({ movementIntervalMin })}
        />
      </Section>

      <Section icon={Clock} title={t('settings.schedule')}>
        <p className="py-2 text-xs text-muted-foreground">{t('settings.scheduleHint')}</p>
        <div className="grid grid-cols-2 gap-3 py-2.5">
          <div className="space-y-1">
            <label htmlFor={startId} className="text-sm">
              {t('settings.workStart')}
            </label>
            <Input
              id={startId}
              type="time"
              value={settings.workStart}
              onChange={(e) => e.target.value && update({ workStart: e.target.value })}
              className="tabular-nums"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor={endId} className="text-sm">
              {t('settings.workEnd')}
            </label>
            <Input
              id={endId}
              type="time"
              value={settings.workEnd}
              onChange={(e) => e.target.value && update({ workEnd: e.target.value })}
              className="tabular-nums"
            />
          </div>
        </div>
        <div className="space-y-2 py-2.5">
          <span className="text-sm">{t('settings.workDays')}</span>
          <div className="grid grid-cols-7 gap-1" role="group" aria-label={t('settings.workDays')}>
            {[1, 2, 3, 4, 5, 6, 0].map((d) => {
              const on = settings.workDays.includes(d)
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleDay(d)}
                  className={cn(
                    'h-9 rounded-lg text-xs font-medium transition-colors',
                    on
                      ? 'bg-water-soft text-water-soft-foreground ring-1 ring-water/40'
                      : 'bg-muted text-muted-foreground hover:text-foreground',
                  )}
                >
                  {weekdays[d]}
                </button>
              )
            })}
          </div>
        </div>
      </Section>

      <Section icon={Bell} title={t('settings.notifications')}>
        <p className="py-2 text-xs text-muted-foreground">{t('settings.popup')}</p>
        <ToggleRow
          label={t('settings.systemNotify')}
          hint={t('settings.systemNotifyHint')}
          checked={settings.systemNotify}
          onChange={(systemNotify) => update({ systemNotify })}
        />
      </Section>

      <Section icon={Monitor} title={t('settings.system')}>
        <ToggleRow
          label={t('settings.autostart')}
          hint={t('settings.autostartHint')}
          checked={settings.autostart}
          onChange={(autostart) => update({ autostart })}
          disabled={!isTauri()}
        />
        <div className="flex items-center justify-between gap-4 py-2.5">
          <div>
            <span className="flex items-center gap-2 text-sm">
              <Keyboard className="size-4 text-muted-foreground" aria-hidden />
              {t('settings.shortcut')}
            </span>
            <span className="block text-xs text-muted-foreground">
              {t('settings.shortcutHint')}
            </span>
          </div>
          <kbd className="rounded-md border bg-muted px-2 py-1 font-sans text-xs font-medium tabular-nums">
            Ctrl+Shift+W
          </kbd>
        </div>
      </Section>

      <p className="flex items-center justify-center gap-2 pb-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-4" aria-hidden />
        {t('settings.privacy')}
      </p>
    </div>
  )
}
