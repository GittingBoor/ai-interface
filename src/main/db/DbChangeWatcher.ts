import type Database from 'better-sqlite3'

/** Erkennt Commits anderer Verbindungen (z. B. Skripte) über `PRAGMA data_version`. */
export class DbChangeWatcher {
  private version: number
  private timer: NodeJS.Timeout | null = null

  constructor(
    private readonly db: Database.Database,
    private readonly onChange: () => void
  ) {
    this.version = this.read()
  }

  check(): boolean {
    const current = this.read()
    if (current === this.version) return false
    this.version = current
    this.onChange()
    return true
  }

  start(intervalMs: number): void {
    this.stop()
    this.timer = setInterval(() => this.check(), intervalMs)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  private read(): number {
    return this.db.pragma('data_version', { simple: true }) as number
  }
}
