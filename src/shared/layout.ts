import type { NavGroup, NavigationSettings, SectionLayout } from './types'

/** Seitenleisten-Eintrag eines Geräts: `device:<id>`. */
export const DEVICE_NAV_PREFIX = 'device:'
/** Seitenleisten-Eintrag einer Webseite: `link:<id>`. */
export const LINK_NAV_PREFIX = 'link:'
/** Seitenleisten-Eintrag eines Add-ons: `addon:<id>`. */
export const ADDON_NAV_PREFIX = 'addon:'
export const DEVICES_GROUP_ID = 'devices'
const DEVICES_GROUP_LABEL = 'Verknüpfungen'
/** Früherer Name der Gruppe; gespeicherte Anordnungen bekommen den neuen Namen. */
const LEGACY_DEVICES_GROUP_LABEL = 'Geräte'
/** Einträge, die sich nicht ausblenden lassen (sonst kommt man nicht mehr zurück). */
export const ALWAYS_VISIBLE: readonly string[] = ['settings']
/** Neue Bereiche, die in gespeicherten Anordnungen an den Anfang ihrer Gruppe kommen statt ans Ende. */
const LEADING_ITEMS: readonly string[] = ['home']

export const deviceNavId = (deviceId: string): string => `${DEVICE_NAV_PREFIX}${deviceId}`
export const deviceIdOf = (navId: string): string | null => (navId.startsWith(DEVICE_NAV_PREFIX) ? navId.slice(DEVICE_NAV_PREFIX.length) : null)
export const linkNavId = (linkId: string): string => `${LINK_NAV_PREFIX}${linkId}`
export const linkIdOf = (navId: string): string | null => (navId.startsWith(LINK_NAV_PREFIX) ? navId.slice(LINK_NAV_PREFIX.length) : null)

export const DEFAULT_NAVIGATION: NavigationSettings = {
  groups: [
    { id: 'work', label: 'Arbeiten', items: ['home', 'overview', 'projects', 'terminal', 'runs'] },
    { id: 'notes', label: 'Notizen', items: ['todos', 'protocols', 'gallery'] },
    { id: 'ai', label: 'KI', items: ['models', 'skills'] },
    { id: DEVICES_GROUP_ID, label: DEVICES_GROUP_LABEL, items: [] },
    { id: 'app', label: 'App', items: ['howto', 'settings'] }
  ],
  hidden: [],
  collapsed: []
}

/** Gruppe, in die ein Eintrag gehört, wenn er in der gespeicherten Anordnung fehlt. */
function defaultGroupOf(item: string): string {
  if (item.startsWith(DEVICE_NAV_PREFIX) || item.startsWith(LINK_NAV_PREFIX) || item.startsWith(ADDON_NAV_PREFIX)) return DEVICES_GROUP_ID
  return DEFAULT_NAVIGATION.groups.find((g) => g.items.includes(item))?.id ?? 'app'
}

/** Neue Verknüpfung direkt hinter ihren Vorgänger in `items` (ihr Gerät oder die vorige Verknüpfung). */
function insertAfterPredecessor(groups: readonly { items: string[] }[], items: readonly string[], item: string): boolean {
  if (!item.startsWith(LINK_NAV_PREFIX)) return false
  const before = items[items.indexOf(item) - 1]
  if (before === undefined) return false
  const group = groups.find((g) => g.items.includes(before))
  if (!group) return false
  const next = [...group.items]
  next.splice(next.indexOf(before) + 1, 0, item)
  group.items = next
  return true
}

/**
 * Gespeicherte Anordnung bereinigen: unbekannte und doppelte Einträge fallen weg, neue Bereiche und Geräte
 * kommen in ihre Standardgruppe (fehlt die, wird sie angelegt), neue Verknüpfungen hinter ihr Gerät.
 * Ausgeblendete Einträge bleiben enthalten.
 */
export function resolveNavigation(nav: NavigationSettings, items: readonly string[]): NavGroup[] {
  const known = new Set(items)
  const seen = new Set<string>()
  const groups = nav.groups.map((g) => ({
    ...g,
    label: g.id === DEVICES_GROUP_ID && g.label === LEGACY_DEVICES_GROUP_LABEL ? DEVICES_GROUP_LABEL : g.label,
    items: g.items.filter((i) => {
      if (!known.has(i) || seen.has(i)) return false
      seen.add(i)
      return true
    })
  }))
  for (const item of items.filter((i) => !seen.has(i))) {
    if (insertAfterPredecessor(groups, items, item)) continue
    const target = defaultGroupOf(item)
    let group = groups.find((g) => g.id === target)
    if (!group) {
      const fallback = DEFAULT_NAVIGATION.groups.find((g) => g.id === target)
      group = { id: target, label: fallback?.label ?? target, items: [] }
      // Neue Gruppe vor „App“ einsortieren, damit Einstellungen unten bleiben.
      const appIndex = groups.findIndex((g) => g.id === 'app')
      groups.splice(appIndex < 0 ? groups.length : appIndex, 0, group)
    }
    group.items = LEADING_ITEMS.includes(item) ? [item, ...group.items] : [...group.items, item]
  }
  return groups
}

/** Sichtbare Gruppen der Seitenleiste (ohne ausgeblendete Einträge und leere Gruppen). */
export function visibleNavigation(nav: NavigationSettings, items: readonly string[]): NavGroup[] {
  const hidden = new Set(nav.hidden.filter((h) => !ALWAYS_VISIBLE.includes(h)))
  return resolveNavigation(nav, items)
    .map((g) => ({ ...g, items: g.items.filter((i) => !hidden.has(i)) }))
    .filter((g) => g.items.length > 0)
}

export interface ResolvedSection {
  readonly id: string
  readonly hidden: boolean
}

/** Abschnitte in gespeicherter Reihenfolge; neue Abschnitte an ihrer Standardstelle. */
export function resolveSections(layout: SectionLayout | undefined, defaults: readonly string[]): ResolvedSection[] {
  const order = (layout?.order ?? []).filter((id, i, all) => defaults.includes(id) && all.indexOf(id) === i)
  for (const [index, id] of defaults.entries()) {
    if (order.includes(id)) continue
    // Hinter den Vorgänger aus der Standardreihenfolge, sonst an den Anfang.
    const before = defaults.slice(0, index).reverse().find((d) => order.includes(d))
    order.splice(before === undefined ? 0 : order.indexOf(before) + 1, 0, id)
  }
  const hidden = new Set(layout?.hidden ?? [])
  return order.map((id) => ({ id, hidden: hidden.has(id) }))
}

/** Verschiebt ein Element um `delta` Plätze (begrenzt auf die Liste). */
export function moveItem<T>(list: readonly T[], item: T, delta: number): T[] {
  const from = list.indexOf(item)
  if (from < 0) return [...list]
  const to = Math.max(0, Math.min(list.length - 1, from + delta))
  const next = [...list]
  next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/** Gerätefarben für neue Geräte (gedeckt, gut unterscheidbar von „Dieser PC“). */
export const DEVICE_COLORS: readonly string[] = ['#5fb37a', '#d9a65a', '#b48ad8', '#5fb3c8', '#d97f7f', '#a3a35f']

/** Aus einem Namen eine gültige, noch freie Geräte-ID machen (`Mini-PC` → `mini-pc`). */
export function deviceIdFrom(name: string, taken: readonly string[]): string {
  const base =
    name
      .toLowerCase()
      .replaceAll('ä', 'ae')
      .replaceAll('ö', 'oe')
      .replaceAll('ü', 'ue')
      .replaceAll('ß', 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'geraet'
  const reserved = new Set([...taken, 'local', 'all'])
  if (!reserved.has(base)) return base
  for (let n = 2; ; n++) if (!reserved.has(`${base}-${n}`)) return `${base}-${n}`
}
