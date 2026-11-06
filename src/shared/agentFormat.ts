import type { AgentDefinition } from './agents'

const DELIMITER = '---'

/** Rohtext eines Frontmatter-Schlüssels samt eingerückter Folgezeilen. */
export interface PreservedBlock {
  readonly key: string
  readonly text: string
}

const quote = (text: string): string => `"${text.replace(/\s*\n\s*/g, ' ').replace(/[\\"]/g, '\\$&')}"`

function managedLines(d: AgentDefinition): string[] {
  const lines = [`name: ${d.name}`, `description: ${quote(d.description)}`]
  if (d.tools.length) lines.push(`tools: ${d.tools.join(', ')}`)
  if (d.disallowedTools.length) lines.push(`disallowedTools: ${d.disallowedTools.join(', ')}`)
  if (d.model) lines.push(`model: ${d.model}`)
  if (d.effort) lines.push(`effort: ${d.effort}`)
  if (d.permissionMode) lines.push(`permissionMode: ${d.permissionMode}`)
  if (d.maxTurns !== null) lines.push(`maxTurns: ${d.maxTurns}`)
  if (d.skills.length) lines.push('skills:', ...d.skills.map((s) => `  - ${s}`))
  if (d.memory) lines.push(`memory: ${d.memory}`)
  if (d.isolation) lines.push(`isolation: ${d.isolation}`)
  if (d.background) lines.push('background: true')
  if (d.color) lines.push(`color: ${d.color}`)
  if (d.initialPrompt.trim()) lines.push(`initialPrompt: ${quote(d.initialPrompt.trim())}`)
  return lines
}

/** Schreibt eine Agent-Datei im Format von Claude Code; `preserved` kommt unverändert hinter die bekannten Felder. */
export function serializeAgentFile(definition: AgentDefinition, preserved: readonly PreservedBlock[] = []): string {
  const header = [...managedLines(definition), ...preserved.map((b) => b.text)].join('\n')
  const prompt = definition.prompt.trim()
  return `${DELIMITER}\n${header}\n${DELIMITER}\n${prompt ? `\n${prompt}\n` : ''}`
}
