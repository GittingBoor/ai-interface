import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { type AiApi, API_CHANNELS, type ApiEvents, EVENT_CHANNEL_PREFIX, TERMINAL_RESIZE_CHANNEL, TERMINAL_WRITE_CHANNEL } from '@shared/api'

function buildCalls(): Record<string, Record<string, (...args: unknown[]) => Promise<unknown>>> {
  const calls: Record<string, Record<string, (...args: unknown[]) => Promise<unknown>>> = {}
  for (const [ns, methods] of Object.entries(API_CHANNELS)) {
    calls[ns] = Object.fromEntries(methods.map((m) => [m, (...args: unknown[]) => ipcRenderer.invoke(`${ns}.${m}`, ...args)]))
  }
  return calls
}

const api = {
  ...buildCalls(),
  terminalInput: {
    write: (id: string, data: string) => ipcRenderer.send(TERMINAL_WRITE_CHANNEL, id, data),
    resize: (id: string, cols: number, rows: number) => ipcRenderer.send(TERMINAL_RESIZE_CHANNEL, id, cols, rows)
  },
  on: <E extends keyof ApiEvents>(event: E, listener: (payload: ApiEvents[E]) => void) => {
    const channel = `${EVENT_CHANNEL_PREFIX}${event}`
    const handler = (_e: IpcRendererEvent, payload: ApiEvents[E]): void => listener(payload)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  }
} as unknown as AiApi

contextBridge.exposeInMainWorld('api', api)
