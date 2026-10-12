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
}
