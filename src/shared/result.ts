/** Fehlerbeschreibung, die über IPC an den Renderer geht. */
export interface AppErrorInfo {
  readonly code: string
  readonly message: string
  readonly hint?: string
}

export type Result<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: AppErrorInfo }

export const ok = <T>(data: T): Result<T> => ({ ok: true, data })

export const fail = <T = never>(error: AppErrorInfo): Result<T> => ({ ok: false, error })
