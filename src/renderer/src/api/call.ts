import type { AppErrorInfo, Result } from '@shared/result'
import { notify } from '@renderer/stores/toastStore'

/** Fehler mit Code, damit Aufrufer gezielt reagieren können (z. B. TODO_NOT_FOUND). */
export class ApiError extends Error {
  readonly code: string
  readonly hint?: string

  constructor(info: AppErrorInfo) {
    super(info.message)
    this.name = 'ApiError'
    this.code = info.code
    if (info.hint !== undefined) this.hint = info.hint
  }
}

/** Packt ein `Result` aus und wirft bei Fehlern eine `ApiError`. */
export async function unwrap<T>(pending: Promise<Result<T>>): Promise<T> {
  let result: Result<T>
  try {
    result = await pending
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    throw new ApiError({ code: 'IPC', message: `Verbindung zum Hintergrundprozess fehlgeschlagen: ${message}`, hint: 'App neu starten; Details stehen im Log.' })
  }
  if (!result.ok) throw new ApiError(result.error)
  return result.data
}

/** Wie `unwrap`, zeigt Fehler aber als Toast und liefert dann `null`. */
export async function attempt<T>(pending: Promise<Result<T>>): Promise<T | null> {
  try {
    return await unwrap(pending)
  } catch (error) {
    reportError(error)
    return null
  }
}

export function reportError(error: unknown): void {
  if (error instanceof ApiError) notify.error(error.message, error.hint)
  else notify.error(error instanceof Error ? error.message : 'Unbekannter Fehler', 'Details stehen im Log (Einstellungen → Log öffnen).')
}

export const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error))
