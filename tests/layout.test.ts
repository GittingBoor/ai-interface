import { describe, expect, it } from 'vitest'
import { de } from '@shared/i18n/de'
import { en } from '@shared/i18n/en'
import { DEFAULT_NAVIGATION, deviceIdFrom, moveItem, navGroupLabel, resolveNavigation, resolveSections, visibleNavigation } from '@shared/layout'

const VIEWS = ['overview', 'projects', 'terminal', 'runs', 'todos', 'protocols', 'knowledge', 'gallery', 'models', 'skills', 'howto', 'settings']

describe('Navigation', () => {
  it('ordnet Geräte in „Geräte“ ein und blendet leere Gruppen aus', () => {
    const groups = visibleNavigation(DEFAULT_NAVIGATION, [...VIEWS, 'device:nas'])
    expect(groups.find((g) => g.id === 'devices')?.items).toEqual(['device:nas'])
    expect(visibleNavigation(DEFAULT_NAVIGATION, VIEWS).some((g) => g.id === 'devices')).toBe(false)
  })

  it('behält eigene Anordnung, entfernt Unbekanntes und ergänzt neue Bereiche', () => {
    const nav = { groups: [{ id: 'mein', label: 'Mein', items: ['skills', 'weg', 'overview', 'skills'] }], hidden: ['skills', 'settings'], collapsed: [] }
    const groups = resolveNavigation(nav, VIEWS)
    expect(groups[0]).toEqual({ id: 'mein', label: 'Mein', items: ['skills', 'overview'] })
    expect(groups.find((g) => g.id === 'app')?.items).toEqual(['howto', 'settings'])
    const visible = visibleNavigation(nav, VIEWS)
    expect(visible[0]?.items).toEqual(['overview'])
    expect(visible.flatMap((g) => g.items)).toContain('settings')
  })

  it('setzt die Startseite in gespeicherten Anordnungen an den Anfang ihrer Gruppe', () => {
    const saved = { groups: [{ id: 'work', label: 'Arbeiten', items: ['overview', 'projects', 'terminal', 'runs'] }], hidden: [], collapsed: [] }
    expect(resolveNavigation(saved, ['home', ...VIEWS])[0]?.items).toEqual(['home', 'overview', 'projects', 'terminal', 'runs'])
    expect(DEFAULT_NAVIGATION.groups[0]?.items[0]).toBe('home')
  })

  it('heißt jetzt „Verknüpfungen“, auch in gespeicherten Anordnungen', () => {
    const nav = { groups: [{ id: 'devices', label: 'Geräte', items: [] }, { id: 'eigen', label: 'Geräte', items: [] }], hidden: [], collapsed: [] }
    expect(resolveNavigation(nav, []).map((g) => g.label)).toEqual(['Verknüpfungen', 'Geräte'])
  })

  it('setzt neue Webseiten hinter ihr Gerät, auch wenn das Gerät verschoben wurde', () => {
    const nav = { groups: [{ id: 'mein', label: 'Mein', items: ['device:mini-pc', 'overview'] }], hidden: [], collapsed: [] }
    const groups = resolveNavigation(nav, ['overview', 'device:mini-pc', 'link:ha', 'link:mc', 'device:nas', 'link:router'])
    expect(groups.find((g) => g.id === 'mein')?.items).toEqual(['device:mini-pc', 'link:ha', 'link:mc', 'overview'])
    expect(groups.find((g) => g.id === 'devices')?.items).toEqual(['device:nas', 'link:router'])
  })

  it('setzt Webseiten ohne Gerät unter „Verknüpfungen“, nicht hinter den letzten Bereich', () => {
    const groups = resolveNavigation(DEFAULT_NAVIGATION, [...VIEWS, 'link:smarthome'])
    expect(groups.find((g) => g.id === 'devices')?.items).toEqual(['link:smarthome'])
    expect(groups.find((g) => g.id === 'app')?.items).toEqual(['howto', 'settings'])
  })
})

describe('Projektwissen in der Navigation', () => {
  it('layout: knowledge sits in notes after protocols', () => {
    const notes = resolveNavigation(DEFAULT_NAVIGATION, VIEWS).find((g) => g.id === 'notes')
    expect(notes?.items).toEqual(['todos', 'protocols', 'knowledge', 'gallery'])
  })

  it('layout: saved navigation without knowledge gets it in notes', () => {
    const saved = { groups: [{ id: 'notes', label: 'Notizen', items: ['gallery', 'todos', 'protocols'] }], hidden: [], collapsed: [] }
    const notes = resolveNavigation(saved, VIEWS).find((g) => g.id === 'notes')
    expect(notes?.items).toEqual(['gallery', 'todos', 'protocols', 'knowledge'])
  })
})

describe('Abschnitte', () => {
  it('ergänzt neue Abschnitte an ihrer Standardstelle', () => {
    expect(resolveSections({ order: ['c', 'a', 'x'], hidden: ['a'] }, ['a', 'b', 'c'])).toEqual([
      { id: 'c', hidden: false },
      { id: 'a', hidden: true },
      { id: 'b', hidden: false }
    ])
    expect(resolveSections(undefined, ['a', 'b']).map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('verschiebt begrenzt', () => {
    expect(moveItem(['a', 'b', 'c'], 'a', 1)).toEqual(['b', 'a', 'c'])
    expect(moveItem(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c'])
  })
})

describe('deviceIdFrom', () => {
  it('erzeugt freie IDs', () => {
    expect(deviceIdFrom('Mini-PC', [])).toBe('mini-pc')
    expect(deviceIdFrom('Mini PC', ['mini-pc'])).toBe('mini-pc-2')
    expect(deviceIdFrom('Größe', [])).toBe('groesse')
    expect(deviceIdFrom('!!', [])).toBe('geraet')
    expect(deviceIdFrom('local', [])).toBe('local-2')
  })
})

describe('navGroupLabel', () => {
  it('übersetzt eingebaute Gruppen mit Standardnamen', () => {
    expect(navGroupLabel({ id: 'work', label: 'Arbeiten' }, en)).toBe('Work')
    expect(navGroupLabel({ id: 'devices', label: 'Geräte' }, en)).toBe('Shortcuts')
    expect(navGroupLabel({ id: 'work', label: 'Arbeiten' }, de)).toBe('Arbeiten')
  })

  it('lässt selbst vergebene Namen und eigene Gruppen unverändert', () => {
    expect(navGroupLabel({ id: 'work', label: 'Meine Arbeit' }, en)).toBe('Meine Arbeit')
    expect(navGroupLabel({ id: 'eigen', label: 'Arbeiten' }, en)).toBe('Arbeiten')
  })
})
