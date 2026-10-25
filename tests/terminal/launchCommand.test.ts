import { describe, expect, it } from 'vitest'
import { buildLaunch, terminalEnv } from '../../src/main/terminal/launchCommand'

describe('buildLaunch', () => {
  it('startet unter Windows PowerShell im Ordner und ruft claude auf', () => {
    expect(buildLaunch({ platform: 'win32', target: 'local', path: "C:\\Projekte\\Alexs 'KI'", mode: 'new', claudeCommand: 'claude', shell: undefined })).toEqual({
      kind: 'local',
      file: 'powershell.exe',
      args: ['-NoLogo', '-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', "Set-Location -LiteralPath 'C:\\Projekte\\Alexs ''KI'''; claude"],
      cwd: "C:\\Projekte\\Alexs 'KI'"
    })
  })

  it('startet unter Linux eine Login-Shell, führt claude --continue aus und bleibt offen', () => {
    expect(buildLaunch({ platform: 'linux', target: 'local', path: '/home/alex/projects', mode: 'continue', claudeCommand: 'claude', shell: '/bin/zsh' })).toEqual({
      kind: 'local',
      file: '/bin/zsh',
      args: ['-l', '-c', "cd '/home/alex/projects' && claude --continue; exec '/bin/zsh' -l"],
      cwd: '/home/alex/projects'
    })
  })

  it('öffnet nur eine Shell im Modus "shell"', () => {
    const spec = buildLaunch({ platform: 'win32', target: 'local', path: 'C:\\x', mode: 'shell', claudeCommand: 'claude', shell: undefined })
    expect(spec).toMatchObject({ args: ['-NoLogo', '-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', "Set-Location -LiteralPath 'C:\\x'"] })
  })

  it('schickt über SSH den gequoteten cd-Befehl als erste Eingabe', () => {
    expect(buildLaunch({ platform: 'win32', target: 'ssh', path: '/home/alex/OneDrive/Obsidian Vault', mode: 'continue', claudeCommand: 'claude', shell: undefined })).toEqual({
      kind: 'ssh',
      initialInput: "cd '/home/alex/OneDrive/Obsidian Vault' && claude --continue\n"
    })
  })

  it('setzt den Startprompt vor die Flags (POSIX lokal)', () => {
    const spec = buildLaunch({ platform: 'linux', target: 'local', path: '/p', mode: 'new', claudeCommand: 'claude', shell: '/bin/bash', initialPrompt: "Tests 'reparieren'", hookSettingsPath: '/h.json', extraArgs: ['--mcp-config', '/m.json'] })
    expect(spec).toMatchObject({ args: ['-l', '-c', `cd '/p' && claude 'Tests '\\''reparieren'\\''' --settings '/h.json' '--mcp-config' '/m.json'; exec '/bin/bash' -l`] })
  })

  it('nutzt unter Windows mit Startprompt -EncodedCommand', () => {
    const spec = buildLaunch({ platform: 'win32', target: 'local', path: 'C:\\p', mode: 'new', claudeCommand: 'claude', shell: undefined, initialPrompt: 'a\nb' })
    if (spec.kind !== 'local') throw new Error('lokal erwartet')
    expect(spec.args.slice(0, 4)).toEqual(['-NoLogo', '-NoExit', '-ExecutionPolicy', 'Bypass'])
    expect(spec.args[4]).toBe('-EncodedCommand')
    const decoded = Buffer.from(spec.args[5] ?? '', 'base64').toString('utf16le')
    expect(decoded).toBe("Set-Location -LiteralPath 'C:\\p'; claude 'a\nb'")
  })

  it('schützt Anführungszeichen für PowerShell 5.1 und native Programme', () => {
    const spec = buildLaunch({ platform: 'win32', target: 'local', path: 'C:\\p', mode: 'new', claudeCommand: 'claude', shell: undefined, initialPrompt: 'sag "hi" \\' })
    if (spec.kind !== 'local') throw new Error('lokal erwartet')
    const decoded = Buffer.from(spec.args[5] ?? '', 'base64').toString('utf16le')
    expect(decoded).toBe(`Set-Location -LiteralPath 'C:\\p'; claude 'sag \\"hi\\" \\\\'`)
  })

  it('übergibt den Startprompt über SSH als Base64', () => {
    const spec = buildLaunch({ platform: 'linux', target: 'ssh', path: '/p', mode: 'new', claudeCommand: 'claude', shell: undefined, initialPrompt: 'ä\n"x"' })
    const b64 = Buffer.from('ä\n"x"', 'utf8').toString('base64')
    expect(spec).toEqual({ kind: 'ssh', initialInput: `cd '/p' && claude "$(printf %s '${b64}' | base64 -d)"\n` })
  })

  it('schützt einen Startprompt mit führendem Bindestrich vor der Deutung als Option', () => {
    const spec = buildLaunch({ platform: 'linux', target: 'local', path: '/p', mode: 'new', claudeCommand: 'claude', shell: '/bin/bash', initialPrompt: '- Ziel: x' })
    expect(spec).toMatchObject({ args: ['-l', '-c', "cd '/p' && claude ' - Ziel: x'; exec '/bin/bash' -l"] })
  })

  it('ignoriert Startprompt und Zusatzargumente im Modus shell', () => {
    const spec = buildLaunch({ platform: 'linux', target: 'local', path: '/p', mode: 'shell', claudeCommand: 'claude', shell: '/bin/bash', initialPrompt: 'x', extraArgs: ['--y'] })
    expect(spec).toMatchObject({ args: ['-l', '-c', "cd '/p'; exec '/bin/bash' -l"] })
  })
})

describe('terminalEnv', () => {
  it('entfernt Sitzungsmarker einer umgebenden Claude-Sitzung, behält Einstellungen', () => {
    const env = terminalEnv({
      PATH: '/bin',
      CLAUDECODE: '1',
      CLAUDE_CODE_CHILD_SESSION: '1',
      CLAUDE_CODE_SESSION_ID: 'x',
      CLAUDE_CODE_ENTRYPOINT: 'cli',
      CLAUDE_CODE_MESSAGING_SOCKET: 's',
      CLAUDE_CODE_MESSAGING_TOKEN: 't',
      CLAUDE_CODE_SESSION_ATTENDED: '1',
      CLAUDE_CODE_EXECPATH: 'e',
      CLAUDE_PID: '1',
      AI_AGENT: 'a',
      CLAUDE_CODE_MAX_OUTPUT_TOKENS: '64000',
      UNDEFINED_VALUE: undefined
    })
    expect(env).toEqual({ PATH: '/bin', CLAUDE_CODE_MAX_OUTPUT_TOKENS: '64000', TERM: 'xterm-256color', COLORTERM: 'truecolor' })
  })
})
