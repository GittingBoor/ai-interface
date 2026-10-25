import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { runProcess } from '../src/main/claude/ClaudeCli'
import { ClaudeCliError } from '../src/main/errors'

/** Electron läuft in den Tests als Node (ELECTRON_RUN_AS_NODE), damit lassen sich kleine Skripte starten. */
const node = process.execPath
const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1' }

describe('runProcess', () => {
  it('reicht stdin durch und liefert stdout', async () => {
    const out = await runProcess(node, ['-e', "process.stdin.on('data', (d) => process.stdout.write(String(d).toUpperCase()))"], 'hallo', { timeoutMs: 10_000, env })
    expect(out).toBe('HALLO')
  })

  it('wirft bei Exit-Code ungleich 0 mit stderr', async () => {
    await expect(runProcess(node, ['-e', "process.stderr.write('kaputt'); process.exit(3)"], '', { timeoutMs: 10_000, env })).rejects.toThrow(ClaudeCliError)
    await expect(runProcess(node, ['-e', "process.stderr.write('kaputt'); process.exit(3)"], '', { timeoutMs: 10_000, env })).rejects.toThrow(/kaputt/)
  })

  it.runIf(process.platform === 'win32')('startet .cmd-Dateien in Pfaden mit Leerzeichen und reicht Argumente unverändert durch', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'aii cmd '))
    const script = join(dir, 'echo args.cmd')
    writeFileSync(script, '@echo off\r\necho [%~1][%~2]\r\n')
    const out = await runProcess(script, ['-p', 'zwei Worte'], '', { timeoutMs: 10_000, env })
    expect(out.trim()).toBe('[-p][zwei Worte]')
  })

  it('bricht nach dem Zeitlimit ab', async () => {
    await expect(runProcess(node, ['-e', 'setTimeout(() => {}, 60000)'], '', { timeoutMs: 300, env })).rejects.toThrow(/Zeitlimit/)
  })
})
