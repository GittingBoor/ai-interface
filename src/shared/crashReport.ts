/** Höchstlänge von Meldung und Stack, damit ein Fehler in einer Schleife das Log nicht flutet. */
export const CRASH_TEXT_LIMIT = 4000

/** Woher der Fehler im Renderer kam. */
export type CrashSource = 'render' | 'error' | 'rejection'

/** Fehler aus der Oberfläche, wie er im Log des Hauptprozesses landet. */
export interface CrashReport {
  readonly source: CrashSource
  readonly message: string
  readonly stack: string
}

function describeValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === undefined) return 'undefined'
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

/** Baut aus einem beliebigen geworfenen Wert einen gekürzten Bericht; `context` z. B. der React-Komponentenstack. */
export function crashReport(source: CrashSource, error: unknown, context = ''): CrashReport {
  const message = error instanceof Error ? error.message : describeValue(error)
  const stack = [error instanceof Error ? (error.stack ?? '') : '', context].filter(Boolean).join('\n')
  return { source, message: message.slice(0, CRASH_TEXT_LIMIT), stack: stack.slice(0, CRASH_TEXT_LIMIT) }
}
