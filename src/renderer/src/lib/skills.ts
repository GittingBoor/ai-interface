import type { HostId, SkillAi, SkillEntry, SkillKind, SkillRelation, SkillRelationKind, SkillScope } from '@shared/types'

export type HostFilter = 'all' | HostId
export type AiFilter = 'all' | SkillAi
export type KindFilter = 'all' | SkillKind
export type ScopeFilter = 'all' | SkillScope

export interface SkillFilters {
  readonly host: HostFilter
  readonly ai: AiFilter
  readonly kind: KindFilter
  readonly scope: ScopeFilter
  readonly query: string
}

export const DEFAULT_FILTERS: SkillFilters = { host: 'all', ai: 'all', kind: 'all', scope: 'all', query: '' }

export const KIND_LABEL: Readonly<Record<SkillKind, string>> = { skill: 'Skill', agent: 'Agent', command: 'Befehl' }
export const AI_LABEL: Readonly<Record<SkillAi, string>> = { claude: 'Claude', codex: 'Codex' }
export const SCOPE_LABEL: Readonly<Record<SkillScope, string>> = {
  user: 'Eigene',
  synced: 'claude.ai',
  plugin: 'Plugin',
  project: 'Projekt',
  disabled: 'Deaktiviert'
}
/** Reihenfolge der Herkunftsgruppen in Liste und Grafik. */
export const SCOPE_ORDER: readonly SkillScope[] = ['user', 'synced', 'plugin', 'project', 'disabled']
const KIND_ORDER: readonly SkillKind[] = ['agent', 'skill', 'command']

type FacetKey = Exclude<keyof SkillFilters, 'query'>

function matchesFacet(entry: SkillEntry, filters: SkillFilters, skip: FacetKey | null): boolean {
  if (skip !== 'host' && filters.host !== 'all' && entry.host !== filters.host) return false
  if (skip !== 'ai' && filters.ai !== 'all' && entry.ai !== filters.ai) return false
  if (skip !== 'kind' && filters.kind !== 'all' && entry.kind !== filters.kind) return false
  if (skip !== 'scope' && filters.scope !== 'all' && entry.scope !== filters.scope) return false
  return true
}

/** Suche über Name, Beschreibung und KI-Zusammenfassung; alle Wörter müssen vorkommen. */
export function matchesQuery(entry: SkillEntry, query: string, summary: string | undefined): boolean {
  const words = query.toLocaleLowerCase('de-DE').split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const haystack = `${entry.name} ${entry.description} ${summary ?? ''} ${entry.plugin ?? ''} ${entry.project ?? ''}`.toLocaleLowerCase('de-DE')
  return words.every((w) => haystack.includes(w))
}

export function filterEntries(entries: readonly SkillEntry[], filters: SkillFilters, summaries: Readonly<Record<string, string>>): SkillEntry[] {
  return entries.filter((e) => matchesFacet(e, filters, null) && matchesQuery(e, filters.query, summaries[e.hash]))
}

/** Zähler je Option eines Filters: alle anderen Filter und die Suche gelten, dieser nicht. */
export function facetCounts<K extends FacetKey>(
  entries: readonly SkillEntry[],
  filters: SkillFilters,
  summaries: Readonly<Record<string, string>>,
  key: K,
  value: (entry: SkillEntry) => string
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const e of entries) {
    if (!matchesFacet(e, filters, key) || !matchesQuery(e, filters.query, summaries[e.hash])) continue
    const v = value(e)
    counts.set(v, (counts.get(v) ?? 0) + 1)
    counts.set('all', (counts.get('all') ?? 0) + 1)
  }
  return counts
}

export const compareEntries = (a: SkillEntry, b: SkillEntry): number =>
  KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.name.localeCompare(b.name, 'de-DE') || a.host.localeCompare(b.host)

export interface SkillSubgroup {
  /** Plugin- oder Projektname; null = keine Untergruppe. */
  readonly label: string | null
  readonly entries: readonly SkillEntry[]
}

export interface SkillGroup {
  readonly scope: SkillScope
  readonly count: number
  readonly subgroups: readonly SkillSubgroup[]
}

function subgroupKey(entry: SkillEntry): string | null {
  if (entry.scope === 'plugin') return entry.plugin ?? 'Unbekanntes Plugin'
  if (entry.scope === 'project') return entry.project ?? 'Unbekanntes Projekt'
  return null
}

/** Gruppen nach Herkunft; Plugins und Projekte mit Untergruppen. */
export function groupEntries(entries: readonly SkillEntry[]): SkillGroup[] {
  return SCOPE_ORDER.flatMap<SkillGroup>((scope) => {
    const inScope = entries.filter((e) => e.scope === scope)
    if (!inScope.length) return []
    const bySub = new Map<string | null, SkillEntry[]>()
    for (const e of inScope) {
      const key = subgroupKey(e)
      bySub.set(key, [...(bySub.get(key) ?? []), e])
    }
    const subgroups = [...bySub.entries()]
      .sort(([a], [b]) => (a ?? '').localeCompare(b ?? '', 'de-DE'))
      .map(([label, list]) => ({ label, entries: [...list].sort(compareEntries) }))
    return [{ scope, count: inScope.length, subgroups }]
  })
}

/** Ein Eintrag je Inhalt ohne Zusammenfassung (gleicher Hash auf mehreren Rechnern nur einmal). */
export function missingSummaryIds(entries: readonly SkillEntry[], summaries: Readonly<Record<string, string>>): string[] {
  const seen = new Set<string>()
  const ids: string[] = []
  for (const e of entries) {
    if (summaries[e.hash] !== undefined || seen.has(e.hash)) continue
    seen.add(e.hash)
    ids.push(e.id)
  }
  return ids
}

export const TOOL_PREFIX = 'tool:'
export const PLUGIN_PREFIX = 'plugin:'

export const stripPrefix = (id: string, prefix: string): string => (id.startsWith(prefix) ? id.slice(prefix.length) : id)

export type RelationDirection = 'out' | 'in'

export interface RelationItem {
  readonly kind: SkillRelationKind
  readonly direction: RelationDirection
  /** Ziel-Eintrag, falls der andere Endpunkt ein Katalogeintrag ist. */
  readonly entry: SkillEntry | null
  readonly label: string
}

export const RELATION_LABEL: Readonly<Record<SkillRelationKind, Readonly<Record<RelationDirection, string>>>> = {
  contains: { out: 'Enthält', in: 'Enthalten in Plugin' },
  'uses-tool': { out: 'Nutzt Tool', in: 'Genutzt von' },
  'uses-skill': { out: 'Nutzt Skill', in: 'Genutzt von Agent' },
  mentions: { out: 'Erwähnt', in: 'Erwähnt von' }
}

/** Beziehungen eines Eintrags in beide Richtungen, aufgelöst gegen den Katalog. */
export function relationsFor(entry: SkillEntry, relations: readonly SkillRelation[], byId: ReadonlyMap<string, SkillEntry>): RelationItem[] {
  const items: RelationItem[] = []
  for (const r of relations) {
    const direction: RelationDirection | null = r.from === entry.id ? 'out' : r.to === entry.id ? 'in' : null
    if (!direction) continue
    const other = direction === 'out' ? r.to : r.from
    const target = byId.get(other) ?? null
    const label = target?.name ?? stripPrefix(stripPrefix(other, TOOL_PREFIX), PLUGIN_PREFIX)
    items.push({ kind: r.kind, direction, entry: target, label })
  }
  return items
}
