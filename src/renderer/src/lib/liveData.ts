import { create } from 'zustand'
import { useCategories } from '@renderer/stores/categoriesStore'
import { useFavorites } from '@renderer/stores/favoritesStore'

/** Zähler, auf den Ansichten mit eigenem Ladezustand (z. B. Galerie) reagieren. */
interface LiveDataStore {
  readonly version: number
  bump(): void
}

export const useLiveData = create<LiveDataStore>((set, get) => ({
  version: 0,
  bump: () => set({ version: get().version + 1 })
}))

/** Lädt Daten neu, die sich von außen ändern können (Skripte, andere Sitzungen). */
export function reloadSharedData(): void {
  void useFavorites.getState().load()
  void useCategories.getState().load()
  useLiveData.getState().bump()
}
