import type { SkillEntry, SkillRelation, SkillRelationKind } from '@shared/types'
import { compareEntries, PLUGIN_PREFIX, TOOL_PREFIX, stripPrefix } from './skills'

export type GraphColumn = 'source' | 'entry' | 'tool'

export interface GraphNode {
  readonly id: string
  readonly column: GraphColumn
  readonly label: string
  /** Mitte des Knotens in px. */
  readonly y: number
  /** Anzahl verbundener Einträge (Quellen, Tools). */
  readonly count: number
  readonly entry: SkillEntry | null
}

export interface GraphEdge {
  readonly id: string
  readonly from: string
  readonly to: string
  readonly kind: SkillRelationKind
}

export interface GraphLayout {
  readonly nodes: readonly GraphNode[]
  readonly edges: readonly GraphEdge[]
  readonly height: number
  /** Nachbarn je Knoten (beide Richtungen). */
  readonly neighbors: ReadonlyMap<string, ReadonlySet<string>>
}

/** Feste Zeilenhöhe: viele Knoten verlängern die Grafik statt sie zu stauchen. */
export const GRAPH_ROW = 30
const PAD = GRAPH_ROW / 2

export const SOURCE_USER = 'src:user'
export const SOURCE_SYNCED = 'src:synced'
export const SOURCE_PROJECT = 'src:project'
export const SOURCE_CODEX = 'src:codex'
export const SOURCE_DISABLED = 'src:disabled'

const SOURCE_LABEL: Readonly<Record<string, string>> = {
  [SOURCE_USER]: 'Eigene',
  [SOURCE_SYNCED]: 'claude.ai',
  [SOURCE_PROJECT]: 'Projekte',
  [SOURCE_CODEX]: 'Codex',
  [SOURCE_DISABLED]: 'Deaktiviert'
}

/** Sammelknoten links; Plugins stehen zwischen claude.ai und Projekte. */
const FIXED_BEFORE = [SOURCE_USER, SOURCE_SYNCED]
const FIXED_AFTER = [SOURCE_PROJECT, SOURCE_CODEX, SOURCE_DISABLED]

export function sourceOf(entry: SkillEntry): string {
  if (entry.plugin) return `${PLUGIN_PREFIX}${entry.plugin}`
  if (entry.ai === 'codex') return SOURCE_CODEX
  if (entry.scope === 'project') return SOURCE_PROJECT
  if (entry.scope === 'synced') return SOURCE_SYNCED
  if (entry.scope === 'disabled') return SOURCE_DISABLED
  return SOURCE_USER
}

export const isPluginSource = (id: string): boolean => id.startsWith(PLUGIN_PREFIX)

function sourceRank(id: string, plugins: readonly string[]): number {
  const before = FIXED_BEFORE.indexOf(id)
  if (before >= 0) return before
  const plugin = plugins.indexOf(id)
  if (plugin >= 0) return FIXED_BEFORE.length + plugin
  return FIXED_BEFORE.length + plugins.length + FIXED_AFTER.indexOf(id)
}

/** Schiebt Wunschpositionen (sortiert) so, dass sie mindestens eine Zeile Abstand haben. */
function spread(desired: readonly number[]): number[] {
  const out: number[] = []
  for (const d of desired) out.push(Math.max(d, (out[out.length - 1] ?? -Infinity) + GRAPH_ROW))
  return out
}

const mean = (values: readonly number[]): number => values.reduce((s, v) => s + v, 0) / Math.max(1, values.length)

/** Drei Spalten: Quellen → Einträge → Tools; Skill-Bezüge bleiben in der Mitte. */
export function buildGraph(entries: readonly SkillEntry[], relations: readonly SkillRelation[]): GraphLayout {
  const visible = new Map(entries.map((e) => [e.id, e]))
  const sourceIds = new Map(entries.map((e) => [e.id, sourceOf(e)]))
  const plugins = [...new Set([...sourceIds.values()].filter(isPluginSource))].sort((a, b) => a.localeCompare(b, 'de-DE'))
  const rank = (e: SkillEntry): number => sourceRank(sourceIds.get(e.id) ?? SOURCE_USER, plugins)
  const ordered = [...entries].sort((a, b) => rank(a) - rank(b) || compareEntries(a, b))

  const entryY = new Map(ordered.map((e, i) => [e.id, PAD + i * GRAPH_ROW]))
  const edges: GraphEdge[] = []
  const toolAgents = new Map<string, number[]>()

  for (const e of ordered) edges.push({ id: `${sourceIds.get(e.id)}>${e.id}`, from: sourceIds.get(e.id) ?? SOURCE_USER, to: e.id, kind: 'contains' })
  for (const r of relations) {
    if (r.kind === 'contains' || !visible.has(r.from)) continue
    if (r.kind === 'uses-tool') {
      toolAgents.set(r.to, [...(toolAgents.get(r.to) ?? []), entryY.get(r.from) ?? 0])
      edges.push({ id: `${r.from}>${r.to}`, from: r.from, to: r.to, kind: r.kind })
    } else if (visible.has(r.to) && r.from !== r.to) {
      edges.push({ id: `${r.from}>${r.to}:${r.kind}`, from: r.from, to: r.to, kind: r.kind })
    }
  }

  const sourceGroups = new Map<string, number[]>()
  for (const e of ordered) {
    const id = sourceIds.get(e.id) ?? SOURCE_USER
    sourceGroups.set(id, [...(sourceGroups.get(id) ?? []), entryY.get(e.id) ?? 0])
  }
  const sources = [...sourceGroups.entries()]
  const sourceY = spread(sources.map(([, ys]) => mean(ys)))
  const tools = [...toolAgents.entries()].map(([id, ys]) => ({ id, desired: mean(ys), count: ys.length })).sort((a, b) => a.desired - b.desired || a.id.localeCompare(b.id))
  const toolY = spread(tools.map((t) => t.desired))

  const nodes: GraphNode[] = [
    ...sources.map<GraphNode>(([id, ys], i) => ({
      id,
      column: 'source',
      label: SOURCE_LABEL[id] ?? stripPrefix(id, PLUGIN_PREFIX),
      y: sourceY[i] ?? PAD,
      count: ys.length,
      entry: null
    })),
    ...ordered.map<GraphNode>((e) => ({ id: e.id, column: 'entry', label: e.name, y: entryY.get(e.id) ?? PAD, count: 0, entry: e })),
    ...tools.map<GraphNode>((t, i) => ({ id: t.id, column: 'tool', label: stripPrefix(t.id, TOOL_PREFIX), y: toolY[i] ?? PAD, count: t.count, entry: null }))
  ]

  const neighbors = new Map<string, Set<string>>()
  const link = (a: string, b: string): void => {
    neighbors.set(a, (neighbors.get(a) ?? new Set()).add(b))
  }
  for (const edge of edges) {
    link(edge.from, edge.to)
    link(edge.to, edge.from)
  }

  const lastY = Math.max(0, ...nodes.map((n) => n.y))
  return { nodes, edges, height: lastY + PAD, neighbors }
}
