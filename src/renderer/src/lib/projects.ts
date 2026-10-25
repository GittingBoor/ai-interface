import type { Favorite, HostId, ProjectUsage, SessionSummary, TodoItem } from '@shared/types'
import { findProjectFor, isInside } from '@shared/projectMatch'

/** Gehört ein Verbrauchsprojekt (Pfad) zu einem Projekt? Gleicher Host, gleicher Pfad oder Unterordner. */
export function belongsTo(fav: Pick<Favorite, 'host' | 'path'>, host: HostId, project: string): boolean {
  return isInside(fav, host, project)
}

export function findFavorite(favorites: readonly Favorite[], host: HostId, project: string): Favorite | undefined {
  return findProjectFor(favorites, host, project)
}

export interface FavoriteStats {
  readonly tokens7d: number
  readonly cost7d: number
  readonly lastActive: number | null
  readonly sessions: number
}

export function statsFor(fav: Favorite, projects: readonly ProjectUsage[]): FavoriteStats {
  const own = projects.filter((p) => belongsTo(fav, p.host, p.project))
  return {
    tokens7d: own.reduce((sum, p) => sum + p.totalTokens, 0),
    cost7d: own.reduce((sum, p) => sum + p.costUsd, 0),
    lastActive: own.length ? Math.max(...own.map((p) => p.lastActive)) : null,
    sessions: own.reduce((sum, p) => sum + p.sessions, 0)
  }
}

const normalize = (text: string): string => text.trim().toLocaleLowerCase('de-DE')

/** Offene TODOs, deren Abschnitt dem Favoritennamen entspricht. */
export function openTodosFor(fav: Favorite, items: readonly TodoItem[]): number {
  const name = normalize(fav.name)
  return items.filter((t) => !t.done && normalize(t.section) === name).length
}

export function sessionsFor(fav: Favorite, sessions: readonly SessionSummary[]): SessionSummary[] {
  return sessions.filter((s) => belongsTo(fav, s.host, s.project))
}

/** Verbrauchsprojekte ohne Favorit (für „Weitere Projekte“). */
export function unassignedProjects(favorites: readonly Favorite[], projects: readonly ProjectUsage[]): ProjectUsage[] {
  return projects.filter((p) => !findFavorite(favorites, p.host, p.project)).sort((a, b) => b.lastActive - a.lastActive)
}

export interface ProjectGroup {
  readonly key: string
  readonly label: string
  readonly host: HostId
  readonly paths: readonly string[]
  readonly totalTokens: number
  readonly costUsd: number
  readonly color: string | null
  readonly icon: string | null
}

/** Fasst Verbrauchsprojekte je Favorit zusammen (Unterordner zählen zum Favoriten). */
export function groupByFavorite(favorites: readonly Favorite[], projects: readonly ProjectUsage[], label: (path: string) => string): ProjectGroup[] {
  const groups = new Map<string, ProjectGroup>()
  for (const p of projects) {
    const fav = findFavorite(favorites, p.host, p.project)
    const key = fav ? `fav-${fav.id}` : `${p.host}-${p.project}`
    const prev = groups.get(key)
    groups.set(key, {
      key,
      label: fav?.name ?? label(p.project),
      host: p.host,
      paths: [...(prev?.paths ?? []), p.project],
      totalTokens: (prev?.totalTokens ?? 0) + p.totalTokens,
      costUsd: (prev?.costUsd ?? 0) + p.costUsd,
      color: fav?.color ?? null,
      icon: fav?.icon ?? null
    })
  }
  return [...groups.values()].sort((a, b) => b.totalTokens - a.totalTokens)
}
