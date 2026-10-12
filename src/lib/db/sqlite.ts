import Database from '@tauri-apps/plugin-sql'
import type { MovementLog, Repos, Todo, WaterLog } from './types'

// Must match the connection string registered with migrations in src-tauri/src/lib.rs.
const DB_URL = 'sqlite:flowbreak.db'

type TodoRow = {
  id: string
  title: string
  done: number
  priority: number
  position: number
  created_at: number
  completed_at: number | null
}
type WaterRow = { id: string; amount_ml: number; logged_at: number }
type MovementRow = { id: string; exercise_id: string; duration_sec: number; logged_at: number }

const toTodo = (r: TodoRow): Todo => ({
  id: r.id,
  title: r.title,
  done: r.done === 1,
  priority: r.priority === 1 ? 1 : 0,
  position: r.position,
  createdAt: r.created_at,
  completedAt: r.completed_at,
})

export async function createSqliteRepos(): Promise<Repos> {
  const db = await Database.load(DB_URL)

  return {
    todos: {
      async list() {
        const rows = await db.select<TodoRow[]>('SELECT * FROM todos ORDER BY position ASC')
        return rows.map(toTodo)
      },
      async upsert(t) {
        await db.execute(
          `INSERT INTO todos (id, title, done, priority, position, created_at, completed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title, done = excluded.done, priority = excluded.priority,
             position = excluded.position, completed_at = excluded.completed_at`,
          [t.id, t.title, t.done ? 1 : 0, t.priority, t.position, t.createdAt, t.completedAt],
        )
      },
      async remove(id) {
        await db.execute('DELETE FROM todos WHERE id = $1', [id])
      },
      async savePositions(items) {
        for (const item of items) {
          await db.execute('UPDATE todos SET position = $1 WHERE id = $2', [item.position, item.id])
        }
      },
    },
    water: {
      async listSince(ts) {
        const rows = await db.select<WaterRow[]>(
          'SELECT * FROM water_logs WHERE logged_at >= $1 ORDER BY logged_at ASC',
          [ts],
        )
        return rows.map((r): WaterLog => ({
          id: r.id,
          amountMl: r.amount_ml,
          loggedAt: r.logged_at,
        }))
      },
      async add(e) {
        await db.execute('INSERT INTO water_logs (id, amount_ml, logged_at) VALUES ($1, $2, $3)', [
          e.id,
          e.amountMl,
          e.loggedAt,
        ])
      },
      async remove(id) {
        await db.execute('DELETE FROM water_logs WHERE id = $1', [id])
      },
    },
    movement: {
      async listSince(ts) {
        const rows = await db.select<MovementRow[]>(
          'SELECT * FROM movement_logs WHERE logged_at >= $1 ORDER BY logged_at ASC',
          [ts],
        )
        return rows.map((r): MovementLog => ({
          id: r.id,
          exerciseId: r.exercise_id,
          durationSec: r.duration_sec,
          loggedAt: r.logged_at,
        }))
      },
      async add(e) {
        await db.execute(
          'INSERT INTO movement_logs (id, exercise_id, duration_sec, logged_at) VALUES ($1, $2, $3, $4)',
          [e.id, e.exerciseId, e.durationSec, e.loggedAt],
        )
      },
      async remove(id) {
        await db.execute('DELETE FROM movement_logs WHERE id = $1', [id])
      },
    },
  }
}
