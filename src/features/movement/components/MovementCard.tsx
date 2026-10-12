import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BellOff, BellRing, LibraryBig, PersonStanding, Play } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/ProgressBar'
import { useSettings } from '@/features/settings'
import { dayKey, minutesBetween } from '@/lib/time'
import { pickExercise } from '../exercises'
import { useMovement } from '../store'
import { ExerciseLibrary } from './ExerciseLibrary'

type MovementCardProps = {
  now: number
  sittingSince: number
  /** Minutes until the next movement reminder; null when off or quiet. */
  nextInMin: number | null
}

export function MovementCard({ now, sittingSince, nextInMin }: MovementCardProps) {
  const { t } = useTranslation()
  const [libraryOpen, setLibraryOpen] = useState(false)
  const logs = useMovement((s) => s.logs)
  const openSession = useMovement((s) => s.openSession)
  const { movementEnabled, movementIntervalMin } = useSettings((s) => s.settings)

  const sittingMin = minutesBetween(sittingSince, now)
  const today = dayKey(now)
  const doneToday = logs.filter((l) => dayKey(l.loggedAt) === today).length

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="grid size-7 place-items-center rounded-lg bg-move-soft text-move-soft-foreground">
            <PersonStanding className="size-4" aria-hidden />
          </span>
          {t('movement.title')}
        </CardTitle>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {!movementEnabled ? (
            <>
              <BellOff className="size-3.5" aria-hidden /> {t('movement.disabled')}
            </>
          ) : nextInMin !== null ? (
            <>
              <BellRing className="size-3.5" aria-hidden />
              {nextInMin <= 1
                ? t('movement.nextSoon')
                : t('movement.nextIn', { minutes: nextInMin })}
            </>
          ) : null}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium tabular-nums">
            {t('movement.sitting', { minutes: sittingMin })}
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {t('movement.doneToday', { count: doneToday })}
          </p>
        </div>
        <ProgressBar
          value={sittingMin / movementIntervalMin}
          tone="move"
          label={t('movement.sitting', { minutes: sittingMin })}
        />
        <div className="flex gap-2">
          <Button
            variant="move"
            className="flex-1"
            onClick={() => openSession(pickExercise(logs.map((l) => l.exerciseId)).id)}
          >
            <Play aria-hidden />
            {t('movement.startNow')}
          </Button>
          <Button variant="moveSoft" onClick={() => setLibraryOpen(true)}>
            <LibraryBig aria-hidden />
            {t('movement.library')}
          </Button>
        </div>
      </CardContent>
      <ExerciseLibrary open={libraryOpen} onOpenChange={setLibraryOpen} />
    </Card>
  )
}
