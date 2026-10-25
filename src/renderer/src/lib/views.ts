import { House, BookOpen, Globe, CirclePause, FolderGit2, Images, ChartArea, ListChecks, NotebookText, Server, Settings2, Sparkles, SquareTerminal, Boxes, type LucideIcon } from 'lucide-react'
import type { DeviceSettings, WebLinkSettings } from '@shared/types'
import { deviceNavId, linkNavId } from '@shared/layout'
import type { ViewId } from '@renderer/stores/navStore'

export interface ViewDef {
  readonly id: ViewId
  readonly label: string
  readonly icon: LucideIcon
  /** Ziffer für Strg+<n>; leer = kein Kürzel. */
  readonly key: string
}

/** Feste Bereiche; Geräte kommen dynamisch dazu (`device:<id>`). Strg+9 öffnet das erste Gerät. */
export const VIEWS: readonly ViewDef[] = [
  { id: 'home', label: 'Start', icon: House, key: '' },
  { id: 'overview', label: 'Auswertung', icon: ChartArea, key: '1' },
  { id: 'projects', label: 'Projekte', icon: FolderGit2, key: '2' },
  { id: 'terminal', label: 'Terminal', icon: SquareTerminal, key: '3' },
  { id: 'runs', label: 'Offen', icon: CirclePause, key: '' },
  { id: 'models', label: 'Modelle', icon: Boxes, key: '4' },
  { id: 'todos', label: 'TODOs', icon: ListChecks, key: '5' },
  { id: 'protocols', label: 'Protokolle', icon: NotebookText, key: '6' },
  { id: 'gallery', label: 'Galerie', icon: Images, key: '7' },
  { id: 'skills', label: 'Skills', icon: Sparkles, key: '0' },
  { id: 'howto', label: 'Steuerung', icon: BookOpen, key: '' },
  { id: 'settings', label: 'Einstellungen', icon: Settings2, key: '8' }
]

export const DEVICE_KEY = '9'
export const DEVICE_ICON = Server
export const LINK_ICON = Globe

/** Ein Eintrag der Seitenleiste (fester Bereich, Gerät oder Webseite). */
export interface NavEntry {
  readonly id: string
  readonly label: string
  readonly icon: LucideIcon | null
  /** Symbol im Format von `shared/projectIcon.ts` (Geräte und Webseiten). */
  readonly deviceIcon: string | null
  readonly color: string | null
  readonly key: string
  /** Webseite, die zu einem Gerät gehört (in der Seitenleiste eingerückt). */
  readonly nested: boolean
}

/** Webseiten ohne eigenes Symbol zeigen die Weltkugel. */
function linkEntries(links: readonly WebLinkSettings[]): NavEntry[] {
  return links.map((l) => ({ id: linkNavId(l.id), label: l.name, icon: l.icon ? null : LINK_ICON, deviceIcon: l.icon, color: l.color, key: '', nested: l.deviceId !== null }))
}

/** Alle Einträge, die in der Seitenleiste stehen können. */
export function navEntries(devices: readonly DeviceSettings[], links: readonly WebLinkSettings[]): NavEntry[] {
  const views = VIEWS.map((v) => ({ id: v.id, label: v.label, icon: v.icon, deviceIcon: null, color: null, key: v.key, nested: false }))
  const enabled = devices.filter((d) => d.enabled)
  // Jedes Gerät direkt gefolgt von seinen Webseiten; so ordnet `resolveNavigation` neue Webseiten unter ihr Gerät.
  // Webseiten ausgeschalteter Geräte fallen mit dem Gerät weg.
  const deviceEntries = enabled.flatMap((d, i) => [
    { id: deviceNavId(d.id), label: d.name, icon: d.icon ? null : DEVICE_ICON, deviceIcon: d.icon, color: d.color, key: i === 0 ? DEVICE_KEY : '', nested: false },
    ...linkEntries(links.filter((l) => l.deviceId === d.id))
  ])
  return [...views, ...deviceEntries, ...linkEntries(links.filter((l) => l.deviceId === null))]
}
