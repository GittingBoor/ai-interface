import type { KnowledgeEdge, KnowledgeNode } from '@shared/knowledge'

export const NODE_WIDTH = 168
export const NODE_HEIGHT = 44
/** Spaltenabstand von links nach rechts: mindestens Platz für Kantenbeschriftungen, höchstens so viel, dass Kanten nicht verloren wirken. */
const MIN_LAYER_GAP = 72
const MAX_LAYER_GAP = 220
/** Abstand der Reihen, wenn das Layout von oben nach unten läuft. */
const STACK_LAYER_GAP = 64
export const ROW_GAP = 20

export type ArchitectureDirection = 'across' | 'down'

export interface PlacedNode extends KnowledgeNode {
  readonly x: number
  readonly y: number
  readonly layer: number
}

export interface ArchitectureLayout {
  readonly nodes: readonly PlacedNode[]
  readonly width: number
  readonly height: number
  readonly direction: ArchitectureDirection
}

type Adjacency = ReadonlyMap<string, readonly string[]>

/** Nur Kanten zwischen bekannten Knoten; Selbstkanten fallen weg. */
function validEdges(nodes: readonly KnowledgeNode[], edges: readonly KnowledgeEdge[]): KnowledgeEdge[] {
  const ids = new Set(nodes.map((n) => n.id))
  return edges.filter((e) => e.from !== e.to && ids.has(e.from) && ids.has(e.to))
}

/** Tiefensuche in Knotenreihenfolge; Kanten zurück in den Besuchspfad werden verworfen. */
function acyclicSuccessors(nodes: readonly KnowledgeNode[], edges: readonly KnowledgeEdge[]): Adjacency {
  const out = new Map<string, string[]>(nodes.map((n) => [n.id, []]))
  for (const e of edges) out.get(e.from)?.push(e.to)
  const kept = new Map<string, string[]>(nodes.map((n) => [n.id, []]))
  const onPath = new Set<string>()
  const done = new Set<string>()
  const visit = (id: string): void => {
    onPath.add(id)
    for (const next of out.get(id) ?? []) {
      if (onPath.has(next)) continue
      kept.get(id)?.push(next)
      if (!done.has(next)) visit(next)
    }
    onPath.delete(id)
    done.add(id)
  }
  for (const n of nodes) if (!done.has(n.id)) visit(n.id)
  return kept
}

/** Schicht = längster Pfad von einer Quelle (Kahn-Reihenfolge auf dem azyklischen Graphen). */
function assignLayers(nodes: readonly KnowledgeNode[], successors: Adjacency): Map<string, number> {
  const indegree = new Map<string, number>(nodes.map((n) => [n.id, 0]))
  for (const targets of successors.values()) for (const t of targets) indegree.set(t, (indegree.get(t) ?? 0) + 1)
  const layer = new Map<string, number>(nodes.map((n) => [n.id, 0]))
  const queue = nodes.filter((n) => indegree.get(n.id) === 0).map((n) => n.id)
  for (let i = 0; i < queue.length; i += 1) {
    const id = queue[i] ?? ''
    for (const next of successors.get(id) ?? []) {
      layer.set(next, Math.max(layer.get(next) ?? 0, (layer.get(id) ?? 0) + 1))
      const remaining = (indegree.get(next) ?? 0) - 1
      indegree.set(next, remaining)
      if (remaining === 0) queue.push(next)
    }
  }
  return layer
}

/** Reihenfolge je Schicht: Mittelwert der Zeilen der Vorgänger, sonst ursprüngliche Reihenfolge. */
function orderLayers(nodes: readonly KnowledgeNode[], layers: ReadonlyMap<string, number>, successors: Adjacency): KnowledgeNode[][] {
  const columns: KnowledgeNode[][] = []
  for (const n of nodes) {
    const index = layers.get(n.id) ?? 0
    columns[index] = [...(columns[index] ?? []), n]
  }
  const predecessors = new Map<string, string[]>()
  for (const [from, targets] of successors) for (const t of targets) predecessors.set(t, [...(predecessors.get(t) ?? []), from])
  const row = new Map<string, number>()
  return columns.map((column) => {
    const weight = (n: KnowledgeNode, fallback: number): number => {
      const rows = (predecessors.get(n.id) ?? []).map((p) => row.get(p)).filter((r): r is number => r !== undefined)
      return rows.length ? rows.reduce((a, b) => a + b, 0) / rows.length : fallback
    }
    const sorted = column.map((n, i) => ({ n, w: weight(n, i) })).sort((a, b) => a.w - b.w).map((entry) => entry.n)
    sorted.forEach((n, i) => row.set(n.id, i))
    return sorted
  })
}

const span = (count: number, size: number, gap: number): number => count * size + Math.max(0, count - 1) * gap

/** Schichten nebeneinander; der Spaltenabstand wächst mit dem verfügbaren Platz. */
function placeAcross(columns: readonly KnowledgeNode[][], available: number): ArchitectureLayout {
  const free = columns.length > 1 ? (available - columns.length * NODE_WIDTH) / (columns.length - 1) : MIN_LAYER_GAP
  const gap = Math.min(MAX_LAYER_GAP, Math.max(MIN_LAYER_GAP, free))
  const height = Math.max(...columns.map((c) => span(c.length, NODE_HEIGHT, ROW_GAP)))
  const nodes = columns.flatMap((column, layer) => {
    const top = (height - span(column.length, NODE_HEIGHT, ROW_GAP)) / 2
    return column.map((n, i) => ({ ...n, layer, x: layer * (NODE_WIDTH + gap), y: top + i * (NODE_HEIGHT + ROW_GAP) }))
  })
  return { nodes, width: span(columns.length, NODE_WIDTH, gap), height, direction: 'across' }
}

/** Schichten untereinander, für schmale Fenster; jede Reihe mittig. */
function placeDown(columns: readonly KnowledgeNode[][]): ArchitectureLayout {
  const width = Math.max(...columns.map((c) => span(c.length, NODE_WIDTH, ROW_GAP)))
  const nodes = columns.flatMap((row, layer) => {
    const left = (width - span(row.length, NODE_WIDTH, ROW_GAP)) / 2
    return row.map((n, i) => ({ ...n, layer, x: left + i * (NODE_WIDTH + ROW_GAP), y: layer * (NODE_HEIGHT + STACK_LAYER_GAP) }))
  })
  return { nodes, width, height: span(columns.length, NODE_HEIGHT, STACK_LAYER_GAP), direction: 'down' }
}

/**
 * Schichten-Layout, das in `available` Pixel Breite passt: von links nach rechts, solange die Spalten
 * mit Mindestabstand hineinpassen, sonst von oben nach unten.
 */
export function layoutArchitecture(nodes: readonly KnowledgeNode[], edges: readonly KnowledgeEdge[], available: number = Number.POSITIVE_INFINITY): ArchitectureLayout {
  if (nodes.length === 0) return { nodes: [], width: 0, height: 0, direction: 'across' }
  const successors = acyclicSuccessors(nodes, validEdges(nodes, edges))
  const columns = orderLayers(nodes, assignLayers(nodes, successors), successors)
  const fitsAcross = span(columns.length, NODE_WIDTH, MIN_LAYER_GAP) <= available
  return fitsAcross ? placeAcross(columns, available) : placeDown(columns)
}
