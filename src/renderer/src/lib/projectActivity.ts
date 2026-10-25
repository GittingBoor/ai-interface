import type { Favorite, HostId, ProjectActivity } from '@shared/types'
import { findProjectFor } from '@shared/projectMatch'
import { baseName, formatDuration, formatTokens, formatUsd } from './format'

export type ComparisonMetric = 'tokens' | 'cost'
export type ActivityMeasure = 'time' | ComparisonMetric

export const REST_KEY = 'rest'

/** Gedeckte Grautöne für Ordner ohne Projekt (Farbe folgt dem Ordner, nicht dem Rang). */
export const UNASSIGNED_TONES: readonly string[] = [
  'oklch(0.62 0.008 80)',
  'oklch(0.5 0.008 80)',
  'oklch(0.72 0.008 80)',
  'oklch(0.44 0.008 80)',
  'oklch(0.56 0.008 80)'
]
/** Farbe für „Weitere“. */
export const REST_TONE = 'oklch(0.36 0.008 70)'

export interface ActivityGroup {
  readonly key: string
  readonly label: string
  /** Hosts, auf denen gearbeitet wurde. */
  readonly hosts: readonly HostId[]
  readonly paths: readonly string[]
  readonly activeMs: number
  readonly totalTokens: number
  readonly costUsd: number
  readonly sessions: number
  readonly color: string
  /** Symbol des Projekts; null bei Ordnern ohne Projekt und bei „Weitere“. */
  readonly icon: string | null
  /** Zu einem Projekt gehörig (sonst Ordnername als Label). */
  readonly isProject: boolean
  /** Bei „Weitere“: Zahl der zusammengefassten Einträge. */
  readonly mergedCount: number
}

function toneFor(key: string): string {
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return UNASSIGNED_TONES[hash % UNASSIGNED_TONES.length] ?? REST_TONE
}

export const MEASURE_LABEL: Readonly<Record<ActivityMeasure, string>> = { time: 'Arbeitszeit', tokens: 'Token', cost: 'API-Gegenwert' }

export function formatMeasure(value: number, measure: ActivityMeasure): string {
  if (measure === 'time') return formatDuration(value)
  return measure === 'tokens' ? formatTokens(value) : formatUsd(value)
}

export function measureOf(group: Pick<ActivityGroup, 'activeMs' | 'totalTokens' | 'costUsd'>, measure: ActivityMeasure): number {
  if (measure === 'time') return group.activeMs
  return measure === 'tokens' ? group.totalTokens : group.costUsd
}

/** Fasst Verbrauchszeilen je Projekt zusammen; Ordner ohne Projekt bleiben je Host und Pfad einzeln. */
export function aggregateActivity(favorites: readonly Favorite[], rows: readonly ProjectActivity[]): ActivityGroup[] {
  const groups = new Map<string, ActivityGroup>()
  for (const row of rows) {
    const fav = findProjectFor(favorites, row.host, row.project)
    const key = fav ? `fav-${fav.id}` : `${row.host}-${row.project}`
    const prev = groups.get(key)
    groups.set(key, {
      key,
      label: fav?.name ?? baseName(row.project),
      hosts: prev?.hosts.includes(row.host) ? prev.hosts : [...(prev?.hosts ?? []), row.host],
      paths: [...(prev?.paths ?? []), row.project],
      activeMs: (prev?.activeMs ?? 0) + row.activeMs,
      totalTokens: (prev?.totalTokens ?? 0) + row.totalTokens,
      costUsd: (prev?.costUsd ?? 0) + row.costUsd,
      sessions: (prev?.sessions ?? 0) + row.sessions,
      color: fav?.color ?? toneFor(key),
      icon: fav?.icon ?? null,
      isProject: fav !== undefined,
      mergedCount: 1
    })
  }
  return [...groups.values()]
}

/** Die `limit` größten Einträge nach `measure`, der Rest zusammengefasst als „Weitere“. */
export function topWithRest(groups: readonly ActivityGroup[], measure: ActivityMeasure, limit: number): ActivityGroup[] {
  const sorted = [...groups].filter((g) => measureOf(g, measure) > 0).sort((a, b) => measureOf(b, measure) - measureOf(a, measure))
  if (sorted.length <= limit + 1) return sorted
  const top = sorted.slice(0, limit)
  const rest = sorted.slice(limit)
  const hosts = [...new Set(rest.flatMap((g) => g.hosts))]
  return [
    ...top,
    {
      key: REST_KEY,
      label: 'Weitere',
      hosts,
      paths: rest.flatMap((g) => g.paths),
      activeMs: rest.reduce((sum, g) => sum + g.activeMs, 0),
      totalTokens: rest.reduce((sum, g) => sum + g.totalTokens, 0),
      costUsd: rest.reduce((sum, g) => sum + g.costUsd, 0),
      sessions: rest.reduce((sum, g) => sum + g.sessions, 0),
      color: REST_TONE,
      icon: null,
      isProject: false,
      mergedCount: rest.length
    }
  ]
}
