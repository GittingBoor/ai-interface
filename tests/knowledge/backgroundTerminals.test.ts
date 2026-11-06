import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import type { InterruptedRun, TerminalInfo } from '@shared/types'
import { withoutBackground, withoutRunsIn } from '../../src/main/privacy/filters'
import { SshConnection } from '../../src/main/hosts/SshConnection'
import { TerminalService } from '../../src/main/terminal/TerminalService'

const cast = <T>(value: unknown): T => value as T
const SHELL_TEST_TIMEOUT_MS = 20_000

describe('withoutBackground', () => {
  it('drops knowledge terminals', () => {
    const items = cast<TerminalInfo[]>([{ id: 'a' }, { id: 'b', background: 'knowledge' }, { id: 'c', orchestrator: true }])
    expect(withoutBackground(items).map((t) => t.id)).toEqual(['a', 'c'])
  })
})

describe('withoutRunsIn', () => {
  const run = (project: string): InterruptedRun => cast<InterruptedRun>({ host: 'local', sessionId: project, project })

  it('drops runs whose project is the knowledge dir', () => {
    const runs = [
      run('C:\\Daten\\App\\projektwissen'),
      run('C:/Daten/App/projektwissen/'),
      run('c:\\daten\\APP\\Projektwissen\\'),
      run('C:\\Daten\\App\\anderes'),
      run('C:\\Daten\\App\\projektwissen-x')
    ]
    const kept = withoutRunsIn(runs, 'C:/Daten/App/projektwissen')
    expect(kept.map((r) => r.project)).toEqual(['C:\\Daten\\App\\anderes', 'C:\\Daten\\App\\projektwissen-x'])
  })
})

describe('TerminalService', () => {
  it('keeps background flag in info', async () => {
    const ssh = new SshConnection(
      () => ({ enabled: false, host: '', port: 22, user: '', privateKeyPath: '', hostFingerprint: '' }),
      () => undefined
    )
    const service = new TerminalService(() => ssh, () => 'echo', { onData: () => undefined, onExit: () => undefined })
    const info = await service.open({ host: 'local', path: tmpdir(), mode: 'shell', title: 'w', cols: 80, rows: 24 }, { background: 'knowledge' })
    expect(info.background).toBe('knowledge')
    expect(service.list()[0]?.background).toBe('knowledge')
    service.close(info.id)
  }, SHELL_TEST_TIMEOUT_MS)
})
