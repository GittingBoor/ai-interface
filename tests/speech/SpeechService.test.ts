import { describe, expect, it } from 'vitest'
import type { SpeechModelId, SpeechSettings } from '@shared/speech'
import { normalizeTranscript, SpeechService } from '../../src/main/speech/SpeechService'
import { EmptyTranscriptError, SpeechUnsupportedError, TranscriptionError, WhisperNotInstalledError } from '../../src/main/errors'

describe('normalizeTranscript', () => {
  it('verbindet Zeilen und trimmt', () => {
    expect(normalizeTranscript(' Bitte lies die Datei.\n Danach schreibe einen Test.\n')).toBe('Bitte lies die Datei. Danach schreibe einen Test.')
  })

  it('verwirft reine Geräusch-Marken und typische Stille-Halluzinationen', () => {
    expect(normalizeTranscript(' [Musik]\n')).toBe('')
    expect(normalizeTranscript(' (Lachen)\n')).toBe('')
    expect(normalizeTranscript(' Untertitel im Auftrag des ZDF, 2021\n')).toBe('')
    expect(normalizeTranscript(' Untertitelung des ZDF für funk, 2017\n')).toBe('')
    expect(normalizeTranscript(' Untertitel der Amara.org-Community\n')).toBe('')
    expect(normalizeTranscript(' Untertitel von Stephanie Geiges\n')).toBe('')
    expect(normalizeTranscript(' Vielen Dank fürs Zuschauen.\n')).toBe('')
    expect(normalizeTranscript(' Copyright WDR 2021\n SWR 2020\n')).toBe('')
  })

  it('filtert Halluzinationen auch zwischen echten Sätzen', () => {
    expect(normalizeTranscript(' Lies die Datei.\n Untertitel der Amara.org-Community\n')).toBe('Lies die Datei.')
  })

  it('lässt „Vielen Dank“ als Teil eines echten Satzes stehen', () => {
    expect(normalizeTranscript(' Vielen Dank fürs Zuschauen, jetzt lies bitte die Datei.\n')).toBe('Vielen Dank fürs Zuschauen, jetzt lies bitte die Datei.')
  })

  it('lässt normale Klammern im Satz stehen', () => {
    expect(normalizeTranscript(' Öffne die Datei (die große) bitte.\n')).toBe('Öffne die Datei (die große) bitte.')
  })
})

function setup(opts: { platform?: NodeJS.Platform; installed?: SpeechModelId[]; binaries?: boolean; response?: Response } = {}) {
  let settings: SpeechSettings = { model: 'large-v3-turbo-q5_0', deviceId: '', hotkeyEnabled: false }
  let installed = opts.installed ?? ['large-v3-turbo-q5_0']
  const requests: { url: string; body: FormData }[] = []
  let running: string | null = null
  let stops = 0
  const service = new SpeechService({
    installer: {
      serverPath: 'bin/whisper-server.exe',
      modelPath: (id) => `models/ggml-${id}.bin`,
      binariesInstalled: async () => opts.binaries ?? true,
      installedModels: async () => installed,
      install: async (model) => {
        installed = [...installed, model]
      },
      removeModel: async (model) => {
        if (running === `models/ggml-${model}.bin`) throw new Error('EBUSY: Datei gesperrt')
        installed = installed.filter((m) => m !== model)
      }
    },
    server: {
      url: async (modelPath) => {
        running = modelPath
        return 'http://127.0.0.1:5000'
      },
      stop: () => {
        running = null
        stops++
      },
      get runningModel() {
        return running
      }
    },
    fetch: async (url, init) => {
      requests.push({ url, body: init.body as FormData })
      return opts.response ?? new Response(JSON.stringify({ text: ' Hallo Welt.\n' }))
    },
    settings: () => settings,
    saveSettings: (next) => {
      settings = next
    },
    onProgress: () => undefined,
    platform: opts.platform ?? 'win32'
  })
  return { service, requests, getSettings: () => settings, getStops: () => stops }
}

const WAV = new Uint8Array([1, 2, 3])

describe('SpeechService', () => {
  it('liefert erkannten Text und schickt Deutsch', async () => {
    const { service, requests } = setup()
    expect(await service.transcribe(WAV)).toBe('Hallo Welt.')
    expect(requests[0]?.url).toBe('http://127.0.0.1:5000/inference')
    expect(requests[0]?.body.get('language')).toBe('de')
    expect(requests[0]?.body.get('response_format')).toBe('json')
  })

  it('meldet fehlende Einrichtung', async () => {
    await expect(setup({ installed: [] }).service.transcribe(WAV)).rejects.toBeInstanceOf(WhisperNotInstalledError)
    await expect(setup({ binaries: false }).service.transcribe(WAV)).rejects.toBeInstanceOf(WhisperNotInstalledError)
  })

  it('ist unter Linux nicht verfügbar', async () => {
    const { service } = setup({ platform: 'linux' })
    expect((await service.status()).supported).toBe(false)
    await expect(service.transcribe(WAV)).rejects.toBeInstanceOf(SpeechUnsupportedError)
  })

  it('leerer Text → EmptyTranscriptError, HTTP-Fehler → TranscriptionError', async () => {
    await expect(setup({ response: new Response(JSON.stringify({ text: ' [Musik]\n' })) }).service.transcribe(WAV)).rejects.toBeInstanceOf(EmptyTranscriptError)
    await expect(setup({ response: new Response('kaputt', { status: 500 }) }).service.transcribe(WAV)).rejects.toBeInstanceOf(TranscriptionError)
  })

  it('setModel speichert die Wahl, der nächste Aufruf nutzt das neue Modell', async () => {
    const { service, getSettings } = setup({ installed: ['large-v3-turbo-q5_0', 'small-q5_1'] })
    const status = await service.setModel('small-q5_1')
    expect(getSettings().model).toBe('small-q5_1')
    expect(status.model).toBe('small-q5_1')
  })

  it('beendet den Server, bevor das laufende Modell gelöscht wird', async () => {
    const { service, getStops } = setup()
    await service.transcribe(WAV)
    const status = await service.removeModel('large-v3-turbo-q5_0')
    expect(getStops()).toBe(1)
    expect(status.installedModels).toEqual([])
  })

  it('install ergänzt das Modell im Status', async () => {
    const { service } = setup({ installed: [] })
    expect((await service.install('small-q5_1')).installedModels).toEqual(['small-q5_1'])
  })
})
