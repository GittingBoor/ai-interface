import { describe, expect, it } from 'vitest'
import type { NotificationSettings, TerminalInfo } from '@shared/types'
import type { HookEvent } from '../../src/main/notify/hookSettings'
import { NotificationService, type ShownNotification } from '../../src/main/notify/NotificationService'

const TERMINAL: TerminalInfo = { id: 't1', host: 'local', path: 'D:/x', mode: 'new', title: 'Drum Trainer', running: true, startedAt: 0 }

function setup(settings: NotificationSettings = { permission: true, question: true, done: true, quotaFree: true }) {
  const shown: ShownNotification[] = []
  const focused: string[] = []
  let clock = 1_000
  const service = new NotificationService({
    settings: () => settings,
    terminal: (id) => (id === TERMINAL.id ? TERMINAL : undefined),
    show: (n) => shown.push(n),
    focusTerminal: (id) => focused.push(id),
    now: () => clock
  })
  return { service, shown, focused, advance: (ms: number) => (clock += ms) }
}

const event = (kind: HookEvent['kind'], terminalId = 't1'): HookEvent => ({ terminalId, kind, message: 'Claude needs your permission to use Bash', host: 'local', at: 0 })

describe('NotificationService', () => {
  it('zeigt Titel mit Terminalname und Text, Klick öffnet das Terminal', () => {
    const { service, shown, focused } = setup()
    service.handle([event('permission')])
    expect(shown).toHaveLength(1)
    expect(shown[0]?.title).toBe('Erlaubnis nötig · Drum Trainer')
    expect(shown[0]?.body).toBe('Claude needs your permission to use Bash')
    shown[0]?.onClick()
    expect(focused).toEqual(['t1'])
  })

  it('meldet „arbeitet“ nie', () => {
    const { service, shown } = setup()
    service.handle([event('working')])
    expect(shown).toHaveLength(0)
  })

  it('schweigt bei abgeschalteter Art und unbekanntem Terminal', () => {
    const { service, shown } = setup({ permission: false, question: true, done: true, quotaFree: true })
    service.handle([event('permission'), event('done', 'fremd')])
    expect(shown).toHaveLength(0)
  })

  it('schweigt, wenn das Terminal im fokussierten Fenster sichtbar ist', () => {
    const { service, shown } = setup()
    service.setViewing(['t1'], true)
    service.handle([event('done')])
    expect(shown).toHaveLength(0)
    service.setViewing(['t1'], false)
    service.handle([event('done')])
    expect(shown).toHaveLength(1)
  })

  it('fasst gleiche Ereignisse eines Terminals innerhalb von 3 s zusammen', () => {
    const { service, shown, advance } = setup()
    service.handle([event('done'), event('done')])
    advance(1_000)
    service.handle([event('done')])
    expect(shown).toHaveLength(1)
    advance(3_000)
    service.handle([event('done')])
    expect(shown).toHaveLength(2)
  })

  it('kürzt lange Texte', () => {
    const { service, shown } = setup()
    service.handle([{ ...event('question'), message: 'x'.repeat(300) }])
    expect(shown[0]?.body.length).toBeLessThanOrEqual(140)
    expect(shown[0]?.title).toBe('Frage von Claude · Drum Trainer')
  })
})
