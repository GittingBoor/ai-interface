import type Database from 'better-sqlite3'
import type { HostId } from '@shared/types'

/** Tabellen mit Lesepositionen je Session-Datei (eine je Scanner). */
export type OffsetTable = 'image_offsets' | 'run_offsets'

/** Leseposition je Session-Datei, unabhängig vom Verbrauchssammler. */
export class ScanOffsets {
  constructor(
    private readonly db: Database.Database,
    private readonly table: OffsetTable
  ) {}

  get(host: HostId, path: string): number | null {
    const row = this.db.prepare(`SELECT offset FROM ${this.table} WHERE host = ? AND path = ?`).get(host, path) as { offset: number } | undefined
    return row?.offset ?? null
  }

  set(host: HostId, path: string, offset: number): void {
    this.db
      .prepare(`INSERT INTO ${this.table} (host, path, offset) VALUES (?, ?, ?) ON CONFLICT(host, path) DO UPDATE SET offset = excluded.offset`)
      .run(host, path, offset)
  }
}
