import type { QuotaState } from '@shared/types'
import type { InspectedProject } from './KnowledgeInspector'

export const KNOWLEDGE_QUOTA_SOFT_LIMIT = 70
export const KNOWLEDGE_QUOTA_STOP = 95
/** Grundaufwand je Lauf (Prozentpunkte, Richtwert). */
export const KNOWLEDGE_PERCENT_BASE = 2
export const KNOWLEDGE_PERCENT_PER_PROTOCOL = 0.5
export const KNOWLEDGE_PERCENT_PER_10_COMMITS = 0.5
const COMMITS_PER_STEP = 10

type Estimable = Pick<InspectedProject, 'newProtocols' | 'newCommits'>

/** Geschätzter Verbrauch eines Laufs in Prozentpunkten des 5-Stunden-Fensters (konservativ aufgerundet). */
export function estimatePercent(p: Estimable): number {
  return (
    KNOWLEDGE_PERCENT_BASE +
    p.newProtocols * KNOWLEDGE_PERCENT_PER_PROTOCOL +
    Math.ceil(p.newCommits / COMMITS_PER_STEP) * KNOWLEDGE_PERCENT_PER_10_COMMITS
  )
}

/** quotaPercent: five_hour-Fenster; null = unbekannt → alles. */
export function selectForRun<T extends Pick<InspectedProject, 'newProtocols' | 'newCommits' | 'lastActivity'>>(
  candidates: readonly T[],
  quotaPercent: number | null,
): { readonly start: T[]; readonly deferred: T[] } {
  if (quotaPercent === null || quotaPercent < KNOWLEDGE_QUOTA_SOFT_LIMIT) {
    return { start: [...candidates], deferred: [] }
  }
  let budget = KNOWLEDGE_QUOTA_STOP - quotaPercent
  const start: T[] = []
  const deferred: T[] = []
  for (const candidate of [...candidates].sort((a, b) => b.lastActivity - a.lastActivity)) {
    const cost = estimatePercent(candidate)
    if (cost <= budget) {
      start.push(candidate)
      budget -= cost
    } else {
      deferred.push(candidate)
    }
  }
  return { start, deferred }
}

/** Verbrauch des 5-Stunden-Fensters; null, wenn das Kontingent unbekannt oder nicht abrufbar ist. */
export function fiveHourPercent(state: QuotaState): number | null {
  if (state.status !== 'ok') return null
  return state.windows.find((w) => w.kind === 'five_hour')?.percent ?? null
}
