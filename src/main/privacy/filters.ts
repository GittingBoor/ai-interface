import type {
  Favorite,
  FolderEntry,
  GitState,
  HostId,
  ImageMeta,
  InterruptedRun,
  MiniPcSnapshot,
  SkillCatalogResult,
  TerminalInfo
} from '@shared/types'

/** Liegt der Pfad gerade in einem privaten Ordner? (siehe `PrivacyService.isHidden`) */
export type HiddenCheck = (host: HostId, path: string | null) => boolean

/** Ohne Host gespeicherte Bilder stammen vom Main-PC. */
const DEFAULT_IMAGE_HOST: HostId = 'local'

export const filterFavorites = (items: readonly Favorite[], hidden: HiddenCheck): Favorite[] => items.filter((f) => !hidden(f.host, f.path))

export const isImageHidden = (image: ImageMeta, hidden: HiddenCheck): boolean =>
  image.project !== null && hidden(image.host ?? DEFAULT_IMAGE_HOST, image.project)

export const filterImages = (items: readonly ImageMeta[], hidden: HiddenCheck): ImageMeta[] => items.filter((i) => !isImageHidden(i, hidden))

/** Nutzlast für `images:added` ohne private Bilder; `null`, wenn nichts übrig bleibt. */
export function imagesAddedPayload(added: readonly ImageMeta[], hidden: HiddenCheck): { readonly count: number; readonly projects: readonly string[] } | null {
  const visible = filterImages(added, hidden)
  return visible.length ? { count: visible.length, projects: [...new Set(visible.map((i) => i.project ?? ''))] } : null
}

export const isTerminalHidden = (terminals: readonly TerminalInfo[], id: string, hidden: HiddenCheck): boolean => {
  const terminal = terminals.find((t) => t.id === id)
  return terminal !== undefined && hidden(terminal.host, terminal.path)
}

export const filterRuns = (items: readonly InterruptedRun[], hidden: HiddenCheck): InterruptedRun[] => items.filter((r) => !hidden(r.host, r.project))

export const filterTerminals = (items: readonly TerminalInfo[], hidden: HiddenCheck): TerminalInfo[] => items.filter((t) => !hidden(t.host, t.path))

export const filterFolders = (host: HostId, items: readonly FolderEntry[], hidden: HiddenCheck): FolderEntry[] =>
  items.filter((f) => !hidden(host, f.path))

/** Git-Stände eines Geräts. */
export const filterGit = (host: HostId, items: readonly GitState[], hidden: HiddenCheck): GitState[] => items.filter((g) => !hidden(host, g.path))

export const filterMiniPc = (host: HostId, snapshot: MiniPcSnapshot, hidden: HiddenCheck): MiniPcSnapshot => ({
  ...snapshot,
  claude: snapshot.claude.filter((c) => !hidden(host, c.cwd))
})

/** Projekt-Skills aus privaten Ordnern und alle Beziehungen, die auf sie zeigen, entfernen. */
export function filterSkills(result: SkillCatalogResult, hidden: HiddenCheck): SkillCatalogResult {
  const entries = result.entries.filter((e) => !hidden(e.host, e.project ?? e.path))
  const ids = new Set(entries.map((e) => e.id))
  return { ...result, entries, relations: result.relations.filter((r) => ids.has(r.from) && ids.has(r.to)) }
}
