import type { Category, Favorite } from '@shared/types'

/** Filter der Projektliste: alle, nur angepinnte, ohne Art oder eine Art (id). */
export type ProjectFilter = 'all' | 'starred' | 'uncategorized' | number

export interface ProjectGroupView {
  /** `null` = „Ohne Art“. */
  readonly category: Category | null
  readonly projects: readonly Favorite[]
}

export function matchesFilter(project: Favorite, filter: ProjectFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'starred') return project.starred
  if (filter === 'uncategorized') return project.categoryId === null
  return project.categoryId === filter
}

/** Angepinnte zuerst, sonst die eigene Reihenfolge (stabil). */
export function pinnedFirst(projects: readonly Favorite[]): Favorite[] {
  return [...projects].sort((a, b) => Number(b.starred) - Number(a.starred) || a.sortOrder - b.sortOrder)
}

/** Gruppen in der Reihenfolge der Arten, „Ohne Art“ zuletzt; leere Gruppen fallen weg. Unbekannte Art zählt als „Ohne Art“. */
export function groupProjects(projects: readonly Favorite[], categories: readonly Category[]): ProjectGroupView[] {
  const known = new Set(categories.map((c) => c.id))
  const groups: ProjectGroupView[] = [...categories]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((category) => ({ category, projects: pinnedFirst(projects.filter((p) => p.categoryId === category.id)) }))
  groups.push({ category: null, projects: pinnedFirst(projects.filter((p) => p.categoryId === null || !known.has(p.categoryId))) })
  return groups.filter((g) => g.projects.length > 0)
}

/**
 * Setzt eine neu sortierte Teilmenge in die Gesamtreihenfolge ein: Die Plätze der Teilmenge
 * bleiben, nur ihre Belegung ändert sich. So lässt sich innerhalb einer Gruppe sortieren.
 */
export function mergeSubsetOrder(allIds: readonly number[], subsetOrder: readonly number[]): number[] {
  const subset = new Set(subsetOrder)
  const queue = [...subsetOrder]
  return allIds.map((id) => (subset.has(id) ? (queue.shift() ?? id) : id))
}

/** Verschiebt ein Element eine Position nach oben (-1) oder unten (1). */
export function moveBy<T>(list: readonly T[], index: number, dir: -1 | 1): T[] {
  const target = index + dir
  if (target < 0 || target >= list.length) return [...list]
  const next = [...list]
  const [item] = next.splice(index, 1)
  if (item !== undefined) next.splice(target, 0, item)
  return next
}
