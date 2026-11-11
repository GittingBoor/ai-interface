import { useId, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MousePointerClick } from 'lucide-react'
import type { KnowledgeEdge, KnowledgeNode, KnowledgeProject } from '@shared/knowledge'
import { useElementSize } from '@renderer/lib/hooks'
import { useT } from '@renderer/i18n/useT'
import { ArchitectureNodeDetail } from './ArchitectureNodeDetail'
import { layoutArchitecture, NODE_HEIGHT, NODE_WIDTH, type ArchitectureLayout, type PlacedNode } from './architectureLayout'
import { KIND_COLOR, KIND_ORDER, tintFill } from './knowledgePalette'

/** Rand um das Layout, damit Pfeile, Fokusrahmen und Beschriftungen nicht abgeschnitten werden. */
const PAD = 8
/** Platz für Rückwärtskanten, die unter bzw. neben den Knoten zurücklaufen. */
const BACK_ROOM = 44
const LABEL_MAX_CHARS = 21
const PATH_MAX_CHARS = 25
const CURVE = 0.5
const ARROW_GAP = 3
const FILL_PERCENT = 13
const FILL_ACTIVE_PERCENT = 24

const clip = (text: string, max: number): string => (text.length > max ? `${text.slice(0, max - 1)}…` : text)
const clipStart = (text: string, max: number): string => (text.length > max ? `…${text.slice(text.length - max + 1)}` : text)

interface EdgePath {
  readonly key: string
  readonly d: string
  readonly from: string
  readonly to: string
  readonly label?: string
  readonly mid: { readonly x: number; readonly y: number }
}

function acrossPath(a: PlacedNode, b: PlacedNode): Pick<EdgePath, 'd' | 'mid'> {
  if (b.layer > a.layer) {
    const x1 = a.x + NODE_WIDTH
    const y1 = a.y + NODE_HEIGHT / 2
    const x2 = b.x - ARROW_GAP
    const y2 = b.y + NODE_HEIGHT / 2
    const dx = (x2 - x1) * CURVE
    return { d: `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`, mid: { x: (x1 + x2) / 2, y: (y1 + y2) / 2 } }
  }
  const x1 = a.x + NODE_WIDTH / 2
  const y1 = a.y + NODE_HEIGHT
  const x2 = b.x + NODE_WIDTH / 2
  const y2 = b.y + NODE_HEIGHT + ARROW_GAP
  const low = Math.max(y1, y2) + BACK_ROOM
  return { d: `M${x1},${y1} C${x1},${low} ${x2},${low} ${x2},${y2}`, mid: { x: (x1 + x2) / 2, y: low - BACK_ROOM / 4 } }
}

function downPath(a: PlacedNode, b: PlacedNode): Pick<EdgePath, 'd' | 'mid'> {
  if (b.layer > a.layer) {
    const x1 = a.x + NODE_WIDTH / 2
    const y1 = a.y + NODE_HEIGHT
    const x2 = b.x + NODE_WIDTH / 2
    const y2 = b.y - ARROW_GAP
    const dy = (y2 - y1) * CURVE
    return { d: `M${x1},${y1} C${x1},${y1 + dy} ${x2},${y2 - dy} ${x2},${y2}`, mid: { x: (x1 + x2) / 2, y: (y1 + y2) / 2 } }
  }
  const x1 = a.x + NODE_WIDTH
  const y1 = a.y + NODE_HEIGHT / 2
  const x2 = b.x + NODE_WIDTH + ARROW_GAP
  const y2 = b.y + NODE_HEIGHT / 2
  const side = Math.max(x1, x2) + BACK_ROOM
  return { d: `M${x1},${y1} C${side},${y1} ${side},${y2} ${x2},${y2}`, mid: { x: side - BACK_ROOM / 4, y: (y1 + y2) / 2 } }
}

function edgePaths(edges: readonly KnowledgeEdge[], layout: ArchitectureLayout): EdgePath[] {
  const byId = new Map(layout.nodes.map((n) => [n.id, n]))
  return edges.flatMap((edge, index) => {
    const a = byId.get(edge.from)
    const b = byId.get(edge.to)
    if (!a || !b || a.id === b.id) return []
    const shape = layout.direction === 'across' ? acrossPath(a, b) : downPath(a, b)
    return [{ key: `${edge.from}-${edge.to}-${index}`, from: edge.from, to: edge.to, label: edge.label, ...shape }]
  })
}

function hasBackEdge(paths: readonly EdgePath[], layout: ArchitectureLayout): boolean {
  const layer = new Map(layout.nodes.map((n) => [n.id, n.layer]))
  return paths.some((p) => (layer.get(p.to) ?? 0) <= (layer.get(p.from) ?? 0))
}

interface DiagramProps {
  readonly nodes: readonly KnowledgeNode[]
  readonly edges: readonly KnowledgeEdge[]
  readonly project: KnowledgeProject
}

/** Bausteine und Verbindungen des Projekts; passt sich der Breite an, statt zu scrollen. */
export function ArchitectureDiagram({ nodes, edges, project }: DiagramProps): React.JSX.Element {
  const [frame, size] = useElementSize<HTMLDivElement>()
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const available = Math.max(0, size.width - PAD * 2 - BACK_ROOM)
  const layout = useMemo(() => layoutArchitecture(nodes, edges, available), [nodes, edges, available])
  const paths = useMemo(() => edgePaths(edges, layout), [edges, layout])
  const active = hovered ?? selected
  const activeNode = nodes.find((n) => n.id === active) ?? null
  const toggle = (id: string): void => setSelected((current) => (current === id ? null : id))

  return (
    <figure className="min-w-0">
      <div ref={frame} className="w-full">
        {size.width > 0 ? <DiagramSvg layout={layout} paths={paths} active={active} selected={selected} width={size.width} onHover={setHovered} onSelect={toggle} /> : null}
      </div>
      <figcaption className="mt-4">
        <AnimatePresence mode="wait" initial={false}>
          {activeNode ? (
            <ArchitectureNodeDetail key={activeNode.id} node={activeNode} nodes={nodes} edges={edges} project={project} onSelect={setSelected} />
          ) : (
            <Legend key="legend" nodes={nodes} />
          )}
        </AnimatePresence>
      </figcaption>
    </figure>
  )
}

interface SvgProps {
  readonly layout: ArchitectureLayout
  readonly paths: readonly EdgePath[]
  readonly active: string | null
  readonly selected: string | null
  readonly width: number
  onHover(id: string | null): void
  onSelect(id: string): void
}

function DiagramSvg({ layout, paths, active, selected, width, onHover, onSelect }: SvgProps): React.JSX.Element {
  const t = useT().knowledge
  const markerId = `arrow-${useId().replace(/:/g, '')}`
  const back = hasBackEdge(paths, layout) ? BACK_ROOM : 0
  const naturalWidth = layout.width + PAD * 2 + (layout.direction === 'down' ? back : 0)
  const naturalHeight = layout.height + PAD * 2 + (layout.direction === 'across' ? back : 0)
  const label = (id: string): string => layout.nodes.find((n) => n.id === id)?.label ?? id
  const description = paths.map((p) => `${label(p.from)} → ${label(p.to)}${p.label ? ` (${p.label})` : ''}`).join('; ')
  const touches = (p: EdgePath): boolean => active === null || p.from === active || p.to === active

  return (
    <svg
      viewBox={`${-PAD} ${-PAD} ${naturalWidth} ${naturalHeight}`}
      style={{ width: Math.min(width, naturalWidth) }}
      className="mx-auto block h-auto overflow-visible"
      role="group"
      aria-label={t.diagramLabel(layout.nodes.length, description)}
    >
      <defs>
        <marker id={markerId} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0.5 L7.5,4 L0,7.5 Z" fill="var(--color-ink-3)" />
        </marker>
      </defs>
      <g fill="none" strokeWidth={1.25}>
        {paths.map((p) => (
          <path
            key={p.key}
            d={p.d}
            stroke={touches(p) && active !== null ? 'var(--color-ink-2)' : 'var(--color-line-strong)'}
            markerEnd={`url(#${markerId})`}
            className="transition-[opacity,stroke] duration-200"
            opacity={touches(p) ? 1 : 0.2}
          />
        ))}
      </g>
      {paths.map((p) =>
        p.label ? (
          <text
            key={`${p.key}-label`}
            x={p.mid.x}
            y={p.mid.y - 5}
            textAnchor="middle"
            fontSize={10.5}
            fill={touches(p) && active !== null ? 'var(--color-ink)' : 'var(--color-ink-3)'}
            stroke="var(--color-canvas)"
            strokeWidth={4}
            paintOrder="stroke"
            strokeLinejoin="round"
            className="pointer-events-none transition-opacity duration-200"
            opacity={touches(p) ? 1 : 0.2}
          >
            {p.label}
          </text>
        ) : null
      )}
      {layout.nodes.map((n) => (
        <DiagramNode key={n.id} node={n} dimmed={active !== null && !isNeighbour(paths, active, n.id)} selected={selected === n.id} onHover={onHover} onSelect={onSelect} />
      ))}
    </svg>
  )
}

const isNeighbour = (paths: readonly EdgePath[], active: string, id: string): boolean =>
  id === active || paths.some((p) => (p.from === active && p.to === id) || (p.to === active && p.from === id))

interface NodeProps {
  readonly node: PlacedNode
  readonly dimmed: boolean
  readonly selected: boolean
  onHover(id: string | null): void
  onSelect(id: string): void
}

function DiagramNode({ node, dimmed, selected, onHover, onSelect }: NodeProps): React.JSX.Element {
  const color = KIND_COLOR[node.kind]
  const t = useT().knowledge
  const [focused, setFocused] = useState(false)
  const lit = selected || focused
  const labelY = node.where ? NODE_HEIGHT / 2 - 7 : NODE_HEIGHT / 2
  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onSelect(node.id)
  }
  return (
    <g
      transform={`translate(${node.x},${node.y})`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${node.label}, ${t.kind[node.kind]}${node.note ? `. ${node.note}` : ''}`}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => {
        setFocused(true)
        onHover(node.id)
      }}
      onBlur={() => {
        setFocused(false)
        onHover(null)
      }}
      onClick={() => onSelect(node.id)}
      onKeyDown={onKeyDown}
      className="cursor-pointer outline-none transition-opacity duration-200"
      opacity={dimmed ? 0.35 : 1}
    >
      <rect
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={9}
        strokeWidth={lit ? 1.75 : 1}
        className="transition-[fill,stroke] duration-200"
        style={{
          fill: tintFill(color, lit ? FILL_ACTIVE_PERCENT : FILL_PERCENT),
          stroke: lit ? color : `color-mix(in oklch, ${color} 55%, transparent)`
        }}
      />
      <rect x={12} y={labelY - 4} width={8} height={8} rx={2.5} style={{ fill: color }} />
      <text x={28} y={labelY} dominantBaseline="central" fontSize={12} fontWeight={580} fill="var(--color-ink)">
        {clip(node.label, LABEL_MAX_CHARS)}
      </text>
      {node.where ? (
        <text x={28} y={labelY + 15} dominantBaseline="central" fontSize={9.5} className="font-mono" fill="var(--color-ink-3)">
          {clipStart(node.where, PATH_MAX_CHARS)}
        </text>
      ) : null}
    </g>
  )
}

function Legend({ nodes }: { readonly nodes: readonly KnowledgeNode[] }): React.JSX.Element {
  const t = useT().knowledge
  const kinds = KIND_ORDER.filter((k) => nodes.some((n) => n.kind === k))
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="flex min-h-[4.5rem] flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-dashed border-line px-4 text-2xs text-ink-3"
    >
      {kinds.map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-[3px]" style={{ background: KIND_COLOR[k] }} />
          {t.kind[k]}
        </span>
      ))}
      <span className="ml-auto inline-flex items-center gap-1.5">
        <MousePointerClick aria-hidden className="size-3.5" strokeWidth={1.75} />
        {t.view.nodeHint}
      </span>
    </motion.div>
  )
}
