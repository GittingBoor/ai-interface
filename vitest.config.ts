import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

// Windows-Runner bei GitHub sind langsam; dort scheiterten Tests sonst zufällig am Standardlimit von 5 s.
const CI_TIMEOUT_MS = process.env['CI'] ? 30_000 : 5_000

export default defineConfig({
  resolve: { alias: { '@shared': resolve('src/shared'), '@renderer': resolve('src/renderer/src') } },
  test: { setupFiles: ['tests/helpers/setupLanguage.ts'], include: ['tests/**/*.test.ts'], environment: 'node', pool: 'forks', testTimeout: CI_TIMEOUT_MS }
})
