import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** Renderer allein im Browser, mit Mock-API (für Design-Arbeit ohne Electron). */
export default defineConfig({
  root: 'src/renderer',
  resolve: {
    alias: { '@shared': resolve('src/shared'), '@renderer': resolve('src/renderer/src') }
  },
  define: { 'import.meta.env.VITE_USE_MOCK': JSON.stringify('1') },
  plugins: [react(), tailwindcss()],
  server: { host: '127.0.0.1', port: 5199 }
})
