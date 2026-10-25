import { describe, expect, it } from 'vitest'
import { DEFAULT_SPEECH_MODEL, isSpeechModelId, SPEECH_MODEL_IDS, speechModelInfo } from '@shared/speech'
import { defaultSettings } from '../../src/main/settings/SettingsService'
import { EmptyTranscriptError, WhisperNotInstalledError } from '../../src/main/errors'

describe('Sprachmodelle', () => {
  it('kennt genau drei Modelle, Standard ist turbo', () => {
    expect(SPEECH_MODEL_IDS).toEqual(['small-q5_1', 'large-v3-turbo-q5_0', 'large-v3-q5_0'])
    expect(DEFAULT_SPEECH_MODEL).toBe('large-v3-turbo-q5_0')
    expect(speechModelInfo('small-q5_1').label).toBe('Schnell')
  })

  it('prüft Modell-IDs', () => {
    expect(isSpeechModelId('large-v3-q5_0')).toBe(true)
    expect(isSpeechModelId('tiny')).toBe(false)
  })

  it('Standardeinstellungen: turbo, Standardmikrofon, Kürzel aus', () => {
    expect(defaultSettings('/home/b', 'linux').speech).toEqual({ model: 'large-v3-turbo-q5_0', deviceId: '', hotkeyEnabled: false })
  })

  it('Fehler tragen Code und Hinweis', () => {
    expect(new WhisperNotInstalledError('Standard').toInfo()).toMatchObject({ code: 'WHISPER_NOT_INSTALLED' })
    expect(new EmptyTranscriptError().toInfo().code).toBe('EMPTY_TRANSCRIPT')
  })
})
