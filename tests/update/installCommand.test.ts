import { describe, expect, it } from 'vitest'
import { installCommandLine } from '../../src/main/update/installCommand'

describe('installCommandLine', () => {
  const line = installCommandLine('D:\\repo\\scripts\\install-update.ps1', 'D:\\repo\\release\\AI Interface Setup 0.1.0.exe', 'C:\\Programs\\AI Interface\\AI Interface.exe')

  it('startet PowerShell über „start“, damit es eine eigene Konsole bekommt und die App überlebt', () => {
    expect(line.startsWith('/d /s /c "start "" /min powershell.exe ')).toBe(true)
    expect(line.endsWith('"')).toBe(true)
  })

  it('setzt Pfade mit Leerzeichen in Anführungszeichen', () => {
    expect(line).toContain('-Installer "D:\\repo\\release\\AI Interface Setup 0.1.0.exe"')
    expect(line).toContain('-AppExe "C:\\Programs\\AI Interface\\AI Interface.exe"')
    expect(line).toContain('-File D:\\repo\\scripts\\install-update.ps1')
  })
})
