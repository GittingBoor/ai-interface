import { mainT } from '../i18n'
import type { QuotaState, QuotaWindow, QuotaWindowKind } from '@shared/types'
import { QuotaFormatError } from '../errors'

/** Derselbe Endpunkt, den `/usage` in Claude Code nutzt (nicht offiziell dokumentiert). */
export const QUOTA_URL = 'https://api.anthropic.com/api/oauth/usage'
const QUOTA_BETA = 'oauth-2025-04-20'
const POLL_MS = 10 * 60_000
const MIN_GAP_MS = 60_000
const MAX_BACKOFF_MS = 30 * 60_000
const REQUEST_TIMEOUT_MS = 10_000
const HTTP_UNAUTHORIZED = 401
const HTTP_TOO_MANY = 429

const WINDOW_KINDS: readonly QuotaWindowKind[] = ['five_hour', 'seven_day', 'seven_day_opus', 'seven_day_sonnet']
const REQUIRED: readonly QuotaWindowKind[] = ['five_hour', 'seven_day']


type ProblemState = Extract<QuotaState, { status: 'expired' | 'unavailable' }>
type Problem = Omit<ProblemState, 'fetchedAt'>

interface RawWindow {
  readonly utilization?: unknown
  readonly resets_at?: unknown
}

/** Liest die Fenster aus der Antwort; fehlt ein Pflichtfenster, gibt es keine Werte (kein Raten). */
export function parseQuota(json: unknown): QuotaWindow[] {
  if (typeof json !== 'object' || json === null) throw new QuotaFormatError(mainT().errors.quota.notObject)
  const record = json as Record<string, RawWindow | null | undefined>
  const windows: QuotaWindow[] = []
  for (const kind of WINDOW_KINDS) {
    const raw = record[kind]
    if (raw === null || raw === undefined) {
      if (REQUIRED.includes(kind)) throw new QuotaFormatError(mainT().errors.quota.missing(kind))
      continue
    }
    if (typeof raw.utilization !== 'number') throw new QuotaFormatError(mainT().errors.quota.utilizationMissing(kind))
    const resets = typeof raw.resets_at === 'string' ? Date.parse(raw.resets_at) : Number.NaN
    windows.push({ kind, percent: raw.utilization, resetsAt: Number.isNaN(resets) ? null : resets })
  }
  return windows
}

interface OauthCredentials {
  readonly claudeAiOauth?: { readonly accessToken?: unknown; readonly expiresAt?: unknown }
}

export interface QuotaDeps {
  /** Inhalt von `~/.claude/.credentials.json` oder `null`, wenn es die Datei nicht gibt. */
  readCredentials(): Promise<string | null>
  fetch(url: string, init: { headers: Record<string, string>; signal?: AbortSignal }): Promise<Response>
  now(): number
  onUpdate(state: QuotaState): void
}

/** Fragt das Abo-Kontingent ab. Das Token wird nur gelesen, nie erneuert, gespeichert oder ausgegeben. */
export class QuotaService {
  private current: QuotaState = { status: 'loading' }
  private delayMs = POLL_MS
  private lastAttempt = Number.NEGATIVE_INFINITY
  private timer: NodeJS.Timeout | null = null
  private running = false
  private backingOff = false

  constructor(private readonly deps: QuotaDeps) {}

  state(): QuotaState {
    return this.current
  }

  nextDelayMs(): number {
    return this.delayMs
  }

  /** Fragt sofort ab (App-Start, Klick) und plant die nächste Abfrage neu. */
  async refresh(): Promise<QuotaState> {
    this.lastAttempt = this.deps.now()
    this.current = await this.fetchState()
    this.deps.onUpdate(this.current)
    if (this.running) this.schedule()
    return this.current
  }

  /** Für Fensterfokus und fertige Durchläufe: höchstens einmal pro Minute, nach 429 erst nach dem Backoff. */
  async refreshSoon(): Promise<QuotaState> {
    const gap = Math.max(MIN_GAP_MS, this.backingOff ? this.delayMs : 0)
    if (this.deps.now() - this.lastAttempt < gap) return this.current
    return this.refresh()
  }

  start(): void {
    this.running = true
    void this.refresh()
  }

  stop(): void {
    this.running = false
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  private schedule(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.refresh(), this.delayMs)
  }

  private async fetchState(): Promise<QuotaState> {
    const fetchedAt = this.deps.now()
    const token = await this.token()
    if (typeof token !== 'string') return { ...token, fetchedAt }
    let response: Response
    try {
      response = await this.deps.fetch(QUOTA_URL, {
        headers: { Authorization: `Bearer ${token}`, 'anthropic-beta': QUOTA_BETA, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      })
    } catch {
      return this.unavailable(mainT().errors.quota.noConnection, fetchedAt)
    }
    if (response.status === HTTP_TOO_MANY) {
      this.backingOff = true
      this.delayMs = Math.min(this.delayMs * 2, MAX_BACKOFF_MS)
      // Letzte gültige Werte behalten; ihr Alter zeigt die Oberfläche selbst an.
      if (this.current.status === 'ok') return this.current
      return this.unavailable(mainT().errors.quota.tooManyRequests, fetchedAt)
    }
    this.backingOff = false
    this.delayMs = POLL_MS
    if (response.status === HTTP_UNAUTHORIZED) return { status: 'expired', reason: mainT().errors.quota.loginExpired, hint: mainT().errors.quota.expiredHint, fetchedAt }
    if (!response.ok) return this.unavailable(mainT().errors.quota.requestFailed(response.status), fetchedAt)
    try {
      return { status: 'ok', windows: parseQuota(await response.json()), fetchedAt }
    } catch (error) {
      return this.unavailable(error instanceof QuotaFormatError ? error.message : mainT().errors.quota.notJson, fetchedAt)
    }
  }

  /** Das Zugriffstoken oder der Grund, warum es keins gibt. */
  private async token(): Promise<string | Problem> {
    const raw = await this.deps.readCredentials().catch(() => null)
    if (raw === null) return { status: 'unavailable', reason: mainT().errors.quota.noLogin, hint: mainT().errors.quota.unavailableHint }
    let parsed: OauthCredentials
    try {
      parsed = JSON.parse(raw) as OauthCredentials
    } catch {
      return { status: 'unavailable', reason: mainT().errors.quota.loginUnreadable, hint: mainT().errors.quota.unavailableHint }
    }
    const oauth = parsed.claudeAiOauth
    if (typeof oauth?.accessToken !== 'string') return { status: 'unavailable', reason: mainT().errors.quota.noSubscription, hint: mainT().errors.quota.unavailableHint }
    if (typeof oauth.expiresAt === 'number' && oauth.expiresAt <= this.deps.now()) {
      return { status: 'expired', reason: mainT().errors.quota.loginExpired, hint: mainT().errors.quota.expiredHint }
    }
    return oauth.accessToken
  }

  private unavailable(reason: string, fetchedAt: number): QuotaState {
    return { status: 'unavailable', reason, hint: mainT().errors.quota.unavailableHint, fetchedAt }
  }
}
