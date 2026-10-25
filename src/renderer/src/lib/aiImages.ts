const MAX_NAMED_PROJECTS = 2

/** Toast-Text für neu übernommene KI-Bilder, z. B. „3 neue KI-Bilder in AI Interface“. */
export function aiImagesMessage(count: number, projectNames: readonly string[]): string {
  const images = count === 1 ? '1 neues KI-Bild' : `${count} neue KI-Bilder`
  const names = [...new Set(projectNames)]
  if (names.length === 0) return images
  if (names.length <= MAX_NAMED_PROJECTS) return `${images} in ${names.join(' und ')}`
  return `${images} in ${names.length} Projekten`
}
