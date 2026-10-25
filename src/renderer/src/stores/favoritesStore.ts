import { create } from 'zustand'
import type { Favorite, FavoriteInput, FavoritePatch } from '@shared/types'
import { api } from '@renderer/api/client'
import { attempt, errorMessage, unwrap } from '@renderer/api/call'

interface FavoritesStore {
  readonly favorites: readonly Favorite[]
  readonly loaded: boolean
  readonly error: string | null
  load(): Promise<void>
  add(input: FavoriteInput): Promise<Favorite | null>
  update(id: number, patch: FavoritePatch): Promise<boolean>
  remove(id: number): Promise<boolean>
  reorder(ids: readonly number[]): Promise<void>
}

export const useFavorites = create<FavoritesStore>((set, get) => ({
  favorites: [],
  loaded: false,
  error: null,
  load: async () => {
    try {
      const favorites = await unwrap(api.favorites.list())
      set({ favorites: [...favorites].sort((a, b) => a.sortOrder - b.sortOrder), loaded: true, error: null })
    } catch (error) {
      set({ loaded: true, error: errorMessage(error) })
    }
  },
  add: async (input) => {
    const fav = await attempt(api.favorites.add(input))
    if (fav) set({ favorites: [...get().favorites, fav] })
    return fav
  },
  update: async (id, patch) => {
    const fav = await attempt(api.favorites.update(id, patch))
    if (fav) set({ favorites: get().favorites.map((f) => (f.id === id ? fav : f)) })
    return fav !== null
  },
  remove: async (id) => {
    const done = await attempt(api.favorites.remove(id))
    if (done === null) return false
    set({ favorites: get().favorites.filter((f) => f.id !== id) })
    return true
  },
  reorder: async (ids) => {
    const previous = get().favorites
    const byId = new Map(previous.map((f) => [f.id, f]))
    const next = ids.map((id, i) => byId.get(id)).filter((f): f is Favorite => f !== undefined).map((f, i) => ({ ...f, sortOrder: i }))
    set({ favorites: next })
    const done = await attempt(api.favorites.reorder([...ids]))
    if (done === null) set({ favorites: previous })
  }
}))
