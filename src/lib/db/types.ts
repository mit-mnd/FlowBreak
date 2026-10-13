export type Priority = 0 | 1 // 0 = normal, 1 = important

export type Todo = {
  id: string
  title: string
  done: boolean
  priority: Priority
  position: number
  createdAt: number
  completedAt: number | null
}

export type WaterLog = {
  id: string
  amountMl: number
  loggedAt: number
}

export type MovementLog = {
  id: string
  exerciseId: string
  durationSec: number
  loggedAt: number
}

export type Appointment = {
  id: string
  title: string
  note: string
  /** Start time, epoch ms. */
  startsAt: number
  /** Minutes before `startsAt` to notify; 0 = at the start time. */
  remindBeforeMin: number
  done: boolean
  /** When the reminder popup was shown; null = not yet notified. */
  notifiedAt: number | null
  /** After "snooze": do not notify again before this time. */
  snoozedUntil: number | null
  createdAt: number
}

export type AppointmentRepo = {
  list(): Promise<Appointment[]>
  upsert(appointment: Appointment): Promise<void>
  remove(id: string): Promise<void>
}

export type TodoRepo = {
  list(): Promise<Todo[]>
  upsert(todo: Todo): Promise<void>
  remove(id: string): Promise<void>
  savePositions(items: Pick<Todo, 'id' | 'position'>[]): Promise<void>
}

export type LogRepo<T> = {
  listSince(ts: number): Promise<T[]>
  add(entry: T): Promise<void>
  remove(id: string): Promise<void>
}

export type Repos = {
  todos: TodoRepo
  water: LogRepo<WaterLog>
  movement: LogRepo<MovementLog>
  appointments: AppointmentRepo
}
