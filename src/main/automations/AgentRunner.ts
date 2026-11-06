import type { AutomationInput } from '@shared/automations'
import type { HostId } from '@shared/types'
import { AppError } from '../errors'
import { mainT } from '../i18n'
import type { Host } from '../hosts/Host'
import { shellQuote } from '../hosts/shellQuote'

const MINUTE_MS = 60_000
/** Exit-Code von coreutils `timeout`, wenn das Zeitlimit greift. */
const TIMEOUT_EXIT = 124
const MAX_ERROR_TEXT = 400
/** Auf Linux liegt der native Installer in `~/.local/bin`, das fehlt in nicht-interaktiven Shells oft im PATH. */
const REMOTE_PATH_FIX = 'export PATH="$HOME/.local/bin:$PATH"'

export interface RunOutcome {
  readonly ok: boolean
  readonly result: string
  readonly error: string | null
  readonly sessionId: string | null
  readonly costUsd: number | null
  readonly turns: number | null
}

/** Führt `claude -p` lokal aus (Prompt über stdin); wirft bei Exit-Code ≠ 0 mit der Ausgabe in der Meldung. */
export type LocalClaude = (args: readonly string[], input: string, options: { readonly timeoutMs: number; readonly cwd: string }) => Promise<string>

export interface AgentRunnerDeps {
  readonly host: (id: HostId) => Host
  readonly local: LocalClaude
}

/** Argumente für einen Lauf ohne Zuschauer. */
export function runArgs(input: Pick<AutomationInput, 'agent' | 'model' | 'permission'>): string[] {
  const args = ['--output-format', 'json', '--permission-mode', input.permission]
  if (input.agent) args.push('--agent', input.agent)
  if (input.model) args.push('--model', input.model)
  return args
}

/** Shell-Befehl für einen Lauf per SSH: Prompt base64-kodiert über stdin, Zeitlimit über `timeout`. */
export function remoteCommand(input: Pick<AutomationInput, 'agent' | 'model' | 'permission' | 'cwd' | 'prompt' | 'timeoutMinutes'>): string {
  const prompt = Buffer.from(input.prompt, 'utf8').toString('base64')
  const claude = ['claude', '-p', ...runArgs(input)].map((a, i) => (i === 0 ? a : shellQuote(a))).join(' ')
  const inner = `${REMOTE_PATH_FIX}; cd ${shellQuote(input.cwd)} && printf %s ${shellQuote(prompt)} | base64 -d | timeout ${input.timeoutMinutes * 60} ${claude}`
  return `bash -lc ${shellQuote(inner)}`
}

interface ResultJson {
  readonly type?: unknown
  readonly subtype?: unknown
  readonly is_error?: unknown
  readonly result?: unknown
  readonly session_id?: unknown
  readonly total_cost_usd?: unknown
  readonly num_turns?: unknown
}

/** Letzte JSON-Zeile der Ausgabe (`--output-format json` liefert ein Objekt, davor kann Rauschen stehen). */
function lastJson(output: string): ResultJson | null {
  const lines = output.trim().split(/\r?\n/).reverse()
  for (const line of lines) {
    const t = line.trim()
    if (!t.startsWith('{')) continue
    try {
      return JSON.parse(t) as ResultJson
    } catch {
      continue
    }
  }
  return null
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)

/** Ergebnis von `claude -p --output-format json` auswerten; ohne JSON zählt der Rohtext als Fehler. */
export function parseRunOutput(output: string, fallbackError: string | null = null): RunOutcome {
  const t = mainT().automations.run
  const json = lastJson(output)
  if (!json) {
    const raw = output.trim().slice(0, MAX_ERROR_TEXT)
    return { ok: false, result: '', error: fallbackError ?? (raw || t.noOutput), sessionId: null, costUsd: null, turns: null }
  }
  const failed = json.is_error === true || (typeof json.subtype === 'string' && json.subtype !== 'success')
  const result = str(json.result) ?? ''
  return {
    ok: !failed,
    result,
    error: failed ? (fallbackError ?? (result || t.claudeReports(String(json.subtype ?? t.errorWord)))) : null,
    sessionId: str(json.session_id),
    costUsd: num(json.total_cost_usd),
    turns: num(json.num_turns)
  }
}

/** Startet einen Agent-Lauf auf dem Zielrechner und liefert das ausgewertete Ergebnis (wirft nie, Fehler stehen im Ergebnis). */
export class AgentRunner {
  constructor(private readonly deps: AgentRunnerDeps) {}

  async run(input: AutomationInput): Promise<RunOutcome> {
    try {
      return input.host === 'local' ? await this.runLocal(input) : await this.runRemote(input)
    } catch (error) {
      const message = error instanceof AppError || error instanceof Error ? error.message : String(error)
      return parseRunOutput(message, message.slice(0, MAX_ERROR_TEXT))
    }
  }

  private async runLocal(input: AutomationInput): Promise<RunOutcome> {
    const output = await this.deps.local(runArgs(input), input.prompt, { timeoutMs: input.timeoutMinutes * MINUTE_MS, cwd: input.cwd })
    return parseRunOutput(output)
  }

  private async runRemote(input: AutomationInput): Promise<RunOutcome> {
    const { stdout, stderr, code } = await this.deps.host(input.host).exec(remoteCommand(input))
    if (code === TIMEOUT_EXIT) return parseRunOutput(stdout, mainT().automations.run.timeout(input.timeoutMinutes))
    const outcome = parseRunOutput(stdout, code === 0 ? null : (stderr.trim() || mainT().automations.run.exitCode(code)).slice(0, MAX_ERROR_TEXT))
    return outcome
  }
}
