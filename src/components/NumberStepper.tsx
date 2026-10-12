import { Minus, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { clamp } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type NumberStepperProps = {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
}

export function NumberStepper({ label, value, onChange, min, max, step }: NumberStepperProps) {
  const { t } = useTranslation()
  const set = (v: number) => onChange(clamp(Math.round(v / step) * step, min, max))
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('settings.decrease', { label })}
          disabled={value <= min}
          onClick={() => set(value - step)}
        >
          <Minus />
        </Button>
        <span className="w-14 text-center text-sm font-semibold tabular-nums" aria-live="polite">
          {value}
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('settings.increase', { label })}
          disabled={value >= max}
          onClick={() => set(value + step)}
        >
          <Plus />
        </Button>
      </div>
    </div>
  )
}
