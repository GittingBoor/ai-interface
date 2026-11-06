import {
  AGENT_COLORS,
  AGENT_EFFORTS,
  AGENT_MEMORIES,
  AGENT_PERMISSION_MODES,
  EMPTY_AGENT,
  type AgentColor,
  type AgentDefinition,
  type AgentEffort,
  type AgentMemory,
  type AgentPermissionMode
} from '@shared/agents'
import { serializeAgentFile, type PreservedBlock } from '@shared/agentFormat'
import { asList, asText, parseFrontmatter, type FrontmatterValue } from '../skills/frontmatter'

export { serializeAgentFile, type PreservedBlock }

const DELIMITER = '---'
const TOP_LEVEL_KEY = /^([A-Za-z0-9_-]+):/
/** Alter Name von `default`. */
const MANUAL_MODE = 'manual'


export interface ParsedAgentFile {
  readonly definition: AgentDefinition
  readonly preservedKeys: readonly string[]
  readonly preserved: readonly PreservedBlock[]
}

type Reader = (value: FrontmatterValue) => Partial<AgentDefinition> | null

const oneOf =
  <T extends string>(allowed: readonly T[], field: keyof AgentDefinition, alias: Readonly<Record<string, T>> = {}): Reader =>
  (value) => {
    const text = asText(value)
    const resolved = alias[text] ?? text
    return (allowed as readonly string[]).includes(resolved) ? { [field]: resolved as T } : null
  }

const positiveInt = (value: FrontmatterValue): Partial<AgentDefinition> | null => {
  const n = Number(asText(value))
  return Number.isInteger(n) && n > 0 ? { maxTurns: n } : null
}

const bool = (value: FrontmatterValue): Partial<AgentDefinition> | null => {
  const text = asText(value).toLowerCase()
  if (text === 'true') return { background: true }
  if (text === 'false') return { background: false }
  return null
}

/** Schlüssel, die der Builder versteht. Unpassende Werte bleiben als Rohtext erhalten statt verloren zu gehen. */
const READERS: Readonly<Record<string, Reader>> = {
  name: (v) => ({ name: asText(v) }),
  description: (v) => ({ description: asText(v) }),
  tools: (v) => ({ tools: asList(v) }),
  disallowedTools: (v) => ({ disallowedTools: asList(v) }),
  model: (v) => (asText(v) ? { model: asText(v) } : null),
  effort: oneOf<AgentEffort>(AGENT_EFFORTS, 'effort'),
  permissionMode: oneOf<AgentPermissionMode>(AGENT_PERMISSION_MODES, 'permissionMode', { [MANUAL_MODE]: 'default' }),
  maxTurns: positiveInt,
  skills: (v) => ({ skills: asList(v) }),
  memory: oneOf<AgentMemory>(AGENT_MEMORIES, 'memory'),
  isolation: (v) => (asText(v) === 'worktree' ? { isolation: 'worktree' } : null),
  background: bool,
  color: oneOf<AgentColor>(AGENT_COLORS, 'color'),
  initialPrompt: (v) => ({ initialPrompt: asText(v) })
}

/** Zerlegt das Frontmatter in Blöcke je oberstem Schlüssel (Rohtext, für verlustfreies Zurückschreiben). */
function frontmatterBlocks(text: string): PreservedBlock[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  if (lines[0]?.trim() !== DELIMITER) return []
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === DELIMITER)
  if (end === -1) return []
  const blocks: { key: string; lines: string[] }[] = []
  for (const line of lines.slice(1, end)) {
    const key = TOP_LEVEL_KEY.exec(line)?.[1]
    if (key) blocks.push({ key, lines: [line] })
    else blocks[blocks.length - 1]?.lines.push(line)
  }
  return blocks.map((b) => ({ key: b.key, text: b.lines.join('\n').replace(/\n+$/, '') }))
}

/** Liest eine Agent-Datei. Was der Builder nicht abbilden kann, landet in `preserved`. */
export function parseAgentFile(content: string): ParsedAgentFile {
  const { data, body } = parseFrontmatter(content)
  let definition: AgentDefinition = { ...EMPTY_AGENT, prompt: body.trim() }
  const keep = new Set<string>()
  for (const [key, value] of Object.entries(data)) {
    const read = READERS[key]
    const patch = read ? read(value) : null
    if (patch) definition = { ...definition, ...patch }
    else keep.add(key)
  }
  const preserved = frontmatterBlocks(content).filter((b) => keep.has(b.key))
  return { definition, preservedKeys: preserved.map((b) => b.key), preserved }
}
