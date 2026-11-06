import { de } from '@shared/i18n/de'
import { describe, expect, it } from 'vitest'
import type { WebLinkSettings } from '@shared/types'
import { isWebUrl, keptLinks, linkError, normalizeUrl, rememberOpened } from '@shared/links'

const link = (patch: Partial<WebLinkSettings> = {}): WebLinkSettings => ({ id: 'ha', name: 'Smart Home', url: 'http://192.168.0.10:8123', color: '#5fb3c8', icon: null, deviceId: null, ...patch })

describe('Webseiten', () => {
  it('lässt nur http und https zu', () => {
    expect(isWebUrl('https://example.org')).toBe(true)
    expect(isWebUrl('http://10.0.0.1:8123')).toBe(true)
    expect(isWebUrl('file:///C:/Windows')).toBe(false)
    expect(isWebUrl('javascript:alert(1)')).toBe(false)
    expect(isWebUrl('kein url')).toBe(false)
  })

  it('ergänzt https:// nur ohne Protokoll', () => {
    expect(normalizeUrl(' panel.example.org ')).toBe('https://panel.example.org')
    expect(normalizeUrl('http://10.0.0.1:8123')).toBe('http://10.0.0.1:8123')
    expect(normalizeUrl('file:///etc/passwd')).toBe('file:///etc/passwd')
  })

  it('meldet fehlende Angaben, doppelte Namen und fremde Protokolle', () => {
    expect(linkError(link(), [], de)).toBeNull()
    expect(linkError(link({ url: 'panel.example.org' }), [], de)).toBeNull()
    expect(linkError(link({ name: ' ' }), [], de)).toMatch(/Namen/)
    expect(linkError(link({ url: '' }), [], de)).toMatch(/Adresse/)
    expect(linkError(link({ url: 'file:///etc/passwd' }), [], de)).toMatch(/http/)
    expect(linkError(link({ id: '' }), [link()], de)).toMatch(/gibt es schon/)
    expect(linkError(link(), [link()], de)).toBeNull()
  })

  it('merkt sich geöffnete Seiten nur einmal', () => {
    const opened = rememberOpened([], 'ha')
    expect(opened).toEqual(['ha'])
    expect(rememberOpened(opened, 'ha')).toBe(opened)
    expect(rememberOpened(opened, 'music')).toEqual(['ha', 'music'])
    expect(rememberOpened(opened, null)).toBe(opened)
  })

  it('hält nur geöffnete Seiten geladen, die es noch gibt', () => {
    const links = [link(), link({ id: 'music', name: 'Musik' }), link({ id: 'panel', name: 'Panel' })]
    expect(keptLinks(links, ['music', 'entfernt']).map((l) => l.id)).toEqual(['music'])
  })
})
