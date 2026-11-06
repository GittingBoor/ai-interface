import { create } from 'zustand'
import type { Source, SourceInput, SourcePatch } from '@shared/types'
import { api } from '@renderer/api/client'
import { attempt, errorMessage, unwrap } from '@renderer/api/call'

interface SourcesStore {
  readonly sources: readonly Source[]
  readonly loaded: boolean
  readonly error: string | null
  load(): Promise<void>
  add(input: SourceInput): Promise<Source | null>
  update(id: number, patch: SourcePatch): Promise<boolean>
  remove(id: number): Promise<boolean>
}

export const useSources = create<SourcesStore>((set, get) => ({
  sources: [],
  loaded: false,
  error: null,
  load: async () => {
    try {
      set({ sources: await unwrap(api.sources.list()), loaded: true, error: null })
    } catch (error) {
      set({ loaded: true, error: errorMessage(error) })
    }
  },
  add: async (input) => {
    const source = await attempt(api.sources.add(input))
    if (source) set({ sources: [source, ...get().sources] })
    return source
  },
  update: async (id, patch) => {
    const source = await attempt(api.sources.update(id, patch))
    if (source) set({ sources: get().sources.map((s) => (s.id === id ? source : s)) })
    return source !== null
  },
  remove: async (id) => {
    const done = await attempt(api.sources.remove(id))
    if (done === null) return false
    set({ sources: get().sources.filter((s) => s.id !== id) })
    return true
  }
}))
