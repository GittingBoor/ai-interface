import { beforeEach, describe, expect, it } from 'vitest'
import type { Favorite } from '@shared/types'
import { openDatabase } from '../../src/main/db/Database'
import { extractImages } from '../../src/main/images/extractImages'
import { ScanOffsets } from '../../src/main/images/ScanOffsets'
import { ImageStore } from '../../src/main/images/ImageStore'
import { SessionImageScanner } from '../../src/main/images/SessionImageScanner'
import { FakeHost } from '../helpers/FakeHost'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const DAY_MS = 86_400_000
// FakeHost vergibt Änderungszeiten ab 1 s; NOW liegt kurz danach.
const NOW = 10 * DAY_MS
/** Ein „Bild“ über der Mindestgröße; der Inhalt macht es eindeutig. */
const bigImage = (seed: string): string => Buffer.from(seed.repeat(5000)).toString('base64')

const fav = (id: number, host: Favorite['host'], path: string): Favorite => ({
  id,
  host,
  path,
  name: `P${id}`,
  color: '#e08a4f',
  sortOrder: id,
  createdAt: 0,
  categoryId: null,
  starred: true,
  icon: null
})

interface LineOptions {
  readonly cwd: string
  readonly data?: string
  readonly session?: string
  readonly read?: boolean
  readonly toolUseId?: string
}

/** Zeile wie Claude Code sie für ein Werkzeugergebnis mit Bild schreibt. */
function toolImageLine(o: LineOptions): string {
  const data = o.data ?? bigImage('x')
  const image = { type: 'image', source: { type: 'base64', media_type: 'image/png', data } }
  return JSON.stringify({
    type: 'user',
    message: { role: 'user', content: [{ tool_use_id: o.toolUseId ?? 'toolu_1', type: 'tool_result', content: [{ type: 'text', text: 'Took a screenshot' }, image] }] },
    toolUseResult: o.read ? { type: 'image', file: { base64: data, type: 'image/png' } } : [image],
    timestamp: '2026-09-27T10:00:00.000Z',
    cwd: o.cwd,
    sessionId: o.session ?? 's1'
  })
}

function toolUseLine(id: string, name: string): string {
  return JSON.stringify({ type: 'assistant', message: { id: 'm1', content: [{ type: 'tool_use', id, name, input: {} }] }, timestamp: '2026-09-27T09:59:59.000Z', cwd: '/x', sessionId: 's1' })
}

function pastedImageLine(cwd: string, sidechain = false): string {
  return JSON.stringify({
    type: 'user',
    isSidechain: sidechain,
    message: { role: 'user', content: [{ type: 'text', text: '[Image #1] schau mal' }, { type: 'image', source: { type: 'base64', media_type: 'image/png', data: bigImage('p') } }] },
    timestamp: '2026-09-27T10:00:00.000Z',
    cwd,
    sessionId: 's1'
  })
}

/** Ergebnis wie Playwright es bei `browser_take_screenshot` mit Dateiname schreibt. */
function playwrightFileLine(cwd: string, link: string): string {
  const text = `### Result\n- [Screenshot of viewport](${link})\n### Ran Playwright code`
  return JSON.stringify({
    type: 'user',
    message: { role: 'user', content: [{ tool_use_id: 'toolu_2', type: 'tool_result', content: [{ type: 'text', text }] }] },
    timestamp: '2026-09-27T10:00:00.000Z',
    cwd,
    sessionId: 's1'
  })
}

const OPTIONS = { importReadImages: false, minBytes: 4096 }

describe('extractImages', () => {
  it('nimmt Werkzeug-Bilder mit Werkzeugname und Einfügungen von Alex, aber keine Read-Ergebnisse', () => {
    const chunk = [toolUseLine('toolu_9', 'mcp__playwright__browser_take_screenshot'), toolImageLine({ cwd: 'D:\\a', toolUseId: 'toolu_9' }), pastedImageLine('D:\\a'), toolImageLine({ cwd: 'D:\\a', read: true, data: bigImage('r') }), ''].join('\n')
    const result = extractImages(chunk, OPTIONS)
    expect(result.images).toHaveLength(2)
    expect(result.images[0]).toMatchObject({ cwd: 'D:\\a', sessionId: 's1', mediaType: 'image/png', tool: 'mcp__playwright__browser_take_screenshot', fromUser: false, timestamp: Date.parse('2026-09-27T10:00:00.000Z') })
    expect(result.images[1]).toMatchObject({ cwd: 'D:\\a', mediaType: 'image/png', tool: null, fromUser: true })
    expect(result.consumedBytes).toBe(Buffer.byteLength(chunk))
  })

  it('ignoriert Bilder im Auftrag an einen Subagenten', () => {
    expect(extractImages(`${pastedImageLine('D:\\a', true)}\n`, OPTIONS).images).toHaveLength(0)
  })

  it('übernimmt Read-Ergebnisse nur mit Einstellung', () => {
    const chunk = `${toolImageLine({ cwd: 'D:\\a', read: true })}\n`
    expect(extractImages(chunk, { ...OPTIONS, importReadImages: true }).images).toHaveLength(1)
  })

  it('meldet Screenshot-Dateien aus Playwright-Links', () => {
    const chunk = `${playwrightFileLine('D:\\a', '.playwright-mcp\\tooltip.png')}\n`
    const result = extractImages(chunk, OPTIONS)
    expect(result.images).toHaveLength(0)
    expect(result.files).toEqual([{ cwd: 'D:\\a', sessionId: 's1', timestamp: Date.parse('2026-09-27T10:00:00.000Z'), path: '.playwright-mcp\\tooltip.png' }])
  })

  it('verwirft zu kleine Bilder und lässt eine halbe letzte Zeile liegen', () => {
    const small = toolImageLine({ cwd: 'D:\\a', data: Buffer.from('klein').toString('base64') })
    const half = toolImageLine({ cwd: 'D:\\a' }).slice(0, 50)
    const result = extractImages(`${small}\n${half}`, OPTIONS)
    expect(result.images).toHaveLength(0)
    expect(result.consumedBytes).toBe(Buffer.byteLength(`${small}\n`))
  })
})

describe('SessionImageScanner', () => {
  const ROOT_LOCAL = '/home/l/.claude/projects'
  const ROOT_MINI = '/home/alex/.claude/projects'
  let store: ImageStore
  let offsets: ScanOffsets
  let projects: Favorite[]

  beforeEach(() => {
    const db = openDatabase(':memory:')
    store = new ImageStore(db, mkdtempSync(join(tmpdir(), 'aii-img-')))
    offsets = new ScanOffsets(db, 'image_offsets')
    projects = [fav(1, 'local', 'D:\\GitHub\\Projects\\a'), fav(2, 'local', 'D:\\GitHub\\Projects\\b')]
  })

  const scanner = (): SessionImageScanner => new SessionImageScanner(offsets, store, () => projects, () => ({ importReadImages: false }), () => NOW)

  it('legt ein Bild aus Projekt A nur bei A ab, mit Host, Session und Kennzeichen „auto“', async () => {
    const host = new FakeHost('local', '/home/l')
    host.setFile(`${ROOT_LOCAL}/D--a/s1.jsonl`, `${toolImageLine({ cwd: 'D:\\GitHub\\Projects\\a\\src' })}\n`)
    const added = await scanner().scan(host)
    expect(added).toHaveLength(1)
    expect(store.list('D:\\GitHub\\Projects\\a')).toHaveLength(1)
    expect(store.list('D:\\GitHub\\Projects\\b')).toHaveLength(0)
    expect(added[0]).toMatchObject({ host: 'local', source: 'auto', sessionId: 's1', project: 'D:\\GitHub\\Projects\\a' })
  })

  it('legt eingefügte Bilder mit Kennzeichen „user“ und Titel „Von dir“ ab', async () => {
    const host = new FakeHost('local', '/home/l')
    host.setFile(`${ROOT_LOCAL}/D--a/s1.jsonl`, `${pastedImageLine('D:\\GitHub\\Projects\\a')}\n`)
    const [image] = await scanner().scan(host)
    expect(image).toMatchObject({ host: 'local', source: 'user', sessionId: 's1', project: 'D:\\GitHub\\Projects\\a' })
    expect(image?.title).toMatch(/^Von dir · /)
  })

  it('übernimmt nichts ohne passendes Projekt (Präfixgrenze)', async () => {
    const host = new FakeHost('local', '/home/l')
    host.setFile(`${ROOT_LOCAL}/D--ab/s1.jsonl`, `${toolImageLine({ cwd: 'D:\\GitHub\\Projects\\ab' })}\n`)
    expect(await scanner().scan(host)).toHaveLength(0)
  })

  it('trennt Mini-PC und lokal bei gleichem Pfad', async () => {
    projects = [fav(1, 'local', '/home/alex/projects/a'), fav(3, 'mini-pc', '/home/alex/projects/a')]
    const mini = new FakeHost('mini-pc', '/home/alex')
    mini.setFile(`${ROOT_MINI}/-home-alex-projects-a/s1.jsonl`, `${toolImageLine({ cwd: '/home/alex/projects/a' })}\n`)
    const [image] = await scanner().scan(mini)
    expect(image).toMatchObject({ host: 'mini-pc', project: '/home/alex/projects/a' })
    expect(store.list().filter((i) => i.host === 'local')).toHaveLength(0)
  })

  it('verwirft Dubletten über den Inhalt', async () => {
    const host = new FakeHost('local', '/home/l')
    const same = bigImage('gleich')
    host.setFile(`${ROOT_LOCAL}/D--a/s1.jsonl`, `${toolImageLine({ cwd: 'D:\\GitHub\\Projects\\a', data: same })}\n${toolImageLine({ cwd: 'D:\\GitHub\\Projects\\a', data: same, session: 's2' })}\n`)
    expect(await scanner().scan(host)).toHaveLength(1)
  })

  it('liest nur Neues und holt eine halbe Zeile beim nächsten Lauf nach', async () => {
    const host = new FakeHost('local', '/home/l')
    const file = `${ROOT_LOCAL}/D--a/s1.jsonl`
    const line = toolImageLine({ cwd: 'D:\\GitHub\\Projects\\a', data: bigImage('2') })
    host.setFile(file, `${toolImageLine({ cwd: 'D:\\GitHub\\Projects\\a' })}\n${line.slice(0, 100)}`)
    const s = scanner()
    expect(await s.scan(host)).toHaveLength(1)
    expect(await s.scan(host)).toHaveLength(0)
    host.setFile(file, `${toolImageLine({ cwd: 'D:\\GitHub\\Projects\\a' })}\n${line}\n`)
    expect(await s.scan(host)).toHaveLength(1)
  })

  it('überspringt alte Dateien beim ersten Lauf', async () => {
    const host = new FakeHost('local', '/home/l')
    const file = `${ROOT_LOCAL}/D--a/alt.jsonl`
    host.setFile(file, `${toolImageLine({ cwd: 'D:\\GitHub\\Projects\\a' })}\n`)
    host.files.set(file, { data: host.files.get(file)?.data ?? Buffer.alloc(0), mtimeMs: NOW - 31 * DAY_MS })
    expect(await scanner().scan(host)).toHaveLength(0)
  })

  it('übernimmt Playwright-Screenshot-Dateien relativ zum Projekt oder zum Ausgabeordner', async () => {
    projects = [fav(1, 'mini-pc', '/home/alex/projects/a')]
    const host = new FakeHost('mini-pc', '/home/alex')
    host.setFile('/home/alex/projects/a/.playwright-mcp/eins.png', Buffer.from('1'.repeat(5000)))
    host.setFile('/home/alex/projects/a/.playwright-mcp/zwei.png', Buffer.from('2'.repeat(5000)))
    const lines = [playwrightFileLine('/home/alex/projects/a', '.playwright-mcp/eins.png'), playwrightFileLine('/home/alex/projects/a', './zwei.png'), playwrightFileLine('/home/alex/projects/a', 'weg.png')]
    host.setFile(`${ROOT_MINI}/-home-alex-projects-a/s1.jsonl`, `${lines.join('\n')}\n`)
    const added = await scanner().scan(host)
    expect(added.map((i) => i.title.split(' · ')[1])).toEqual(['eins.png', 'zwei.png'])
    expect(added[0]).toMatchObject({ host: 'mini-pc', source: 'auto', project: '/home/alex/projects/a' })
  })

  it('liest Bilder aus Subagenten-Sessions', async () => {
    const host = new FakeHost('local', '/home/l')
    host.setFile(`${ROOT_LOCAL}/D--a/s1.jsonl`, '{}\n')
    host.setFile(`${ROOT_LOCAL}/D--a/s1/subagents/agent-1.jsonl`, `${toolImageLine({ cwd: 'D:\\GitHub\\Projects\\a' })}\n`)
    expect(await scanner().scan(host)).toHaveLength(1)
  })
})
