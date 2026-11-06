import type { Messages } from './i18n/messages'
import type { HostId } from './types'

/** Wörterbuchbereich für Texte rund um Agents. */
export type AgentsText = Messages['agents']

/** Farben, die Claude Code für Agents kennt (nur Anzeige). */
export const AGENT_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'] as const
export type AgentColor = (typeof AGENT_COLORS)[number]

/** Anzeigefarbe je Agent-Farbe (gedämpft, auf dunklem und hellem Grund lesbar). */
export const AGENT_COLOR_HEX: Readonly<Record<AgentColor, string>> = {
  red: '#d9706b',
  blue: '#6b9bd9',
  green: '#6fb37a',
  yellow: '#d9b35a',
  purple: '#a98ad8',
  orange: '#e08a4f',
  pink: '#d98ab4',
  cyan: '#5fb3c8'
}

export const AGENT_PERMISSION_MODES = ['default', 'acceptEdits', 'auto', 'dontAsk', 'plan', 'bypassPermissions'] as const
export type AgentPermissionMode = (typeof AGENT_PERMISSION_MODES)[number]

export const AGENT_EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const
export type AgentEffort = (typeof AGENT_EFFORTS)[number]

export const AGENT_MEMORIES = ['user', 'project', 'local'] as const
export type AgentMemory = (typeof AGENT_MEMORIES)[number]

/** Kurznamen, die Claude Code als Modell akzeptiert; daneben sind volle Modell-IDs erlaubt. */
export const AGENT_MODEL_ALIASES = ['inherit', 'haiku', 'sonnet', 'opus', 'fable'] as const

/** Alles, was eine Agent-Datei beschreibt. Leere Werte = Feld fehlt in der Datei (Claude nimmt den Standard). */
export interface AgentDefinition {
  readonly name: string
  readonly description: string
  /** Leer = der Agent erbt alle Tools. */
  readonly tools: readonly string[]
  readonly disallowedTools: readonly string[]
  readonly model: string | null
  readonly effort: AgentEffort | null
  readonly permissionMode: AgentPermissionMode | null
  readonly maxTurns: number | null
  readonly skills: readonly string[]
  readonly memory: AgentMemory | null
  readonly isolation: 'worktree' | null
  readonly background: boolean
  readonly color: AgentColor | null
  readonly initialPrompt: string
  /** Inhalt unter dem Frontmatter: die Anweisungen (System-Prompt). */
  readonly prompt: string
}

export const EMPTY_AGENT: AgentDefinition = {
  name: '',
  description: '',
  tools: [],
  disallowedTools: [],
  model: null,
  effort: null,
  permissionMode: null,
  maxTurns: null,
  skills: [],
  memory: null,
  isolation: null,
  background: false,
  color: null,
  initialPrompt: '',
  prompt: ''
}

/** Gelesene Agent-Datei. */
export interface AgentDocument {
  readonly host: HostId
  readonly path: string
  readonly definition: AgentDefinition
  /** Frontmatter-Schlüssel, die der Builder nicht kennt und unverändert übernimmt (z. B. `hooks`). */
  readonly preservedKeys: readonly string[]
  /** Plugin-Agents gehören dem Plugin und werden beim nächsten Update überschrieben. */
  readonly readOnly: boolean
  readonly content: string
}

export type AgentScope = 'user' | 'project'

export interface AgentSaveInput {
  readonly host: HostId
  readonly scope: AgentScope
  /** Projektordner bei `scope = project`. */
  readonly projectPath: string | null
  readonly definition: AgentDefinition
  /** Bisherige Datei beim Bearbeiten (wird bei neuem Namen/Ort entfernt), sonst `null`. */
  readonly previousPath: string | null
}

export interface AgentSaveResult {
  readonly host: HostId
  readonly path: string
}

export type AgentAssistMode = 'create' | 'improve'

export interface AgentAssistRequest {
  readonly mode: AgentAssistMode
  /** Beschreibung in eigenen Worten (create) bzw. Wunsch zur Verbesserung (improve, darf leer sein). */
  readonly idea: string
  readonly current: AgentDefinition | null
  /** Skills, die der Agent vorladen könnte (Namen aus dem Katalog). */
  readonly availableSkills: readonly string[]
}

export interface AgentAssistResult {
  readonly definition: AgentDefinition
  /** Kurze Begründungen der KI, was sie wie gewählt hat. */
  readonly notes: readonly string[]
}

export type LintLevel = 'error' | 'warn' | 'tip'

export interface LintFinding {
  readonly level: LintLevel
  /** Feld, auf das sich der Hinweis bezieht. */
  readonly field: keyof AgentDefinition | 'file'
  readonly message: string
}

export interface ToolInfo {
  readonly name: string
  readonly label: string
  readonly explain: string
  readonly risk: 'read' | 'write' | 'exec' | 'web' | 'meta'
}

export interface ToolGroup {
  readonly id: string
  readonly label: string
  readonly tools: readonly ToolInfo[]
}

/** Eingebaute Tools von Claude Code; Namen und Risiko sind fest, Beschriftung und Erklärung kommen aus dem Wörterbuch. */
const TOOL_STRUCTURE = [
  { id: 'read', tools: [{ name: 'Read', risk: 'read' }, { name: 'Grep', risk: 'read' }, { name: 'Glob', risk: 'read' }] },
  { id: 'write', tools: [{ name: 'Edit', risk: 'write' }, { name: 'Write', risk: 'write' }, { name: 'NotebookEdit', risk: 'write' }] },
  { id: 'exec', tools: [{ name: 'Bash', risk: 'exec' }, { name: 'PowerShell', risk: 'exec' }] },
  { id: 'web', tools: [{ name: 'WebSearch', risk: 'web' }, { name: 'WebFetch', risk: 'web' }] },
  { id: 'meta', tools: [{ name: 'Agent', risk: 'meta' }, { name: 'Skill', risk: 'meta' }, { name: 'TodoWrite', risk: 'meta' }] }
] as const

type ToolGroupId = (typeof TOOL_STRUCTURE)[number]['id']
type ToolName = (typeof TOOL_STRUCTURE)[number]['tools'][number]['name']

export const KNOWN_TOOL_NAMES: ReadonlySet<string> = new Set(TOOL_STRUCTURE.flatMap((g) => g.tools.map((t) => t.name)))

/** Eingebaute Tools mit Erklärung für Menschen. */
export function toolGroups(t: AgentsText): ToolGroup[] {
  return TOOL_STRUCTURE.map((g) => ({
    id: g.id,
    label: t.toolGroups[g.id as ToolGroupId],
    tools: g.tools.map((tool) => ({ name: tool.name, risk: tool.risk, ...t.tools[tool.name as ToolName] }))
  }))
}

export function toolInfo(name: string, t: AgentsText): ToolInfo | undefined {
  return toolGroups(t).flatMap((g) => g.tools).find((tool) => tool.name === name)
}

/** Schnellauswahl im Builder. Leere Liste = alle Tools erben. */
const TOOL_PRESET_TOOLS = {
  read: ['Read', 'Grep', 'Glob'],
  edit: ['Read', 'Grep', 'Glob', 'Edit', 'Write'],
  dev: ['Read', 'Grep', 'Glob', 'Edit', 'Write', 'Bash'],
  web: ['WebSearch', 'WebFetch', 'Read', 'Write'],
  all: []
} as const satisfies Record<string, readonly string[]>

export interface ToolPreset {
  readonly id: string
  readonly label: string
  readonly explain: string
  readonly tools: readonly string[]
}

export function toolPresets(t: AgentsText): ToolPreset[] {
  return (Object.keys(TOOL_PRESET_TOOLS) as (keyof typeof TOOL_PRESET_TOOLS)[]).map((id) => ({ id, ...t.presets[id], tools: TOOL_PRESET_TOOLS[id] }))
}

export interface OptionInfo<T extends string> {
  readonly value: T
  readonly label: string
  readonly explain: string
}

const MODEL_VALUES = AGENT_MODEL_ALIASES

export const modelOptions = (t: AgentsText): readonly OptionInfo<string>[] => MODEL_VALUES.map((value) => ({ value, ...t.options.model[value] }))
export const effortOptions = (t: AgentsText): readonly OptionInfo<AgentEffort>[] => AGENT_EFFORTS.map((value) => ({ value, ...t.options.effort[value] }))
export const permissionOptions = (t: AgentsText): readonly OptionInfo<AgentPermissionMode>[] => AGENT_PERMISSION_MODES.map((value) => ({ value, ...t.options.permission[value] }))
export const memoryOptions = (t: AgentsText): readonly OptionInfo<AgentMemory>[] => AGENT_MEMORIES.map((value) => ({ value, ...t.options.memory[value] }))

/** Wortlaut, mit dem Claude einen Agent auch ungefragt einsetzt. */
export const PROACTIVE_PATTERN = /\b(use proactively|proactively|immer einsetzen|von selbst|automatisch einsetzen|must be used)\b/i

/** Gültiger Agent-Name: Kleinbuchstaben, Ziffern, Bindestriche. */
export const AGENT_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/

/** Name aus freiem Text: `Code Prüfer` → `code-pruefer`. */
export function agentSlug(text: string): string {
  return text
    .toLowerCase()
    .replaceAll('ä', 'ae') // i18n-ignore: Umschrift für Dateinamen
    .replaceAll('ö', 'oe') // i18n-ignore: Umschrift für Dateinamen
    .replaceAll('ü', 'ue') // i18n-ignore: Umschrift für Dateinamen
    .replaceAll('ß', 'ss') // i18n-ignore: Umschrift für Dateinamen
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

/** Ob Claude den Agent von sich aus einsetzt oder nur, wenn man ihn nennt. */
export const isProactive = (description: string): boolean => PROACTIVE_PATTERN.test(description)

export interface AgentTemplate {
  readonly id: string
  readonly label: string
  readonly explain: string
  readonly definition: AgentDefinition
}

/** Feste Teile der Vorlagen; Beschreibung und Anweisungen kommen in der App-Sprache aus dem Wörterbuch. */
const TEMPLATE_BASE = {
  reviewer: { name: 'code-reviewer', tools: ['Read', 'Grep', 'Glob', 'Bash'], model: 'sonnet', effort: 'high', permissionMode: 'plan', color: 'red' },
  researcher: { name: 'code-explorer', tools: ['Read', 'Grep', 'Glob'], model: 'haiku', color: 'cyan' },
  tester: { name: 'test-writer', tools: ['Read', 'Grep', 'Glob', 'Edit', 'Write', 'Bash'], model: 'sonnet', permissionMode: 'acceptEdits', color: 'green' },
  web: { name: 'web-researcher', tools: ['WebSearch', 'WebFetch'], model: 'sonnet', color: 'blue' },
  docs: { name: 'docs-writer', tools: ['Read', 'Grep', 'Glob', 'Edit', 'Write'], model: 'sonnet', permissionMode: 'acceptEdits', color: 'yellow' }
} as const satisfies Record<string, Partial<AgentDefinition>>

/** Vorlagen im Builder: kleine, gut geschnittene Agents als Startpunkt. */
export function agentTemplates(t: AgentsText): AgentTemplate[] {
  return (Object.keys(TEMPLATE_BASE) as (keyof typeof TEMPLATE_BASE)[]).map((id) => {
    const text = t.templates[id]
    const base: Partial<AgentDefinition> = TEMPLATE_BASE[id]
    return { id, label: text.label, explain: text.explain, definition: { ...EMPTY_AGENT, ...base, description: text.description, prompt: text.prompt } }
  })
}
