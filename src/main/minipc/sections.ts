/** Abschnitte der Ausgabe `@@NAME@@` → Zeilen (leere Zeilen entfallen). */
export function sections(stdout: string): Map<string, string[]> {
  const result = new Map<string, string[]>()
  let current: string[] | null = null
  for (const raw of stdout.split('\n')) {
    const line = raw.replace(/\r$/, '')
    const header = /^@@([A-Z0-9]+)@@$/.exec(line)
    if (header?.[1]) {
      current = []
      result.set(header[1], current)
    } else if (current && line.trim()) {
      current.push(line)
    }
  }
  return result
}

export const numbers = (line: string | undefined): number[] =>
  (line ?? '')
    .trim()
    .split(/\s+/)
    .map(Number)
    .filter((n) => !Number.isNaN(n))

/** Zahl aus einem Feld, `null` bei leerem oder unlesbarem Wert. */
export function numberOrNull(value: string | undefined): number | null {
  const text = value?.trim() ?? ''
  if (!text) return null
  const n = Number(text)
  return Number.isNaN(n) ? null : n
}
