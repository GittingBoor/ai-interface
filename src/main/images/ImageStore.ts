import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import type { HostId, ImageInput, ImageMeta, ImageSource } from '@shared/types'
import { NotFoundError, ValidationError } from '../errors'

export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] as const

interface Row {
  readonly id: number
  readonly file_name: string
  readonly title: string
  readonly project: string | null
  readonly tags: string
  readonly bytes: number
  readonly created_at: number
  readonly host: HostId | null
  readonly source: ImageSource
  readonly session_id: string | null
}

/** Bild aus einer Claude-Session (siehe `SessionImageScanner`). */
export interface AutoImageInput {
  readonly data: Buffer
  readonly extension: string
  readonly title: string
  readonly project: string
  readonly host: HostId
  readonly source: Exclude<ImageSource, 'manual'>
  readonly sessionId: string
  readonly createdAt: number
}

const toMeta = (r: Row): ImageMeta => ({
  id: r.id,
  fileName: r.file_name,
  title: r.title,
  project: r.project,
  tags: JSON.parse(r.tags) as string[],
  bytes: r.bytes,
  createdAt: r.created_at,
  host: r.host,
  source: r.source,
  sessionId: r.session_id
})

/** Bilder als Dateien im App-Datenordner, Metadaten in SQLite. */
export class ImageStore {
  constructor(
    private readonly db: Database.Database,
    private readonly dir: string
  ) {
    mkdirSync(dir, { recursive: true })
  }

  add(data: Uint8Array, input: ImageInput): ImageMeta {
    const extension = input.extension.toLowerCase().replace(/^\./, '')
    if (!(IMAGE_EXTENSIONS as readonly string[]).includes(extension)) {
      throw new ValidationError(`Dateityp .${extension} wird nicht unterstützt (erlaubt: ${IMAGE_EXTENSIONS.join(', ')}).`)
    }
    const fileName = `${randomUUID()}.${extension}`
    writeFileSync(join(this.dir, fileName), data)
    const info = this.db
      .prepare('INSERT INTO images (file_name, title, project, tags, bytes, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(fileName, input.title.trim() || 'Ohne Titel', input.project, JSON.stringify(input.tags), data.byteLength, Date.now())
    return this.get(Number(info.lastInsertRowid))
  }

  /** Legt ein Session-Bild ab; `null`, wenn derselbe Inhalt schon existiert. */
  addAuto(input: AutoImageInput): ImageMeta | null {
    const hash = createHash('sha256').update(input.data).digest('hex')
    if (this.db.prepare('SELECT 1 FROM images WHERE content_hash = ?').get(hash)) return null
    const fileName = `${randomUUID()}.${input.extension}`
    writeFileSync(join(this.dir, fileName), input.data)
    const info = this.db
      .prepare(
        `INSERT INTO images (file_name, title, project, tags, bytes, created_at, host, source, session_id, content_hash)
         VALUES (?, ?, ?, '[]', ?, ?, ?, ?, ?, ?)`
      )
      .run(fileName, input.title, input.project, input.data.byteLength, input.createdAt, input.host, input.source, input.sessionId, hash)
    return this.get(Number(info.lastInsertRowid))
  }

  list(project?: string): ImageMeta[] {
    const rows =
      project === undefined
        ? this.db.prepare('SELECT * FROM images ORDER BY created_at DESC, id DESC').all()
        : this.db.prepare('SELECT * FROM images WHERE project = ? ORDER BY created_at DESC, id DESC').all(project)
    return (rows as Row[]).map(toMeta)
  }

  update(id: number, patch: Partial<Pick<ImageMeta, 'title' | 'project' | 'tags'>>): ImageMeta {
    const current = this.get(id)
    this.db
      .prepare('UPDATE images SET title = ?, project = ?, tags = ? WHERE id = ?')
      .run(patch.title ?? current.title, patch.project === undefined ? current.project : patch.project, JSON.stringify(patch.tags ?? current.tags), id)
    return this.get(id)
  }

  remove(id: number): void {
    const meta = this.get(id)
    rmSync(join(this.dir, meta.fileName), { force: true })
    this.db.prepare('DELETE FROM images WHERE id = ?').run(id)
  }

  filePath(id: number): string {
    return join(this.dir, this.get(id).fileName)
  }

  get(id: number): ImageMeta {
    const row = this.db.prepare('SELECT * FROM images WHERE id = ?').get(id) as Row | undefined
    if (!row) throw new NotFoundError(`Bild ${id}`)
    return toMeta(row)
  }
}
