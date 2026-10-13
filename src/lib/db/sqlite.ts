import Database from '@tauri-apps/plugin-sql'
import type { Appointment, MovementLog, Repos, Todo, WaterLog } from './types'

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
type AppointmentRow = {
  id: string
  title: string
  note: string
  starts_at: number
  remind_before_min: number
  done: number
  notified_at: number | null
  snoozed_until: number | null
  created_at: number
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

const toAppointment = (r: AppointmentRow): Appointment => ({
  id: r.id,
  title: r.title,
  note: r.note,
  startsAt: r.starts_at,
  remindBeforeMin: r.remind_before_min,
  done: r.done === 1,
  notifiedAt: r.notified_at,
  snoozedUntil: r.snoozed_until,
  createdAt: r.created_at,
})

export async function createSqliteRepos(): Promise<Repos> {
  const db = await Database.load(DB_URL)

  return {
    appointments: {
      async list() {
        const rows = await db.select<AppointmentRow[]>(
          'SELECT * FROM appointments ORDER BY starts_at ASC',
        )
        return rows.map(toAppointment)
      },
      async upsert(a) {
        await db.execute(
          `INSERT INTO appointments
             (id, title, note, starts_at, remind_before_min, done, notified_at, snoozed_until, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title, note = excluded.note, starts_at = excluded.starts_at,
             remind_before_min = excluded.remind_before_min, done = excluded.done,
             notified_at = excluded.notified_at, snoozed_until = excluded.snoozed_until`,
          [
            a.id,
            a.title,
            a.note,
            a.startsAt,
            a.remindBeforeMin,
            a.done ? 1 : 0,
            a.notifiedAt,
            a.snoozedUntil,
            a.createdAt,
          ],
        )
      },
      async remove(id) {
        await db.execute('DELETE FROM appointments WHERE id = $1', [id])
      },
    },
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
