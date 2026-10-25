import type { AppErrorInfo } from '@shared/result'

/** Basisklasse für erwartbare Fehler mit Code und Handlungshinweis. */
export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly hint?: string
  ) {
    super(message)
    this.name = new.target.name
  }

  toInfo(): AppErrorInfo {
    return this.hint ? { code: this.code, message: this.message, hint: this.hint } : { code: this.code, message: this.message }
  }
}

export class HostUnreachableError extends AppError {
  constructor(host: string, cause: string) {
    super('HOST_UNREACHABLE', `${host} ist nicht erreichbar: ${cause}`, 'Netzwerk und SSH-Einstellungen prüfen.')
  }
}

export class NotFoundError extends AppError {
  constructor(what: string, hint?: string) {
    super('NOT_FOUND', `${what} wurde nicht gefunden.`, hint)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION', message, 'Eingabe korrigieren und erneut versuchen.')
  }
}

export class QuotaFormatError extends AppError {
  constructor(detail: string) {
    super('QUOTA_FORMAT', `Format der Kontingent-Antwort unbekannt (${detail}).`, 'Claude Code aktualisieren; bis dahin zeigt die App keine Werte statt falscher.')
  }
}

export class SummaryError extends AppError {
  constructor(name: string, cause: string) {
    super('SUMMARY_FAILED', `Zusammenfassung für „${name}“ fehlgeschlagen: ${cause}`, 'Claude Code prüfen (angemeldet, Kontingent frei) und erneut starten; fertige Zusammenfassungen bleiben erhalten.')
  }
}

export class ClaudeCliError extends AppError {
  constructor(detail: string) {
    super('CLAUDE_CLI', `Claude Code konnte nicht ausgeführt werden (${detail}).`, 'Prüfen, ob Claude Code installiert und angemeldet ist (claude im Terminal starten).')
  }
}

export class GitCommandError extends AppError {
  constructor(action: string, cause: string) {
    super('GIT_FAILED', `${action} fehlgeschlagen: ${cause}`, 'Prüfen, ob Git installiert ist und der Ordner beschreibbar ist.')
  }
}

export class SpeechUnsupportedError extends AppError {
  constructor() {
    super('SPEECH_UNSUPPORTED', 'Spracheingabe ist nur unter Windows eingerichtet.', 'Unter Windows nutzen oder Win+H bzw. /voice in Claude Code verwenden.')
  }
}

export class WhisperNotInstalledError extends AppError {
  constructor(modelLabel: string) {
    super('WHISPER_NOT_INSTALLED', `Spracherkennung „${modelLabel}“ ist nicht eingerichtet.`, 'Im Tab Steuerung das Modell herunterladen.')
  }
}

export class WhisperStartError extends AppError {
  constructor(detail: string) {
    super('WHISPER_START', `Spracherkennung konnte nicht gestartet werden (${detail}).`, 'Grafiktreiber aktualisieren oder in Steuerung ein kleineres Modell wählen; Details im Log.')
  }
}

export class TranscriptionError extends AppError {
  constructor(detail: string) {
    super('TRANSCRIPTION_FAILED', `Spracherkennung fehlgeschlagen (${detail}).`, 'Noch einmal sprechen; tritt es wieder auf, App neu starten.')
  }
}

export class EmptyTranscriptError extends AppError {
  constructor() {
    super('EMPTY_TRANSCRIPT', 'Nichts erkannt.', 'Näher ans Mikrofon gehen und etwas lauter sprechen.')
  }
}

export class DownloadError extends AppError {
  constructor(what: string, detail: string) {
    super('DOWNLOAD_FAILED', `Download von ${what} fehlgeschlagen (${detail}).`, 'Internetverbindung prüfen und erneut versuchen.')
  }
}

export class DownloadChecksumError extends AppError {
  constructor(what: string) {
    super('DOWNLOAD_CHECKSUM', `Prüfsumme von ${what} stimmt nicht, Datei wurde gelöscht.`, 'Erneut herunterladen; bei Wiederholung ist die Quelle geändert worden.')
  }
}

export class DownloadCancelledError extends AppError {
  constructor() {
    super('DOWNLOAD_CANCELLED', 'Download abgebrochen.')
  }
}

export class SpeechBusyError extends AppError {
  constructor(model: string) {
    super('SPEECH_BUSY', `Es wird bereits „${model}“ heruntergeladen.`, 'Warten, bis der Download fertig ist, oder ihn abbrechen.')
  }
}

export class PrivacyLockedError extends AppError {
  constructor() {
    super('PRIVACY_LOCKED', 'Der Privatmodus ist aktiv.', 'In den Einstellungen mit der PIN entsperren.')
  }
}

export class WrongPinError extends AppError {
  constructor(waitSec?: number) {
    super('WRONG_PIN', waitSec ? `Zu viele Fehlversuche, bitte ${waitSec} s warten.` : 'PIN falsch.', 'PIN erneut eingeben.')
  }
}

export class InvalidPinError extends AppError {
  constructor() {
    super('INVALID_PIN', 'Die PIN muss aus 4 bis 12 Ziffern bestehen.', 'Nur Ziffern verwenden.')
  }
}

export class PinRequiredError extends AppError {
  constructor() {
    super('PIN_REQUIRED', 'Für den Privatmodus ist noch keine PIN festgelegt.', 'Neue PIN festlegen, das entsperrt den Privatmodus.')
  }
}

export class UpdateError extends AppError {
  constructor(step: string, detail: string) {
    super('UPDATE_FAILED', `Update fehlgeschlagen bei „${step}“ (${detail}).`, 'Im Repo manuell git pull und npm run dist:win ausführen; Details im Log.')
  }
}

export class TerminalBusyError extends AppError {
  constructor(terminal: string) {
    super('TERMINAL_BUSY', `${terminal} arbeitet noch.`, 'Warte auf die Statuszeile „[AI Interface] … fertig“ und sende dann erneut.')
  }
}

export class OrchestratorUnavailableError extends AppError {
  constructor(detail: string) {
    super('ORCHESTRATOR_UNAVAILABLE', `Orchestrator nicht verfügbar: ${detail}`, 'In den Einstellungen unter „Orchestrator“ prüfen, ob er eingeschaltet ist; Details stehen im Log.')
  }
}

export function toErrorInfo(error: unknown): AppErrorInfo {
  if (error instanceof AppError) return error.toInfo()
  const message = error instanceof Error ? error.message : String(error)
  return { code: 'UNEXPECTED', message, hint: 'Details stehen im Log (Einstellungen → Log öffnen).' }
}
