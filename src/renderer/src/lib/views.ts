import { Bot, Workflow, House, Lightbulb, BookOpen, Bookmark, Globe, CirclePause, FolderGit2, Images, ChartArea, ListChecks, NotebookText, Server, Settings2, Sparkles, SquareTerminal, Boxes, type LucideIcon } from 'lucide-react'
import type { DeviceSettings, Source, WebLinkSettings } from '@shared/types'
import { deviceNavId, linkNavId, sourceNavId } from '@shared/layout'
import type { Messages } from '@shared/i18n/messages'
import { currentT } from '@renderer/i18n/useT'

/** Feste Bereiche mit Wörterbucheintrag (Teilmenge von `ViewId`). */
export type FixedViewId = keyof Messages['frame']['views']

export interface ViewDef {
  readonly id: FixedViewId
  readonly icon: LucideIcon
  /** Ziffer für Strg+<n>; leer = kein Kürzel. */
  readonly key: string
}

/** Feste Bereiche; Geräte kommen dynamisch dazu (`device:<id>`). Strg+9 öffnet das erste Gerät. */
export const VIEWS: readonly ViewDef[] = [
  { id: 'home', icon: House, key: '' },
  { id: 'overview', icon: ChartArea, key: '1' },
  { id: 'projects', icon: FolderGit2, key: '2' },
  { id: 'terminal', icon: SquareTerminal, key: '3' },
  { id: 'runs', icon: CirclePause, key: '' },
  { id: 'models', icon: Boxes, key: '4' },
  { id: 'todos', icon: ListChecks, key: '5' },
  { id: 'protocols', icon: NotebookText, key: '6' },
  { id: 'knowledge', icon: Lightbulb, key: '' },
  { id: 'gallery', icon: Images, key: '7' },
  { id: 'sources', icon: Bookmark, key: '' },
  { id: 'skills', icon: Sparkles, key: '0' },
  { id: 'agents', icon: Bot, key: '' },
  { id: 'automations', icon: Workflow, key: '' },
  { id: 'howto', icon: BookOpen, key: '' },
  { id: 'settings', icon: Settings2, key: '8' }
]

/** Anzeigename eines festen Bereichs in der aktiven Sprache. */
export function viewLabel(id: FixedViewId, t: Messages = currentT()): string {
  return t.frame.views[id]
}

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

/** Quellen mit Stern stehen unter „Webseiten“. */
function sourceEntries(sources: readonly Source[]): NavEntry[] {
  return sources.filter((s) => s.starred).map((s) => ({ id: sourceNavId(s.id), label: s.title, icon: LINK_ICON, deviceIcon: null, color: null, key: '', nested: false }))
}

/** Alle Einträge, die in der Seitenleiste stehen können. */
export function navEntries(devices: readonly DeviceSettings[], links: readonly WebLinkSettings[], sources: readonly Source[] = [], t: Messages = currentT()): NavEntry[] {
  const views = VIEWS.map((v) => ({ id: v.id, label: viewLabel(v.id, t), icon: v.icon, deviceIcon: null, color: null, key: v.key, nested: false }))
  const enabled = devices.filter((d) => d.enabled)
  // Jedes Gerät direkt gefolgt von seinen Webseiten; so ordnet `resolveNavigation` neue Webseiten unter ihr Gerät.
  // Webseiten ausgeschalteter Geräte fallen mit dem Gerät weg.
  const deviceEntries = enabled.flatMap((d, i) => [
    { id: deviceNavId(d.id), label: d.name, icon: d.icon ? null : DEVICE_ICON, deviceIcon: d.icon, color: d.color, key: i === 0 ? DEVICE_KEY : '', nested: false },
    ...linkEntries(links.filter((l) => l.deviceId === d.id))
  ])
  return [...views, ...deviceEntries, ...linkEntries(links.filter((l) => l.deviceId === null)), ...sourceEntries(sources)]
}
