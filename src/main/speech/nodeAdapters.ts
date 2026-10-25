import { execFile, spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { join } from 'node:path'
import { promisify } from 'node:util'
import type { ServerProcess } from './WhisperServer'

const execFileAsync = promisify(execFile)

/** Windows-eigenes bsdtar (ab Windows 10) entpackt Zip-Dateien; nicht das tar aus Git Bash. */
export async function extractZip(zipPath: string, targetDir: string): Promise<void> {
  const tar = join(process.env['SystemRoot'] ?? 'C:\\Windows', 'System32', 'tar.exe')
  await execFileAsync(tar, ['-xf', zipPath, '-C', targetDir], { windowsHide: true })
}

export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      server.close(() => (address && typeof address === 'object' ? resolve(address.port) : reject(new Error('Kein freier Port gefunden'))))
    })
  })
}

export function spawnServer(log: (line: string) => void): (command: string, args: readonly string[]) => ServerProcess {
  return (command, args) => {
    const child = spawn(command, [...args], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
    const tail: string[] = []
    child.stderr.on('data', (chunk: Buffer) => {
      tail.push(chunk.toString())
      if (tail.length > 20) tail.shift()
    })
    let exited = false
    child.on('exit', (code) => {
      exited = true
      if (code !== 0 && code !== null) log(`whisper-server beendet (Code ${code}): ${tail.join('').slice(-2000)}`)
    })
    return {
      get exited() {
        return exited
      },
      kill: () => void child.kill(),
      onExit: (listener) => void child.on('exit', (code) => listener(code))
    }
  }
}
