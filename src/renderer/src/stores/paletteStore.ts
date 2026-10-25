import { create } from 'zustand'

interface PaletteStore {
  readonly open: boolean
  show(): void
  hide(): void
  toggle(): void
}

export const usePalette = create<PaletteStore>((set, get) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
  toggle: () => set({ open: !get().open })
}))
