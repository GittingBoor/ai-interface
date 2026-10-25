import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { app } from 'electron'
import { installCommandLine } from './installCommand'
import { type CommandResult, type CommandRunner, StartupUpdater } from './StartupUpdater'
import { UpdateService, type UpdateServiceDeps } from './UpdateService'

/** Wird beim Windows-Login übergeben (siehe autostart.ts); nur dann installiert der Modus `auto` selbst. */
export const AUTOSTART_FLAG = '--autostart'

/** Direkt nach dem Login ist das Netz oft noch nicht da. */
const NETWORK_WAIT_MS = 30_000
const COMMAND_TIMEOUT_MS = 20 * 60_000
const OUTPUT_TAIL_CHARS = 4000
const INSTALL_SCRIPT = join('scripts', 'install-update.ps1')

export type UpdateHooks = Pick<UpdateServiceDeps, 'emit' | 'mode' | 'log' | 'logError' | 'notify'>

class ProcessRunner implements CommandRunner {
  exec(command: string, args: readonly string[], cwd: string): Promise<CommandResult> {
    return new Promise((resolve) => {
      // npm ist unter Windows eine .cmd-Datei und braucht die Shell; die Argumente enthalten keine Leerzeichen.
      const child = spawn(command, [...args], { cwd, windowsHide: true, shell: command === 'npm', timeout: COMMAND_TIMEOUT_MS })
      let stdout = ''
      let stderr = ''
      child.stdout.on('data', (chunk: Buffer) => (stdout = (stdout + chunk.toString()).slice(-OUTPUT_TAIL_CHARS)))
      child.stderr.on('data', (chunk: Buffer) => (stderr = (stderr + chunk.toString()).slice(-OUTPUT_TAIL_CHARS)))
      child.on('error', (error) => resolve({ code: -1, stdout, stderr: error.message }))
      child.on('close', (code) => resolve({ code: code ?? -1, stdout, stderr }))
    })
  }
}

/** Dienst für die laufende App: prüft gegen den Repo-Ordner, aus dem sie gebaut wurde. */
export function createUpdateService(hooks: UpdateHooks): UpdateService {
  const files = { exists: existsSync, readText: (path: string) => readFileSync(path, 'utf8') }
  return new UpdateService({
    ...hooks,
    supported: app.isPackaged && process.platform === 'win32',
    source: new StartupUpdater(__BUILD_REPO__, __BUILD_COMMIT__, new ProcessRunner(), files),
    launchInstaller,
    quit: () => app.quit(),
    waitForNetwork: () => sleep(NETWORK_WAIT_MS)
  })
}

function launchInstaller(installerPath: string): void {
  const script = join(__BUILD_REPO__, INSTALL_SCRIPT)
  const commandLine = installCommandLine(script, installerPath, process.execPath)
  spawn('cmd.exe', [commandLine], { detached: true, stdio: 'ignore', windowsHide: true, windowsVerbatimArguments: true }).unref()
}
