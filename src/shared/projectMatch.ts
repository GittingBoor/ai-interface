import type { HostId } from './types'

export interface ProjectLocation {
  readonly host: HostId
  readonly path: string
}

const WINDOWS_PATH = /^[A-Za-z]:[\\/]/

/** Vergleichbare Form: Windows-Pfade ohne Groß-/Kleinschreibung und mit `/`, ohne abschließenden Trenner. */
export function normalize(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, '')
  return WINDOWS_PATH.test(path) ? trimmed.replaceAll('\\', '/').toLowerCase() : trimmed
}

/** Liegt `path` im Projektordner (gleich oder darunter, Grenze an einem Pfadtrenner)? */
export function isInside(project: ProjectLocation, host: HostId, path: string): boolean {
  if (project.host !== host) return false
  const root = normalize(project.path)
  const target = normalize(path)
  return target === root || target.startsWith(`${root}/`)
}

/** Das Projekt mit dem längsten passenden Pfad (verschachtelte Projekte: das tiefste gewinnt). */
export function findProjectFor<T extends ProjectLocation>(projects: readonly T[], host: HostId, path: string): T | undefined {
  return projects.filter((p) => isInside(p, host, path)).sort((a, b) => normalize(b.path).length - normalize(a.path).length)[0]
}
