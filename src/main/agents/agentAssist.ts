import {
  AGENT_COLORS,
  AGENT_EFFORTS,
  AGENT_MEMORIES,
  AGENT_PERMISSION_MODES,
  agentSlug,
  type AgentAssistResult,
  type AgentDefinition
} from '@shared/agents'
import { AgentAssistError } from '../errors'
import { mainT } from '../i18n'

export { ASSIST_MODEL, buildAssistPrompt } from './agentAssistPrompt'

const MAX_NOTES = 6
const MAX_TURNS_LIMIT = 500

const text = (v: unknown): string => (typeof v === 'string' ? v : '')
const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()) : [])
const pick = <T extends string>(v: unknown, allowed: readonly T[]): T | null => (typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : null)

/** Erstes JSON-Objekt aus der Antwort (Claude setzt trotz Bitte manchmal einen Zaun oder Text davor). */
function extractJson(answer: string): unknown {
  const start = answer.indexOf('{')
  const end = answer.lastIndexOf('}')
  if (start === -1 || end <= start) throw new AgentAssistError(mainT().agents.service.noJson)
  try {
    return JSON.parse(answer.slice(start, end + 1))
  } catch (error) {
    throw new AgentAssistError(mainT().agents.service.unreadableJson(error instanceof Error ? error.message : String(error)))
  }
}

/** Antwort der KI in eine gültige Definition übersetzen; ungültige Werte fallen auf „nicht gesetzt“ zurück. */
export function parseAssistAnswer(answer: string, skills: readonly string[]): AgentAssistResult {
  const raw = extractJson(answer)
  if (typeof raw !== 'object' || raw === null) throw new AgentAssistError(mainT().agents.service.notObject)
  const o = raw as Record<string, unknown>
  const turns = typeof o['maxTurns'] === 'number' && Number.isInteger(o['maxTurns']) && o['maxTurns'] > 0 ? Math.min(o['maxTurns'], MAX_TURNS_LIMIT) : null
  const permission = pick(o['permissionMode'], AGENT_PERMISSION_MODES)
  const definition: AgentDefinition = {
    name: agentSlug(text(o['name'])),
    description: text(o['description']).trim(),
    tools: list(o['tools']),
    disallowedTools: list(o['disallowedTools']),
    model: text(o['model']).trim() || null,
    effort: pick(o['effort'], AGENT_EFFORTS),
    permissionMode: permission === 'bypassPermissions' ? null : permission,
    maxTurns: turns,
    skills: list(o['skills']).filter((s) => skills.includes(s)),
    memory: pick(o['memory'], AGENT_MEMORIES),
    isolation: o['isolation'] === 'worktree' ? 'worktree' : null,
    background: o['background'] === true,
    color: pick(o['color'], AGENT_COLORS),
    initialPrompt: text(o['initialPrompt']).trim(),
    prompt: text(o['prompt']).trim()
  }
  if (!definition.name || !definition.description || !definition.prompt) throw new AgentAssistError(mainT().agents.service.incompleteAnswer)
  return { definition, notes: list(o['notes']).slice(0, MAX_NOTES) }
}
