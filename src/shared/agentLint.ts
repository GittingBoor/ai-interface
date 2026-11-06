import { AGENT_NAME_PATTERN, isProactive, KNOWN_TOOL_NAMES, type AgentDefinition, type AgentsText, type LintFinding } from './agents'

const DESCRIPTION_MIN = 40
const DESCRIPTION_MAX = 600
const PROMPT_MIN = 120
const PROMPT_LONG = 12_000
const MANY_TOOLS = 8
/** Signalwörter, an denen Claude erkennt, wann der Agent passt. */
const TRIGGER_PATTERN = /\b(use when|use proactively|use for|use after|use before|wenn|sobald|nach|bevor|für)\b/i
const OUTPUT_PATTERN = /(^|\n)#+\s*(ausgabe|output|ergebnis|antwort|format|report|sortie|résultat|salida|resultado|uscita|risultato|输出|出力)|\b(antworte|gib .* zurück|liefere|return|report back|output format)\b/i
const LIMITS_PATTERN = /(^|\n)#+\s*(grenzen|regeln|verboten|constraints|rules|limits|never|limites|règles|límites|reglas|limiti|regole|限制|约束|制約|ルール)|\b(niemals|nie |never|do not|don't|keine?n? )\b/i
const WRITE_TOOLS = ['Edit', 'Write', 'NotebookEdit', 'Bash', 'PowerShell']
const REVIEW_WORDS = /\b(prüf|review|audit|analys|untersuch|find|such)/i
/** Freie Tool-Namen, die keine eingebauten sind, aber gültig sein können (MCP, Muster). */
const EXTERNAL_TOOL = /^mcp__|\(/

/** Regelbasierter Check einer Agent-Definition; die Reihenfolge entspricht der Wichtigkeit. */
export function lintAgent(d: AgentDefinition, t: AgentsText['lint']): LintFinding[] {
  const findings: LintFinding[] = []
  const add = (level: LintFinding['level'], field: LintFinding['field'], message: string): void => void findings.push({ level, field, message })
  const description = d.description.trim()
  const prompt = d.prompt.trim()

  if (!d.name) add('error', 'name', t.nameMissing)
  else if (!AGENT_NAME_PATTERN.test(d.name)) add('error', 'name', t.nameFormat)
  if (!description) add('error', 'description', t.descriptionMissing)
  else if (description.length < DESCRIPTION_MIN) add('warn', 'description', t.descriptionShort)
  else if (description.length > DESCRIPTION_MAX) add('warn', 'description', t.descriptionLong)
  if (description && !TRIGGER_PATTERN.test(description)) add('warn', 'description', t.noTrigger)
  if (description && !isProactive(description)) add('tip', 'description', t.notProactive)

  if (!prompt) add('error', 'prompt', t.promptMissing)
  else if (prompt.length < PROMPT_MIN) add('warn', 'prompt', t.promptShort)
  else if (prompt.length > PROMPT_LONG) add('tip', 'prompt', t.promptLong)
  if (prompt && !OUTPUT_PATTERN.test(prompt)) add('warn', 'prompt', t.noOutput)
  if (prompt && !LIMITS_PATTERN.test(prompt)) add('tip', 'prompt', t.noLimits)

  if (!d.tools.length) add('tip', 'tools', t.inheritsAllTools)
  else if (d.tools.length > MANY_TOOLS) add('tip', 'tools', t.manyTools)
  const unknown = d.tools.filter((tool) => !KNOWN_TOOL_NAMES.has(tool) && !EXTERNAL_TOOL.test(tool))
  if (unknown.length) add('warn', 'tools', t.unknownTools(unknown.join(', ')))
  const writes = d.tools.length === 0 || d.tools.some((tool) => WRITE_TOOLS.includes(tool))
  if (writes && REVIEW_WORDS.test(description) && d.permissionMode !== 'plan') add('tip', 'tools', t.reviewWrites)
  if (d.permissionMode === 'bypassPermissions') add('warn', 'permissionMode', t.bypass)
  if (d.model === 'opus' || d.model === 'fable') {
    if (d.tools.length > 0 && d.tools.every((tool) => ['Read', 'Grep', 'Glob'].includes(tool))) add('tip', 'model', t.haikuTip)
  }
  if (d.skills.length > 3) add('tip', 'skills', t.manySkills)
  return findings
}

/** 0–100 für die Anzeige: Fehler kosten viel, Warnungen etwas, Tipps wenig. */
export function lintScore(findings: readonly LintFinding[]): number {
  const cost = findings.reduce((sum, f) => sum + (f.level === 'error' ? 30 : f.level === 'warn' ? 12 : 4), 0)
  return Math.max(0, 100 - cost)
}
