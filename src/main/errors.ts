import type { AppErrorInfo } from '@shared/result'
import { mainT } from './i18n'

/** Basisklasse für erwartbare Fehler mit Code und Handlungshinweis. Text und Hinweis kommen beim Erzeugen aus dem Wörterbuch (`mainT().errors`). */
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
    const t = mainT().errors.hostUnreachable
    super('HOST_UNREACHABLE', t.message(host, cause), t.hint)
  }
}

export class NotFoundError extends AppError {
  constructor(what: string, hint?: string) {
    super('NOT_FOUND', mainT().errors.notFound(what), hint)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION', message, mainT().errors.validationHint)
  }
}

export class QuotaFormatError extends AppError {
  constructor(detail: string) {
    const t = mainT().errors.quotaFormat
    super('QUOTA_FORMAT', t.message(detail), t.hint)
  }
}

export class SummaryError extends AppError {
  constructor(name: string, cause: string) {
    const t = mainT().errors.summaryFailed
    super('SUMMARY_FAILED', t.message(name, cause), t.hint)
  }
}

export class ClaudeCliError extends AppError {
  constructor(detail: string) {
    const t = mainT().errors.claudeCli
    super('CLAUDE_CLI', t.message(detail), t.hint)
  }
}

export class GitCommandError extends AppError {
  constructor(action: string, cause: string) {
    const t = mainT().errors.gitFailed
    super('GIT_FAILED', t.message(action, cause), t.hint)
  }
}

export class SpeechUnsupportedError extends AppError {
  constructor() {
    const t = mainT().errors.speechUnsupported
    super('SPEECH_UNSUPPORTED', t.message, t.hint)
  }
}

export class WhisperNotInstalledError extends AppError {
  constructor(modelLabel: string) {
    const t = mainT().errors.whisperNotInstalled
    super('WHISPER_NOT_INSTALLED', t.message(modelLabel), t.hint)
  }
}

export class WhisperStartError extends AppError {
  constructor(detail: string) {
    const t = mainT().errors.whisperStart
    super('WHISPER_START', t.message(detail), t.hint)
  }
}

export class TranscriptionError extends AppError {
  constructor(detail: string) {
    const t = mainT().errors.transcription
    super('TRANSCRIPTION_FAILED', t.message(detail), t.hint)
  }
}

export class EmptyTranscriptError extends AppError {
  constructor() {
    const t = mainT().errors.emptyTranscript
    super('EMPTY_TRANSCRIPT', t.message, t.hint)
  }
}

export class DownloadError extends AppError {
  constructor(what: string, detail: string) {
    const t = mainT().errors.download
    super('DOWNLOAD_FAILED', t.message(what, detail), t.hint)
  }
}

export class DownloadChecksumError extends AppError {
  constructor(what: string) {
    const t = mainT().errors.downloadChecksum
    super('DOWNLOAD_CHECKSUM', t.message(what), t.hint)
  }
}

export class DownloadCancelledError extends AppError {
  constructor() {
    super('DOWNLOAD_CANCELLED', mainT().errors.downloadCancelled.message)
  }
}

export class SpeechBusyError extends AppError {
  constructor(model: string) {
    const t = mainT().errors.speechBusy
    super('SPEECH_BUSY', t.message(model), t.hint)
  }
}

export class PrivacyLockedError extends AppError {
  constructor() {
    const t = mainT().errors.privacyLocked
    super('PRIVACY_LOCKED', t.message, t.hint)
  }
}

export class WrongPinError extends AppError {
  constructor(waitSec?: number) {
    const t = mainT().errors.wrongPin
    super('WRONG_PIN', waitSec ? t.tooMany(waitSec) : t.message, t.hint)
  }
}

export class InvalidPinError extends AppError {
  constructor() {
    const t = mainT().errors.invalidPin
    super('INVALID_PIN', t.message, t.hint)
  }
}

export class PinRequiredError extends AppError {
  constructor() {
    const t = mainT().errors.pinRequired
    super('PIN_REQUIRED', t.message, t.hint)
  }
}

export class UpdateError extends AppError {
  constructor(step: string, detail: string) {
    const t = mainT().errors.updateFailed
    super('UPDATE_FAILED', t.message(step, detail), t.hint)
  }
}

export class TerminalBusyError extends AppError {
  constructor(terminal: string) {
    const t = mainT().errors.terminalBusy
    super('TERMINAL_BUSY', t.message(terminal), t.hint)
  }
}

export class OrchestratorUnavailableError extends AppError {
  constructor(detail: string) {
    const t = mainT().errors.orchestratorUnavailable
    super('ORCHESTRATOR_UNAVAILABLE', t.message(detail), t.hint)
  }
}

export class AgentAssistError extends AppError {
  constructor(detail: string) {
    const t = mainT().errors.agentAssist
    super('AGENT_ASSIST', t.message(detail), t.hint)
  }
}

export class AgentExistsError extends AppError {
  constructor(name: string) {
    const t = mainT().errors.agentExists
    super('AGENT_EXISTS', t.message(name), t.hint)
  }
}

export class AutomationRunError extends AppError {
  constructor(detail: string) {
    const t = mainT().errors.automationRun
    super('AUTOMATION_RUN', t.message(detail), t.hint)
  }
}

export function toErrorInfo(error: unknown): AppErrorInfo {
  if (error instanceof AppError) return error.toInfo()
  const message = error instanceof Error ? error.message : String(error)
  return { code: 'UNEXPECTED', message, hint: mainT().errors.unexpectedHint }
}
