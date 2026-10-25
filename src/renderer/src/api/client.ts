import type { AiApi } from '@shared/api'
import { createMockApi } from './mockApi'

declare global {
  interface Window {
    readonly api: AiApi
  }
  interface ImportMetaEnv {
    readonly VITE_USE_MOCK?: string
  }
}

export const IS_MOCK = import.meta.env.VITE_USE_MOCK === '1'

function resolveApi(): AiApi {
  if (IS_MOCK) return createMockApi()
  if (!window.api) throw new Error('window.api fehlt: Der Preload wurde nicht geladen. App neu starten.')
  return window.api
}

/** Die einzige Stelle, an der der Renderer mit dem Main-Prozess spricht. */
export const api: AiApi = resolveApi()
