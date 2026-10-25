import { describe, expect, it } from 'vitest'
import { openDatabase } from '../../src/main/db/Database'
import { SummaryError } from '../../src/main/errors'
import { MAX_INPUT_CHARS, SkillSummarizer } from '../../src/main/skills/SkillSummarizer'

const entry = (hash: string, content = `Inhalt ${hash}`): { hash: string; name: string; content: string } => ({ hash, name: `skill-${hash}`, content })

describe('SkillSummarizer', () => {
  it('fasst nur Ungecachtes zusammen, meldet Fortschritt und liefert den Cache', async () => {
    const db = openDatabase(':memory:')
    const inputs: string[] = []
    const progress: string[] = []
    const summarizer = new SkillSummarizer(db, async (_prompt, input) => {
      inputs.push(input)
      return `  Kurz: ${input.slice(0, 9)}  \n`
    }, (p) => progress.push(`${p.done}/${p.total} ${p.current}`))
    expect(await summarizer.summarize([entry('a'), entry('b')])).toBe(2)
    expect(await summarizer.summarize([entry('a'), entry('c')])).toBe(1)
    expect(inputs).toHaveLength(3)
    expect(progress).toEqual(['0/2 skill-a', '1/2 skill-b', '2/2 ', '0/1 skill-c', '1/1 '])
    expect(summarizer.cached(['a', 'c', 'x'])).toEqual({ a: 'Kurz: Inhalt a', c: 'Kurz: Inhalt c' })
  })

  it('kürzt lange Inhalte', async () => {
    let seen = ''
    const summarizer = new SkillSummarizer(openDatabase(':memory:'), async (_p, input) => {
      seen = input
      return 'ok'
    }, () => undefined)
    await summarizer.summarize([entry('a', 'x'.repeat(MAX_INPUT_CHARS * 2))])
    expect(seen.length).toBe(MAX_INPUT_CHARS)
  })

  it('bricht beim ersten Fehler ab, behält bisherige Ergebnisse und nennt den Eintrag', async () => {
    const summarizer = new SkillSummarizer(openDatabase(':memory:'), async (_p, input) => {
      if (input.includes('b')) throw new Error('Kontingent erschöpft')
      return 'ok'
    }, () => undefined)
    await expect(summarizer.summarize([entry('a'), entry('b'), entry('c')])).rejects.toThrow(SummaryError)
    await expect(summarizer.summarize([entry('b')])).rejects.toThrow(/skill-b.*Kontingent erschöpft/)
    expect(Object.keys(summarizer.cached(['a', 'b', 'c']))).toEqual(['a'])
  })

  it('verwirft leere Antworten', async () => {
    const summarizer = new SkillSummarizer(openDatabase(':memory:'), async () => '   ', () => undefined)
    await expect(summarizer.summarize([entry('a')])).rejects.toThrow(/leere/)
  })
})
