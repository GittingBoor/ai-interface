import { describe, expect, it } from 'vitest'
import type { TerminalStatus } from '@shared/types'
import { OrchestratorRelay, QUIET_MS } from '../../src/main/orchestrator/OrchestratorRelay'

function setup() {
  const statuses: Record<string, TerminalStatus> = { orch: 'idle' }
  const delivered: string[] = []
  const hidden = new Set<string>()
  let now = 100_000
  let orchId: string | null = 'orch'
  const relay = new OrchestratorRelay({
    orchestratorId: () => orchId,
    status: (id) => statuses[id],
    describe: (id) => (hidden.has(id) ? null : `Projekt ${id} (Dieser PC, Terminal ${id})`),
    deliver: async (text) => void delivered.push(text),
    now: () => now
  })
  return {
    relay,
    statuses,
    delivered,
    hidden,
    advance: (ms: number) => void (now += ms),
    closeOrchestrator: () => void (orchId = null)
  }
}

describe('OrchestratorRelay', () => {
  it('meldet nur beobachtete Terminals', async () => {
    const s = setup()
    s.relay.watch('t1')
    s.relay.onStatus({ id: 't1', status: 'review' })
    s.relay.onStatus({ id: 't9', status: 'review' })
    await s.relay.tick()
    expect(s.delivered).toEqual(['[AI Interface] Projekt t1 (Dieser PC, Terminal t1): fertig. read_terminal für Details.'])
  })

  it('ignoriert working und idle', async () => {
    const s = setup()
    s.relay.watch('t1')
    s.relay.onStatus({ id: 't1', status: 'working' })
    s.relay.onStatus({ id: 't1', status: 'idle' })
    await s.relay.tick()
    expect(s.delivered).toEqual([])
  })

  it('wartet, solange der Orchestrator arbeitet oder gerade getippt wurde', async () => {
    const s = setup()
    s.relay.watch('t1')
    s.relay.onStatus({ id: 't1', status: 'question' })
    s.statuses['orch'] = 'working'
    await s.relay.tick()
    expect(s.delivered).toEqual([])
    s.statuses['orch'] = 'idle'
    s.relay.noteInput('weiter\r')
    s.advance(QUIET_MS - 1)
    await s.relay.tick()
    expect(s.delivered).toEqual([])
    s.advance(1)
    await s.relay.tick()
    expect(s.delivered).toEqual(['[AI Interface] Projekt t1 (Dieser PC, Terminal t1): hat eine Frage. read_terminal für Details.'])
  })

  it('fasst mehrere wartende Zeilen zusammen, je Terminal nur den letzten Stand', async () => {
    const s = setup()
    s.relay.watch('t1')
    s.relay.watch('t2')
    s.statuses['orch'] = 'working'
    s.relay.onStatus({ id: 't1', status: 'permission' })
    s.relay.onStatus({ id: 't1', status: 'review' })
    s.relay.onStatus({ id: 't2', status: 'exited' })
    s.statuses['orch'] = 'review'
    await s.relay.tick()
    expect(s.delivered).toEqual([
      '[AI Interface] 2 Meldungen:\n- Projekt t1 (Dieser PC, Terminal t1): fertig.\n- Projekt t2 (Dieser PC, Terminal t2): beendet.\nread_terminal für Details.'
    ])
  })

  it('verrät verborgene Terminals nicht', async () => {
    const s = setup()
    s.relay.watch('t1')
    s.hidden.add('t1')
    s.relay.onStatus({ id: 't1', status: 'review' })
    await s.relay.tick()
    expect(s.delivered).toEqual([])
  })

  it('verwirft wartende Zeilen, wenn der Orchestrator geschlossen ist', async () => {
    const s = setup()
    s.relay.watch('t1')
    s.statuses['orch'] = 'working'
    s.relay.onStatus({ id: 't1', status: 'review' })
    s.closeOrchestrator()
    await s.relay.tick()
    s.statuses['orch'] = 'idle'
    await s.relay.tick()
    expect(s.delivered).toEqual([])
  })

  it('schickt keinen halb getippten Entwurf mit ab', async () => {
    const s = setup()
    s.relay.watch('t1')
    s.relay.noteInput('halber Satz')
    s.relay.onStatus({ id: 't1', status: 'review' })
    s.advance(QUIET_MS * 10)
    await s.relay.tick()
    expect(s.delivered).toEqual([])
    s.relay.noteInput('\r')
    s.advance(QUIET_MS)
    await s.relay.tick()
    expect(s.delivered).toHaveLength(1)
  })

  it('ein abgeschickter Prompt im Orchestrator beendet den Entwurf', async () => {
    const s = setup()
    s.relay.watch('t1')
    s.relay.noteInput('Text')
    s.relay.onStatus({ id: 'orch', status: 'working' })
    s.relay.onStatus({ id: 't1', status: 'review' })
    s.advance(QUIET_MS)
    await s.relay.tick()
    expect(s.delivered).toHaveLength(1)
  })

  it('prüft den Privatmodus erst bei der Zustellung und behält verborgene Zeilen', async () => {
    const s = setup()
    s.relay.watch('t1')
    s.statuses['orch'] = 'working'
    s.relay.onStatus({ id: 't1', status: 'review' })
    s.hidden.add('t1')
    s.statuses['orch'] = 'idle'
    await s.relay.tick()
    expect(s.delivered).toEqual([])
    s.hidden.delete('t1')
    await s.relay.tick()
    expect(s.delivered).toEqual(['[AI Interface] Projekt t1 (Dieser PC, Terminal t1): fertig. read_terminal für Details.'])
  })

  it('beobachtet ein beendetes Terminal danach nicht mehr', async () => {
    const s = setup()
    s.relay.watch('t1')
    s.relay.onStatus({ id: 't1', status: 'exited' })
    await s.relay.tick()
    s.relay.onStatus({ id: 't1', status: 'review' })
    await s.relay.tick()
    expect(s.delivered).toHaveLength(1)
  })
})
