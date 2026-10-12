import { useTranslation } from 'react-i18next'
import { Check, Play, VolumeX } from 'lucide-react'
import { SOUND_IDS, playSound, type SoundChoice } from '@/lib/sound'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const OPTIONS: readonly SoundChoice[] = ['off', ...SOUND_IDS]

type SoundPickerProps = {
  value: SoundChoice
  onChange: (value: SoundChoice) => void
  label: string
}

/** Radio list of reminder sounds; every real sound has its own preview button. */
export function SoundPicker({ value, onChange, label }: SoundPickerProps) {
  const { t } = useTranslation()

  return (
    <div role="radiogroup" aria-label={label} className="space-y-1.5 py-2.5">
      {OPTIONS.map((option) => {
        const selected = option === value
        const name = t(`settings.sounds.${option}`)
        return (
          <div
            key={option}
            className={cn(
              'flex items-center gap-1 rounded-lg border pr-1 transition-colors',
              selected ? 'border-water/50 bg-water-soft' : 'border-transparent hover:bg-muted',
            )}
          >
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option)}
              className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg px-3 text-left"
            >
              <span
                className={cn(
                  'grid size-5 shrink-0 place-items-center rounded-full border-2',
                  selected
                    ? 'border-water-strong bg-water-strong text-water-foreground'
                    : 'border-input',
                )}
              >
                {selected && <Check className="size-3" strokeWidth={3} aria-hidden />}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    'block text-sm font-medium',
                    selected && 'text-water-soft-foreground',
                  )}
                >
                  {name}
                </span>
                <span
                  className={cn(
                    'block truncate text-xs',
                    selected ? 'text-water-soft-foreground/80' : 'text-muted-foreground',
                  )}
                >
                  {t(`settings.soundsHint.${option}`)}
                </span>
              </span>
            </button>

            {option === 'off' ? (
              <span className="grid size-9 place-items-center text-muted-foreground" aria-hidden>
                <VolumeX className="size-4" />
              </span>
            ) : (
              <Button
                variant="outline"
                size="icon"
                aria-label={t('settings.soundPreview', { name })}
                title={t('settings.soundPreview', { name })}
                onClick={() => void playSound(option)}
              >
                <Play />
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}
