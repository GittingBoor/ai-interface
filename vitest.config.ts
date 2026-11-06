import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@shared': resolve('src/shared'), '@renderer': resolve('src/renderer/src') } },
  test: { setupFiles: ['tests/helpers/setupLanguage.ts'], include: ['tests/**/*.test.ts'], environment: 'node', pool: 'forks' }
})
