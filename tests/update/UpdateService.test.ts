import { describe, expect, it } from 'vitest'
import type { UpdateMode, UpdateState } from '../../src/shared/types'
import { UpdateError } from '../../src/main/errors'
import type { UpdateCheck } from '../../src/main/update/StartupUpdater'
import { type UpdateSource, UpdateService } from '../../src/main/update/UpdateService'

const INSTALLER = 'release/AI Interface Setup 0.2.0.exe'

class FakeSource implements UpdateSource {
  builds = 0
  constructor(
    private readonly result: UpdateCheck,
    private readonly buildFails = false
  ) {}

  async check(): Promise<UpdateCheck> {
    return this.result
  }

  async build(): Promise<string> {
    this.builds++
    if (this.buildFails) throw new UpdateError('npm run dist:win', 'tsc kaputt')
    return INSTALLER
  }
}

function setup(result: UpdateCheck, mode: UpdateMode, options: { supported?: boolean; buildFails?: boolean } = {}) {
  const source = new FakeSource(result, options.buildFails)
  const launched: string[] = []
  const notes: string[] = []
  const states: UpdateState[] = []
  let quits = 0
  const service = new UpdateService({
    supported: options.supported ?? true,
    source,
    mode: () => mode,
    launchInstaller: (path) => launched.push(path),
    quit: () => quits++,
    notify: (title) => notes.push(title),
    emit: (state) => states.push(state),
    log: () => undefined,
    logError: () => undefined,
    waitForNetwork: async () => undefined
  })
  return { service, source, launched, notes, states, quits: () => quits }
}

const available: UpdateCheck = { kind: 'available', remote: 'bbb222' }

describe('UpdateService', () => {
  it('meldet im manuellen Modus beim Login nur, dass ein Update da ist', async () => {
    const t = setup(available, 'manual')
    await t.service.startup(true)
    expect(t.service.state().phase).toBe('available')
    expect(t.source.builds).toBe(0)
    expect(t.notes).toEqual(['Update verfügbar'])
  })

  it('installiert im automatischen Modus beim Login selbst', async () => {
    const t = setup(available, 'auto')
    await t.service.startup(true)
    expect(t.launched).toEqual([INSTALLER])
    expect(t.quits()).toBe(1)
  })

  it('installiert im automatischen Modus nicht bei einem normalen Start', async () => {
    const t = setup(available, 'auto')
    await t.service.startup(false)
    expect(t.service.state().phase).toBe('available')
    expect(t.launched).toEqual([])
  })

  it('baut und installiert auf Knopfdruck', async () => {
    const t = setup(available, 'manual')
    await t.service.check()
    await t.service.install()
    expect(t.launched).toEqual([INSTALLER])
    expect(t.quits()).toBe(1)
    expect(t.states.map((s) => s.phase)).toContain('building')
  })

  it('zeigt Fehler beim Bauen an und beendet die App nicht', async () => {
    const t = setup(available, 'manual', { buildFails: true })
    await t.service.install()
    expect(t.service.state().phase).toBe('failed')
    expect(t.service.state().detail).toContain('npm run dist:win')
    expect(t.quits()).toBe(0)
  })

  it('übernimmt den Grund, wenn die Prüfung übersprungen wird', async () => {
    const t = setup({ kind: 'skipped', reason: 'Repo hat uncommittete Änderungen' }, 'manual')
    await t.service.check()
    expect(t.service.state()).toMatchObject({ phase: 'skipped', detail: 'Repo hat uncommittete Änderungen' })
  })

  it('tut nichts außerhalb der installierten Windows-App', async () => {
    const t = setup(available, 'auto', { supported: false })
    await t.service.startup(true)
    await t.service.install()
    expect(t.service.state().phase).toBe('unsupported')
    expect(t.source.builds).toBe(0)
  })

  it('prüft beim Start nur einmal, auch wenn der Login-Start später als zweite Instanz ankommt', async () => {
    const t = setup(available, 'manual')
    await t.service.startup(false)
    await t.service.startup(true)
    expect(t.notes).toEqual(['Update verfügbar'])
  })
})
