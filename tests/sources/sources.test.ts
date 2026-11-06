import { beforeEach, describe, expect, it } from 'vitest'
import type { Favorite, Source } from '@shared/types'
import { domainOf, isSourceUrl, noteFromPrompt, sectionOf, splitByOrigin, titleFromUrl } from '@shared/sources'
import { sourceIdOf, sourceNavId, resolveNavigation, DEFAULT_NAVIGATION } from '@shared/layout'
import { openDatabase } from '../../src/main/db/Database'
import { ScanOffsets } from '../../src/main/images/ScanOffsets'
import { extractSources } from '../../src/main/sources/extractSources'
import { SourceRepo } from '../../src/main/sources/SourceRepo'
import { SessionSourceScanner } from '../../src/main/sources/SessionSourceScanner'
import { ValidationError } from '../../src/main/errors'
import { FakeHost } from '../helpers/FakeHost'

const DAY_MS = 86_400_000
const NOW = 10 * DAY_MS
const PROJECT = '/home/alex/projects/music'

const fav = (path: string): Favorite => ({ id: 1, host: 'mini-pc', path, name: 'Music', color: '#e08a4f', sortOrder: 0, createdAt: 0, categoryId: null, starred: true, icon: null })

function fetchUse(id: string, url: string, prompt = 'Was ist MFCC? Bitte kurz.'): string {
  return JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name: 'WebFetch', input: { url, prompt } }] }, cwd: PROJECT, sessionId: 's1', timestamp: '2026-10-01T10:00:00.000Z' })
}

function result(id: string, cwd = PROJECT, isError = false): string {
  return JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: isError, content: 'Inhalt' }] }, cwd, sessionId: 's1', timestamp: '2026-10-01T10:00:01.000Z' })
}

const source = (id: number, url: string, origin: Source['origin'] = 'ai'): Source => ({
  id,
  url,
  title: url,
  note: '',
  host: 'local',
  project: '/p',
  origin,
  starred: false,
  sessionId: null,
  createdAt: id
})

describe('Quellen-Hilfen', () => {
  it('erkennt öffentliche Adressen und lässt lokale weg', () => {
    expect(isSourceUrl('https://de.wikipedia.org/wiki/X')).toBe(true)
    expect(isSourceUrl('http://localhost:5173')).toBe(false)
    expect(isSourceUrl('http://192.168.1.20:8123')).toBe(false)
    expect(isSourceUrl('http://100.100.1.2:8123')).toBe(false)
    expect(isSourceUrl('file:///D:/x.html')).toBe(false)
  })

  it('baut Titel und Info aus Adresse und Frage', () => {
    expect(domainOf('https://www.electronjs.org/docs')).toBe('electronjs.org')
    expect(titleFromUrl('https://de.wikipedia.org/wiki/Kosinus-%C3%84hnlichkeit')).toBe('Kosinus Ähnlichkeit · de.wikipedia.org')
    expect(titleFromUrl('https://librosa.org/')).toBe('librosa.org')
    expect(noteFromPrompt('  Was ist MFCC?   Bitte kurz. ')).toBe('Was ist MFCC?')
  })

  it('bündelt erst ab zwei Quellen derselben Webseite', () => {
    const section = sectionOf([source(1, 'https://de.wikipedia.org/a'), source(2, 'https://de.wikipedia.org/b'), source(3, 'https://librosa.org/x')])
    expect(section.bundles.map((b) => [b.domain, b.sources.length])).toEqual([['de.wikipedia.org', 2]])
    expect(section.singles.map((s) => s.id)).toEqual([3])
    const split = splitByOrigin([source(1, 'https://a.org', 'user'), source(2, 'https://b.org')])
    expect([split.mine.count, split.ai.count]).toEqual([1, 1])
  })

  it('führt Quellen mit Stern in der Gruppe „Webseiten“', () => {
    expect(sourceIdOf(sourceNavId(7))).toBe(7)
    expect(sourceIdOf('link:x')).toBeNull()
    const groups = resolveNavigation({ ...DEFAULT_NAVIGATION, groups: DEFAULT_NAVIGATION.groups.filter((g) => g.id !== 'websites') }, ['home', 'sources', sourceNavId(3)])
    expect(groups.find((g) => g.id === 'websites')?.items).toEqual([sourceNavId(3)])
    expect(groups.find((g) => g.id === 'notes')?.items).toEqual(['sources'])
  })
})

describe('extractSources', () => {
  it('nimmt nur erfolgreiche WebFetch-Abrufe mit Ort und Info', () => {
    const chunk = [fetchUse('t1', 'https://de.wikipedia.org/wiki/MFCC'), result('t1'), fetchUse('t2', 'https://kaputt.example'), result('t2', PROJECT, true), result('t3')].join('\n') + '\n'
    const { sources, consumedBytes } = extractSources(chunk)
    expect(sources).toEqual([{ url: 'https://de.wikipedia.org/wiki/MFCC', note: 'Was ist MFCC?', sessionId: 's1', cwd: PROJECT, timestamp: Date.parse('2026-10-01T10:00:01.000Z') }])
    expect(consumedBytes).toBe(Buffer.byteLength(chunk))
  })

  it('lässt eine unvollständige letzte Zeile liegen', () => {
    expect(extractSources(fetchUse('t1', 'https://a.org')).consumedBytes).toBe(0)
  })
})

describe('SourceRepo', () => {
  let repo: SourceRepo
  beforeEach(() => {
    repo = new SourceRepo(openDatabase(':memory:'), () => NOW)
  })

  it('legt eigene Quellen an und verhindert Dubletten im selben Ordner', () => {
    const added = repo.add({ url: 'music.example.org', title: '', note: ' Live ', host: 'mini-pc', project: PROJECT })
    expect(added).toMatchObject({ url: 'https://music.example.org', title: 'music.example.org', note: 'Live', origin: 'user', starred: false })
    expect(() => repo.add({ url: 'https://music.example.org', title: 'x', note: '', host: 'mini-pc', project: PROJECT })).toThrow(ValidationError)
    expect(() => repo.add({ url: 'ftp://x', title: 'x', note: '', host: null, project: null })).toThrow(ValidationError)
    expect(repo.add({ url: 'https://music.example.org', title: 'x', note: '', host: 'local', project: null }).host).toBeNull()
  })

  it('übernimmt KI-Quellen nur einmal und lässt lokale Adressen weg', () => {
    const input = { url: 'https://de.wikipedia.org/wiki/MFCC', note: 'n', host: 'mini-pc' as const, project: PROJECT, sessionId: 's1', createdAt: 5 }
    expect(repo.addAuto(input)?.origin).toBe('ai')
    expect(repo.addAuto(input)).toBeNull()
    expect(repo.addAuto({ ...input, project: null })?.project).toBeNull()
    expect(repo.addAuto({ ...input, url: 'http://localhost:3000' })).toBeNull()
  })

  it('übernimmt zu „Ich“, setzt Stern, verschiebt und löscht', () => {
    const ai = repo.addAuto({ url: 'https://a.org/x', note: '', host: 'local', project: '/p', sessionId: 's', createdAt: 1 })
    if (!ai) throw new Error('Quelle fehlt')
    expect(repo.update(ai.id, { origin: 'user', starred: true })).toMatchObject({ origin: 'user', starred: true })
    expect(repo.update(ai.id, { host: null, project: null })).toMatchObject({ host: null, project: null })
    repo.remove(ai.id)
    expect(repo.list()).toEqual([])
  })
})

describe('SessionSourceScanner', () => {
  it('ordnet Abrufe dem Projekt der Session zu, sonst „Allgemein“', async () => {
    const host = new FakeHost('mini-pc', '/home/alex')
    host.setFile('/home/alex/.claude/projects/p/s1.jsonl', [fetchUse('t1', 'https://a.org/x'), result('t1'), fetchUse('t2', 'https://b.org/y'), result('t2', '/tmp/anders')].join('\n') + '\n')
    const repo = new SourceRepo(openDatabase(':memory:'))
    const scanner = new SessionSourceScanner(new ScanOffsets(openDatabase(':memory:'), 'source_offsets'), repo, () => [fav(PROJECT)], () => NOW)
    const added = await scanner.scan(host)
    expect(added.map((s) => [s.url, s.project])).toEqual([
      ['https://a.org/x', PROJECT],
      ['https://b.org/y', null]
    ])
    expect(await scanner.scan(host)).toEqual([])
  })
})
