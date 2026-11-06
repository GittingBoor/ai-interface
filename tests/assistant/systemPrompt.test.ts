import { describe, expect, it } from 'vitest'
import { LOCALES } from '../../src/shared/i18n/locales'
import { languageDirective } from '../../src/shared/i18n/directive'
import { buildSystemPrompt } from '../../src/main/assistant/systemPrompt'

const prompt = (locale: Parameters<typeof buildSystemPrompt>[0]): string => buildSystemPrompt(locale, 'heute', '/p', '/v', null, '/p/CLAUDE.md')

describe('languageDirective', () => {
  it('nennt die Sprache englisch, für jede Sprache', () => {
    expect(languageDirective('ja')).toBe(
      'Always respond in Japanese. Write every file you create or fill (CLAUDE.md, docs/PLAN.md, README.md, notes) in Japanese.'
    )
    expect(languageDirective('zh')).toContain('Chinese (Simplified)')
    expect(new Set(LOCALES.map(languageDirective)).size).toBe(LOCALES.length)
  })
})

describe('buildSystemPrompt', () => {
  it('enthält die Sprachvorgabe der Sprache und kein festes Deutsch', () => {
    expect(prompt('ja')).toContain(languageDirective('ja'))
    expect(prompt('ja')).toContain('Japanese')
    expect(prompt('ja')).not.toContain('Deutsch')
  })
})
