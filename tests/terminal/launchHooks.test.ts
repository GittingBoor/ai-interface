import { describe, expect, it } from 'vitest'
import { buildLaunch } from '../../src/main/terminal/launchCommand'

describe('buildLaunch mit Hooks', () => {
  it('SSH: exportiert die Terminal-ID und startet claude mit --settings', () => {
    expect(
      buildLaunch({
        platform: 'win32',
        target: 'ssh',
        path: '/home/alex/projects',
        mode: 'continue',
        claudeCommand: 'claude',
        shell: undefined,
        terminalId: 't1',
        hookSettingsPath: '/home/alex/.cache/ai-interface/hooks.json'
      })
    ).toEqual({
      kind: 'ssh',
      initialInput: "export AI_INTERFACE_TERMINAL_ID='t1'; cd '/home/alex/projects' && claude --continue --settings '/home/alex/.cache/ai-interface/hooks.json'\n"
    })
  })

  it('Windows: claude bekommt --settings mit PowerShell-Quoting', () => {
    const spec = buildLaunch({
      platform: 'win32',
      target: 'local',
      path: 'C:\\x',
      mode: 'new',
      claudeCommand: 'claude',
      shell: undefined,
      terminalId: 't1',
      hookSettingsPath: 'C:\\Users\\Alex\\AppData\\Roaming\\AI Interface\\hooks-local.json'
    })
    expect(spec).toMatchObject({
      args: ['-NoLogo', '-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', "Set-Location -LiteralPath 'C:\\x'; claude --settings 'C:\\Users\\Alex\\AppData\\Roaming\\AI Interface\\hooks-local.json'"]
    })
  })

  it('Nur-Shell: keine --settings', () => {
    const spec = buildLaunch({
      platform: 'linux',
      target: 'ssh',
      path: '/p',
      mode: 'shell',
      claudeCommand: 'claude',
      shell: undefined,
      terminalId: 't1',
      hookSettingsPath: '/h.json'
    })
    expect(spec).toEqual({ kind: 'ssh', initialInput: "export AI_INTERFACE_TERMINAL_ID='t1'; cd '/p'\n" })
  })
})
