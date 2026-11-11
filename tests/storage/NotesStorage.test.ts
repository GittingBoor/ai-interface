import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import type { Favorite, Settings } from '@shared/types'
import { defaultSettings } from '../../src/main/settings/SettingsService'
import { NotesStorage, protocolDirective } from '../../src/main/storage/NotesStorage'

const APP_DIR = join('data', 'Notizen')

function favorite(patch: Partial<Favorite> = {}): Favorite {
  return { id: 1, host: 'local', path: join('work', 'demo'), name: 'Demo', color: '#e08a4f', sortOrder: 0, createdAt: 0, categoryId: null, starred: false, icon: null, ...patch }
}

function storage(patch: Partial<Settings>): NotesStorage {
  const settings: Settings = { ...defaultSettings('/home/alex', 'linux'), vault: { host: 'local', path: '/vault' }, ...patch }
  return new NotesStorage(() => settings, APP_DIR)
}

describe('NotesStorage', () => {
  it('lässt die Einstellungen im Obsidian-Modus unverändert', () => {
    const s = storage({ storage: 'obsidian' })
    expect(s.effective().vault.path).toBe('/vault')
    expect(s.protocolDir(favorite())).toBeNull()
  })

  it('zeigt im App-Modus den Vault auf den Notizordner der App', () => {
    const effective = storage({ storage: 'app', vault: { host: 'mini-pc', path: '/vault' } }).effective()
    expect(effective.vault).toEqual({ host: 'local', path: APP_DIR })
    expect(effective.todoFile).toBe('TODO.md')
    expect(effective.notesDir).toBe('Projekte')
  })

  it('nennt im App-Modus den Protokollordner lokaler Projekte, den der Vault-Leser findet', () => {
    const s = storage({ storage: 'app' })
    expect(s.protocolDir(favorite())).toBe(join(APP_DIR, 'Projekte', 'Demo', 'Protokoll'))
    expect(s.protocolDir(favorite({ host: 'mini-pc' }))).toBeNull()
  })

  it('findet das Projekt eines Terminals auch bei anderer Schreibweise des Pfads', () => {
    const s = storage({ storage: 'app' })
    const fav = favorite({ path: 'C:\\Work\\Demo' })
    expect(s.projectFor([fav], 'local', 'c:/work/demo/', 'win32')).toBe(fav)
    expect(s.projectFor([fav], 'local', 'C:\\Work\\Other', 'win32')).toBeNull()
    expect(s.projectFor([fav], 'mini-pc', 'C:\\Work\\Demo', 'win32')).toBeNull()
  })
})

describe('protocolDirective', () => {
  it('nennt Ablageort, Projekt und das Feld für offene Aufgaben', () => {
    const text = protocolDirective('/data/Notizen/Projekte/Demo/Protokoll', 'Demo', 'de')
    expect(text).toContain('/data/Notizen/Projekte/Demo/Protokoll')
    expect(text).toContain('Demo')
    expect(text).toContain('**Offen:**')
  })
})
