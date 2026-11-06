import type { Favorite, Source } from '@shared/types'
import { domainOf, sameFolder, type SourceFolderKey } from '@shared/sources'
import { baseName } from '@renderer/lib/format'
import { pinnedFirst } from '@renderer/lib/projectOrganize'
import { activeTag } from '../../i18n/activeLocale'

const GENERAL_KEY = 'general'
const TITLE_SEPARATOR = ' · '

/** Ein Ordner unter „Quellen“: Projekt-Favorit, verwaister Projektpfad oder „Allgemein“. */
export interface SourceFolder extends SourceFolderKey {
  readonly key: string
  readonly label: string
  readonly color: string | null
  readonly icon: string | null
  readonly sources: readonly Source[]
}

export const folderKeyOf = (folder: SourceFolderKey): string => (folder.project === null ? GENERAL_KEY : `${folder.host ?? ''}|${folder.project}`)

const general = (label: string, sources: readonly Source[]): SourceFolder => ({
  key: GENERAL_KEY,
  host: null,
  project: null,
  label,
  color: null,
  icon: null,
  sources: sources.filter((s) => s.project === null)
})

const ofFavorite = (favorite: Favorite, sources: readonly Source[]): SourceFolder => {
  const key: SourceFolderKey = { host: favorite.host, project: favorite.path }
  return { ...key, key: folderKeyOf(key), label: favorite.name, color: favorite.color, icon: favorite.icon, sources: sources.filter((s) => sameFolder(s, key)) }
}

/** Projekte, die kein Favorit (mehr) sind, erscheinen unter ihrem Ordnernamen. */
function orphanFolders(favorites: readonly Favorite[], sources: readonly Source[]): SourceFolder[] {
  const known = new Set(favorites.map((f) => folderKeyOf({ host: f.host, project: f.path })))
  const byKey = new Map<string, SourceFolder>()
  for (const source of sources) {
    if (source.project === null) continue
    const key = folderKeyOf(source)
    if (known.has(key)) continue
    const current = byKey.get(key)
    byKey.set(key, {
      key,
      host: source.host,
      project: source.project,
      label: baseName(source.project),
      color: null,
      icon: null,
      sources: [...(current?.sources ?? []), source]
    })
  }
  return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label, activeTag()))
}

/** Alle möglichen Ordner: Projekte in Favoriten-Reihenfolge, verwaiste Projekte, „Allgemein“ zuletzt. */
export function allFolders(favorites: readonly Favorite[], sources: readonly Source[], generalLabel: string): SourceFolder[] {
  return [...pinnedFirst(favorites).map((f) => ofFavorite(f, sources)), ...orphanFolders(favorites, sources), general(generalLabel, sources)]
}

/** Ordner für die Navigation: nur solche mit Quellen, „Allgemein“ immer. */
export const visibleFolders = (folders: readonly SourceFolder[]): SourceFolder[] => folders.filter((f) => f.sources.length > 0 || f.project === null)

export function matchesQuery(source: Source, rawQuery: string): boolean {
  const query = rawQuery.trim().toLocaleLowerCase(activeTag())
  if (!query) return true
  return `${source.title} ${domainOf(source.url)} ${source.note}`.toLocaleLowerCase(activeTag()).includes(query)
}

/** Titel ohne angehängte Webseite (`Fourier · de.wikipedia.org` → `Fourier`), die steht ohnehin daneben. */
export function displayTitle(source: Source): string {
  const suffix = `${TITLE_SEPARATOR}${domainOf(source.url)}`
  return source.title.endsWith(suffix) && source.title.length > suffix.length ? source.title.slice(0, -suffix.length) : source.title
}

/** Anfangsbuchstabe des Namens der Webseite (`de.wikipedia.org` → `W`). */
export function siteInitial(domain: string): string {
  const labels = domain.split('.').filter(Boolean)
  const name = labels.length >= 2 ? labels[labels.length - 2] : labels[0]
  return (name?.[0] ?? '?').toLocaleUpperCase(activeTag())
}
