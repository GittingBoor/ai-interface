import { create } from 'zustand'
import type { HostId } from '@shared/types'
import { deviceIdOf, deviceNavId, linkIdOf, linkNavId } from '@shared/layout'

export type ViewId = 'home' | 'overview' | 'projects' | 'terminal' | 'runs' | 'models' | 'todos' | 'protocols' | 'gallery' | 'device' | 'link' | 'skills' | 'howto' | 'settings'

interface NavStore {
  readonly view: ViewId
  /** Im Projektbereich ausgewählter Favorit. */
  readonly selectedFavoriteId: number | null
  /** Zählt hoch, wenn die TODO-Eingabe fokussiert werden soll (Befehlspalette). */
  readonly todoComposerRequest: number
  /** Vorbelegter Text für die TODO-Eingabe. */
  readonly todoDraft: string
  /** Projektfilter der Galerie (Favoritenpfad), null = alle. */
  readonly galleryProject: string | null
  /** Angezeigtes Gerät im Bereich `device`. */
  readonly deviceId: HostId | null
  /** Angezeigte Webseite im Bereich `link`. */
  readonly linkId: string | null
  /** Abschnitt der Einstellungen, zu dem gesprungen werden soll. */
  readonly settingsAnchor: string | null
  /** Protokoll, das die Protokolle-Ansicht beim Öffnen auswählen soll (Vault-relativ). */
  readonly protocolPath: string | null
  go(view: ViewId): void
  /** Eintrag der Seitenleiste öffnen (`ViewId`, `device:<id>` oder `link:<id>`). */
  navigate(navId: string): void
  openDevice(id: HostId): void
  openLink(id: string): void
  openSettings(anchor: string): void
  openGallery(project: string | null): void
  openProtocol(path: string): void
  /** Die Protokolle-Ansicht hat den Wunsch übernommen. */
  clearProtocolRequest(): void
  setGalleryProject(project: string | null): void
  openFavorite(id: number): void
  requestTodoComposer(draft?: string): void
}

export const useNav = create<NavStore>((set, get) => ({
  view: 'home',
  selectedFavoriteId: null,
  todoComposerRequest: 0,
  todoDraft: '',
  galleryProject: null,
  deviceId: null,
  linkId: null,
  settingsAnchor: null,
  protocolPath: null,
  go: (view) => set({ view }),
  navigate: (navId) => {
    const device = deviceIdOf(navId)
    const link = linkIdOf(navId)
    if (device) set({ view: 'device', deviceId: device })
    else if (link) set({ view: 'link', linkId: link })
    else set({ view: navId as ViewId })
  },
  openDevice: (id) => set({ view: 'device', deviceId: id }),
  openLink: (id) => set({ view: 'link', linkId: id }),
  openSettings: (anchor) => set({ view: 'settings', settingsAnchor: anchor }),
  openGallery: (project) => set({ view: 'gallery', galleryProject: project }),
  openProtocol: (path) => set({ view: 'protocols', protocolPath: path }),
  clearProtocolRequest: () => set({ protocolPath: null }),
  setGalleryProject: (project) => set({ galleryProject: project }),
  openFavorite: (id) => set({ view: 'projects', selectedFavoriteId: id }),
  requestTodoComposer: (draft = '') => set({ view: 'todos', todoDraft: draft, todoComposerRequest: get().todoComposerRequest + 1 })
}))

/** ID des aktiven Seitenleisten-Eintrags. */
export function activeNavId(view: ViewId, deviceId: HostId | null, linkId: string | null): string {
  if (view === 'link' && linkId) return linkNavId(linkId)
  return view === 'device' && deviceId ? deviceNavId(deviceId) : view
}
