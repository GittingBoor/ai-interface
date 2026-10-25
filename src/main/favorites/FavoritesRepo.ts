import type Database from 'better-sqlite3'
import type { Favorite, FavoriteInput, FavoritePatch } from '@shared/types'
import { NotFoundError, ValidationError } from '../errors'
import { assertColor, assertIcon } from './validation'

interface FavoriteRow {
  readonly id: number
  readonly host: Favorite['host']
  readonly path: string
  readonly name: string
  readonly color: string
  readonly sort_order: number
  readonly created_at: number
  readonly category_id: number | null
  readonly starred: number
  readonly icon: string | null
}

const toFavorite = (r: FavoriteRow): Favorite => ({
  id: r.id,
  host: r.host,
  path: r.path,
  name: r.name,
  color: r.color,
  sortOrder: r.sort_order,
  createdAt: r.created_at,
  categoryId: r.category_id,
  starred: r.starred !== 0,
  icon: r.icon
})

/** Projekte (Tabelle `favorites`; der Name bleibt wegen externer Skripte). */
export class FavoritesRepo {
  constructor(private readonly db: Database.Database) {}

  list(): Favorite[] {
    return (this.db.prepare('SELECT * FROM favorites ORDER BY sort_order, id').all() as FavoriteRow[]).map(toFavorite)
  }

  add(input: FavoriteInput): Favorite {
    if (!input.path.trim() || !input.name.trim()) throw new ValidationError('Name und Pfad dürfen nicht leer sein.')
    assertColor(input.color)
    assertIcon(input.icon ?? null)
    const exists = this.db.prepare('SELECT 1 FROM favorites WHERE host = ? AND path = ?').get(input.host, input.path)
    if (exists) throw new ValidationError(`Der Ordner ${input.path} ist bereits ein Projekt.`)
    const next = (this.db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM favorites').get() as { n: number }).n
    const info = this.db
      .prepare(
        'INSERT INTO favorites (host, path, name, color, sort_order, created_at, category_id, starred, icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(input.host, input.path, input.name.trim(), input.color, next, Date.now(), input.categoryId ?? null, input.starred === false ? 0 : 1, input.icon ?? null)
    return this.get(Number(info.lastInsertRowid))
  }

  update(id: number, patch: FavoritePatch): Favorite {
    const current = this.get(id)
    const color = patch.color ?? current.color
    const icon = patch.icon === undefined ? current.icon : patch.icon
    if (patch.color !== undefined) assertColor(color)
    if (patch.icon !== undefined) assertIcon(icon)
    this.db
      .prepare('UPDATE favorites SET name = ?, color = ?, category_id = ?, starred = ?, icon = ? WHERE id = ?')
      .run(
        patch.name?.trim() || current.name,
        color,
        patch.categoryId === undefined ? current.categoryId : patch.categoryId,
        (patch.starred ?? current.starred) ? 1 : 0,
        icon,
        id
      )
    return this.get(id)
  }

  remove(id: number): void {
    this.db.prepare('DELETE FROM favorites WHERE id = ?').run(id)
  }

  reorder(ids: readonly number[]): void {
    const stmt = this.db.prepare('UPDATE favorites SET sort_order = ? WHERE id = ?')
    this.db.transaction(() => ids.forEach((id, index) => stmt.run(index, id)))()
  }

  private get(id: number): Favorite {
    const row = this.db.prepare('SELECT * FROM favorites WHERE id = ?').get(id) as FavoriteRow | undefined
    if (!row) throw new NotFoundError(`Projekt ${id}`)
    return toFavorite(row)
  }
}
