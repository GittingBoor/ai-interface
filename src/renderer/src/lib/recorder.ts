import { SPEECH_SAMPLE_RATE } from '@shared/speech'
import { MicrophoneError, type RecorderLike } from './speechController'

/** Nach 5 min automatisch stoppen. */
const MAX_RECORDING_MS = 5 * 60_000
const MIC_HINT = 'Windows: Einstellungen > Datenschutz und Sicherheit > Mikrofon prüfen.'

/** Nimmt per MediaRecorder auf und dekodiert auf 16 kHz Mono (Chromium resampelt beim Dekodieren). */
export class BrowserRecorder implements RecorderLike {
  private stream: MediaStream | null = null
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private limitTimer: ReturnType<typeof setTimeout> | null = null

  async start(deviceId: string, onLimit: () => void): Promise<void> {
    this.release()
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: deviceId ? { exact: deviceId } : undefined, channelCount: 1, echoCancellation: true, noiseSuppression: true }
      })
    } catch (error) {
      throw toMicrophoneError(error)
    }
    this.chunks = []
    try {
      this.recorder = new MediaRecorder(this.stream)
    } catch (error) {
      this.release()
      throw new MicrophoneError('Aufnahme konnte nicht starten', error instanceof Error ? error.message : MIC_HINT)
    }
    this.recorder.ondataavailable = (e) => this.chunks.push(e.data)
    this.recorder.start()
    this.limitTimer = setTimeout(onLimit, MAX_RECORDING_MS)
  }

  async stop(): Promise<Float32Array> {
    const recorder = this.recorder
    if (!recorder) return new Float32Array()
    const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()))
    recorder.stop()
    await stopped
    const blob = new Blob(this.chunks, { type: recorder.mimeType })
    this.release()
    if (blob.size === 0) return new Float32Array()
    const context = new OfflineAudioContext(1, 1, SPEECH_SAMPLE_RATE)
    const audio = await context.decodeAudioData(await blob.arrayBuffer())
    return audio.getChannelData(0).slice()
  }

  cancel(): void {
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop()
    this.release()
  }

  private release(): void {
    if (this.limitTimer) clearTimeout(this.limitTimer)
    this.limitTimer = null
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.recorder = null
    this.chunks = []
  }
}

function toMicrophoneError(error: unknown): MicrophoneError {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError') return new MicrophoneError('Mikrofonzugriff verweigert', MIC_HINT)
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return new MicrophoneError('Kein Mikrofon gefunden', `Im Tab Steuerung ein anderes Mikrofon wählen. ${MIC_HINT}`)
  return new MicrophoneError('Mikrofon konnte nicht geöffnet werden', error instanceof Error ? error.message : MIC_HINT)
}
