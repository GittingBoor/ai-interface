import type { Result } from '@shared/result'
import { SPEECH_SAMPLE_RATE } from '@shared/speech'
import { encodeWav, isSilent } from './wav'
import { sameTarget, type SpeechTarget } from './speechText'

export type SpeechPhase = 'idle' | 'recording' | 'transcribing'

/** Kürzer als 0,5 s ist fast immer ein versehentlicher Klick. */
export const MIN_RECORDING_SAMPLES = SPEECH_SAMPLE_RATE / 2
const NOTHING_RECOGNIZED = 'Nichts erkannt'
const EMPTY_TRANSCRIPT_CODE = 'EMPTY_TRANSCRIPT'

export class MicrophoneError extends Error {
  constructor(
    message: string,
    readonly hint: string
  ) {
    super(message)
    this.name = 'MicrophoneError'
  }
}

export interface RecorderLike {
  start(deviceId: string, onLimit: () => void): Promise<void>
  /** Liefert 16-kHz-Mono-Samples. */
  stop(): Promise<Float32Array>
  cancel(): void
}

export interface SpeechControllerDeps {
  readonly recorder: RecorderLike
  readonly transcribe: (wav: Uint8Array) => Promise<Result<string>>
  /** false, wenn das Ziel nicht mehr existiert. */
  readonly deliver: (target: SpeechTarget, text: string) => boolean
  readonly notify: { info(title: string, hint?: string): void; error(title: string, hint?: string): void }
  readonly onChange: (phase: SpeechPhase, target: SpeechTarget | null) => void
  readonly deviceId: () => string
}

/** Ablauf eines Diktats: Aufnahme → Erkennung → Einfügen ins ursprüngliche Ziel. */
export class SpeechController {
  phase: SpeechPhase = 'idle'
  target: SpeechTarget | null = null
  /** Läuft, solange getUserMedia noch nicht geantwortet hat; true = Mikrofon offen. */
  private starting: Promise<boolean> | null = null
  /** Esc kam, bevor das Mikrofon offen war: nach dem Start sofort wieder schließen. */
  private cancelRequested = false

  constructor(private readonly deps: SpeechControllerDeps) {}

  async toggle(target: SpeechTarget): Promise<void> {
    if (this.phase === 'transcribing') return
    if (this.phase === 'recording') {
      if (this.starting && !(await this.starting)) return
      return this.finish()
    }
    if (this.starting) await this.starting
    await this.start(target)
  }

  cancel(): void {
    if (this.phase !== 'recording') return
    if (this.starting) this.cancelRequested = true
    else this.deps.recorder.cancel()
    this.set('idle', null)
  }

  isActive(target: SpeechTarget): boolean {
    return this.phase !== 'idle' && sameTarget(this.target, target)
  }

  private async start(target: SpeechTarget): Promise<void> {
    this.cancelRequested = false
    this.set('recording', target)
    this.starting = this.openMicrophone()
    const opened = await this.starting
    this.starting = null
    if (opened && this.cancelRequested) this.deps.recorder.cancel()
    this.cancelRequested = false
  }

  private async openMicrophone(): Promise<boolean> {
    try {
      await this.deps.recorder.start(this.deps.deviceId(), () => void this.finish())
      return true
    } catch (error) {
      this.set('idle', null)
      if (error instanceof MicrophoneError) this.deps.notify.error(error.message, error.hint)
      else this.deps.notify.error('Aufnahme konnte nicht starten', error instanceof Error ? error.message : String(error))
      return false
    }
  }

  private async finish(): Promise<void> {
    if (this.phase !== 'recording' || !this.target) return
    const target = this.target
    this.set('transcribing', target)
    try {
      const samples = await this.deps.recorder.stop()
      if (samples.length < MIN_RECORDING_SAMPLES || isSilent(samples)) {
        this.deps.notify.info(NOTHING_RECOGNIZED)
        return
      }
      const result = await this.deps.transcribe(encodeWav(samples, SPEECH_SAMPLE_RATE))
      if (!result.ok) {
        if (result.error.code === EMPTY_TRANSCRIPT_CODE) this.deps.notify.info(NOTHING_RECOGNIZED)
        else this.deps.notify.error(result.error.message, result.error.hint)
        return
      }
      if (!this.deps.deliver(target, result.data)) this.deps.notify.info('Terminal ist nicht mehr offen, Text verworfen')
    } catch (error) {
      this.deps.notify.error('Aufnahme konnte nicht verarbeitet werden', error instanceof Error ? error.message : String(error))
    } finally {
      this.set('idle', null)
    }
  }

  private set(phase: SpeechPhase, target: SpeechTarget | null): void {
    this.phase = phase
    this.target = target
    this.deps.onChange(phase, target)
  }
}
