import { describe, expect, it } from 'vitest'
import type { SetupDetection } from '@shared/types'
import { defaultSettings } from '../../src/main/settings/SettingsService'
import { draftFromDetection, mergeScan, toSetupInput } from '../../src/renderer/src/lib/setupDraft'

const detection = (patch: Partial<SetupDetection> = {}): SetupDetection => ({
  platform: 'linux',
  homeDir: '/home/ich',
  proposalPath: '/home/ich/ai-interface-setup.json',
  proposal: null,
  proposalError: null,
  projectRootCandidates: ['/home/ich/code'],
  vaultCandidates: ['/home/ich/Notizen'],
  sshKeyCandidates: ['/home/ich/.ssh/id_ed25519'],
  existingInstall: false,
  ...patch
})
const settings = defaultSettings('/home/ich', 'linux')

describe('setupDraft', () => {
  it('nimmt bei einer neuen Installation die gefundenen Ordner', () => {
    const draft = draftFromDetection(detection(), settings)
    expect(draft.projectsRoot).toBe('/home/ich/code')
    expect(draft).toMatchObject({ useVault: true, vault: { path: '/home/ich/Notizen' } })
  })

  it('übernimmt den Vorschlag mit Geräten, Arten und Projekten', () => {
    const draft = draftFromDetection(
      detection({
        proposal: {
          projectsRoot: 'D:\\GitHub',
          vault: null,
          devices: [{ name: 'Mini-PC', host: '10.0.0.2', user: 'ich' }],
          categories: [{ name: 'Smarthome', color: '#5fb3a8' }],
          projects: [{ path: '/home/ich/smart', device: 'Mini-PC', category: 'smarthome' }]
        }
      }),
      settings
    )
    expect(draft.projectsRoot).toBe('D:\\GitHub')
    expect(draft.useVault).toBe(false)
    expect(draft.devices[0]).toMatchObject({ id: 'mini-pc', privateKeyPath: '/home/ich/.ssh/id_ed25519', port: 22 })
    expect(draft.projects[0]).toMatchObject({ host: 'mini-pc', name: 'smart', category: 'Smarthome', color: '#5fb3a8', fromProposal: true })
    const input = toSetupInput(draft)
    expect(input.vault.path).toBe('')
    expect(input.projects).toHaveLength(1)
  })

  it('mischt neu gelesene Ordner ein und wählt Git-Projekte vor, schon eingetragene nicht', () => {
    const scanned = [
      { path: '/c/a', name: 'a', isGit: true, hasClaudeMd: false },
      { path: '/c/b', name: 'b', isGit: false, hasClaudeMd: false },
      { path: '/c/c', name: 'c', isGit: true, hasClaudeMd: false }
    ]
    const merged = mergeScan([], scanned, new Set(['local\n/c/c']))
    expect(merged.map((p) => [p.name, p.selected])).toEqual([
      ['a', true],
      ['b', false],
      ['c', false]
    ])
    const again = mergeScan([{ ...merged[0]!, selected: false }], scanned, new Set())
    expect(again[0]?.selected).toBe(false)
  })
})
