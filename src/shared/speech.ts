/** Spracheingabe: gemeinsame Typen für Main-Prozess und Oberfläche. */

import type { Messages } from './i18n/messages'

export const SPEECH_MODEL_IDS = ['small-q5_1', 'large-v3-turbo-q5_0', 'large-v3-q5_0'] as const
export type SpeechModelId = (typeof SPEECH_MODEL_IDS)[number]

export const DEFAULT_SPEECH_MODEL: SpeechModelId = 'large-v3-turbo-q5_0'
/** Whisper erwartet 16 kHz Mono. */
export const SPEECH_SAMPLE_RATE = 16_000
/** Tastennamen des Diktier-Kürzels in der Sprache von `t`. */
export const speechHotkeyKeys = (t: Messages): readonly string[] => t.main.speechHotkeyKeys

export interface SpeechModelInfo {
  readonly id: SpeechModelId
  readonly bytes: number
}

export const SPEECH_MODELS: readonly SpeechModelInfo[] = [
  { id: 'small-q5_1', bytes: 190_085_487 },
  { id: 'large-v3-turbo-q5_0', bytes: 574_041_195 },
  { id: 'large-v3-q5_0', bytes: 1_081_140_203 }
]

export const isSpeechModelId = (value: string): value is SpeechModelId => (SPEECH_MODEL_IDS as readonly string[]).includes(value)

/** Anzeigename und Beschreibung eines Modells in der Sprache von `t`. */
export function speechModelText(id: SpeechModelId, t: Messages): { readonly label: string; readonly description: string } {
  return t.main.speechModels[id]
}

export function speechModelInfo(id: SpeechModelId): SpeechModelInfo {
  const info = SPEECH_MODELS.find((m) => m.id === id)
  if (!info) throw new RangeError(`Unbekanntes Sprachmodell „${id}“, erwartet: ${SPEECH_MODEL_IDS.join(', ')}`) // i18n-ignore: Entwicklerfehler
  return info
}

export interface SpeechSettings {
  readonly model: SpeechModelId
  /** '' = Standardmikrofon von Windows. */
  readonly deviceId: string
  readonly hotkeyEnabled: boolean
}

export interface SpeechStatus {
  /** false unter Linux/macOS: keine automatische Einrichtung. */
  readonly supported: boolean
  readonly binariesInstalled: boolean
  readonly installedModels: readonly SpeechModelId[]
  readonly model: SpeechModelId
  /** Modell, das gerade heruntergeladen wird. */
  readonly installing: SpeechModelId | null
}

export interface SpeechProgress {
  readonly model: SpeechModelId
  readonly receivedBytes: number
  readonly totalBytes: number
}

/** Bereit zum Diktieren mit dem gewählten Modell. */
export const speechReady = (status: SpeechStatus): boolean =>
  status.supported && status.binariesInstalled && status.installedModels.includes(status.model)
