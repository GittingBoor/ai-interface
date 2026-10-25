import type { TerminalStatus, TerminalStatusChange } from '@shared/types'

/** So lange nach dem letzten Tastendruck im Orchestrator wird nichts hineingeschrieben. */
export const QUIET_MS = 5_000
const PREFIX = '[AI Interface]'
const DETAILS = 'read_terminal für Details.'
const READY: readonly TerminalStatus[] = ['idle', 'review']
const SUBMIT = '\r'

const WORDS: Partial<Readonly<Record<TerminalStatus, string>>> = {
  review: 'fertig',
  question: 'hat eine Frage',
  permission: 'wartet auf Erlaubnis',
  exited: 'beendet'
}

export interface RelayDeps {
  orchestratorId(): string | null
  status(id: string): TerminalStatus | undefined
  /** „<Titel> (<Gerät>, Terminal <id>)“ oder `null`, wenn verborgen oder geschlossen. */
  describe(id: string): string | null
  deliver(text: string): Promise<void>
  now(): number
}

/** Meldet dem Orchestrator, wenn ein von ihm beauftragtes Terminal fertig ist, fragt oder endet. */
export class OrchestratorRelay {
  private readonly watched = new Set<string>()
  /** Je Terminal nur der letzte Stand (Wort), in Reihenfolge des ersten Auftretens; Text erst bei Zustellung. */
  private readonly pending = new Map<string, string>()
  private lastInputAt = Number.NEGATIVE_INFINITY
  /** Im Orchestrator steht getippter, noch nicht abgeschickter Text. */
  private draft = false
  private delivering = false

  constructor(private readonly deps: RelayDeps) {}

  watch(id: string): void {
    this.watched.add(id)
  }

  unwatch(id: string): void {
    this.watched.delete(id)
    this.pending.delete(id)
  }

  /** Tastatureingabe im Orchestrator; endet sie nicht mit Enter, gilt der Text als Entwurf. */
  noteInput(data: string): void {
    this.lastInputAt = this.deps.now()
    this.draft = !data.endsWith(SUBMIT)
  }

  onStatus(change: TerminalStatusChange): void {
    if (change.id === this.deps.orchestratorId() && change.status === 'working') this.draft = false
    const word = WORDS[change.status]
    if (!word || !this.watched.has(change.id)) return
    this.pending.set(change.id, word)
    if (change.status === 'exited') this.watched.delete(change.id)
  }

  async tick(): Promise<void> {
    if (!this.pending.size || this.delivering) return
    const orchestrator = this.deps.orchestratorId()
    if (!orchestrator) return this.pending.clear()
    if (!READY.includes(this.deps.status(orchestrator) ?? 'exited')) return
    if (this.draft || this.deps.now() - this.lastInputAt < QUIET_MS) return
    // Privatmodus erst jetzt prüfen; verborgene Zeilen bleiben bis zum Entsperren liegen.
    const lines: string[] = []
    for (const [id, word] of this.pending) {
      const label = this.deps.describe(id)
      if (!label) continue
      lines.push(`${label}: ${word}.`)
      this.pending.delete(id)
    }
    if (!lines.length) return
    this.delivering = true
    try {
      await this.deps.deliver(this.message(lines))
    } finally {
      this.delivering = false
    }
  }

  private message(lines: readonly string[]): string {
    if (lines.length === 1) return `${PREFIX} ${lines[0]} ${DETAILS}`
    return `${PREFIX} ${lines.length} Meldungen:\n${lines.map((l) => `- ${l}`).join('\n')}\n${DETAILS}`
  }
}
