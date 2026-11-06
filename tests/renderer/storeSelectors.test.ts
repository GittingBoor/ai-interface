import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const RENDERER_DIR = join('src', 'renderer', 'src')
/** Store-Hook mit Selektor, der als Ersatzwert ein frisches Array/Objekt liefert: `useX((s) => … ?? [])`. */
const FRESH_FALLBACK = /use[A-Z]\w*\(\s*\(\w+\)\s*=>[^\n]*?(\?\?|\|\|)\s*(\[\]|\{\})\s*\)/

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name)
    if (e.isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(e.name) ? [path] : []
  })
}

describe('Store-Selektoren', () => {
  // Zustand vergleicht mit Object.is: ein neues [] bei jedem Aufruf gilt als Änderung und rendert endlos neu
  // (React-Fehler #185, schwarzes Fenster in der Projektansicht ohne Verbrauchsdaten oder Vault).
  it('liefern keine frischen Arrays oder Objekte als Ersatzwert', () => {
    const hits = sourceFiles(RENDERER_DIR).flatMap((file) =>
      readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .map((line, i) => ({ line, at: `${file}:${i + 1}` }))
        .filter(({ line }) => FRESH_FALLBACK.test(line) && !line.includes('useShallow'))
        .map(({ at }) => at)
    )
    expect(hits).toEqual([])
  })
})
