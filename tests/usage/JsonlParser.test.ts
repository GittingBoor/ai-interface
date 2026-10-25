import { describe, expect, it } from 'vitest'
import { decodeProjectDir, parseJsonlChunk } from '../../src/main/usage/JsonlParser'

const assistantLine = (id: string, ts: string, extra: Record<string, unknown> = {}): string =>
  JSON.stringify({
    type: 'assistant',
    sessionId: 's1',
    cwd: '/home/alex/projects/ai-interface',
    timestamp: ts,
    message: {
      id,
      model: 'claude-opus-5-5',
      role: 'assistant',
      usage: { input_tokens: 10, output_tokens: 20, cache_creation_input_tokens: 30, cache_read_input_tokens: 40 }
    },
    ...extra
  })

describe('parseJsonlChunk', () => {
  it('liest Token-Zahlen, Modell, Session und Projekt aus einer Assistant-Zeile', () => {
    const result = parseJsonlChunk(assistantLine('m1', '2026-09-26T10:00:00.000Z') + '\n', 'local', 'fallback')
    expect(result.records).toEqual([
      {
        messageId: 'm1',
        sessionId: 's1',
        host: 'local',
        project: '/home/alex/projects/ai-interface',
        model: 'claude-opus-5-5',
        timestamp: Date.parse('2026-09-26T10:00:00.000Z'),
        inputTokens: 10,
        outputTokens: 20,
        cacheCreationTokens: 30,
        cacheReadTokens: 40
      }
    ])
    expect(result.skippedLines).toBe(0)
  })

  it('ignoriert User-Zeilen und synthetische Modelle', () => {
    const user = JSON.stringify({ type: 'user', message: { role: 'user', content: 'hi' } })
    const synthetic = assistantLine('m2', '2026-09-26T10:00:00.000Z').replace('claude-opus-5-5', '<synthetic>')
    const result = parseJsonlChunk(`${user}\n${synthetic}\n`, 'local', 'fb')
    expect(result.records).toHaveLength(0)
  })

  it('überspringt kaputte Zeilen, zählt sie und liest den Rest', () => {
    const chunk = `${assistantLine('a', '2026-09-26T10:00:00Z')}\n{kaputt\n${assistantLine('b', '2026-09-26T10:01:00Z')}\n`
    const result = parseJsonlChunk(chunk, 'local', 'fb')
    expect(result.records.map((r) => r.messageId)).toEqual(['a', 'b'])
    expect(result.skippedLines).toBe(1)
  })

  it('verbraucht eine unvollständige letzte Zeile nicht (Bytes, inkl. Umlaute)', () => {
    const first = assistantLine('ä1', '2026-09-26T10:00:00Z') + '\n'
    const partial = assistantLine('b', '2026-09-26T10:01:00Z').slice(0, 40)
    const result = parseJsonlChunk(first + partial, 'local', 'fb')
    expect(result.records).toHaveLength(1)
    expect(result.consumedBytes).toBe(Buffer.byteLength(first, 'utf8'))
    expect(result.skippedLines).toBe(0)
  })

  it('nutzt den Fallback-Projektnamen ohne cwd', () => {
    const line = JSON.parse(assistantLine('x', '2026-09-26T10:00:00Z')) as Record<string, unknown>
    delete line['cwd']
    const result = parseJsonlChunk(JSON.stringify(line) + '\n', 'mini-pc', '/fallback')
    expect(result.records[0]?.project).toBe('/fallback')
    expect(result.records[0]?.host).toBe('mini-pc')
  })
})

describe('decodeProjectDir', () => {
  it('wandelt den kodierten Ordnernamen in einen Pfad zurück', () => {
    expect(decodeProjectDir('-home-alex-projects')).toBe('/home/alex/projects')
  })

  it('erkennt Windows-Laufwerke', () => {
    expect(decodeProjectDir('C--Users-Alex-projects')).toBe('C:\\Users\\Alex\\projects')
  })
})

const PROMPT_TS = '2026-09-26T10:05:00.000Z'

const userLine = (uuid: string, content: unknown, extra: Record<string, unknown> = {}): string =>
  JSON.stringify({
    type: 'user',
    uuid,
    sessionId: 's1',
    cwd: '/home/alex/projects/ai-interface',
    timestamp: PROMPT_TS,
    message: { role: 'user', content },
    ...extra
  })

describe('parseJsonlChunk – Prompts', () => {
  it('zählt Text-Prompts', () => {
    const result = parseJsonlChunk(userLine('u1', 'Bau mir X') + '\n', 'local', 'fb')
    expect(result.prompts).toEqual([
      { uuid: 'u1', sessionId: 's1', host: 'local', project: '/home/alex/projects/ai-interface', timestamp: Date.parse(PROMPT_TS), chars: 9 }
    ])
    expect(result.records).toHaveLength(0)
  })

  it('zählt Block-Prompts mit Text (auch mit Bild)', () => {
    const content = [{ type: 'image', source: { type: 'base64', data: 'xx' } }, { type: 'text', text: 'Schau' }]
    const result = parseJsonlChunk(userLine('u2', content) + '\n', 'local', 'fb')
    expect(result.prompts).toHaveLength(1)
    expect(result.prompts[0]?.chars).toBe(5)
  })

  it('ignoriert tool_result, isMeta, isSidechain', () => {
    const lines = [
      userLine('a', [{ type: 'tool_result', tool_use_id: 't', content: 'ok' }]),
      userLine('b', 'Systemhinweis', { isMeta: true }),
      userLine('c', 'Auftrag an Subagent', { isSidechain: true })
    ]
    expect(parseJsonlChunk(lines.join('\n') + '\n', 'local', 'fb').prompts).toEqual([])
  })

  it('ignoriert Befehls- und Systemausgaben', () => {
    const lines = [
      userLine('a', '<command-name>/clear</command-name>'),
      userLine('b', '<local-command-stdout>x</local-command-stdout>'),
      userLine('c', '  <task-notification>fertig</task-notification>')
    ]
    expect(parseJsonlChunk(lines.join('\n') + '\n', 'local', 'fb').prompts).toEqual([])
  })

  it('ignoriert Unterbrechungsmarker und Zusammenfassungen nach /compact', () => {
    const lines = [
      userLine('a', [{ type: 'text', text: '[Request interrupted by user]' }]),
      userLine('b', '[Request interrupted by user for tool use]'),
      userLine('c', 'This session is being continued from a previous conversation …', { isCompactSummary: true })
    ]
    expect(parseJsonlChunk(lines.join('\n') + '\n', 'local', 'fb').prompts).toEqual([])
  })

  it('Assistant-Zeilen ändern sich nicht', () => {
    const result = parseJsonlChunk(assistantLine('m1', '2026-09-26T10:00:00.000Z') + '\n', 'local', 'fb')
    expect(result.records).toHaveLength(1)
    expect(result.prompts).toEqual([])
  })
})
