import { describe, expect, it } from 'vitest'
import type { Category, Favorite, FavoriteInput, Settings, SettingsPatch } from '@shared/types'
import { defaultSettings } from '../../src/main/settings/SettingsService'
import { SetupService } from '../../src/main/setup/SetupService'
import { parseProposal } from '../../src/main/setup/proposal'
import { FakeHost } from '../helpers/FakeHost'

function setup(host = new FakeHost('local', '/home/ich')) {
  let settings: Settings = defaultSettings('/home/ich', 'linux')
  const favorites: Favorite[] = []
  const categories: Category[] = [{ id: 1, name: 'Programmieren', color: '#e08a4f', icon: null, sortOrder: 0 }]
  const service = new SetupService({
    host,
    platform: 'linux',
    settings: () => settings,
    updateSettings: (patch: SettingsPatch) => (settings = { ...settings, ...patch }),
    favorites: () => favorites,
    addFavorite: (input: FavoriteInput) => {
      const fav = { ...input, id: favorites.length + 1, sortOrder: 0, createdAt: 0, categoryId: input.categoryId ?? null, starred: input.starred ?? true, icon: input.icon ?? null }
      favorites.push(fav)
      return fav
    },
    categories: () => categories,
    addCategory: (input) => {
      const c = { ...input, id: categories.length + 1, sortOrder: categories.length }
      categories.push(c)
      return c
    },
    testSsh: async (device) => {
      if (device.host !== 'ok') throw new Error('nicht erreichbar')
    }
  })
  return { service, host, favorites, categories, settings: () => settings }
}

describe('SetupService', () => {
  it('findet Projektordner, Vaults, SSH-Schlüssel und einen Vorschlag', async () => {
    const host = new FakeHost('local', '/home/ich')
    host.setFile('/home/ich/projects/app/.git/HEAD', 'ref')
    host.setFile('/home/ich/Documents/Notizen/.obsidian/app.json', '{}')
    host.setFile('/home/ich/.ssh/id_ed25519', 'KEY')
    host.setFile('/home/ich/ai-interface-setup.json', JSON.stringify({ projectsRoot: '/home/ich/projects', devices: [{ name: 'NAS', host: 'nas', user: 'ich' }] }))
    const result = await setup(host).service.detect()
    expect(result.projectRootCandidates).toEqual(['/home/ich/projects'])
    expect(result.vaultCandidates).toEqual(['/home/ich/Documents/Notizen'])
    expect(result.sshKeyCandidates).toEqual(['/home/ich/.ssh/id_ed25519'])
    expect(result.proposal?.devices?.[0]?.name).toBe('NAS')
    expect(result.proposalError).toBeNull()
  })

  it('klappt Sammelordner auf und erkennt Git und CLAUDE.md', async () => {
    const host = new FakeHost('local', '/home/ich')
    host.setFile('/p/app/.git/HEAD', 'x')
    host.setFile('/p/Uni/mathe/CLAUDE.md', '#')
    host.setFile('/p/Uni/notizen.txt', 'x')
    host.setFile('/p/leer/readme.md', 'x')
    const found = await setup(host).service.scanProjects('/p')
    expect(found.map((f) => [f.name, f.isGit, f.hasClaudeMd])).toEqual([
      ['app', true, false],
      ['leer', false, false],
      ['mathe', false, true]
    ])
  })

  it('findet TODO-Dateien und Protokollordner im Vault', async () => {
    const host = new FakeHost('local', '/home/ich')
    host.setFile('/v/Arbeit/TODO.md', '- [ ] x')
    host.setFile('/v/Arbeit/Server/Protokoll/2026-01-01.md', '#')
    host.setFile('/v/.obsidian/todo.md', 'nicht')
    const scan = await setup(host).service.scanVault('/v')
    expect(scan).toEqual({ todoFiles: ['Arbeit/TODO.md'], protocolDirs: ['Arbeit/Server/Protokoll'], topDirs: ['Arbeit'] })
  })

  it('speichert die Einrichtung ohne Dubletten', () => {
    const { service, favorites, categories, settings } = setup()
    const project = { host: 'local', path: '/p/app', name: 'App', category: 'Programmieren', color: '#e08a4f', icon: null, starred: true }
    const input = {
      projectsRoot: '/p',
      vault: { path: '', todoFile: '', protocolDir: '', notesDir: '' },
      devices: [],
      categories: [{ name: 'programmieren', color: '#000000', icon: null }, { name: 'Uni', color: '#6f9bd8', icon: null }],
      projects: [project, project],
      launchOnStartup: false
    }
    service.finish(input)
    service.finish(input)
    expect(settings()).toMatchObject({ setupDone: true, projectsRoot: '/p', todoFile: 'TODO.md', launchOnStartup: false })
    expect(categories.map((c) => c.name)).toEqual(['Programmieren', 'Uni'])
    expect(favorites).toHaveLength(1)
    expect(favorites[0]?.categoryId).toBe(1)
  })

  it('lehnt doppelte Geräte-IDs ab und testet Verbindungen ohne Ausnahme', async () => {
    const { service } = setup()
    const device = { id: 'nas', name: 'NAS', color: '#fff', icon: null, projectsDir: '~', enabled: true, host: 'ok', port: 22, user: 'ich', privateKeyPath: '', hostFingerprint: '' }
    expect(() => service.finish({ projectsRoot: '/p', vault: { path: '', todoFile: '', protocolDir: '', notesDir: '' }, devices: [device, device], categories: [], projects: [], launchOnStartup: true })).toThrow(/doppelt/)
    expect(await service.testDevice(device)).toMatchObject({ ok: true })
    expect(await service.testDevice({ ...device, host: 'weg' })).toEqual({ ok: false, message: 'nicht erreichbar' })
  })
})

describe('parseProposal', () => {
  it('meldet kaputtes JSON und falsche Felder verständlich', () => {
    expect(parseProposal('{').error).toMatch(/JSON/)
    expect(parseProposal('{"devices":[{"name":"x"}]}').error).toMatch(/devices\.0\.host/)
    expect(parseProposal('\uFEFF{"projectsRoot":"D:\\\\GitHub"}').proposal?.projectsRoot).toBe('D:\\GitHub')
  })
})

describe('Beispiel in docs/ai-interface-setup.example.json', () => {
  it('ist ein gültiger Vorschlag', async () => {
    const { readFileSync } = await import('node:fs')
    const result = parseProposal(readFileSync('docs/ai-interface-setup.example.json', 'utf8'))
    expect(result.error).toBeNull()
    expect(result.proposal?.devices?.[0]?.id).toBe('server')
  })
})
