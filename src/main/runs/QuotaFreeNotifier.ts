import type { QuotaState } from '@shared/types'

export interface QuotaFreeDeps {
  openRuns(): number
  enabled(): boolean
  show(title: string, body: string): void
}

/** Meldet einmal je Fenster, wenn das 5-Stunden-Kontingent zurückgesetzt wurde und Durchläufe warten. */
export class QuotaFreeNotifier {
  private lastReset: number | null = null

  constructor(private readonly deps: QuotaFreeDeps) {}

  update(state: QuotaState): void {
    if (state.status !== 'ok') return
    const reset = state.windows.find((w) => w.kind === 'five_hour')?.resetsAt ?? null
    if (reset === null) return
    const rolledOver = this.lastReset !== null && reset > this.lastReset
    this.lastReset = reset
    if (!rolledOver || !this.deps.enabled()) return
    const open = this.deps.openRuns()
    if (open === 0) return
    const body = open === 1 ? '1 Durchlauf wartet auf Fortsetzung.' : `${open} Durchläufe warten auf Fortsetzung.`
    this.deps.show('Kontingent wieder frei', body)
  }
}
