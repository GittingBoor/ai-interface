import { useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { KnowledgeFlow, KnowledgeNode } from '@shared/knowledge'
import { useT } from '@renderer/i18n/useT'
import { SequenceDiagram } from '../charts/SequenceDiagram'
import { kindsByLabel } from '../knowledgePalette'
import { SectionFrame } from './SectionFrame'

const EASE = [0.16, 1, 0.3, 1] as const

const STEP_KEYS: Readonly<Record<string, number>> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

interface TabsProps {
  readonly flows: readonly KnowledgeFlow[]
  readonly active: number
  readonly baseId: string
  onSelect(index: number): void
}

/** Tabs nach WAI-ARIA: Pfeiltasten wechseln, Pos1/Ende springen, nur der aktive Tab ist im Tab-Fluss. */
function FlowTabs({ flows, active, baseId, onSelect }: TabsProps): React.JSX.Element {
  const t = useT().knowledge
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const focus = (index: number): void => {
    const next = (index + flows.length) % flows.length
    onSelect(next)
    refs.current[next]?.focus()
  }
  const onKeyDown = (event: React.KeyboardEvent): void => {
    const step = STEP_KEYS[event.key]
    if (step !== undefined) focus(active + step)
    else if (event.key === 'Home') focus(0)
    else if (event.key === 'End') focus(flows.length - 1)
    else return
    event.preventDefault()
  }
  return (
    <div role="tablist" aria-label={t.view.flowsLabel} className="flex flex-wrap gap-1" onKeyDown={onKeyDown}>
      {flows.map((f, i) => {
        const selected = i === active
        return (
          <button
            key={`${f.title}-${i}`}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${i}`}
            aria-selected={selected}
            aria-controls={`${baseId}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(i)}
            className={`relative h-7 rounded-md px-2.5 text-xs font-[560] transition-colors duration-150 ${selected ? 'text-ink' : 'text-ink-3 hover:bg-raised hover:text-ink-2'}`}
          >
            {selected ? <motion.span layoutId={`${baseId}-pill`} className="absolute inset-0 rounded-md border border-line-strong bg-raised" transition={{ duration: 0.25, ease: EASE }} /> : null}
            <span className="relative">{f.title}</span>
          </button>
        )
      })}
    </div>
  )
}

interface FlowsProps {
  readonly flows: readonly KnowledgeFlow[]
  readonly nodes: readonly KnowledgeNode[]
}

/** Abläufe als Sequenzdiagramme, je Frage ein Tab. */
export function FlowsSection({ flows, nodes }: FlowsProps): React.JSX.Element {
  const usable = useMemo(() => flows.filter((f) => f.steps.length > 0), [flows])
  const kinds = useMemo(() => kindsByLabel(nodes), [nodes])
  const [active, setActive] = useState(0)
  const baseId = `flows-${useId().replace(/:/g, '')}`
  const flow = usable[Math.min(active, usable.length - 1)]
  return (
    <SectionFrame id="flows">
      {usable.length > 1 ? <FlowTabs flows={usable} active={active} baseId={baseId} onSelect={setActive} /> : null}
      {flow ? (
        <div role={usable.length > 1 ? 'tabpanel' : undefined} id={`${baseId}-panel`} aria-labelledby={usable.length > 1 ? `${baseId}-tab-${active}` : undefined} className="mt-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={active} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: EASE }}>
              <h3 className="mb-4 text-[0.9375rem] font-[600] text-ink [text-wrap:balance]">{flow.question}</h3>
              <SequenceDiagram flow={flow} kinds={kinds} />
            </motion.div>
          </AnimatePresence>
        </div>
      ) : null}
    </SectionFrame>
  )
}
