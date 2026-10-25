import { describe, expect, it } from 'vitest'
import type { SshSettings } from '@shared/types'
import { SshConnection } from '../../src/main/hosts/SshConnection'
import { SshHost } from '../../src/main/hosts/SshHost'

/** Läuft nur mit einem Test-sshd: AII_SSH_TEST_KEY=/pfad/zum/key AII_SSH_TEST_PORT=2299 npm test */
const key = process.env['AII_SSH_TEST_KEY']
const port = Number(process.env['AII_SSH_TEST_PORT'] ?? 0)

describe.skipIf(!key)('SshHost (Integration)', () => {
  let saved = ''
  const settings: SshSettings = {
    enabled: true,
    host: '127.0.0.1',
    port,
    user: process.env['USER'] ?? 'alex',
    privateKeyPath: key ?? '',
    hostFingerprint: ''
  }

  it('liest, schreibt atomar und merkt sich den Host-Schlüssel', async () => {
    const connection = new SshConnection(() => settings, (fp) => (saved = fp))
    const host = new SshHost(connection, 'mini-pc', () => 'Mini-PC')
    const dir = `/tmp/aii-ssh-test-${Date.now()}`
    await host.writeFileAtomic(`${dir}/Vault Ordner/TODO.md`, 'hallo welt')
    expect((await host.readFile(`${dir}/Vault Ordner/TODO.md`, 6)).toString()).toBe('welt')
    expect((await host.readDir(dir)).map((e) => [e.name, e.isDirectory])).toEqual([['Vault Ordner', true]])
    expect(await host.stat(`${dir}/fehlt`)).toBeNull()
    await expect(host.readDir(`${dir}/fehlt`)).rejects.toMatchObject({ code: 'ENOENT' })
    expect((await host.homeDir()).length).toBeGreaterThan(1)
    expect(saved).toMatch(/^[0-9a-f]{64}$/)
    await host.exec(`rm -rf '${dir}'`)
    connection.dispose()
  })

  it('verbindet nach einem Fehlschlag erneut, wenn die Einstellungen korrigiert wurden', async () => {
    const mutable = { ...settings, privateKeyPath: '/gibt/es/nicht' }
    const connection = new SshConnection(() => mutable, () => undefined)
    const prevAgent = process.env['SSH_AUTH_SOCK']
    delete process.env['SSH_AUTH_SOCK']
    await expect(new SshHost(connection, 'mini-pc', () => 'Mini-PC').exec('true')).rejects.toMatchObject({ code: 'HOST_UNREACHABLE' })
    if (prevAgent) process.env['SSH_AUTH_SOCK'] = prevAgent
    mutable.privateKeyPath = key ?? ''
    expect((await new SshHost(connection, 'mini-pc', () => 'Mini-PC').exec('echo wieder')).stdout).toBe('wieder\n')
    connection.dispose()
  })

  it('lehnt einen geänderten Host-Schlüssel ab', async () => {
    const connection = new SshConnection(() => ({ ...settings, hostFingerprint: 'f'.repeat(64) }), () => undefined)
    await expect(new SshHost(connection, 'mini-pc', () => 'Mini-PC').exec('true')).rejects.toMatchObject({ code: 'HOST_KEY_MISMATCH' })
  })
})
