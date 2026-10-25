import { describe, expect, it } from 'vitest'
import type { Result } from '@shared/result'
import { MicrophoneError, SpeechController, type RecorderLike, type SpeechPhase } from '../../src/renderer/src/lib/speechController'
import type { SpeechTarget } from '../../src/renderer/src/lib/speechText'

const VOICE = Float32Array.from({ length: 16_000 }, (_, i) => 0.2 * Math.sin(i / 10))

function setup(opts: { samples?: Float32Array; result?: Result<string>; deliver?: boolean; startError?: Error } = {}) {
  const calls = { started: 0, cancelled: 0, transcribed: 0 }
  const delivered: { target: SpeechTarget; text: string }[] = []
  const infos: string[] = []
  const errors: string[] = []
  const phases: SpeechPhase[] = []
  let release: (() => void) | null = null
  const recorder: RecorderLike = {
    start: async () => {
      calls.started++
      if (opts.startError) throw opts.startError
    },
    stop: async () => opts.samples ?? VOICE,
    cancel: () => {
      calls.cancelled++
    }
  }
  const controller = new SpeechController({
    recorder,
    transcribe: async () => {
      calls.transcribed++
      await new Promise<void>((r) => (release = r))
      return opts.result ?? { ok: true, data: 'Hallo Welt' }
    },
    deliver: (target, text) => {
      delivered.push({ target, text })
      return opts.deliver ?? true
    },
    notify: { info: (t) => infos.push(t), error: (t) => errors.push(t) },
    onChange: (phase) => phases.push(phase),
    deviceId: () => ''
  })
  /** Wartet, bis `transcribe` läuft, gibt die Antwort frei und lässt den Rest durchlaufen. */
  const finish = async (): Promise<void> => {
    while (!release) await new Promise((r) => setTimeout(r, 0))
    release()
    await new Promise((r) => setTimeout(r, 0))
  }
  return { controller, calls, delivered, infos, errors, phases, finish }
}

const T1: SpeechTarget = { kind: 'terminal', id: 't1' }

describe('SpeechController', () => {
  it('Klick startet, zweiter Klick erkennt und liefert ans Ziel', async () => {
    const s = setup()
    await s.controller.toggle(T1)
    expect(s.controller.phase).toBe('recording')
    const done = s.controller.toggle(T1)
    await s.finish()
    await done
    expect(s.delivered).toEqual([{ target: T1, text: 'Hallo Welt' }])
    expect(s.phases).toEqual(['recording', 'transcribing', 'idle'])
  })

  it('stoppt mit dem ursprünglichen Ziel, auch wenn der Klick von woanders kommt', async () => {
    const s = setup()
    await s.controller.toggle(T1)
    const done = s.controller.toggle({ kind: 'assistant' })
    await s.finish()
    await done
    expect(s.delivered[0]?.target).toEqual(T1)
  })

  it('ignoriert Klicks während der Erkennung', async () => {
    const s = setup()
    await s.controller.toggle(T1)
    const done = s.controller.toggle(T1)
    await Promise.resolve()
    await s.controller.toggle(T1)
    await s.finish()
    await done
    expect(s.calls.started).toBe(1)
    expect(s.calls.transcribed).toBe(1)
  })

  it('Esc verwirft die Aufnahme', async () => {
    const s = setup()
    await s.controller.toggle(T1)
    s.controller.cancel()
    expect(s.controller.phase).toBe('idle')
    expect(s.calls.cancelled).toBe(1)
    expect(s.calls.transcribed).toBe(0)
  })

  it('Stille oder zu kurz → nichts senden, Hinweis', async () => {
    for (const samples of [new Float32Array(16_000), VOICE.slice(0, 4_000)]) {
      const s = setup({ samples })
      await s.controller.toggle(T1)
      await s.controller.toggle(T1)
      expect(s.calls.transcribed).toBe(0)
      expect(s.infos).toEqual(['Nichts erkannt'])
      expect(s.controller.phase).toBe('idle')
    }
  })

  it('Ziel weg → Text verworfen mit Hinweis', async () => {
    const s = setup({ deliver: false })
    await s.controller.toggle(T1)
    const done = s.controller.toggle(T1)
    await s.finish()
    await done
    expect(s.infos).toEqual(['Terminal ist nicht mehr offen, Text verworfen'])
  })

  it('leerer Text vom Server → Hinweis statt Fehler', async () => {
    const s = setup({ result: { ok: false, error: { code: 'EMPTY_TRANSCRIPT', message: 'Nichts erkannt.' } } })
    await s.controller.toggle(T1)
    const done = s.controller.toggle(T1)
    await s.finish()
    await done
    expect(s.infos).toEqual(['Nichts erkannt'])
    expect(s.errors).toEqual([])
  })

  it('Mikrofonfehler → Fehlermeldung, zurück auf idle', async () => {
    const s = setup({ startError: new MicrophoneError('Kein Mikrofon gefunden', 'Windows: Datenschutz > Mikrofon prüfen.') })
    await s.controller.toggle(T1)
    expect(s.errors).toEqual(['Kein Mikrofon gefunden'])
    expect(s.controller.phase).toBe('idle')
  })
})

describe('SpeechController – Start noch nicht fertig', () => {
  function slowStart() {
    let open: (() => void) | null = null
    /** Wie BrowserRecorder: stop/cancel wirken nur auf einen schon geöffneten Stream. */
    const mic = { started: false, open: false }
    const calls = { cancelled: 0, stopped: 0, transcribed: 0 }
    const infos: string[] = []
    const controller = new SpeechController({
      recorder: {
        start: () =>
          new Promise<void>((r) => {
            open = () => {
              mic.started = true
              mic.open = true
              r()
            }
          }),
        stop: async () => {
          calls.stopped++
          if (!mic.started) return new Float32Array()
          mic.open = false
          return VOICE
        },
        cancel: () => {
          calls.cancelled++
          mic.open = false
        }
      },
      transcribe: async () => {
        calls.transcribed++
        return { ok: true, data: 'Hallo' }
      },
      deliver: () => true,
      notify: { info: (t) => infos.push(t), error: () => undefined },
      onChange: () => undefined,
      deviceId: () => ''
    })
    const opened = async (): Promise<void> => {
      while (!open) await new Promise((r) => setTimeout(r, 0))
      open()
      await new Promise((r) => setTimeout(r, 0))
    }
    return { controller, calls, infos, opened, mic }
  }

  it('zweiter Klick während getUserMedia stoppt erst nach dem Start', async () => {
    const s = slowStart()
    const first = s.controller.toggle(T1)
    const second = s.controller.toggle(T1)
    await s.opened()
    await Promise.all([first, second])
    expect(s.mic.open).toBe(false)
    expect(s.calls.transcribed).toBe(1)
    expect(s.infos).toEqual([])
    expect(s.controller.phase).toBe('idle')
  })

  it('Esc während getUserMedia gibt das Mikrofon nach dem Start frei', async () => {
    const s = slowStart()
    const first = s.controller.toggle(T1)
    s.controller.cancel()
    await s.opened()
    await first
    expect(s.mic.open).toBe(false)
    expect(s.calls.transcribed).toBe(0)
    expect(s.controller.phase).toBe('idle')
  })
})

describe('SpeechController – Fehler beim Verarbeiten', () => {
  it('meldet einen Fehler beim Stoppen/Dekodieren statt ihn zu verschlucken', async () => {
    const errors: string[] = []
    const controller = new SpeechController({
      recorder: { start: async () => undefined, stop: () => Promise.reject(new Error('EncodingError')), cancel: () => undefined },
      transcribe: async () => ({ ok: true, data: 'x' }),
      deliver: () => true,
      notify: { info: () => undefined, error: (t) => errors.push(t) },
      onChange: () => undefined,
      deviceId: () => ''
    })
    await controller.toggle(T1)
    await controller.toggle(T1)
    expect(errors).toEqual(['Aufnahme konnte nicht verarbeitet werden'])
    expect(controller.phase).toBe('idle')
  })
})
