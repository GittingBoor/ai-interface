import type { QuotaState, QuotaWindow, QuotaWindowKind } from '@shared/types'

/** Ab hier wird der Balken in Warnfarbe gezeigt. */
export const QUOTA_WARN_PERCENT = 80
/** Ab hier in Gefahrfarbe. */
export const QUOTA_DANGER_PERCENT = 95
/** Voll: neue Anfragen werden abgewiesen. */
export const QUOTA_FULL_PERCENT = 100
/** Älter als das gilt ein Stand als veraltet (Abfrage alle 10 min). */
export const QUOTA_STALE_MS = 15 * 60_000

export type QuotaLevel = 'normal' | 'warn' | 'danger'

export const QUOTA_LABEL: Readonly<Record<QuotaWindowKind, string>> = {
  five_hour: '5 Std.',
  seven_day: 'Woche',
  seven_day_opus: 'Woche · Opus',
  seven_day_sonnet: 'Woche · Sonnet'
}

const ORDER: readonly QuotaWindowKind[] = ['five_hour', 'seven_day', 'seven_day_opus', 'seven_day_sonnet']

export function quotaLevel(percent: number): QuotaLevel {
  if (percent >= QUOTA_DANGER_PERCENT) return 'danger'
  if (percent >= QUOTA_WARN_PERCENT) return 'warn'
  return 'normal'
}

/** Fenster in fester Reihenfolge: 5 Std., Woche, dann Opus/Sonnet (nur wenn vorhanden). */
export function orderedWindows(windows: readonly QuotaWindow[]): QuotaWindow[] {
  return [...windows].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind))
}

export type QuotaAvailability =
  | { readonly kind: 'unknown' }
  | { readonly kind: 'free'; readonly percent: number }
  | { readonly kind: 'full'; readonly resetsAt: number | null }

/** Ist das 5-Stunden-Kontingent gerade frei? Unbekannt ohne Quelle oder bei veraltetem Stand. */
export function fiveHourAvailability(state: QuotaState, now: number): QuotaAvailability {
  if (state.status !== 'ok' || now - state.fetchedAt > QUOTA_STALE_MS) return { kind: 'unknown' }
  const window = state.windows.find((w) => w.kind === 'five_hour')
  if (!window) return { kind: 'unknown' }
  const resetPassed = window.resetsAt !== null && window.resetsAt <= now
  if (window.percent >= QUOTA_FULL_PERCENT && !resetPassed) return { kind: 'full', resetsAt: window.resetsAt }
  return { kind: 'free', percent: resetPassed ? 0 : window.percent }
}
