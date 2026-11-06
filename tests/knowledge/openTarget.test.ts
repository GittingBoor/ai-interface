import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { isInside, opensDirectly, resolveOpenTarget } from '../../src/main/knowledge/openTarget'

describe('Datei aus dem Projektwissen öffnen', () => {
  const dirs: string[] = []
  afterEach(async () => {
    for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true })
  })

  it('öffnet Text, Doku und Quellcode direkt, Ausführbares nicht', () => {
    for (const file of ['README.md', 'src/a.ts', 'docs/plan.txt', 'package.json', 'Bild.PNG']) expect(opensDirectly(file), file).toBe(true)
    for (const file of ['setup.exe', 'tools/x.bat', 'a.cmd', 'run.ps1', 'start.sh', 'main.py', 'index.js', 'x.lnk', 'Makefile']) expect(opensDirectly(file), file).toBe(false)
  })

  it('erkennt, ob ein Pfad im Projekt liegt', () => {
    expect(isInside('C:\\p', 'C:\\p\\src\\a.ts')).toBe(true)
    expect(isInside('C:\\p', 'C:\\p')).toBe(true)
    expect(isInside('C:\\p', 'C:\\pfad\\a.ts')).toBe(false)
    expect(isInside('C:\\p', 'D:\\p\\a.ts')).toBe(false)
  })

  it('liefert den echten Pfad und ob er direkt geöffnet wird', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aii-open-'))
    dirs.push(root)
    await mkdir(join(root, 'src'))
    await writeFile(join(root, 'src', 'a.ts'), '')
    await writeFile(join(root, 'x.bat'), '')
    expect(await resolveOpenTarget(root, 'src/a.ts')).toMatchObject({ direct: true })
    expect(await resolveOpenTarget(root, 'x.bat')).toMatchObject({ direct: false })
  })

  it('meldet fehlende Dateien und verweigert Pfade aus dem Projekt hinaus', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aii-open-'))
    dirs.push(root)
    await expect(resolveOpenTarget(root, 'fehlt.md')).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(resolveOpenTarget(root, '../x.md')).rejects.toMatchObject({ code: 'VALIDATION' })
  })
})
