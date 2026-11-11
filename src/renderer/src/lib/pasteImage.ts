/** Bild aus der Zwischenablage übernehmen? Nur wenn kein Text dabei ist; Text hat immer Vorrang. */
export function shouldPasteImage(types: readonly string[]): boolean {
  if (types.includes('text/plain')) return false
  return types.some((t) => t === 'Files' || t.startsWith('image/'))
}
