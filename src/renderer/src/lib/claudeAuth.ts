import type { ClaudeAuth } from '@shared/types'
import { messagesFor, type Messages } from '@shared/i18n/messages'
import { activeLocale } from '../i18n/activeLocale'
import { formatDateTime } from './format'

/** Ab so vielen Resttagen (einschließlich) warnt die Seitenleiste. */
export const CLAUDE_AUTH_WARN_DAYS = 7
const DAY_MS = 86_400_000
const RELOGIN = 'claude auth login'

/** `warn`/`expired` markieren das Gerät in der Seitenleiste; `unknown` und `none` nie (kein Fehlalarm). */
export type ClaudeAuthLevel = 'ok' | 'warn' | 'expired' | 'unknown' | 'none'

export interface ClaudeAuthView {
  readonly level: ClaudeAuthLevel
  /** Ganze Resttage wie bei `claude-auth-check` (abgerundet); `null` ohne gültige Anmeldung. */
  readonly daysLeft: number | null
  readonly expiresAt: number | null
  /** Kurztext, z. B. „Claude-Login: noch 23 Tage“; `null` = nichts anzeigen. */
  readonly label: string | null
  /** Tooltip bzw. Erklärung mit Handlungsanweisung. */
  readonly hint: string | null
}

/** Anmeldestand → Anzeige; `auth` fehlt, solange noch keine Prüfung zurück ist. Texte in der aktiven Sprache, sofern kein Wörterbuch übergeben wird. */
export function claudeAuthView(auth: ClaudeAuth | undefined, now: number, t: Messages['device'] = messagesFor(activeLocale()).device): ClaudeAuthView {
  const none = { daysLeft: null, expiresAt: null }
  switch (auth?.state) {
    case undefined:
      return { ...none, level: 'unknown', label: t.authChecking, hint: null }
    case 'notInstalled':
      return { ...none, level: 'none', label: null, hint: null }
    case 'unknown':
      return { ...none, level: 'unknown', label: t.authUnknown, hint: t.authNotCheckable(auth.reason) }
    case 'signedOut':
      return { ...none, level: 'expired', label: t.authSignedOut, hint: t.authSignedOutHint(RELOGIN) }
    case 'signedIn': {
      const left = auth.expiresAt - now
      const until = formatDateTime(auth.expiresAt)
      if (left <= 0) {
        return { level: 'expired', daysLeft: null, expiresAt: auth.expiresAt, label: t.authExpired(until), hint: t.authExpiredHint(until, RELOGIN) }
      }
      const daysLeft = Math.floor(left / DAY_MS)
      const warn = left <= CLAUDE_AUTH_WARN_DAYS * DAY_MS
      return {
        level: warn ? 'warn' : 'ok',
        daysLeft,
        expiresAt: auth.expiresAt,
        label: t.authDaysLeft(daysLeft),
        hint: warn ? t.authWarnHint(until, RELOGIN) : t.authValidUntil(until)
      }
    }
  }
}
