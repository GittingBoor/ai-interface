import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LocalHost } from '../../src/main/hosts/LocalHost'

describe('LocalHost', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aii-local-'))
  const host = new LocalHost()

  it('liest Verzeichnisse, Dateien ab Offset und Stat', async () => {
    mkdirSync(join(dir, 'sub'))
    writeFileSync(join(dir, 'a.txt'), 'hallo welt')
    const entries = (await host.readDir(dir)).map((e) => [e.name, e.isDirectory]).sort()
    expect(entries).toEqual([['a.txt', false], ['sub', true]])
    expect((await host.readFile(join(dir, 'a.txt'), 6)).toString()).toBe('welt')
    expect(await host.stat(join(dir, 'fehlt'))).toBeNull()
    expect((await host.stat(join(dir, 'sub')))?.isDirectory).toBe(true)
  })

  it('schreibt atomar und legt fehlende Ordner an', async () => {
    const target = join(dir, 'neu', 'TODO.md')
    await host.writeFileAtomic(target, 'eins')
    await host.writeFileAtomic(target, 'zwei')
    expect((await host.readFile(target)).toString()).toBe('zwei')
    expect((await host.readDir(join(dir, 'neu'))).map((e) => e.name)).toEqual(['TODO.md'])
  })

  it('führt Befehle aus und liefert den Exit-Code', async () => {
    const result = await host.exec('echo hallo')
    expect(result.stdout.replace(/\r\n/g, '\n')).toBe('hallo\n')
    expect(result.code).toBe(0)
    expect((await host.exec('exit 3')).code).toBe(3)
  })
})
