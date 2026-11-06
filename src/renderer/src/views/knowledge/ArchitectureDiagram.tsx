import { useId, useMemo, useState } from 'react'
import type { KnowledgeEdge, KnowledgeNode, KnowledgeNodeKind } from '@shared/knowledge'
import { useT } from '@renderer/i18n/useT'
import { layoutArchitecture, NODE_HEIGHT, NODE_WIDTH, type PlacedNode } from './architectureLayout'

/** Rand um das Layout, damit Pfeile und Rahmen nicht abgeschnitten werden. */
const PAD = 6
/** Kleiner als die natürliche Größe wird das Diagramm nicht; darunter scrollt es. */
const MIN_SCALE = 0.8
const LABEL_MAX_CHARS = 20
const CURVE = 0.5
const ARROW_GAP = 3

interface KindStyle {
  readonly color: string
}

export const KIND_STYLE: Readonly<Record<KnowledgeNodeKind, KindStyle>> = {
  ui: { color: 'var(--color-accent)' },
  service: { color: 'var(--color-status-review)' },
  data: { color: 'var(--color-warn)' },
  external: { color: 'var(--color-status-question)' },
  device: { color: 'var(--color-status-idle)' }
}

const KIND_ORDER: readonly KnowledgeNodeKind[] = ['ui', 'service', 'data', 'external', 'device']

const truncate = (text: string): string => (text.length > LABEL_MAX_CHARS ? `${text.slice(0, LABEL_MAX_CHARS - 1)}…` : text)

interface EdgePath {
  readonly key: string
  readonly d: string
  readonly from: string
  readonly to: string
  readonly label?: string
  readonly mid: { readonly x: number; readonly y: number }
}

function edgePath(edge: KnowledgeEdge, index: number, byId: ReadonlyMap<string, PlacedNode>): EdgePath | null {
  const a = byId.get(edge.from)
  const b = byId.get(edge.to)
  if (!a || !b || a.id === b.id) return null
  const forward = b.x > a.x
  const x1 = forward ? a.x + NODE_WIDTH : a.x + NODE_WIDTH / 2
  const y1 = forward ? a.y + NODE_HEIGHT / 2 : a.y + NODE_HEIGHT
  const x2 = forward ? b.x - ARROW_GAP : b.x + NODE_WIDTH / 2
  const y2 = forward ? b.y + NODE_HEIGHT / 2 : b.y + NODE_HEIGHT + ARROW_GAP
  const dx = Math.abs(x2 - x1) * CURVE
  const d = forward
    ? `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`
    : `M${x1},${y1} C${x1},${y1 + NODE_HEIGHT} ${x2},${y2 + NODE_HEIGHT} ${x2},${y2}`
  const mid = forward ? { x: (x1 + x2) / 2, y: (y1 + y2) / 2 } : { x: (x1 + x2) / 2, y: Math.max(y1, y2) + NODE_HEIGHT * 0.75 }
  return { key: `${edge.from}-${edge.to}-${index}`, d, from: edge.from, to: edge.to, label: edge.label, mid }
}

interface DiagramProps {
  readonly nodes: readonly KnowledgeNode[]
  readonly edges: readonly KnowledgeEdge[]
}

/** Bausteine und Verbindungen des Projekts, von links (Einstieg) nach rechts. */
export function ArchitectureDiagram({ nodes, edges }: DiagramProps): React.JSX.Element {
  const layout = useMemo(() => layoutArchitecture(nodes, edges), [nodes, edges])
  const [hovered, setHovered] = useState<string | null>(null)
  const t = useT().knowledge
  const markerId = `arrow-${useId().replace(/:/g, '')}`
  const byId = useMemo(() => new Map(layout.nodes.map((n) => [n.id, n])), [layout])
  const paths = useMemo(() => edges.map((e, i) => edgePath(e, i, byId)).filter((p): p is EdgePath => p !== null), [edges, byId])
  // Rückwärtskanten laufen unter den Knoten durch und brauchen Platz.
  const extraBottom = paths.some((p) => (byId.get(p.to)?.x ?? 0) <= (byId.get(p.from)?.x ?? 0)) ? NODE_HEIGHT : 0
  const width = layout.width + PAD * 2
  const height = layout.height + PAD * 2 + extraBottom
  const kinds = KIND_ORDER.filter((k) => nodes.some((n) => n.kind === k))
  const touches = (p: EdgePath): boolean => hovered === null || p.from === hovered || p.to === hovered
  const description = paths.map((p) => `${byId.get(p.from)?.label ?? p.from} → ${byId.get(p.to)?.label ?? p.to}${p.label ? ` (${p.label})` : ''}`).join('; ')

  return (
    <figure className="min-w-0">
      <div className="overflow-x-auto pb-1">
        <svg
          viewBox={`${-PAD} ${-PAD} ${width} ${height}`}
          style={{ width: '100%', maxWidth: width, minWidth: width * MIN_SCALE }}
          className="block h-auto"
          role="img"
          aria-label={t.diagramLabel(nodes.length, description)}
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
                stroke={touches(p) && hovered !== null ? 'var(--color-ink-2)' : 'var(--color-line-strong)'}
                markerEnd={`url(#${markerId})`}
                className="transition-[opacity,stroke] duration-150"
                opacity={touches(p) ? 1 : 0.25}
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
                fill="var(--color-ink-3)"
                stroke="var(--color-canvas)"
                strokeWidth={4}
                paintOrder="stroke"
                strokeLinejoin="round"
                className="transition-opacity duration-150"
                opacity={touches(p) ? 1 : 0.25}
              >
                {p.label}
              </text>
            ) : null
          )}
          {layout.nodes.map((n) => (
            <DiagramNode key={n.id} node={n} dimmed={hovered !== null && hovered !== n.id} onHover={setHovered} />
          ))}
        </svg>
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-2xs text-ink-3">
        {kinds.map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-[3px]" style={{ background: KIND_STYLE[k].color }} />
            {t.kind[k]}
          </span>
        ))}
      </figcaption>
    </figure>
  )
}

interface NodeProps {
  readonly node: PlacedNode
  readonly dimmed: boolean
  onHover(id: string | null): void
}

function DiagramNode({ node, dimmed, onHover }: NodeProps): React.JSX.Element {
  const color = KIND_STYLE[node.kind].color
  const t = useT().knowledge
  return (
    <g
      transform={`translate(${node.x},${node.y})`}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      className="transition-opacity duration-150"
      opacity={dimmed ? 0.55 : 1}
    >
      <title>{`${node.label} · ${t.kind[node.kind]}`}</title>
      <rect
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={8}
        style={{ fill: `color-mix(in oklch, ${color} 13%, var(--color-raised))`, stroke: `color-mix(in oklch, ${color} 55%, transparent)` }}
      />
      <rect x={12} y={NODE_HEIGHT / 2 - 4} width={8} height={8} rx={2.5} style={{ fill: color }} />
      <text x={28} y={NODE_HEIGHT / 2} dominantBaseline="central" fontSize={12} fontWeight={560} fill="var(--color-ink)">
        {truncate(node.label)}
      </text>
    </g>
  )
}
