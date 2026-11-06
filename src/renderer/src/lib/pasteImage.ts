import { PASTE_IMAGE_EXTENSIONS } from '@shared/types'

/** Bild aus der Zwischenablage übernehmen? Nur wenn kein Text dabei ist; Text hat immer Vorrang. */
export function shouldPasteImage(types: readonly string[]): boolean {
  if (types.includes('text/plain')) return false
  return types.some((t) => t === 'Files' || t.startsWith('image/'))
}

/** Dateiendung einer hereingezogenen Datei, wenn Claude Code das Format annimmt, sonst `null`. */
export function pasteExtensionOf(fileName: string): string | null {
  const extension = /\.([a-z0-9]+)$/i.exec(fileName)?.[1]?.toLowerCase()
  return extension && PASTE_IMAGE_EXTENSIONS.includes(extension) ? extension : null
}
