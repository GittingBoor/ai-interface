// Baut native Module (node-pty) für Electron neu. Unter Windows bringen node-pty und
// better-sqlite3 fertige N-API-Builds mit, dort ist kein Compiler nötig.
import { spawnSync } from 'node:child_process'

if (process.platform === 'win32') {
  console.log('postinstall: Windows erkannt, verwende mitgelieferte native Builds.')
  process.exit(0)
}
const result = spawnSync('npx', ['electron-builder', 'install-app-deps'], { stdio: 'inherit', shell: true })
process.exit(result.status ?? 1)
