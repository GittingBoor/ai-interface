import type { ProjectKnowledge } from '@shared/knowledge'

export type KnowledgeSectionId =
  | 'overview'
  | 'orientation'
  | 'architecture'
  | 'flows'
  | 'code'
  | 'activity'
  | 'features'
  | 'pitfalls'
  | 'concepts'
  | 'dependencies'
  | 'resources'
  | 'history'
  | 'gaps'

export interface KnowledgeSectionEntry {
  readonly id: KnowledgeSectionId
  /** Anzahl der Einträge, die das Inhaltsverzeichnis neben dem Titel zeigt. */
  readonly count?: number
}

export const sectionAnchor = (id: KnowledgeSectionId): string => `knowledge-${id}`

const ORDER: readonly KnowledgeSectionId[] = [
  'overview',
  'orientation',
  'architecture',
  'flows',
  'code',
  'activity',
  'features',
  'pitfalls',
  'concepts',
  'dependencies',
  'resources',
  'history',
  'gaps'
]

type Counter = (k: ProjectKnowledge) => number

/** Wie viele Einträge ein Abschnitt hat; 0 blendet ihn aus. */
const COUNTERS: Readonly<Record<KnowledgeSectionId, Counter>> = {
  overview: () => 1,
  orientation: (k) => (k.orientation?.start.length ?? 0) + (k.orientation?.readFirst.length ?? 0),
  architecture: (k) => k.architecture.nodes.length,
  flows: (k) => (k.flows ?? []).filter((f) => f.steps.length > 0).length,
  code: (k) => (k.stats ? k.stats.languages.length + k.stats.areas.length + k.stats.hotspots.length : 0),
  activity: (k) => (k.stats ? k.stats.contributors.length + k.stats.activity.filter((m) => m.commits > 0).length : 0),
  features: (k) => k.features.length,
  pitfalls: (k) => k.pitfalls?.length ?? 0,
  concepts: (k) => k.concepts.length,
  dependencies: (k) => k.stats?.dependencies.length ?? 0,
  resources: (k) => k.resources?.length ?? 0,
  history: (k) => k.timeline.length,
  gaps: (k) => k.gaps.length
}

/** Abschnitte, die zählen dürfen; die übrigen zeigen keine Zahl im Inhaltsverzeichnis. */
const COUNTED: ReadonlySet<KnowledgeSectionId> = new Set(['flows', 'features', 'pitfalls', 'concepts', 'dependencies', 'resources', 'gaps'])

/** Abschnitte mit Inhalt in fester Reihenfolge; leere fehlen, auch im Inhaltsverzeichnis. */
export function presentSections(knowledge: ProjectKnowledge): readonly KnowledgeSectionEntry[] {
  return ORDER.flatMap((id) => {
    const count = COUNTERS[id](knowledge)
    if (count === 0) return []
    return [COUNTED.has(id) ? { id, count } : { id }]
  })
}
