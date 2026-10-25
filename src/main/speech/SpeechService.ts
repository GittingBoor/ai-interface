import { speechModelInfo, type SpeechModelId, type SpeechProgress, type SpeechSettings, type SpeechStatus } from '@shared/speech'
import { EmptyTranscriptError, SpeechBusyError, SpeechUnsupportedError, TranscriptionError, WhisperNotInstalledError } from '../errors'
import type { WhisperInstaller } from './WhisperInstaller'
import type { WhisperServer } from './WhisperServer'

const LANGUAGE = 'de'
/** 5 min Audio brauchen auf der CPU mit dem großen Modell mehrere Minuten. */
const TRANSCRIBE_TIMEOUT_MS = 10 * 60_000
/** Ganze Zeile nur Geräusch-Marke, z. B. „[Musik]“ oder „(Lachen)“. */
const NOISE_TAG = /^[[(*][^\])*]*[\])*]$/
/** Bekannte Whisper-Halluzinationen auf Deutsch bei Stille (Trainingsdaten aus Untertiteln), je ganze Zeile. */
const HALLUCINATIONS: readonly RegExp[] = [
  /^untertitel(ung)?\b.*\b(zdf|ard|funk)\b/i,
  /^untertitel(ung)? (der|von|im auftrag)\b.*$/i,
  /^vielen dank f(ü|ue)rs zu(schauen|sehen|hören)[.!]?$/i,
  /^(copyright )?(©\s*)?(wdr|swr|ndr|br|mdr|hr|rbb|zdf|ard)\b[\s,]*(\d{4})?\.?$/i
]
const isHallucination = (line: string): boolean => HALLUCINATIONS.some((p) => p.test(line))

export function normalizeTranscript(raw: string): string {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !NOISE_TAG.test(line) && !isHallucination(line))
    .join(' ')
}

export interface SpeechServiceDeps {
  readonly installer: Pick<WhisperInstaller, 'serverPath' | 'modelPath' | 'binariesInstalled' | 'installedModels' | 'install' | 'removeModel'>
  readonly server: Pick<WhisperServer, 'url' | 'stop' | 'runningModel'>
  readonly fetch: (url: string, init: RequestInit) => Promise<Response>
  readonly settings: () => SpeechSettings
  readonly saveSettings: (next: SpeechSettings) => void
  readonly onProgress: (p: SpeechProgress) => void
  readonly platform: NodeJS.Platform
}

/** Einrichtung, Modellwahl und Erkennung für die Oberfläche. */
export class SpeechService {
  private installing: { readonly model: SpeechModelId; readonly controller: AbortController } | null = null

  constructor(private readonly deps: SpeechServiceDeps) {}

  private get supported(): boolean {
    return this.deps.platform === 'win32'
  }

  async status(): Promise<SpeechStatus> {
    const model = this.deps.settings().model
    if (!this.supported) return { supported: false, binariesInstalled: false, installedModels: [], model, installing: null }
    return {
      supported: true,
      binariesInstalled: await this.deps.installer.binariesInstalled(),
      installedModels: await this.deps.installer.installedModels(),
      model,
      installing: this.installing?.model ?? null
    }
  }

  async install(model: SpeechModelId): Promise<SpeechStatus> {
    if (!this.supported) throw new SpeechUnsupportedError()
    if (this.installing) throw new SpeechBusyError(speechModelInfo(this.installing.model).label)
    const controller = new AbortController()
    this.installing = { model, controller }
    try {
      await this.deps.installer.install(model, controller.signal, this.deps.onProgress)
    } finally {
      this.installing = null
    }
    return this.status()
  }

  cancelInstall(): void {
    this.installing?.controller.abort()
  }

  async removeModel(model: SpeechModelId): Promise<SpeechStatus> {
    // Windows sperrt geladene Modelldateien: Server vorher beenden.
    if (this.deps.server.runningModel === this.deps.installer.modelPath(model)) this.deps.server.stop()
    await this.deps.installer.removeModel(model)
    return this.status()
  }

  async setModel(model: SpeechModelId): Promise<SpeechStatus> {
    this.deps.saveSettings({ ...this.deps.settings(), model })
    return this.status()
  }

  async transcribe(wav: Uint8Array): Promise<string> {
    if (!this.supported) throw new SpeechUnsupportedError()
    const { model } = this.deps.settings()
    const ready = (await this.deps.installer.binariesInstalled()) && (await this.deps.installer.installedModels()).includes(model)
    if (!ready) throw new WhisperNotInstalledError(speechModelInfo(model).label)
    const base = await this.deps.server.url(this.deps.installer.modelPath(model))
    const form = new FormData()
    form.append('file', new Blob([wav], { type: 'audio/wav' }), 'speech.wav')
    form.append('language', LANGUAGE)
    form.append('response_format', 'json')
    form.append('temperature', '0')
    const response = await this.post(`${base}/inference`, form)
    const text = normalizeTranscript(await this.readText(response))
    if (!text) throw new EmptyTranscriptError()
    return text
  }

  stop(): void {
    this.cancelInstall()
    this.deps.server.stop()
  }

  private async post(url: string, form: FormData): Promise<Response> {
    try {
      const response = await this.deps.fetch(url, { method: 'POST', body: form, signal: AbortSignal.timeout(TRANSCRIBE_TIMEOUT_MS) })
      if (!response.ok) throw new TranscriptionError(`HTTP ${response.status}`)
      return response
    } catch (error) {
      if (error instanceof TranscriptionError) throw error
      throw new TranscriptionError(error instanceof Error ? error.message : String(error))
    }
  }

  private async readText(response: Response): Promise<string> {
    const body = (await response.json()) as { readonly text?: unknown }
    if (typeof body.text !== 'string') throw new TranscriptionError('Antwort ohne Feld „text“')
    return body.text
  }
}
