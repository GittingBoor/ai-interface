import { describe, expect, it } from 'vitest'
import { agentTemplates, EMPTY_AGENT } from '@shared/agents'
import { lintAgent, lintScore } from '@shared/agentLint'
import { LOCALES } from '@shared/i18n/locales'
import { MESSAGES } from '@shared/i18n/messages'

const t = MESSAGES.de.agents
const TEMPLATES = agentTemplates(t)

describe('lintAgent', () => {
  it('meldet leere Agents als Fehler', () => {
    const levels = lintAgent(EMPTY_AGENT, t.lint).filter((f) => f.level === 'error').map((f) => f.field)
    expect(levels).toEqual(['name', 'description', 'prompt'])
  })

  it('lässt die Vorlagen in jeder Sprache ohne Fehler und Warnungen durch', () => {
    for (const locale of LOCALES) {
      const text = MESSAGES[locale].agents
      for (const template of agentTemplates(text)) {
        const serious = lintAgent(template.definition, text.lint).filter((f) => f.level !== 'tip')
        expect(serious, `${locale}/${template.id}`).toEqual([])
      }
    }
  })

  it('erkennt ungültige Namen, Tippfehler bei Tools und Alles-erlaubt', () => {
    const findings = lintAgent({ ...TEMPLATES[0]!.definition, name: 'Code Reviewer', tools: ['Read', 'Grpe'], permissionMode: 'bypassPermissions' }, t.lint)
    expect(findings.map((f) => f.field)).toEqual(expect.arrayContaining(['name', 'tools', 'permissionMode']))
    expect(findings.find((f) => f.field === 'tools' && f.level === 'warn')?.message).toContain('Grpe')
  })

  it('akzeptiert MCP-Tools und Muster', () => {
    const findings = lintAgent({ ...TEMPLATES[1]!.definition, tools: ['Read', 'mcp__github__get_issue', 'Bash(git diff *)'] }, t.lint)
    expect(findings.some((f) => f.message.startsWith('Unbekannte'))).toBe(false)
  })

  it('bewertet mit 0 bis 100', () => {
    expect(lintScore([])).toBe(100)
    expect(lintScore(lintAgent(EMPTY_AGENT, t.lint))).toBeLessThan(20)
  })
})
