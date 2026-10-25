import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { buildLaunch } from '../../src/main/terminal/launchCommand'

const PROMPT = 'Ziel: "Tests" reparieren\nKontext: $HOME `x` ä ö ü \'quote\' 100% \\pfad\\'
const NODE = process.execPath
const ROUNDTRIP_TIMEOUT_MS = 30_000
const RUN_ENV = { ...process.env, ELECTRON_RUN_AS_NODE: '1' }

const decode = (stdout: string): string => Buffer.from(stdout.trim(), 'base64').toString('utf8')

describe('Startprompt kommt unverändert an', () => {
  it.skipIf(process.platform !== 'win32')(
    'PowerShell 5.1',
    () => {
      const claudeCommand = `& '${NODE}' -e 'process.stdout.write(Buffer.from(process.argv[1]).toString(\\"base64\\"))'`
      const spec = buildLaunch({ platform: 'win32', target: 'local', path: tmpdir(), mode: 'new', claudeCommand, shell: undefined, initialPrompt: PROMPT })
      if (spec.kind !== 'local') throw new Error('lokal erwartet')
      const args = spec.args.filter((a) => a !== '-NoExit')
      const run = spawnSync(spec.file, args, { cwd: spec.cwd, encoding: 'utf8', timeout: ROUNDTRIP_TIMEOUT_MS, env: RUN_ENV })
      expect(decode(run.stdout)).toBe(PROMPT)
    },
    ROUNDTRIP_TIMEOUT_MS
  )

  it.skipIf(process.platform === 'win32')(
    'POSIX-Shell',
    () => {
      const claudeCommand = `'${NODE}' -e 'process.stdout.write(Buffer.from(process.argv[1]).toString("base64"))'`
      const spec = buildLaunch({ platform: process.platform, target: 'local', path: tmpdir(), mode: 'new', claudeCommand, shell: '/bin/sh', initialPrompt: PROMPT })
      if (spec.kind !== 'local') throw new Error('lokal erwartet')
      const script = (spec.args[2] ?? '').replace(/; exec .*$/, '')
      const run = spawnSync('/bin/sh', ['-c', script], { encoding: 'utf8', timeout: ROUNDTRIP_TIMEOUT_MS, env: RUN_ENV })
      expect(decode(run.stdout)).toBe(PROMPT)
    },
    ROUNDTRIP_TIMEOUT_MS
  )

  it.skipIf(process.platform === 'win32')(
    'SSH-Eingabe in einer interaktiven Shell',
    () => {
      const claudeCommand = `'${NODE}' -e 'process.stdout.write(Buffer.from(process.argv[1]).toString("base64"))'`
      const spec = buildLaunch({ platform: 'linux', target: 'ssh', path: tmpdir(), mode: 'new', claudeCommand, shell: undefined, initialPrompt: PROMPT })
      if (spec.kind !== 'ssh') throw new Error('ssh erwartet')
      const run = spawnSync('/bin/sh', [], { input: spec.initialInput, encoding: 'utf8', timeout: ROUNDTRIP_TIMEOUT_MS, env: RUN_ENV })
      expect(decode(run.stdout)).toBe(PROMPT)
    },
    ROUNDTRIP_TIMEOUT_MS
  )
})
