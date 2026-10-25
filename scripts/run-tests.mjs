// Startet Vitest in Electrons Node-Laufzeit, damit native Module (better-sqlite3, node-pty)
// mit derselben ABI getestet werden wie in der App.
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const electronBinary = require('electron')
const vitestEntry = require.resolve('vitest/vitest.mjs')
const child = spawn(electronBinary, [vitestEntry, 'run', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
})
child.on('exit', (code) => process.exit(code ?? 1))
