import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Wrench, type LucideIcon } from 'lucide-react'
import type { SkillEntry, SkillRelation } from '@shared/types'
import { HostDot } from '@renderer/components/Host'
import { useElementSize } from '@renderer/lib/hooks'
import { hostLabel } from '@renderer/lib/hosts'
import {
  buildGraph,
  GRAPH_ROW,
  isPluginSource,
  SOURCE_CODEX,
  SOURCE_DISABLED,
  SOURCE_PROJECT,
  SOURCE_SYNCED,
  SOURCE_USER,
  type GraphEdge,
  type GraphNode
} from '@renderer/lib/skillGraph'
import { CODEX_ICON, EntryTags, KindIcon, SCOPE_ICON } from './skillMarks'

const SOURCE_W = 164
const ENTRY_W = 216
const TOOL_W = 172
const NODE_H = 24
const MIN_WIDTH = 760
/** Abstand der Kopfzeile über der ersten Zeile. */
const HEAD_H = 28
/** Wölbung der Skill-Bögen: Grundwert plus Anteil der Höhe, gedeckelt auf die Spaltenlücke. */
const ARC_BASE = 18
const ARC_SLOPE = 0.2
const ARC_GAP_SHARE = 0.55
const DRAW_MS = 0.6
const DRAW_STAGGER_PER_PX = 0.0006
const DIM_OPACITY = 0.14
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const

interface Columns {
  readonly source: number
  readonly entry: number
  readonly tool: number
  readonly width: number
}

function columnsFor(width: number): Columns {
  const w = Math.max(MIN_WIDTH, width)
  const gap = (w - SOURCE_W - ENTRY_W - TOOL_W) / 2
  return { source: 0, entry: SOURCE_W + gap, tool: w - TOOL_W, width: w }
}

function edgePath(edge: GraphEdge, byId: ReadonlyMap<string, GraphNode>, cols: Columns): string {
  const a = byId.get(edge.from)
  const b = byId.get(edge.to)
  if (!a || !b) return ''
  if (edge.kind === 'contains') {
    const x1 = cols.source + SOURCE_W
    const x2 = cols.entry
    const mid = (x1 + x2) / 2
    return `M${x1},${a.y} C${mid},${a.y} ${mid},${b.y} ${x2},${b.y}`
  }
  const x1 = cols.entry + ENTRY_W
  if (edge.kind === 'uses-tool') {
    const x2 = cols.tool
    const mid = (x1 + x2) / 2
    return `M${x1},${a.y} C${mid},${a.y} ${mid},${b.y} ${x2},${b.y}`
  }
  const bulge = Math.min((cols.tool - x1) * ARC_GAP_SHARE, ARC_BASE + Math.abs(b.y - a.y) * ARC_SLOPE)
  return `M${x1},${a.y} C${x1 + bulge},${a.y} ${x1 + bulge},${b.y} ${x1},${b.y}`
}

interface SkillGraphProps {
  readonly entries: readonly SkillEntry[]
  readonly relations: readonly SkillRelation[]
  readonly selectedId: string | null
  /** Rechner-Punkt an Einträgen, wenn mehrere Rechner gezeigt werden. */
  readonly showHost: boolean
  onSelect(id: string): void
}

/** Drei Spalten: Quellen → Skills/Agents/Befehle → Tools. Hover zeigt den Pfad, Klick das Detail. */
export function SkillGraph({ entries, relations, selectedId, showHost, onSelect }: SkillGraphProps): React.JSX.Element {
  const [ref, { width }] = useElementSize<HTMLDivElement>()
  const [hover, setHover] = useState<string | null>(null)
  const graph = useMemo(() => buildGraph(entries, relations), [entries, relations])
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph])
  const cols = columnsFor(width)
  const focus = hover ?? (selectedId && byId.has(selectedId) ? selectedId : null)
  const lit = focus ? new Set([focus, ...(graph.neighbors.get(focus) ?? [])]) : null
  const edgeLit = (e: GraphEdge): boolean => focus !== null && (e.from === focus || e.to === focus)
  const nodeState = (id: string): NodeState => (!lit ? 'idle' : id === focus ? 'focus' : lit.has(id) ? 'lit' : 'dim')

  return (
    <div ref={ref} className="min-w-0 overflow-x-auto pb-6">
      {width > 0 ? (
        <div className="relative" style={{ width: cols.width, height: graph.height + HEAD_H }} onMouseLeave={() => setHover(null)}>
          <ColumnHead x={cols.source} w={SOURCE_W} label="Quellen" />
          <ColumnHead x={cols.entry} w={ENTRY_W} label="Skills, Agents, Befehle" count={entries.length} />
          <ColumnHead x={cols.tool} w={TOOL_W} label="Tools" count={graph.nodes.filter((n) => n.column === 'tool').length} />
          <svg width={cols.width} height={graph.height} className="absolute left-0 overflow-visible" style={{ top: HEAD_H }} aria-hidden>
            {graph.edges.map((e) => {
              const on = edgeLit(e)
              const opacity = !focus ? (e.kind === 'contains' ? 0.55 : 0.75) : on ? 1 : DIM_OPACITY
              const dashed = e.kind === 'mentions'
              const y = byId.get(e.to)?.y ?? 0
              return (
                <motion.path
                  key={e.id}
                  d={edgePath(e, byId, cols)}
                  fill="none"
                  stroke={on ? 'var(--color-accent)' : e.kind === 'contains' ? 'var(--color-line-strong)' : 'var(--color-ink-3)'}
                  strokeWidth={on ? 1.5 : 1}
                  strokeDasharray={dashed ? '3 3' : undefined}
                  strokeLinecap="round"
                  initial={dashed ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
                  animate={dashed ? { opacity } : { pathLength: 1, opacity }}
                  transition={{
                    pathLength: { duration: DRAW_MS, delay: y * DRAW_STAGGER_PER_PX, ease: EASE_OUT_EXPO },
                    opacity: { duration: 0.15 }
                  }}
                />
              )
            })}
          </svg>
          <ul aria-label="Grafik der Skills" className="absolute left-0" style={{ top: HEAD_H, width: cols.width, height: graph.height }}>
            {graph.nodes.map((n) => (
              <Node
                key={n.id}
                node={n}
                x={n.column === 'source' ? cols.source : n.column === 'entry' ? cols.entry : cols.tool}
                state={nodeState(n.id)}
                selected={n.id === selectedId}
                showHost={showHost}
                onHover={setHover}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </div>
      ) : (
        <div style={{ height: GRAPH_ROW * 4 }} />
      )}
      <Legend />
    </div>
  )
}

function ColumnHead({ x, w, label, count }: { readonly x: number; readonly w: number; readonly label: string; readonly count?: number }): React.JSX.Element {
  return (
    <p className="absolute top-0 flex items-baseline gap-1.5 px-2 text-2xs font-[600] text-ink-3" style={{ left: x, width: w }}>
      {label}
      {count !== undefined ? <span className="num font-[500]">{count}</span> : null}
    </p>
  )
}

type NodeState = 'idle' | 'focus' | 'lit' | 'dim'

interface NodeProps {
  readonly node: GraphNode
  readonly x: number
  readonly state: NodeState
  readonly selected: boolean
  readonly showHost: boolean
  onHover(id: string | null): void
  onSelect(id: string): void
}

const NODE_WIDTH: Readonly<Record<GraphNode['column'], number>> = { source: SOURCE_W, entry: ENTRY_W, tool: TOOL_W }

function Node({ node, x, state, selected, showHost, onHover, onSelect }: NodeProps): React.JSX.Element {
  const style = { left: x, top: node.y - NODE_H / 2, width: NODE_WIDTH[node.column], height: NODE_H }
  const ring = selected
    ? 'border-accent/70 bg-accent-soft text-ink'
    : state === 'focus'
      ? 'border-accent/60 bg-raised-2 text-ink'
      : state === 'lit'
        ? 'border-line-strong bg-raised-2 text-ink'
        : 'border-line bg-raised text-ink-2'
  const fade = `transition-[opacity,background-color,border-color,color] duration-150 ${state === 'dim' ? 'opacity-35' : ''}`
  const hoverProps = { onMouseEnter: () => onHover(node.id), onFocus: () => onHover(node.id), onBlur: () => onHover(null) }

  if (node.column === 'entry' && node.entry) {
    const entry = node.entry
    return (
      <li className="absolute" style={style}>
        <button
          type="button"
          aria-pressed={selected}
          title={`${entry.name} · ${hostLabel(entry.host)}`}
          onClick={() => onSelect(entry.id)}
          {...hoverProps}
          className={`flex size-full items-center gap-1.5 rounded-md border px-2 text-left ${ring} ${fade}`}
        >
          <KindIcon kind={entry.kind} className={`size-3.5 ${selected || state === 'focus' ? 'text-accent' : 'text-ink-3'}`} />
          <span className={`min-w-0 flex-1 truncate text-xs font-[560] ${entry.scope === 'disabled' ? 'text-ink-3 line-through decoration-line-strong' : ''}`}>{entry.name}</span>
          <EntryTags entry={entry} />
          {showHost ? <HostDot host={entry.host} className="size-1.5" /> : null}
        </button>
      </li>
    )
  }

  const Icon = node.column === 'tool' ? Wrench : isPluginSource(node.id) ? SCOPE_ICON.plugin : sourceIcon(node.id)
  return (
    <li className="absolute" style={style} tabIndex={0} {...hoverProps} title={node.label}>
      <span className={`flex size-full items-center gap-1.5 rounded-md border px-2 ${node.column === 'tool' ? 'border-dashed' : ''} ${ring} ${fade}`}>
        <Icon className="size-3.5 shrink-0 text-ink-3" aria-hidden strokeWidth={1.75} />
        <span className={`min-w-0 flex-1 truncate ${node.column === 'tool' ? 'font-mono text-2xs' : 'text-xs font-[600]'}`}>{node.label}</span>
        <span className="num text-2xs text-ink-3">{node.count}</span>
      </span>
    </li>
  )
}

const SOURCE_ICON: Readonly<Record<string, LucideIcon>> = {
  [SOURCE_USER]: SCOPE_ICON.user,
  [SOURCE_SYNCED]: SCOPE_ICON.synced,
  [SOURCE_PROJECT]: SCOPE_ICON.project,
  [SOURCE_CODEX]: CODEX_ICON,
  [SOURCE_DISABLED]: SCOPE_ICON.disabled
}

const sourceIcon = (id: string): LucideIcon => SOURCE_ICON[id] ?? SCOPE_ICON.user

function Legend(): React.JSX.Element {
  const items: readonly { readonly label: string; readonly dash?: string; readonly color: string }[] = [
    { label: 'enthält', color: 'var(--color-line-strong)' },
    { label: 'nutzt Tool / Skill', color: 'var(--color-ink-3)' },
    { label: 'erwähnt', color: 'var(--color-ink-3)', dash: '3 3' }
  ]
  return (
    <ul aria-label="Legende" className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-2xs text-ink-3">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <svg width={22} height={6} aria-hidden>
            <line x1={1} x2={21} y1={3} y2={3} stroke={i.color} strokeWidth={1.25} strokeDasharray={i.dash} strokeLinecap="round" />
          </svg>
          {i.label}
        </li>
      ))}
      <li>Überfahren zeigt die Verbindungen, Klick öffnet das Detail.</li>
    </ul>
  )
}
