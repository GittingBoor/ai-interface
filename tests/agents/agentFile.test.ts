import { describe, expect, it } from 'vitest'
import { EMPTY_AGENT, type AgentDefinition } from '@shared/agents'
import { parseAgentFile, serializeAgentFile } from '../../src/main/agents/agentFile'

const FULL: AgentDefinition = {
  ...EMPTY_AGENT,
  name: 'code-reviewer',
  description: 'Prüft Code: findet "echte" Fehler. Use proactively.',
  tools: ['Read', 'Grep', 'Bash'],
  disallowedTools: ['Write'],
  model: 'sonnet',
  effort: 'high',
  permissionMode: 'plan',
  maxTurns: 12,
  skills: ['impeccable', 'dataviz'],
  memory: 'project',
  isolation: 'worktree',
  background: true,
  color: 'red',
  initialPrompt: 'Starte mit git diff',
  prompt: '# Prüfer\n\nDu prüfst Code.'
}

describe('Agent-Datei', () => {
  it('übersteht Schreiben und Lesen ohne Verlust', () => {
    const text = serializeAgentFile(FULL)
    expect(parseAgentFile(text).definition).toEqual(FULL)
  })

  it('lässt leere Felder weg', () => {
    const text = serializeAgentFile({ ...EMPTY_AGENT, name: 'mini', description: 'Kurz', prompt: 'Hallo' })
    expect(text).toBe('---\nname: mini\ndescription: "Kurz"\n---\n\nHallo\n')
  })

  it('liest bestehende Dateien wie die von Claude Code', () => {
    const text = [
      '---',
      'name: job-finder',
      'description: "Findet Jobs. Use when the user asks."',
      'tools: "WebSearch, WebFetch, Write"',
      'model: sonnet',
      'color: orange',
      '---',
      '# Job Finder',
      '',
      'Text'
    ].join('\r\n')
    const { definition, preservedKeys } = parseAgentFile(text)
    expect(definition.tools).toEqual(['WebSearch', 'WebFetch', 'Write'])
    expect(definition.color).toBe('orange')
    expect(definition.prompt).toBe('# Job Finder\n\nText')
    expect(preservedKeys).toEqual([])
  })

  it('behält unbekannte und verschachtelte Schlüssel unverändert', () => {
    const text = [
      '---',
      'name: guard',
      'description: Wacht',
      'hooks:',
      '  PreToolUse:',
      '    - matcher: "Bash"',
      '      hooks:',
      '        - type: command',
      '          command: "./check.sh"',
      'permissionMode: irgendwas',
      'mcpServers: [slack]',
      '---',
      'Body'
    ].join('\n')
    const parsed = parseAgentFile(text)
    expect(parsed.preservedKeys).toEqual(['hooks', 'permissionMode', 'mcpServers'])
    expect(parsed.definition.permissionMode).toBeNull()
    const written = serializeAgentFile({ ...parsed.definition, description: 'Wacht gut' }, parsed.preserved)
    expect(written).toContain('hooks:\n  PreToolUse:\n    - matcher: "Bash"\n      hooks:\n        - type: command\n          command: "./check.sh"\n')
    expect(written).toContain('permissionMode: irgendwas\n')
    expect(written).toContain('mcpServers: [slack]\n')
    expect(parseAgentFile(written).definition.description).toBe('Wacht gut')
  })

  it('macht aus manual den Standardmodus und aus Zeilenumbrüchen in der Beschreibung Leerzeichen', () => {
    const parsed = parseAgentFile('---\nname: a\ndescription: x\npermissionMode: manual\n---\n')
    expect(parsed.definition.permissionMode).toBe('default')
    expect(serializeAgentFile({ ...EMPTY_AGENT, name: 'a', description: 'eins\nzwei' })).toContain('description: "eins zwei"')
  })

  it('maskiert Backslashes und Anführungszeichen', () => {
    const def = { ...EMPTY_AGENT, name: 'a', description: 'Pfad C:\\temp und "Zitat"' }
    expect(parseAgentFile(serializeAgentFile(def)).definition.description).toBe(def.description)
  })
})
