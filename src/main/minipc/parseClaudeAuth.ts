import { mainT } from '../i18n'
import type { ClaudeAuth } from '@shared/types'
import { keyValues } from './parseInfo'
import { numberOrNull, sections } from './sections'

const YES = '1'

/**
 * Ausgabe von `claudeAuthScript` → Anmeldestand. Wie `claude-auth-check`: abgemeldet, wenn das Refresh-Token
 * oder sein Ablaufdatum fehlt oder `claude auth status` keine Anmeldung meldet. Ohne Claude-CLI im `PATH`
 * zählt allein die Anmeldedatei, damit ein anders installiertes Claude keinen Fehlalarm auslöst.
 */
export function parseClaudeAuth(stdout: string, checkedAt: number): ClaudeAuth {
  const lines = sections(stdout).get('AUTH')
  if (!lines) return { state: 'unknown', reason: mainT().errors.minipc.authMissing, checkedAt }
  const kv = keyValues(lines)
  const cli = kv.get('cli') === YES
  if (!cli && kv.get('file') !== YES) return { state: 'notInstalled', checkedAt }
  const expiresAt = numberOrNull(kv.get('expires'))
  const loggedIn = !cli || kv.get('loggedIn') === YES
  if (loggedIn && kv.get('refresh') === YES && expiresAt !== null) return { state: 'signedIn', expiresAt, checkedAt }
  return { state: 'signedOut', checkedAt }
}
