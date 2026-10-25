import { session, shell, type WebContents } from 'electron'
import { isWebUrl, LINK_PARTITION } from '@shared/links'

/** Sitzungen, in denen eingebettete Seiten laufen dürfen. */
const PARTITIONS: readonly string[] = [LINK_PARTITION]

/** Mehr brauchen Home Assistant, Server-Panels und Anmeldeseiten nicht; Kamera, Mikrofon, Standort bleiben gesperrt. */
const ALLOWED_PERMISSIONS: readonly string[] = ['clipboard-sanitized-write', 'fullscreen']

/**
 * Eingebettete Webseiten (`<webview>` im Bereich Verknüpfungen) absichern: nur http(s) in der eigenen, dauerhaften
 * Sitzung, ohne Preload und ohne Node. Neue Fenster aus der Seite öffnen sich im Browser.
 */
export function guardWebviews(host: WebContents): void {
  for (const partition of PARTITIONS) session.fromPartition(partition).setPermissionRequestHandler((_contents, permission, callback) => callback(ALLOWED_PERMISSIONS.includes(permission)))
  host.on('will-attach-webview', (event, preferences, params) => {
    if (!PARTITIONS.includes(params['partition'] ?? '') || !isWebUrl(params['src'] ?? '')) {
      event.preventDefault()
      return
    }
    delete preferences.preload
    preferences.nodeIntegration = false
    preferences.nodeIntegrationInSubFrames = false
    preferences.contextIsolation = true
    preferences.sandbox = true
  })
  host.on('did-attach-webview', (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      if (isWebUrl(url)) void shell.openExternal(url)
      return { action: 'deny' }
    })
  })
}
