import type Database from 'better-sqlite3'
import type { CustomModel, CustomModelInput } from '@shared/types'
import { NotFoundError, ValidationError } from '../errors'

interface Row {
  readonly id: number
  readonly name: string
  readonly host: CustomModel['host']
  readonly path: string
  readonly kind: string
  readonly note: string
  readonly status: CustomModel['status']
  readonly updated_at: number
}

const toModel = ({ updated_at, ...rest }: Row): CustomModel => ({ ...rest, updatedAt: updated_at })

/** Manuell gepflegte eigene Modelle (z. B. ein eigenes Transkriptionsmodell). */
export class CustomModelRepo {
  constructor(private readonly db: Database.Database) {}

  list(): CustomModel[] {
    return (this.db.prepare('SELECT * FROM custom_models ORDER BY name').all() as Row[]).map(toModel)
  }

  upsert(input: CustomModelInput): CustomModel {
    if (!input.name.trim()) throw new ValidationError('Das Modell braucht einen Namen.')
    const values = [input.name.trim(), input.host, input.path, input.kind, input.note, input.status, Date.now()]
    if (input.id === undefined) {
      const info = this.db
        .prepare('INSERT INTO custom_models (name, host, path, kind, note, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(...values)
      return this.get(Number(info.lastInsertRowid))
    }
    this.db
      .prepare('UPDATE custom_models SET name = ?, host = ?, path = ?, kind = ?, note = ?, status = ?, updated_at = ? WHERE id = ?')
      .run(...values, input.id)
    return this.get(input.id)
  }

  remove(id: number): void {
    this.db.prepare('DELETE FROM custom_models WHERE id = ?').run(id)
  }

  private get(id: number): CustomModel {
    const row = this.db.prepare('SELECT * FROM custom_models WHERE id = ?').get(id) as Row | undefined
    if (!row) throw new NotFoundError(`Modell ${id}`)
    return toModel(row)
  }
}
