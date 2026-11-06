import { mainT } from '../i18n'
import type Database from 'better-sqlite3'
import type { HostId, Source, SourceInput, SourceOrigin, SourcePatch } from '@shared/types'
import { isWebUrl, normalizeUrl } from '@shared/links'
import { isSourceUrl, titleFromUrl } from '@shared/sources'
import { NotFoundError, ValidationError } from '../errors'

interface Row {
  readonly id: number
  readonly url: string
  readonly title: string
  readonly note: string
  readonly host: HostId | null
  readonly project: string | null
  readonly origin: SourceOrigin
  readonly starred: number
  readonly session_id: string | null
  readonly created_at: number
}

/** Quelle aus einer Claude-Session (siehe `SessionSourceScanner`). */
export interface AutoSourceInput {
  readonly url: string
  readonly note: string
  readonly host: HostId
  readonly project: string | null
  readonly sessionId: string
  readonly createdAt: number
}

const toSource = (r: Row): Source => ({
  id: r.id,
  url: r.url,
  title: r.title,
  note: r.note,
  host: r.host,
  project: r.project,
  origin: r.origin,
  starred: r.starred === 1,
  sessionId: r.session_id,
  createdAt: r.created_at
})

/** „Allgemein“ hat weder Host noch Projekt; ein Projekt immer beides. */
const folderOf = (host: HostId | null, project: string | null): { host: HostId | null; project: string | null } =>
  project === null ? { host: null, project: null } : { host, project }

/** Gemerkte Webseiten je Projekt in SQLite; dieselbe Adresse steht je Ordner nur einmal. */
export class SourceRepo {
  constructor(
    private readonly db: Database.Database,
    private readonly now: () => number = Date.now
  ) {}

  list(): Source[] {
    return (this.db.prepare('SELECT * FROM sources ORDER BY created_at DESC, id DESC').all() as Row[]).map(toSource)
  }

  add(input: SourceInput): Source {
    const url = normalizeUrl(input.url)
    if (!isWebUrl(url)) throw new ValidationError(mainT().errors.sources.urlInvalid)
    const folder = folderOf(input.host, input.project)
    if (this.findId(folder.host, folder.project, url) !== null) throw new ValidationError(mainT().errors.sources.duplicate)
    const info = this.db
      .prepare(`INSERT INTO sources (url, title, note, host, project, origin, created_at) VALUES (?, ?, ?, ?, ?, 'user', ?)`)
      .run(url, input.title.trim() || titleFromUrl(url), input.note.trim(), folder.host, folder.project, this.now())
    return this.get(Number(info.lastInsertRowid))
  }

  /** Legt eine KI-Quelle ab; `null`, wenn die Adresse unbrauchbar ist oder im Ordner schon steht. */
  addAuto(input: AutoSourceInput): Source | null {
    if (!isSourceUrl(input.url)) return null
    const folder = folderOf(input.host, input.project)
    const info = this.db
      .prepare(`INSERT OR IGNORE INTO sources (url, title, note, host, project, origin, session_id, created_at) VALUES (?, ?, ?, ?, ?, 'ai', ?, ?)`)
      .run(input.url, titleFromUrl(input.url), input.note, folder.host, folder.project, input.sessionId, input.createdAt)
    return info.changes ? this.get(Number(info.lastInsertRowid)) : null
  }

  update(id: number, patch: SourcePatch): Source {
    const current = this.get(id)
    const folder = patch.project === undefined ? current : folderOf(patch.host ?? null, patch.project)
    const clash = this.findId(folder.host, folder.project, current.url)
    if (clash !== null && clash !== id) throw new ValidationError(mainT().errors.sources.targetDuplicate)
    this.db
      .prepare('UPDATE sources SET title = ?, note = ?, host = ?, project = ?, origin = ?, starred = ? WHERE id = ?')
      .run(
        patch.title?.trim() || current.title,
        patch.note === undefined ? current.note : patch.note.trim(),
        folder.host,
        folder.project,
        patch.origin ?? current.origin,
        (patch.starred ?? current.starred) ? 1 : 0,
        id
      )
    return this.get(id)
  }

  remove(id: number): void {
    this.get(id)
    this.db.prepare('DELETE FROM sources WHERE id = ?').run(id)
  }

  get(id: number): Source {
    const row = this.db.prepare('SELECT * FROM sources WHERE id = ?').get(id) as Row | undefined
    if (!row) throw new NotFoundError(mainT().errors.what.source(id))
    return toSource(row)
  }

  private findId(host: HostId | null, project: string | null, url: string): number | null {
    const row = this.db
      .prepare(`SELECT id FROM sources WHERE coalesce(host, '') = coalesce(?, '') AND coalesce(project, '') = coalesce(?, '') AND url = ?`)
      .get(host, project, url) as { id: number } | undefined
    return row?.id ?? null
  }
}
