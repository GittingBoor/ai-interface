import { useShallow } from 'zustand/react/shallow'
import type { DeviceSettings, HostId } from '@shared/types'
import { useSettings } from '@renderer/stores/settingsStore'

export const LOCAL_LABEL = 'Dieser PC'
const LOCAL_COLOR = 'var(--color-local)'
/** Farbe für Einträge eines Geräts, das es nicht mehr gibt. */
const UNKNOWN_COLOR = 'var(--color-ink-3)'

const devices = (): readonly DeviceSettings[] => useSettings.getState().settings?.devices ?? []

/** `local` und alle eingeschalteten Geräte. */
export function hostIds(list: readonly DeviceSettings[] = devices()): HostId[] {
  return ['local', ...list.filter((d) => d.enabled).map((d) => d.id)]
}

/** Wie `hostIds`, aktualisiert sich aber bei geänderten Geräten. */
export function useHostIds(): HostId[] {
  return useSettings(useShallow((s) => hostIds(s.settings?.devices ?? [])))
}

export function useDevices(): readonly DeviceSettings[] {
  return useSettings((s) => s.settings?.devices ?? EMPTY_DEVICES)
}
const EMPTY_DEVICES: readonly DeviceSettings[] = []

export function findDevice(id: HostId): DeviceSettings | undefined {
  return devices().find((d) => d.id === id)
}

export function hostLabel(id: HostId): string {
  if (id === 'local') return LOCAL_LABEL
  return findDevice(id)?.name ?? id
}

/** Farbe des Rechners als CSS-Wert (für Punkte, Balken, SVG). */
export function hostColor(id: HostId): string {
  if (id === 'local') return LOCAL_COLOR
  return findDevice(id)?.color ?? UNKNOWN_COLOR
}

/** Dezente Fläche und gut lesbarer Text in Rechnerfarbe. */
export function hostTint(id: HostId): { readonly background: string; readonly color: string } {
  const color = hostColor(id)
  return { background: `color-mix(in oklab, ${color} 16%, transparent)`, color: `color-mix(in oklab, ${color} 55%, var(--color-ink))` }
}

/** Farben, die für Favoriten zur Wahl stehen (gedeckt, unterscheidbar). */
export const FAVORITE_COLORS: readonly string[] = [
  '#e08a4f',
  '#d9b35a',
  '#8fb573',
  '#5fb3a8',
  '#6f9bd8',
  '#9b8ad8',
  '#c77ea8',
  '#a39e96'
]

/** Auswahl für Segmented/Select: dieser PC und alle eingeschalteten Geräte. */
export function hostOptions(list: readonly DeviceSettings[] = devices()): { value: HostId; label: string }[] {
  return hostIds(list).map((id) => ({ value: id, label: id === 'local' ? LOCAL_LABEL : (list.find((d) => d.id === id)?.name ?? id) }))
}
