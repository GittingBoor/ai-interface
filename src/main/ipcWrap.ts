import { fail, ok, type Result } from '@shared/result'
import { AppError, toErrorInfo } from './errors'

/** Führt einen Handler aus und liefert immer ein `Result`; unerwartete Fehler werden geloggt. */
export function wrapHandler<A extends unknown[], T>(
  handler: (...args: A) => Promise<T> | T,
  logError: (error: unknown) => void = () => undefined
): (...args: A) => Promise<Result<T>> {
  return async (...args: A) => {
    try {
      return ok(await handler(...args))
    } catch (error) {
      if (!(error instanceof AppError)) logError(error)
      return fail(toErrorInfo(error))
    }
  }
}
