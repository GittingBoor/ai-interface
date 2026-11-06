import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ClaudeTrust, trustKey, withTrustedFolder } from '../src/main/claude/claudeTrust'

describe('Vertrauen für Claude-Arbeitsordner', () => {
  const dirs: string[] = []
  afterEach(async () => {
    for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true })
  })

  async function configFile(content: string): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'aii-trust-'))
    dirs.push(dir)
    const file = join(dir, '.claude.json')
    await writeFile(file, content, 'utf8')
    return file
  }

  it('schreibt Windows-Pfade so wie Claude Code (Schrägstriche)', () => {
    expect(trustKey('C:\\Daten\\AI Interface\\projektwissen')).toBe('C:/Daten/AI Interface/projektwissen')
    expect(trustKey('/home/nutzer/projektwissen')).toBe('/home/nutzer/projektwissen')
  })

  it('ergänzt den Ordner und lässt alles andere unverändert', () => {
    const config = { numStartups: 3, projects: { 'C:/a': { hasTrustDialogAccepted: true, allowedTools: ['x'] } } }
    expect(withTrustedFolder(config, 'C:\\b')).toEqual({
      numStartups: 3,
      projects: { 'C:/a': { hasTrustDialogAccepted: true, allowedTools: ['x'] }, 'C:/b': { hasTrustDialogAccepted: true } }
    })
  })

  it('behält vorhandene Felder des Ordners und meldet „nichts zu tun“, wenn er schon vertraut ist', () => {
    expect(withTrustedFolder({ projects: { 'C:/b': { allowedTools: ['y'] } } }, 'C:\\b')).toEqual({ projects: { 'C:/b': { allowedTools: ['y'], hasTrustDialogAccepted: true } } })
    expect(withTrustedFolder({ projects: { 'C:/b': { hasTrustDialogAccepted: true } } }, 'C:\\b')).toBeNull()
  })

  it('schreibt die Datei nur bei Bedarf und ohne Daten zu verlieren', async () => {
    const file = await configFile(JSON.stringify({ userID: 'u', projects: {} }))
    await new ClaudeTrust(file).ensure('C:\\arbeit\\projektwissen')
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({ userID: 'u', projects: { 'C:/arbeit/projektwissen': { hasTrustDialogAccepted: true } } })
  })

  it('legt keine Datei an, wenn Claude Code noch nie lief', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aii-trust-'))
    dirs.push(dir)
    const file = join(dir, '.claude.json')
    await new ClaudeTrust(file).ensure('C:\\x')
    await expect(readFile(file, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('überschreibt keine kaputte Konfiguration', async () => {
    const file = await configFile('{ kaputt')
    await expect(new ClaudeTrust(file).ensure('C:\\x')).rejects.toThrow(/\.claude\.json/)
    expect(await readFile(file, 'utf8')).toBe('{ kaputt')
  })
})
