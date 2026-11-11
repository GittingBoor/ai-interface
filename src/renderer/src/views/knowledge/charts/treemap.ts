import type { AreaSize } from '@shared/knowledge'

export interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface TreemapItem<T> {
  readonly value: number
  readonly data: T
}

export interface PlacedItem<T> extends Rect {
  readonly data: T
}

/** Schlechtestes Seitenverhältnis einer Reihe, wenn sie entlang `side` gelegt wird. */
function worstRatio(values: readonly number[], side: number): number {
  const sum = values.reduce((a, b) => a + b, 0)
  if (sum <= 0 || side <= 0) return Number.POSITIVE_INFINITY
  const max = Math.max(...values)
  const min = Math.min(...values)
  return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min))
}

function layRow<T>(row: readonly TreemapItem<T>[], scale: number, rect: Rect): { placed: PlacedItem<T>[]; rest: Rect } {
  const area = row.reduce((a, b) => a + b.value, 0) * scale
  const horizontal = rect.width >= rect.height
  const thickness = horizontal ? area / rect.height : area / rect.width
  let offset = 0
  const placed = row.map((item) => {
    const length = (item.value * scale) / thickness
    const cell = horizontal
      ? { x: rect.x, y: rect.y + offset, width: thickness, height: length }
      : { x: rect.x + offset, y: rect.y, width: length, height: thickness }
    offset += length
    return { ...cell, data: item.data }
  })
  const rest = horizontal
    ? { x: rect.x + thickness, y: rect.y, width: rect.width - thickness, height: rect.height }
    : { x: rect.x, y: rect.y + thickness, width: rect.width, height: rect.height - thickness }
  return { placed, rest }
}

/** Squarified-Treemap (Bruls, Huizing, van Wijk): Flächen proportional zum Wert, möglichst quadratisch. */
export function squarify<T>(items: readonly TreemapItem<T>[], rect: Rect): PlacedItem<T>[] {
  const sorted = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value)
  const total = sorted.reduce((a, b) => a + b.value, 0)
  if (total <= 0 || rect.width <= 0 || rect.height <= 0) return []
  const scale = (rect.width * rect.height) / total
  const placed: PlacedItem<T>[] = []
  let space = rect
  let row: TreemapItem<T>[] = []
  for (const item of sorted) {
    const side = Math.min(space.width, space.height)
    const current = row.map((r) => r.value * scale)
    if (row.length === 0 || worstRatio([...current, item.value * scale], side) <= worstRatio(current, side)) {
      row = [...row, item]
      continue
    }
    const laid = layRow(row, scale, space)
    placed.push(...laid.placed)
    space = laid.rest
    row = [item]
  }
  if (row.length) placed.push(...layRow(row, scale, space).placed)
  return placed
}

export interface FolderNode {
  readonly path: string
  readonly lines: number
  readonly files: number
  /** Unterordner der zweiten Ebene; der Rest des Ordners erscheint als eigener Posten ohne Pfad. */
  readonly children: readonly FolderChild[]
}

export interface FolderChild {
  readonly path: string | null
  readonly lines: number
  readonly files: number
}

const ROOT = '.'

/** Ordner der ersten Ebene mit ihren Unterordnern; `areas` enthält beide Ebenen flach. */
export function folderTree(areas: readonly AreaSize[]): FolderNode[] {
  const top = areas.filter((a) => a.path === ROOT || !a.path.includes('/'))
  return top.map((parent) => {
    const inner = areas.filter((a) => a.path.startsWith(`${parent.path}/`) && a.lines > 0)
    const used = inner.reduce((sum, a) => ({ lines: sum.lines + a.lines, files: sum.files + a.files }), { lines: 0, files: 0 })
    const rest: FolderChild = { path: null, lines: Math.max(0, parent.lines - used.lines), files: Math.max(0, parent.files - used.files) }
    const children = inner.length ? [...inner.map((a) => ({ path: a.path, lines: a.lines, files: a.files })), rest].filter((c) => c.lines > 0) : []
    return { path: parent.path, lines: parent.lines, files: parent.files, children }
  })
}
