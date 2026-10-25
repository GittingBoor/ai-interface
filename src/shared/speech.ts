/** Spracheingabe: gemeinsame Typen für Main-Prozess und Oberfläche. */

export const SPEECH_MODEL_IDS = ['small-q5_1', 'large-v3-turbo-q5_0', 'large-v3-q5_0'] as const
export type SpeechModelId = (typeof SPEECH_MODEL_IDS)[number]

export const DEFAULT_SPEECH_MODEL: SpeechModelId = 'large-v3-turbo-q5_0'
/** Whisper erwartet 16 kHz Mono. */
export const SPEECH_SAMPLE_RATE = 16_000
export const SPEECH_HOTKEY_KEYS: readonly string[] = ['Strg', 'Shift', 'Leertaste']

export interface SpeechModelInfo {
  readonly id: SpeechModelId
  readonly label: string
  readonly description: string
  readonly bytes: number
}

export const SPEECH_MODELS: readonly SpeechModelInfo[] = [
  { id: 'small-q5_1', label: 'Schnell', description: 'Klein und flott, verhört sich eher bei Fachbegriffen.', bytes: 190_085_487 },
  { id: 'large-v3-turbo-q5_0', label: 'Standard', description: 'Gutes Deutsch, auf der GPU unter einer Sekunde.', bytes: 574_041_195 },
  { id: 'large-v3-q5_0', label: 'Genau', description: 'Beste Erkennung, deutlich langsamer.', bytes: 1_081_140_203 }
]

export const isSpeechModelId = (value: string): value is SpeechModelId => (SPEECH_MODEL_IDS as readonly string[]).includes(value)

export function speechModelInfo(id: SpeechModelId): SpeechModelInfo {
  const info = SPEECH_MODELS.find((m) => m.id === id)
  if (!info) throw new RangeError(`Unbekanntes Sprachmodell „${id}“, erwartet: ${SPEECH_MODEL_IDS.join(', ')}`)
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
