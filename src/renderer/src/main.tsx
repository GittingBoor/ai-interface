import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@renderer/styles/index.css'
import { App } from '@renderer/App'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root-Element #root fehlt in index.html')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
