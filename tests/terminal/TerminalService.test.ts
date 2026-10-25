import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import type { SshSettings } from '@shared/types'
import { SshConnection } from '../../src/main/hosts/SshConnection'
import { TerminalService } from '../../src/main/terminal/TerminalService'

const waitFor = async (check: () => boolean, timeoutMs = 5000): Promise<void> => {
  const start = Date.now()
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error('Timeout')
    await new Promise((r) => setTimeout(r, 25))
  }
}

/** PowerShell braucht für Start und Ende zusammen mehrere Sekunden. */
const SHELL_TEST_TIMEOUT_MS = 20_000

const LOCAL_ECHO_AND_EXIT =
  process.platform === 'win32' ? 'echo "hallo-$(40+2)"; exit\r' : 'echo hallo-$((40+2)); exit\n'

const disabledSsh = new SshConnection(
  () => ({ enabled: false, host: '', port: 22, user: '', privateKeyPath: '', hostFingerprint: '' }),
  () => undefined
)

describe('TerminalService (lokal)', () => {
  it('öffnet eine Shell, schreibt, puffert die Ausgabe und meldet das Ende', async () => {
    let exited = ''
    const service = new TerminalService(() => disabledSsh, () => 'claude', { onData: () => undefined, onExit: (id) => (exited = id) })
    const info = await service.open({ host: 'local', path: tmpdir(), mode: 'shell', title: 'tmp', cols: 80, rows: 24 })
    service.write(info.id, LOCAL_ECHO_AND_EXIT)
    await waitFor(() => exited === info.id)
    expect(service.snapshot(info.id)).toContain('hallo-42')
    expect(service.list()[0]).toMatchObject({ id: info.id, running: false })
    service.close(info.id)
    expect(service.list()).toEqual([])
  })

  it('übergibt den Startprompt und markiert den Orchestrator', async () => {
    let exited = ''
    const service = new TerminalService(() => disabledSsh, () => 'echo', { onData: () => undefined, onExit: (id) => (exited = id) })
    const info = await service.open({ host: 'local', path: tmpdir(), mode: 'new', title: 'o', cols: 80, rows: 24 }, { initialPrompt: 'startprompt-angekommen', orchestrator: true })
    expect(info.orchestrator).toBe(true)
    await waitFor(() => service.snapshot(info.id).includes('startprompt-angekommen'))
    service.write(info.id, process.platform === 'win32' ? 'exit\r' : 'exit\n')
    await waitFor(() => exited === info.id)
    service.close(info.id)
  }, SHELL_TEST_TIMEOUT_MS)

  it('meldet einen fehlenden Ordner verständlich', async () => {
    const service = new TerminalService(() => disabledSsh, () => 'claude', { onData: () => undefined, onExit: () => undefined })
    await expect(service.open({ host: 'local', path: '/gibt/es/nicht', mode: 'shell', title: 'x', cols: 80, rows: 24 })).rejects.toThrow(/Ordner/)
  })
})

const key = process.env['AII_SSH_TEST_KEY']
describe.skipIf(!key)('TerminalService (SSH, Integration)', () => {
  it('öffnet eine SSH-Shell im Ordner mit Leerzeichen', async () => {
    const settings: SshSettings = {
      enabled: true,
      host: '127.0.0.1',
      port: Number(process.env['AII_SSH_TEST_PORT']),
      user: process.env['USER'] ?? 'alex',
      privateKeyPath: key ?? '',
      hostFingerprint: ''
    }
    const connection = new SshConnection(() => settings, () => undefined)
    const service = new TerminalService(() => connection, () => 'claude', { onData: () => undefined, onExit: () => undefined })
    const info = await service.open({ host: 'mini-pc', path: '/tmp', mode: 'shell', title: 'ssh', cols: 100, rows: 30 })
    service.resize(info.id, 120, 40)
    service.write(info.id, 'echo "pwd=$(pwd) cols=$(tput cols)"\n')
    await waitFor(() => service.snapshot(info.id).includes('pwd=/tmp cols=120'))
    service.close(info.id)
    connection.dispose()
  })
})
