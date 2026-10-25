# Installiert eine neu gebaute AI-Interface-Version. Wird von der App beim Startup-Update gestartet,
# läuft losgelöst von ihr: wartet aufs Beenden, sichert die Datenbank, installiert still und startet neu.
param(
  [Parameter(Mandatory = $true)][string]$Installer,
  [Parameter(Mandatory = $true)][string]$AppExe
)
$ErrorActionPreference = 'Stop'
$DataDir = Join-Path $env:APPDATA 'AI Interface'
$Log = Join-Path (Split-Path $Installer) "update-$(Get-Date -Format 'yyyy-MM-dd-HHmm').log"

function Write-Log([string]$Message) { "$(Get-Date -Format s) $Message" | Add-Content -Path $Log -Encoding utf8 }

try {
  Write-Log "Update gestartet: $Installer"

  # Die App beendet sich selbst; erst warten, dann normal schließen, zuletzt hart.
  for ($i = 0; $i -lt 30 -and (Get-Process -Name 'AI Interface' -ErrorAction SilentlyContinue); $i++) { Start-Sleep -Seconds 1 }
  Get-Process -Name 'AI Interface' -ErrorAction SilentlyContinue | ForEach-Object { [void]$_.CloseMainWindow() }
  Start-Sleep -Seconds 5
  $left = Get-Process -Name 'AI Interface' -ErrorAction SilentlyContinue
  if ($left) { Write-Log "Beende $($left.Count) Prozess(e) hart"; $left | Stop-Process -Force; Start-Sleep -Seconds 2 }
  Get-Process -Name 'whisper-server' -ErrorAction SilentlyContinue | Stop-Process -Force
  Write-Log 'App geschlossen'

  $stamp = Get-Date -Format 'yyyy-MM-dd-HHmm'
  foreach ($suffix in @('', '-wal', '-shm')) {
    $src = Join-Path $DataDir "ai-interface.db$suffix"
    if (Test-Path $src) { Copy-Item $src (Join-Path $DataDir "ai-interface.backup-$stamp-vor-update.db$suffix") }
  }
  Write-Log "DB gesichert (ai-interface.backup-$stamp-vor-update.db)"

  $proc = Start-Process -FilePath $Installer -ArgumentList '/S' -Wait -PassThru
  Write-Log "Installer beendet mit Code $($proc.ExitCode)"
  if ($proc.ExitCode -ne 0) { throw "Installer-Code $($proc.ExitCode)" }

  # Während der Installer die .exe ersetzt, merkt sich Windows ein Standardsymbol für Taskleiste und Verknüpfungen.
  $IconRefresh = Join-Path $env:SystemRoot 'System32\ie4uinit.exe'
  if (Test-Path $IconRefresh) { Start-Process -FilePath $IconRefresh -ArgumentList '-show' -Wait -WindowStyle Hidden }
  Write-Log 'Symbol-Cache aufgefrischt'

  Start-Process -FilePath $AppExe
  Write-Log 'App neu gestartet, fertig'
} catch {
  Write-Log "FEHLER: $_"
  if (Test-Path $AppExe) { Start-Process -FilePath $AppExe }
}
