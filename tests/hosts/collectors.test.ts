import { beforeEach, describe, expect, it } from 'vitest'
import type { Favorite, Settings } from '@shared/types'
import { openDatabase } from '../../src/main/db/Database'
import { UsageRepo } from '../../src/main/usage/UsageRepo'
import { UsageCollector } from '../../src/main/usage/UsageCollector'
import { TodoMarkdownStore } from '../../src/main/todos/TodoMarkdownStore'
import { VaultReader } from '../../src/main/vault/VaultReader'
import { OllamaSource } from '../../src/main/models/OllamaSource'
import { HostUnreachableError } from '../../src/main/errors'
import { defaultSettings } from '../../src/main/settings/SettingsService'
import { joinPath } from '../../src/main/hosts/Host'
import { FakeHost } from '../helpers/FakeHost'

const DIR = '/home/alex/.claude/projects/-home-alex-projects'
const line = (id: string): string =>
  JSON.stringify({
    type: 'assistant',
    sessionId: 's1',
    cwd: '/home/alex/projects',
    timestamp: '2026-09-26T10:00:00Z',
    message: { id, model: 'claude-opus-5-5', usage: { input_tokens: 1, output_tokens: 1 } }
  })

describe('UsageCollector', () => {
  let host: FakeHost
  let repo: UsageRepo
  let collector: UsageCollector

  beforeEach(() => {
    host = new FakeHost('mini-pc')
    repo = new UsageRepo(openDatabase(':memory:'), () => ({}))
    collector = new UsageCollector(repo)
  })

  it('liest beim zweiten Lauf nur neue Bytes', async () => {
    host.setFile(`${DIR}/a.jsonl`, `${line('m1')}\n`)
    expect((await collector.collect(host)).newRecords).toBe(1)
    host.appendFile(`${DIR}/a.jsonl`, `${line('m2')}\n`)
    const stats = await collector.collect(host)
    expect(stats).toMatchObject({ host: 'mini-pc', files: 1, newRecords: 1 })
    expect(repo.getOffset('mini-pc', `${DIR}/a.jsonl`)).toBe(Buffer.byteLength(`${line('m1')}\n${line('m2')}\n`))
  })

  it('liest eine halb geschriebene Zeile im nächsten Lauf vollständig', async () => {
    const full = line('m1')
    host.setFile(`${DIR}/a.jsonl`, full.slice(0, 30))
    expect((await collector.collect(host)).newRecords).toBe(0)
    host.setFile(`${DIR}/a.jsonl`, `${full}\n`)
    expect((await collector.collect(host)).newRecords).toBe(1)
  })

  it('liest eine verkürzte (neu geschriebene) Datei von vorn', async () => {
    host.setFile(`${DIR}/a.jsonl`, `${line('m1')}\n${line('m2')}\n`)
    await collector.collect(host)
    host.setFile(`${DIR}/a.jsonl`, `${line('m3')}\n`)
    expect((await collector.collect(host)).newRecords).toBe(1)
  })

  it('liefert 0 Dateien, wenn es noch keine Claude-Logs gibt', async () => {
    host.setFile('/home/alex/sonstwas.txt', 'x')
    expect(await collector.collect(host)).toMatchObject({ files: 0, newRecords: 0 })
  })

  it('wirft bei offline-Host und lässt Offsets unverändert', async () => {
    host.setFile(`${DIR}/a.jsonl`, `${line('m1')}\n`)
    host.offline = true
    await expect(collector.collect(host)).rejects.toBeInstanceOf(HostUnreachableError)
    expect(repo.getOffset('mini-pc', `${DIR}/a.jsonl`)).toBe(0)
  })
})

const settingsFor = (vaultPath: string): Settings => ({
  ...defaultSettings('/home/alex', 'linux'),
  vault: { host: 'local', path: vaultPath },
  todoFile: 'Programmieren/Server/TODO.md',
  protocolDir: 'Programmieren/Server/homeserver/Protokoll',
  notesDir: 'Programmieren'
})

describe('TodoMarkdownStore', () => {
  const vault = '/vault'
  const file = '/vault/Programmieren/Server/TODO.md'
  let host: FakeHost
  let store: TodoMarkdownStore

  beforeEach(() => {
    host = new FakeHost('local')
    store = new TodoMarkdownStore(() => host, () => settingsFor(vault), () => '2026-09-26')
  })

  it('meldet eine fehlende Datei und kann sie anlegen', async () => {
    host.setFile('/vault/andere.md', 'x')
    expect(await store.load()).toMatchObject({ exists: false, items: [], path: file })
    await store.create()
    expect(host.text(file)).toContain('tags:')
    expect((await store.load()).exists).toBe(true)
  })

  it('wendet Änderungen auf den frischen Inhalt an und schreibt zurück', async () => {
    host.setFile(file, '## Server\n- [ ] A\n')
    const state = await store.load()
    const id = state.items[0]?.id ?? ''
    host.setFile(file, '## Server\n- [ ] A\n- [ ] Aus Obsidian\n')
    const after = await store.apply({ kind: 'toggle', id, today: 'ignoriert' })
    expect(host.text(file)).toBe('## Server\n- [x] A ✅ 2026-09-26\n- [ ] Aus Obsidian\n')
    expect(after.items.map((i) => i.text)).toEqual(['A', 'Aus Obsidian'])
    expect(after.sections).toEqual(['Server'])
  })

  it('meldet Änderungen per Signatur (mtime + Größe)', async () => {
    host.setFile(file, '- [ ] A\n')
    const first = await store.signature()
    host.setFile(file, '- [ ] B\n')
    expect(await store.signature()).not.toBe(first)
  })
})

describe('VaultReader', () => {
  const rel = 'Programmieren/Server/homeserver/Protokoll'
  const dir = `/vault/${rel}`
  const favorite = (id: number, path: string, name: string, host: Favorite['host'] = 'local'): Favorite => ({
    id, host, path, name, color: '#a39e96', sortOrder: id, createdAt: 0, categoryId: null, starred: true, icon: 'lucide:server'
  })

  it('listet Protokolle neueste zuerst und liest eins', async () => {
    const host = new FakeHost('local')
    host.setFile(`${dir}/2026-09-24.md`, '# alt')
    host.setFile(`${dir}/2026-09-26.md`, '# neu')
    host.setFile(`${dir}/bild.png`, 'x')
    const reader = new VaultReader(() => host, () => settingsFor('/vault'), () => [])
    const [group] = await reader.list()
    expect(group?.entries.map((p) => p.name)).toEqual(['2026-09-26.md', '2026-09-24.md'])
    expect((await reader.read(`${rel}/2026-09-26.md`)).content).toBe('# neu')
  })

  it('gruppiert die Protokollordner der Projekte im Vault', async () => {
    const host = new FakeHost('local')
    host.setFile(`${dir}/2026-09-26.md`, '# smarthome')
    host.setFile('/vault/Programmieren/Server/VPS/Protokoll/2026-09-22.md', '# vps')
    host.setFile('/vault/Programmieren/PC/Protokoll/2026-09-28.md', '# pc')
    host.setFile('/vault/Programmieren/PC/Notiz.md', 'x')
    host.setFile('/code/repo/Protokoll/2026-01-01.md', 'außerhalb des Vaults')
    const favorites = [
      favorite(1, '/vault/Programmieren/Server', 'Server'),
      favorite(2, '/vault/Programmieren/PC', 'PC'),
      favorite(3, '/code/repo', 'Repo'),
      favorite(4, '/vault/Programmieren/PC', 'PC (Mini-PC)', 'mini-pc')
    ]
    const reader = new VaultReader(() => host, () => settingsFor('/vault'), () => favorites)
    const groups = await reader.list()
    expect(groups.map((g) => [g.label, g.favoriteId])).toEqual([
      ['Server · homeserver', 1],
      ['Server · VPS', 1],
      ['PC', 2]
    ])
    expect(groups[2]?.entries[0]?.path).toBe('Programmieren/PC/Protokoll/2026-09-28.md')
    expect((await reader.read('Programmieren/Server/VPS/Protokoll/2026-09-22.md')).content).toBe('# vps')
  })

  it('findet Protokolle von Projekten außerhalb des Vaults über Namen und CLAUDE.md', async () => {
    const host = new FakeHost('local')
    host.setFile('/vault/Programmieren/AI Interface/Protokoll/2026-10-04.md', '# ai')
    host.setFile('/vault/Studium/Master/ASE/Protokoll/2026-10-01.md', '# ase')
    host.setFile('/vault/Studium/Master/Data/Protokoll/2026-10-02.md', '# data')
    host.setFile('/vault/Programmieren/Server/VPS/Protokoll/2026-09-22.md', '# vps')
    host.setFile('/code/ai/CLAUDE.md', 'Notizen: Obsidian `Programmieren\\AI Interface\\`')
    host.setFile('/code/ase/CLAUDE.md', '- Ort: Obsidian `Studium\\Master\\ASE\\Protokoll\\JJJJ-MM-TT.md`, eine Datei pro Datum.')
    host.setFile('/code/data/CLAUDE.md', 'Ort: Obsidian `/vault/Studium/Master/Data/Protokoll/` und Obsidian `Programmieren\\Server\\TODO.md`')
    const favorites = [
      favorite(1, '/code/ai', 'AI Interface'),
      favorite(2, '/code/ase', 'ASE'),
      favorite(3, '/code/data', 'Data Science'),
      favorite(4, '/code/leer', 'Ohne Protokolle'),
      favorite(5, '/remote/ai', 'AI Interface', 'mini-pc')
    ]
    const reader = new VaultReader(() => host, () => settingsFor('/vault'), () => favorites)
    const groups = await reader.list()
    expect(groups.map((g) => [g.label, g.favoriteId])).toEqual([
      ['AI Interface', 1],
      ['ASE', 2],
      ['Data Science', 3]
    ])
    expect((await reader.read('Studium/Master/ASE/Protokoll/2026-10-01.md')).content).toBe('# ase')
  })

  it('verhindert Pfade außerhalb der Protokollordner', async () => {
    const host = new FakeHost('local')
    host.setFile(`${dir}/2026-09-26.md`, '# neu')
    host.setFile('/vault/Programmieren/geheim.md', 'x')
    const reader = new VaultReader(() => host, () => settingsFor('/vault'), () => [])
    await expect(reader.read('../../geheim.md')).rejects.toThrow(/Ungültiger/)
    await expect(reader.read('Programmieren/geheim.md')).rejects.toThrow(/kein Protokoll/)
  })

  it('liefert eine leere Liste, wenn der Ordner fehlt', async () => {
    const host = new FakeHost('local')
    host.setFile('/vault/x.md', 'x')
    const reader = new VaultReader(() => host, () => settingsFor('/vault'), () => [])
    expect(await reader.list()).toEqual([])
  })

  it('findet eingebettete Bilder in Protokollordnern oder unter Assets', async () => {
    const host = new FakeHost('local')
    host.setFile(`${dir}/2026-09-26.md`, '![[screen.png]]')
    host.setFile('/vault/Assets/Bilder/screen.png', 'PNG')
    host.setFile('/vault/Programmieren/PC/Protokoll/pc.png', 'PC-PNG')
    const reader = new VaultReader(() => host, () => settingsFor('/vault'), () => [favorite(2, '/vault/Programmieren/PC', 'PC')])
    expect((await reader.readAsset('screen.png'))?.toString()).toBe('PNG')
    expect((await reader.readAsset('pc.png'))?.toString()).toBe('PC-PNG')
    expect(await reader.readAsset('fehlt.png')).toBeNull()
  })
})

describe('OllamaSource', () => {
  const tags = { models: [{ name: 'llama3:8b', size: 42, modified_at: '2026-09-01T00:00:00Z', details: { family: 'llama', parameter_size: '8B', quantization_level: 'Q4_0' } }] }
  const ps = { models: [{ name: 'llama3:8b' }] }

  it('liest Modelle lokal per HTTP und markiert laufende', async () => {
    const source = new OllamaSource(async (url) => (url.endsWith('/api/tags') ? tags : ps))
    const status = await source.list(new FakeHost('local'))
    expect(status).toMatchObject({ installed: true, models: [{ name: 'llama3:8b', running: true, parameterSize: '8B' }] })
  })

  it('liest Modelle entfernt per curl über SSH', async () => {
    const host = new FakeHost('mini-pc')
    host.execHandler = (cmd) => ({ stdout: JSON.stringify(cmd.includes('/api/tags') ? tags : { models: [] }), stderr: '', code: 0 })
    const status = await new OllamaSource(async () => ({})).list(host)
    expect(status.models[0]).toMatchObject({ name: 'llama3:8b', running: false })
  })

  it('meldet "nicht installiert", wenn Ollama nicht antwortet', async () => {
    const source = new OllamaSource(async () => {
      throw new Error('ECONNREFUSED')
    })
    expect(await source.list(new FakeHost('local'))).toEqual({ host: 'local', installed: false, models: [] })
  })
})

describe('joinPath', () => {
  it('verbindet mit dem Trenner des Hosts', () => {
    expect(joinPath({ separator: '\\' }, 'C:\\Users\\B\\', 'OneDrive/Obsidian Vault', 'Programmieren/Server/TODO.md')).toBe(
      'C:\\Users\\B\\OneDrive\\Obsidian Vault\\Programmieren\\Server\\TODO.md'
    )
  })
})
