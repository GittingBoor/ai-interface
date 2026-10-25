/**
 * Befehlszeile für `cmd.exe`, die das Installationsskript startet.
 *
 * PowerShell direkt mit `detached` zu starten schlägt fehl: Ohne Konsole beendet sie sich sofort mit Code 0, ohne das
 * Skript auszuführen. Ohne `detached` landet sie in Nodes Job-Objekt und stirbt mit der App. `start` gibt ihr eine
 * eigene Konsole außerhalb der App; `-WindowStyle Hidden` blendet sie aus.
 */
export function installCommandLine(script: string, installer: string, appExe: string): string {
  const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', script, '-Installer', installer, '-AppExe', appExe]
  return `/d /s /c "start "" /min powershell.exe ${args.map(quote).join(' ')}"`
}

/** Windows-Pfade enthalten keine Anführungszeichen, also reicht Einschließen bei Leerzeichen. */
function quote(arg: string): string {
  return arg.includes(' ') ? `"${arg}"` : arg
}
