import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { ApiEvents } from '@shared/api'
import type { ImageMeta, SettingsPatch, TerminalInfo } from '@shared/types'
import { Container } from '../../src/main/container'
import { openDatabase } from '../../src/main/db/Database'
import { ValidationError } from '../../src/main/errors'
import { verifyPin } from '../../src/main/privacy/PinHasher'
import { PrivateProjectsRepo } from '../../src/main/privacy/PrivateProjectsRepo'
import { PrivacyService } from '../../src/main/privacy/PrivacyService'
import { imagesAddedPayload, isTerminalHidden } from '../../src/main/privacy/filters'
import { fillSlots } from '../../src/renderer/src/lib/terminalLayout'

const DIARY = 'C:\\Users\\Alex\\OneDrive\\Obsidian Vault\\Programmieren\\Privat\\Tagebuch'

type Emitted = { readonly event: keyof ApiEvents; readonly payload: unknown }

function container() {
  const emitted: Emitted[] = []
  const c = new Container(mkdtempSync(join(tmpdir(), 'aii-priv-')), (event, payload) => emitted.push({ event, payload }), () => undefined, {
    showNotification: () => undefined,
    focusWindow: () => undefined,
    showInFolder: () => undefined
  })
  return { c, emitted }
}

describe('Review-Fixes Privatmodus', () => {
  it('settings.update kann den PIN-Hash nicht überschreiben', () => {
    const { c } = container()
    c.privacy.setPin(null, '1234')
    c.privacy.lock()
    c.updateSettings({ privacyPin: null } as unknown as SettingsPatch)
    expect(c.privacy.status().hasPin).toBe(true)
    expect(() => c.privacy.setPin(null, '0000')).toThrow()
  })

  it('offene Durchläufe privater Projekte werden gesperrt nicht gemeldet', () => {
    const { c } = container()
    c.privacy.setPin(null, '1234')
    c.privacy.add({ host: 'local', path: DIARY, label: 'Tagebuch' })
    c.privacy.lock()
    c.runs.apply('local', {
      interruptions: [
        { sessionId: 'p', project: DIARY, timestamp: 1, message: 'Limit' },
        { sessionId: 'o', project: 'D:\\GitHub\\Projects\\ai-interface', timestamp: 1, message: 'Limit' }
      ],
      answers: [],
      prompts: [],
      consumedBytes: 0
    })
    expect(c.openRuns().map((r) => r.sessionId)).toEqual(['o'])
  })

  it('images:added verrät gesperrt keine privaten Projekte', () => {
    const hidden = (_h: string, p: string | null): boolean => p === DIARY
    const priv = { id: 1, host: 'local', project: DIARY } as unknown as ImageMeta
    const pub = { id: 2, host: 'local', project: 'D:\\x' } as unknown as ImageMeta
    expect(imagesAddedPayload([priv], hidden)).toBeNull()
    expect(imagesAddedPayload([priv, pub], hidden)).toEqual({ count: 1, projects: ['D:\\x'] })
  })

  it('verborgene Terminals werden erkannt; im Tabs-Modus kein Slot für unbekannte IDs', () => {
    const terms = [{ id: 't1', host: 'local', path: DIARY }] as unknown as TerminalInfo[]
    const hidden = (_h: string, p: string | null): boolean => p === DIARY
    expect(isTerminalHidden(terms, 't1', hidden)).toBe(true)
    expect(isTerminalHidden(terms, 'unbekannt', hidden)).toBe(false)
    expect(fillSlots(['a'], [null], 'tabs', 'verborgen')).toEqual(['a'])
  })

  it('Sperren leert den Assistenten', () => {
    const { c } = container()
    c.privacy.setPin(null, '1234')
    const reset = vi.spyOn(c.assistant, 'reset').mockResolvedValue(undefined)
    c.privacy.lock()
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('verifyPin lehnt kaputte Hashes ab', () => {
    expect(verifyPin('1234', 'scrypt$00$zz')).toBe(false)
    expect(verifyPin('1234', 'scrypt$00$')).toBe(false)
  })

  it('add lehnt Wurzel, leere Pfade, fremde Hosts und normalisierte Duplikate ab', () => {
    const db = openDatabase(join(mkdtempSync(join(tmpdir(), 'priv-add-')), 'db.sqlite'))
    let pin: string | null = null
    const service = new PrivacyService(new PrivateProjectsRepo(db), { get: () => pin, set: (v) => (pin = v) }, { now: Date.now, onChange: () => undefined, knownHosts: () => ['local', 'mini-pc'] })
    service.setPin(null, '1234')
    service.add({ host: 'local', path: DIARY, label: 'Tagebuch' })
    expect(() => service.add({ host: 'mini-pc', path: '/', label: 'x' })).toThrow(ValidationError)
    expect(() => service.add({ host: 'local', path: '  ', label: 'x' })).toThrow(ValidationError)
    expect(() => service.add({ host: 'local', path: 'D:\\', label: 'x' })).toThrow(ValidationError)
    expect(() => service.add({ host: 'server' as 'local', path: 'D:\\x', label: 'x' })).toThrow(ValidationError)
    expect(() => service.add({ host: 'local', path: `${DIARY.toLowerCase()}\\`, label: 'x' })).toThrow(ValidationError)
  })
})
