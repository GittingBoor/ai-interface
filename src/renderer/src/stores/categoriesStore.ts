import { create } from 'zustand'
import type { Category, CategoryInput } from '@shared/types'
import { api } from '@renderer/api/client'
import { attempt, errorMessage, unwrap } from '@renderer/api/call'
import { useFavorites } from './favoritesStore'

interface CategoriesStore {
  readonly categories: readonly Category[]
  readonly loaded: boolean
  readonly error: string | null
  load(): Promise<void>
  add(input: CategoryInput): Promise<Category | null>
  update(id: number, patch: Partial<CategoryInput>): Promise<boolean>
  /** Liefert die Zahl der Projekte, die „Ohne Art“ wurden, oder `null` bei Fehler. */
  remove(id: number): Promise<number | null>
  reorder(ids: readonly number[]): Promise<void>
}

const sorted = (list: readonly Category[]): Category[] => [...list].sort((a, b) => a.sortOrder - b.sortOrder)

export const useCategories = create<CategoriesStore>((set, get) => ({
  categories: [],
  loaded: false,
  error: null,
  load: async () => {
    try {
      set({ categories: sorted(await unwrap(api.categories.list())), loaded: true, error: null })
    } catch (error) {
      set({ loaded: true, error: errorMessage(error) })
    }
  },
  add: async (input) => {
    const category = await attempt(api.categories.add(input))
    if (category) set({ categories: sorted([...get().categories, category]) })
    return category
  },
  update: async (id, patch) => {
    const category = await attempt(api.categories.update(id, patch))
    if (category) set({ categories: get().categories.map((c) => (c.id === id ? category : c)) })
    return category !== null
  },
  remove: async (id) => {
    const affected = await attempt(api.categories.remove(id))
    if (affected === null) return null
    set({ categories: get().categories.filter((c) => c.id !== id) })
    if (affected > 0) await useFavorites.getState().load()
    return affected
  },
  reorder: async (ids) => {
    const previous = get().categories
    const byId = new Map(previous.map((c) => [c.id, c]))
    set({ categories: ids.map((id, i) => byId.get(id)).filter((c): c is Category => c !== undefined).map((c, i) => ({ ...c, sortOrder: i })) })
    if ((await attempt(api.categories.reorder([...ids]))) === null) set({ categories: previous })
  }
}))
