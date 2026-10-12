import { isTauri } from '@/lib/tauri'
import { createMemoryRepos } from './memory'
import type { Repos } from './types'

export type * from './types'

let repos: Repos | null = null
let pending: Promise<Repos> | null = null

export function getRepos(): Promise<Repos> {
  if (repos) return Promise.resolve(repos)
  if (!pending) {
    pending = (async () => {
      if (isTauri()) {
        const { createSqliteRepos } = await import('./sqlite')
        repos = await createSqliteRepos()
      } else {
        repos = createMemoryRepos()
      }
      return repos
    })()
  }
  return pending
}

/** Test helper: inject repositories (e.g. a fresh in-memory set). */
export function setRepos(next: Repos | null): void {
  repos = next
  pending = null
}
