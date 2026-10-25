import { describe, expect, it } from 'vitest'
import type { TerminalStatusChange } from '@shared/types'
import type { HookEvent, HookEventKind } from '../../src/main/notify/hookSettings'
import { TerminalStatusTracker } from '../../src/main/terminal/TerminalStatusTracker'

const hook = (kind: HookEventKind, terminalId = 't1', message = ''): HookEvent => ({ terminalId, kind, message, host: 'local', at: 0 })

function setup() {
  const changes: TerminalStatusChange[] = []
  const tracker = new TerminalStatusTracker()
  tracker.subscribe((c) => changes.push(c))
  tracker.add('t1')
  return { tracker, changes }
}

describe('TerminalStatusTracker', () => {
  it('merkt sich den Text einer offenen Frage, bis Claude weiterarbeitet', () => {
    const { tracker } = setup()
    tracker.handle([hook('question', 't1', 'Welche Datenbank?')])
    expect(tracker.pendingPrompt('t1')).toBe('Welche Datenbank?')
    tracker.handle([hook('working')])
    expect(tracker.pendingPrompt('t1')).toBeNull()
  })

  it('gilt als beendet, wenn Claude endet, auch wenn die Shell weiterläuft', () => {
    const { tracker } = setup()
    tracker.handle([hook('working'), hook('ended')])
    expect(tracker.status('t1')).toBe('exited')
    tracker.handle([hook('working')])
    expect(tracker.status('t1')).toBe('exited')
  })

  it('startet bereit und arbeitet nach dem Prompt', () => {
    const { tracker, changes } = setup()
    expect(tracker.status('t1')).toBe('idle')
    tracker.handle([hook('working')])
    expect(tracker.status('t1')).toBe('working')
    expect(changes).toEqual([{ id: 't1', status: 'working' }])
  })

  it('wird nach „fertig“ ungesehen blau und beim Ansehen grün', () => {
    const { tracker } = setup()
    tracker.handle([hook('working'), hook('done', 't1', 'Alles grün.')])
    expect(tracker.status('t1')).toBe('review')
    expect(tracker.lastAnswer('t1')).toBe('Alles grün.')
    tracker.setViewing(['t1'], true)
    expect(tracker.status('t1')).toBe('idle')
  })

  it('wird bei „fertig“ direkt grün, wenn das Terminal gerade zu sehen ist', () => {
    const { tracker } = setup()
    tracker.setViewing(['t1'], true)
    tracker.handle([hook('done')])
    expect(tracker.status('t1')).toBe('idle')
  })

  it('bleibt blau, wenn das Fenster keinen Fokus hat', () => {
    const { tracker } = setup()
    tracker.setViewing(['t1'], false)
    tracker.handle([hook('done')])
    expect(tracker.status('t1')).toBe('review')
  })

  it('zeigt Frage und Erlaubnis und arbeitet nach der Antwort weiter', () => {
    const { tracker } = setup()
    tracker.handle([hook('question')])
    expect(tracker.status('t1')).toBe('question')
    tracker.handle([hook('working'), hook('permission')])
    expect(tracker.status('t1')).toBe('permission')
    tracker.handle([hook('working')])
    expect(tracker.status('t1')).toBe('working')
  })

  it('meldet nur echte Wechsel, ignoriert unbekannte Terminals und bleibt nach dem Ende beendet', () => {
    const { tracker, changes } = setup()
    tracker.handle([hook('working'), hook('working'), hook('done', 'fremd')])
    tracker.exit('t1')
    tracker.handle([hook('working')])
    expect(tracker.status('t1')).toBe('exited')
    expect(changes.map((c) => c.status)).toEqual(['working', 'exited'])
    expect(tracker.status('fremd')).toBeUndefined()
  })

  it('vergisst entfernte Terminals', () => {
    const { tracker } = setup()
    tracker.remove('t1')
    expect(tracker.status('t1')).toBeUndefined()
  })
})
