import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@renderer/styles/index.css'
import { App } from '@renderer/App'
import { ErrorBoundary, logCrash } from '@renderer/components/ErrorBoundary'
import { crashReport } from '@shared/crashReport'

// Fehler außerhalb von React (Ereignisse, Timer, Promises) landen sonst nirgends.
window.addEventListener('error', (event) => logCrash(crashReport('error', event.error ?? event.message, `${event.filename}:${event.lineno}`)))
window.addEventListener('unhandledrejection', (event) => logCrash(crashReport('rejection', event.reason)))

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root-Element #root fehlt in index.html')

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
