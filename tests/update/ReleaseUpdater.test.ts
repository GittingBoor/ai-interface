import { describe, expect, it } from 'vitest'
import { ReleaseUpdater, type ReleaseClient } from '../../src/main/update/ReleaseUpdater'

function client(overrides: Partial<ReleaseClient> = {}): ReleaseClient {
  return {
    checkForUpdates: async () => ({ isUpdateAvailable: true, updateInfo: { version: '0.3.0' } }),
    downloadUpdate: async () => ['C:\\Temp\\AI-Interface-Setup.exe'],
    ...overrides
  }
}

describe('ReleaseUpdater', () => {
  it('meldet ein neueres Release mit seiner Version', async () => {
    expect(await new ReleaseUpdater(client()).check()).toEqual({ kind: 'available', remote: '0.3.0' })
  })

  it('ist aktuell, wenn GitHub nichts Neueres hat', async () => {
    const updater = new ReleaseUpdater(client({ checkForUpdates: async () => ({ isUpdateAvailable: false, updateInfo: { version: '0.2.0' } }) }))
    expect(await updater.check()).toEqual({ kind: 'up-to-date' })
  })

  it('überspringt, wenn die Prüfung nicht laufen kann (z. B. ohne app-update.yml)', async () => {
    const updater = new ReleaseUpdater(client({ checkForUpdates: async () => null }))
    expect((await updater.check()).kind).toBe('skipped')
  })

  it('lädt das Update herunter und liefert den Installer', async () => {
    expect(await new ReleaseUpdater(client()).build()).toBe('C:\\Temp\\AI-Interface-Setup.exe')
  })

  it('wirft, wenn der Download keinen Installer liefert', async () => {
    await expect(new ReleaseUpdater(client({ downloadUpdate: async () => [] })).build()).rejects.toThrow()
  })
})
