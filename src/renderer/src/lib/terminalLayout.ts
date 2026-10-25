import type { TerminalInfo, TerminalLayoutMode } from '@shared/types'

export type Slots = readonly (string | null)[]

const SLOT_COUNT: Readonly<Record<TerminalLayoutMode, number>> = { tabs: 1, columns: 2, rows: 2, grid: 4 }

export const slotCount = (mode: TerminalLayoutMode): number => SLOT_COUNT[mode]

/**
 * Bestimmt, welches Terminal in welchem Slot steht: gültige Zuordnungen bleiben an ihrer Stelle,
 * freie Slots bekommen die nächsten Terminals in Tab-Reihenfolge, das aktive Terminal ist immer sichtbar.
 */
export function fillSlots(order: readonly string[], slots: Slots, mode: TerminalLayoutMode, activeId: string | null): (string | null)[] {
  const count = slotCount(mode)
  if (mode === 'tabs') return [activeId !== null && order.includes(activeId) ? activeId : (order[0] ?? null)]
  const result: (string | null)[] = []
  for (let i = 0; i < count; i++) {
    const id = slots[i] ?? null
    result.push(id !== null && order.includes(id) && !result.includes(id) ? id : null)
  }
  const waiting = order.filter((id) => !result.includes(id))
  for (let i = 0; i < count && waiting.length; i++) if (result[i] === null) result[i] = waiting.shift() ?? null
  if (activeId !== null && order.includes(activeId) && !result.includes(activeId)) {
    const free = result.indexOf(null)
    result[free === -1 ? count - 1 : free] = activeId
  }
  return result
}

/** Zeigt `id` in `slot`; steht es schon woanders, tauschen die beiden Slots. */
export function placeInSlot(slots: Slots, slot: number, id: string): (string | null)[] {
  const next = [...slots]
  const from = next.indexOf(id)
  if (from !== -1) next[from] = next[slot] ?? null
  next[slot] = id
  return next
}

/** Verschiebt `id` vor `beforeId` (oder ans Ende bei `null`). */
export function moveInOrder(order: readonly string[], id: string, beforeId: string | null): string[] {
  if (id === beforeId) return [...order]
  const rest = order.filter((o) => o !== id)
  const index = beforeId === null ? -1 : rest.indexOf(beforeId)
  if (index === -1) return [...rest, id]
  return [...rest.slice(0, index), id, ...rest.slice(index)]
}

/** Der Orchestrator-Tab steht immer zuerst. */
export function orchestratorFirst(order: readonly string[], terminals: readonly Pick<TerminalInfo, 'id' | 'orchestrator'>[]): string[] {
  const lead = new Set(terminals.filter((t) => t.orchestrator).map((t) => t.id))
  return [...order.filter((id) => lead.has(id)), ...order.filter((id) => !lead.has(id))]
}
