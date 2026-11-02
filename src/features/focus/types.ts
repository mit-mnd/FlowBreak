export type FocusSession = {
  /** Stable id: the finished session is stored under it. */
  id: string
  taskId: string | null
  title: string | null
  startedAt: number
  durationMin: number
}
