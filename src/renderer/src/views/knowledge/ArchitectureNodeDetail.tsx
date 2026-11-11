import { motion } from 'motion/react'
import { ArrowLeft, ArrowRight, type LucideIcon } from 'lucide-react'
import type { KnowledgeEdge, KnowledgeNode, KnowledgeProject } from '@shared/knowledge'
import { useT } from '@renderer/i18n/useT'
import { FileLink } from './KnowledgeLinks'
import { KIND_COLOR, tintFill } from './knowledgePalette'

const CHIP_FILL_PERCENT = 10
const PANEL_FILL_PERCENT = 5

interface Neighbour {
  readonly node: KnowledgeNode
  readonly label?: string
}

function neighbours(node: KnowledgeNode, nodes: readonly KnowledgeNode[], edges: readonly KnowledgeEdge[], outgoing: boolean): Neighbour[] {
  return edges.flatMap((e) => {
    const near = outgoing ? e.from === node.id : e.to === node.id
    const other = nodes.find((n) => n.id === (outgoing ? e.to : e.from))
    return near && other && other.id !== node.id ? [{ node: other, label: e.label }] : []
  })
}

interface ConnectionsProps {
  readonly icon: LucideIcon
  readonly title: string
  readonly items: readonly Neighbour[]
  onSelect(id: string): void
}

function Connections({ icon: Icon, title, items, onSelect }: ConnectionsProps): React.JSX.Element | null {
  if (items.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex w-24 shrink-0 items-center gap-1 text-2xs text-ink-3">
        <Icon aria-hidden className="size-3" strokeWidth={1.75} />
        {title}
      </span>
      {items.map(({ node, label }) => (
        <button
          key={`${node.id}-${label ?? ''}`}
          type="button"
          onClick={() => onSelect(node.id)}
          className="inline-flex h-6 items-center gap-1.5 rounded-md border border-line px-1.5 text-2xs text-ink-2 transition-colors duration-150 hover:border-line-strong hover:text-ink"
          style={{ background: tintFill(KIND_COLOR[node.kind], CHIP_FILL_PERCENT) }}
        >
          <span aria-hidden className="size-1.5 rounded-[2px]" style={{ background: KIND_COLOR[node.kind] }} />
          {node.label}
          {label ? <span className="text-ink-3">· {label}</span> : null}
        </button>
      ))}
    </div>
  )
}

interface DetailProps {
  readonly node: KnowledgeNode
  readonly nodes: readonly KnowledgeNode[]
  readonly edges: readonly KnowledgeEdge[]
  readonly project: KnowledgeProject
  onSelect(id: string): void
}

/** Was ein Baustein tut, wo er liegt und mit wem er redet. */
export function ArchitectureNodeDetail({ node, nodes, edges, project, onSelect }: DetailProps): React.JSX.Element {
  const t = useT().knowledge
  const color = KIND_COLOR[node.kind]
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="grid min-h-[4.5rem] gap-x-8 gap-y-3 rounded-lg border px-4 py-3 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
      style={{ borderColor: `color-mix(in oklab, ${color} 35%, var(--color-line))`, background: tintFill(color, PANEL_FILL_PERCENT) }}
    >
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[0.875rem] font-[620] text-ink">{node.label}</span>
          <span className="inline-flex items-center gap-1.5 text-2xs text-ink-3">
            <span aria-hidden className="size-2 rounded-[3px]" style={{ background: color }} />
            {t.kind[node.kind]}
          </span>
          {node.where ? <FileLink project={project} path={node.where} full /> : null}
        </p>
        {node.note ? <p className="mt-1 max-w-[62ch] text-[0.8125rem] leading-relaxed text-ink-2">{node.note}</p> : null}
      </div>
      <div className="min-w-0 space-y-1.5 self-center">
        <Connections icon={ArrowRight} title={t.view.sendsTo} items={neighbours(node, nodes, edges, true)} onSelect={onSelect} />
        <Connections icon={ArrowLeft} title={t.view.receivesFrom} items={neighbours(node, nodes, edges, false)} onSelect={onSelect} />
      </div>
    </motion.div>
  )
}
