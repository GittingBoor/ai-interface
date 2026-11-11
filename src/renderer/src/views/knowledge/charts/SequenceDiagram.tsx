import { useId, useMemo, useState } from 'react'
import type { KnowledgeFlow, KnowledgeNodeKind } from '@shared/knowledge'
import { useElementSize } from '@renderer/lib/hooks'
import { useT } from '@renderer/i18n/useT'
import { KIND_COLOR, kindOf, tintFill } from '../knowledgePalette'
import { clipLabel, HEAD_HEIGHT, headChars, layoutSequence, ROW_HEIGHT, SELF_LOOP, type SequenceLayout, type SequenceRow } from './sequenceLayout'

const LOOP_DROP = 14
const ARROW_GAP = 4
const BADGE_X = 12
const BADGE_RADIUS = 8
const HEAD_FILL_PERCENT = 16
const NEUTRAL = 'var(--color-ink-3)'
const DIM = 0.28

interface DiagramProps {
  readonly flow: KnowledgeFlow
  /** Beteiligte, die einem Baustein des Aufbaus entsprechen, tragen dessen Farbe. */
  readonly kinds: ReadonlyMap<string, KnowledgeNodeKind>
}

/** Ablauf als Sequenzdiagramm: Lebenslinien je Beteiligtem, nummerierte Pfeile von oben nach unten. */
export function SequenceDiagram({ flow, kinds }: DiagramProps): React.JSX.Element {
  const [frame, size] = useElementSize<HTMLDivElement>()
  const layout = useMemo(() => layoutSequence(flow, size.width), [flow, size.width])
  const t = useT().knowledge
  const description = flow.steps.map((s, i) => `${i + 1}. ${s.from} → ${s.to}: ${s.label}`).join('; ')
  return (
    <div ref={frame} className="w-full">
      {size.width > 0 ? <SequenceSvg layout={layout} kinds={kinds} label={t.view.flowLabel(flow.steps.length, description)} width={size.width} /> : null}
    </div>
  )
}

interface SvgProps {
  readonly layout: SequenceLayout
  readonly kinds: ReadonlyMap<string, KnowledgeNodeKind>
  readonly label: string
  readonly width: number
}

function SequenceSvg({ layout, kinds, label, width }: SvgProps): React.JSX.Element {
  const markerId = `seq-${useId().replace(/:/g, '')}`
  const [hovered, setHovered] = useState<number | null>(null)
  const colorOf = (name: string): string => {
    const kind = kindOf(kinds, name)
    return kind ? KIND_COLOR[kind] : NEUTRAL
  }
  return (
    <svg viewBox={`0 0 ${layout.width} ${layout.height}`} style={{ width: Math.min(width, layout.width) }} className="block h-auto" role="img" aria-label={label}>
      <defs>
        <marker id={markerId} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0.5 L7.5,4 L0,7.5 Z" fill="context-stroke" />
        </marker>
      </defs>
      {layout.heads.map((h) => (
        <line
          key={`life-${h.name}`}
          x1={h.x + h.width / 2}
          x2={h.x + h.width / 2}
          y1={layout.lifelineTop}
          y2={layout.lifelineBottom}
          stroke={`color-mix(in oklab, ${colorOf(h.name)} 40%, var(--color-line))`}
          strokeDasharray="3 4"
        />
      ))}
      {layout.heads.map((h) => (
        <g key={`head-${h.name}`}>
          <title>{h.name}</title>
          <rect x={h.x} y={0} width={h.width} height={HEAD_HEIGHT} rx={8} style={{ fill: tintFill(colorOf(h.name), HEAD_FILL_PERCENT), stroke: `color-mix(in oklch, ${colorOf(h.name)} 55%, transparent)` }} />
          <text x={h.x + h.width / 2} y={HEAD_HEIGHT / 2} textAnchor="middle" dominantBaseline="central" fontSize={11.5} fontWeight={600} fill="var(--color-ink)">
            {clipLabel(h.name, headChars(h.width))}
          </text>
        </g>
      ))}
      {layout.rows.map((row) => (
        <StepRow
          key={row.index}
          row={row}
          layout={layout}
          markerId={markerId}
          color={colorOf(layout.heads[row.from]?.name ?? '')}
          dimmed={hovered !== null && hovered !== row.index}
          onHover={setHovered}
        />
      ))}
    </svg>
  )
}

function arrowPath(row: SequenceRow, layout: SequenceLayout): string {
  const head = (i: number): number => {
    const h = layout.heads[i]
    return h ? h.x + h.width / 2 : 0
  }
  const x1 = head(row.from)
  if (row.loop !== 0) {
    const out = x1 + row.loop * SELF_LOOP
    const y = row.arrowY - LOOP_DROP / 2
    return `M${x1},${y} H${out} V${y + LOOP_DROP} H${x1 + row.loop * ARROW_GAP}`
  }
  const x2 = head(row.to)
  const direction = Math.sign(x2 - x1)
  return `M${x1},${row.arrowY} H${x2 - direction * ARROW_GAP}`
}

interface RowProps {
  readonly row: SequenceRow
  readonly layout: SequenceLayout
  readonly markerId: string
  readonly color: string
  readonly dimmed: boolean
  onHover(index: number | null): void
}

function StepRow({ row, layout, markerId, color, dimmed, onHover }: RowProps): React.JSX.Element {
  const stroke = color === NEUTRAL ? 'var(--color-ink-2)' : color
  return (
    <g onMouseEnter={() => onHover(row.index)} onMouseLeave={() => onHover(null)} className="group transition-opacity duration-150" opacity={dimmed ? DIM : 1}>
      <title>{row.fullLabel}</title>
      <rect x={0} y={row.top + 2} width={layout.width} height={ROW_HEIGHT - 2} rx={6} fill="var(--color-raised)" className="opacity-0 transition-opacity duration-150 group-hover:opacity-70" />
      <circle cx={BADGE_X} cy={row.arrowY - BADGE_RADIUS / 2} r={BADGE_RADIUS} fill="var(--color-raised-2)" />
      <text x={BADGE_X} y={row.arrowY - BADGE_RADIUS / 2} textAnchor="middle" dominantBaseline="central" fontSize={9.5} fontWeight={620} fill="var(--color-ink-2)" className="num">
        {row.index + 1}
      </text>
      <path d={arrowPath(row, layout)} fill="none" stroke={stroke} strokeWidth={1.4} markerEnd={`url(#${markerId})`} />
      <text
        x={row.labelX}
        y={row.labelY}
        textAnchor={row.anchor}
        fontSize={11.5}
        fill="var(--color-ink)"
        stroke="var(--color-canvas)"
        strokeWidth={4}
        paintOrder="stroke"
        strokeLinejoin="round"
      >
        {row.label}
      </text>
    </g>
  )
}
