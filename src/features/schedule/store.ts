import { create } from 'zustand'
import { getRepos } from '@/lib/db'
import { MINUTE } from '@/lib/time'
import { uid } from '@/lib/utils'
import { SNOOZE_MIN, type AppointmentDraft } from './logic'
import type { Appointment } from './types'

type AppointmentStore = {
  items: Appointment[]
  loaded: boolean
  load(): Promise<void>
  add(draft: AppointmentDraft): Appointment | null
  /** Changing the start or the lead time re-arms the notification. */
  update(id: string, patch: Partial<AppointmentDraft>): Appointment | undefined
  toggleDone(id: string): Appointment | undefined
  remove(id: string): Appointment | undefined
  restore(appointment: Appointment): void
  markNotified(ids: string[], at: number): void
  snooze(ids: string[], minutes?: number): void
}

const persist = (a: Appointment) => void getRepos().then((r) => r.appointments.upsert(a))

export const useAppointments = create<AppointmentStore>((set, get) => {
  const patchMany = (ids: string[], fn: (a: Appointment) => Appointment): Appointment[] => {
    const wanted = new Set(ids)
    const changed: Appointment[] = []
    set({
      items: get().items.map((a) => {
        if (!wanted.has(a.id)) return a
        const next = fn(a)
        changed.push(next)
        return next
      }),
    })
    changed.forEach(persist)
    return changed
  }

  return {
    items: [],
    loaded: false,
    async load() {
      const repos = await getRepos()
      set({ items: await repos.appointments.list(), loaded: true })
    },
    add(draft) {
      const title = draft.title.trim()
      if (!title) return null
      const appointment: Appointment = {
        id: uid(),
        title,
        note: draft.note.trim(),
        startsAt: draft.startsAt,
        remindBeforeMin: draft.remindBeforeMin,
        done: false,
        notifiedAt: null,
        snoozedUntil: null,
        createdAt: Date.now(),
      }
      set({ items: [...get().items, appointment] })
      persist(appointment)
      return appointment
    },
    update(id, patch) {
      return patchMany([id], (a) => {
        const rearm =
          (patch.startsAt !== undefined && patch.startsAt !== a.startsAt) ||
          (patch.remindBeforeMin !== undefined && patch.remindBeforeMin !== a.remindBeforeMin)
        return {
          ...a,
          title: patch.title?.trim() || a.title,
          note: patch.note?.trim() ?? a.note,
          startsAt: patch.startsAt ?? a.startsAt,
          remindBeforeMin: patch.remindBeforeMin ?? a.remindBeforeMin,
          ...(rearm ? { notifiedAt: null, snoozedUntil: null, done: false } : {}),
        }
      })[0]
    },
    toggleDone(id) {
      const now = Date.now()
      return patchMany([id], (a) => ({
        ...a,
        done: !a.done,
        // Finishing it also silences any pending reminder.
        notifiedAt: a.done ? a.notifiedAt : (a.notifiedAt ?? now),
      }))[0]
    },
    remove(id) {
      const found = get().items.find((a) => a.id === id)
      if (!found) return undefined
      set({ items: get().items.filter((a) => a.id !== id) })
      void getRepos().then((r) => r.appointments.remove(id))
      return found
    },
    restore(appointment) {
      set({ items: [...get().items.filter((a) => a.id !== appointment.id), appointment] })
      persist(appointment)
    },
    markNotified(ids, at) {
      patchMany(ids, (a) => ({ ...a, notifiedAt: at }))
    },
    snooze(ids, minutes = SNOOZE_MIN) {
      const until = Date.now() + minutes * MINUTE
      patchMany(ids, (a) => ({ ...a, notifiedAt: null, snoozedUntil: until }))
    },
  }
})
