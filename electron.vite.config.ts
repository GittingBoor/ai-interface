import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const sharedAlias = { '@shared': resolve('src/shared') }

/** Commit des Builds fürs Startup-Update; ohne Git bleibt er leer und die App sucht nicht nach Updates. */
function buildCommit(): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

/** Gesetzt im Release-Workflow: Die Exe läuft ohne geklonten Ordner, das Update verweist dann auf GitHub-Releases. */
const RELEASE_BUILD = process.env['AII_RELEASE_BUILD'] === '1'

const buildInfo = {
  __BUILD_COMMIT__: JSON.stringify(buildCommit()),
  __BUILD_REPO__: JSON.stringify(RELEASE_BUILD ? '' : process.cwd())
}

/** Strenge CSP nur im Build; im Dev-Modus braucht Vite Inline-Skripte (React Refresh). */
const CONTENT_SECURITY_POLICY =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: aiimg:; font-src 'self' data:; connect-src 'self'"

const cspPlugin: Plugin = {
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`)
}

export default defineConfig({
  main: {
    resolve: { alias: sharedAlias },
    define: buildInfo
  },
  preload: {
    resolve: { alias: sharedAlias },
    build: {
      rollupOptions: {
        output: { format: 'cjs', entryFileNames: '[name].cjs' }
      }
    }
  },
  renderer: {
    resolve: { alias: { ...sharedAlias, '@renderer': resolve('src/renderer/src') } },
    plugins: [react(), tailwindcss(), cspPlugin]
  }
})
