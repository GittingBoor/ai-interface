import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Settings } from '@shared/types'
import { TodoMarkdownStore } from '../src/main/todos/TodoMarkdownStore'
import { applyTodoChange, parseTodos } from '../src/main/todos/TodoMarkdown'
import { powershellQuote } from '../src/main/hosts/shellQuote'
import { buildLaunch } from '../src/main/terminal/launchCommand'
import { UsageCollector } from '../src/main/usage/UsageCollector'
import { UsageRepo } from '../src/main/usage/UsageRepo'
import { UsageService } from '../src/main/usage/UsageService'
import { openDatabase } from '../src/main/db/Database'
import { VaultReader } from '../src/main/vault/VaultReader'
import { defaultSettings } from '../src/main/settings/SettingsService'
import { Container } from '../src/main/container'
import { isTerminalTarget } from '../src/renderer/src/lib/keyboard'
import { FakeHost, fakeHosts } from './helpers/FakeHost'

const settingsFor = (vault: string): Settings => ({ ...defaultSettings('/home/alex', 'linux'), vault: { host: 'local', path: vault }, todoFile: 'Programmieren/Server/TODO.md' })

describe('Review: TODO-Datei', () => {
  it('verliert keine fremde Änderung zwischen Lesen und Schreiben', async () => {
    const host = new FakeHost('local')
    const file = '/vault/Programmieren/Server/TODO.md'
    host.setFile(file, '- [ ] A\n')
    const store = new TodoMarkdownStore(() => host, () => settingsFor('/vault'), () => '2026-09-27')
    const id = (await store.load()).items[0]?.id ?? ''
    host.afterRead = () => host.setFile(file, '- [ ] A\n- [ ] Obsidian parallel\n')
    await store.apply({ kind: 'toggle', id, today: 'x' })
    expect(host.text(file)).toBe('- [x] A ✅ 2026-09-27\n- [ ] Obsidian parallel\n')
  })

  it('liest TODOs bei gemischten Zeilenenden und erhält jedes Zeilenende', () => {
    const md = '## S\r\n- [ ] A\n- [ ] B\r\n- [ ] C\n'
    expect(parseTodos(md).map((t) => t.text)).toEqual(['A', 'B', 'C'])
    const id = parseTodos(md).find((t) => t.text === 'B')?.id ?? ''
    expect(applyTodoChange(md, { kind: 'toggle', id, today: '2026-09-27' })).toBe('## S\r\n- [ ] A\n- [x] B ✅ 2026-09-27\r\n- [ ] C\n')
  })
})

describe('Review: Terminalstart unter Windows', () => {
  it('verdoppelt auch typografische Apostrophe', () => {
    expect(powershellQuote('Alex’s ‘Projekt‛ ‚x')).toBe("'Alex’’s ‘‘Projekt‛‛ ‚‚x'")
  })

  it('umgeht die Execution Policy nur für diesen Prozess', () => {
    const spec = buildLaunch({ platform: 'win32', target: 'local', path: 'C:\\x', mode: 'new', claudeCommand: 'claude', shell: undefined })
    expect(spec.kind === 'local' && spec.args.slice(0, 4)).toEqual(['-NoLogo', '-NoExit', '-ExecutionPolicy', 'Bypass'])
  })
})

describe('Review: Verbrauch', () => {
  const DIR = '/home/alex/.claude/projects/-p'
  const line = (id: string): string =>
    JSON.stringify({ type: 'assistant', sessionId: 's', cwd: '/p', timestamp: '2026-09-26T10:00:00Z', message: { id, model: 'm', usage: { input_tokens: 1 } } }) + '\n'

  it('überspringt eine unlesbare Datei statt den Host als offline zu melden', async () => {
    const host = new FakeHost('local')
    host.setFile(`${DIR}/gut.jsonl`, line('a'))
    host.setFile(`${DIR}/kaputt.jsonl`, line('b'))
    host.failRead = (p) => p.endsWith('kaputt.jsonl')
    const repo = new UsageRepo(openDatabase(':memory:'), () => ({}))
    const stats = await new UsageCollector(repo).collect(host)
    expect(stats).toMatchObject({ newRecords: 1, failedFiles: 1 })
  })

  it('sammelt bei parallelen Aufrufen auch zusätzlich angefragte Hosts', async () => {
    const repo = new UsageRepo(openDatabase(':memory:'), () => ({}))
    const local = new FakeHost('local')
    const mini = new FakeHost('mini-pc')
    mini.setFile(`${DIR}/m.jsonl`, line('m'))
    const service = new UsageService(repo, new UsageCollector(repo), fakeHosts({ local, 'mini-pc': mini }))
    const [, both] = await Promise.all([service.refresh(['local']), service.refresh(['local', 'mini-pc'])])
    expect(both.find((h) => h.id === 'mini-pc')?.lastCollect?.newRecords).toBe(1)
  })
})

describe('Review: Vault-Bilder', () => {
  it('findet Einbettungen mit Unterordner und blockt Traversal weiterhin', async () => {
    const host = new FakeHost('local')
    host.setFile('/vault/Assets/Bilder/x.png', 'PNG')
    const reader = new VaultReader(() => host, () => settingsFor('/vault'), () => [])
    expect((await reader.readAsset('Assets/Bilder/x.png'))?.toString()).toBe('PNG')
    expect((await reader.readAsset('Bilder/x.png'))?.toString()).toBe('PNG')
    await expect(reader.readAsset('../../etc/passwd')).rejects.toThrow(/Ungültiger/)
  })
})

describe('Review: Einstellungen', () => {
  it('überschreibt den gespeicherten Host-Fingerabdruck nicht über normale Updates', () => {
    const container = new Container(mkdtempSync(join(tmpdir(), 'aii-c-')), () => undefined, () => undefined, { showNotification: () => undefined, focusWindow: () => undefined, showInFolder: () => undefined })
    const device = { id: 'nas', name: 'NAS', color: '#5fb37a', icon: null, projectsDir: '~', enabled: false, host: 'nas.local', port: 22, user: 'ich', privateKeyPath: '/k', hostFingerprint: '' }
    container.settings.update({ devices: [{ ...device, hostFingerprint: 'abc' }] })
    container.updateSettings({ devices: [{ ...device, hostFingerprint: '', user: 'neu' }] })
    expect(container.settings.get().devices[0]).toMatchObject({ hostFingerprint: 'abc', user: 'neu' })
    container.resetFingerprint('nas')
    expect(container.settings.get().devices[0]?.hostFingerprint).toBe('')
    container.stop()
  })
})

describe('Review: Tastatur', () => {
  it('erkennt Fokus im Terminal, damit Strg+K dort ankommt', () => {
    const inTerminal = { closest: (sel: string) => (sel === '.xterm' ? {} : null) }
    const elsewhere = { closest: () => null }
    expect(isTerminalTarget(inTerminal)).toBe(true)
    expect(isTerminalTarget(elsewhere)).toBe(false)
    expect(isTerminalTarget(null)).toBe(false)
  })
})
