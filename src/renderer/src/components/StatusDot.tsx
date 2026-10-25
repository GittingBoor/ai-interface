import { AnimatePresence, motion, useReducedMotion, type Transition } from 'motion/react'
import type { ComponentType } from 'react'
import { Check, Lock } from 'lucide-react'
import type { TerminalStatus } from '@shared/types'
import { useTerminals } from '@renderer/stores/terminalStore'

export type StatusDotSize = 'md' | 'sm'

interface StatusDotProps {
  readonly status: TerminalStatus
  /** `md` für Tabs, `sm` für kompakte Köpfe. */
  readonly size?: StatusDotSize
  readonly className?: string
}

interface GlyphProps {
  readonly className?: string
  readonly strokeWidth?: number
}

type StatusVisual =
  | { readonly kind: 'glyph'; readonly fill: string; readonly Glyph: ComponentType<GlyphProps> }
  | { readonly kind: 'spinner' }
  | { readonly kind: 'plain'; readonly fill: string }

interface SizeSpec {
  readonly box: string
  readonly glyph: string
  readonly plain: string
}

export const STATUS_LABEL: Readonly<Record<TerminalStatus, string>> = {
  working: 'arbeitet',
  review: 'fertig – noch nicht angesehen',
  idle: 'bereit',
  question: 'Frage offen',
  permission: 'wartet auf Erlaubnis',
  exited: 'beendet'
}

const SIZES: Readonly<Record<StatusDotSize, SizeSpec>> = {
  md: { box: 'size-3.5', glyph: 'size-[9px]', plain: 'size-2' },
  sm: { box: 'size-3', glyph: 'size-2', plain: 'size-1.5' }
}

/** Strichstärke der Symbole: kräftiger als sonst, weil sie nur 8–9 px groß sind. */
const GLYPH_STROKE = 3.25
/** Ring des Lade-Symbols im 16er-Raster. */
const RING_VIEWBOX = 16
const RING_CENTER = RING_VIEWBOX / 2
const RING_RADIUS = 5.75
const RING_STROKE = 2.25
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
/** Anteil des Rings, der als drehender Bogen sichtbar ist. */
const RING_ARC_SHARE = 0.32

const POP: Transition = { type: 'spring', stiffness: 520, damping: 26, mass: 0.6 }
const FADE_OUT: Transition = { duration: 0.12 }
const POP_FROM_SCALE = 0.45

/** Fragezeichen im Lucide-Stil (Lucide hat kein freistehendes). */
function QuestionGlyph({ className, strokeWidth }: GlyphProps): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M8.5 8.5a3.6 3.6 0 0 1 7 1.2c0 2.4-3.5 3.1-3.5 5.3" />
      <path d="M12 19.5h.01" />
    </svg>
  )
}

const STATUS_VISUAL: Readonly<Record<TerminalStatus, StatusVisual>> = {
  working: { kind: 'spinner' },
  review: { kind: 'glyph', fill: 'bg-status-review', Glyph: Check },
  idle: { kind: 'plain', fill: 'bg-status-idle' },
  question: { kind: 'glyph', fill: 'bg-status-question', Glyph: QuestionGlyph },
  permission: { kind: 'glyph', fill: 'bg-warn', Glyph: Lock },
  exited: { kind: 'plain', fill: 'bg-status-exited' }
}

function Spinner(): React.JSX.Element {
  const arc = RING_CIRCUMFERENCE * RING_ARC_SHARE
  return (
    <svg viewBox={`0 0 ${RING_VIEWBOX} ${RING_VIEWBOX}`} className="size-full animate-status-spin text-accent" aria-hidden>
      <circle cx={RING_CENTER} cy={RING_CENTER} r={RING_RADIUS} fill="none" stroke="currentColor" strokeOpacity={0.28} strokeWidth={RING_STROKE} />
      <circle
        cx={RING_CENTER}
        cy={RING_CENTER}
        r={RING_RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        strokeDasharray={`${arc} ${RING_CIRCUMFERENCE - arc}`}
      />
    </svg>
  )
}

function Visual({ visual, spec }: { readonly visual: StatusVisual; readonly spec: SizeSpec }): React.JSX.Element {
  switch (visual.kind) {
    case 'spinner':
      return <Spinner />
    case 'plain':
      return <span className={`${spec.plain} rounded-full ${visual.fill}`} />
    case 'glyph': {
      const { Glyph } = visual
      return (
        <span className={`grid size-full place-items-center rounded-full text-status-glyph ${visual.fill}`}>
          <Glyph className={spec.glyph} strokeWidth={GLYPH_STROKE} />
        </span>
      )
    }
  }
}

/** Zustand eines Terminals als kleiner Punkt mit Symbol; Wechsel ploppen kurz auf. */
export function StatusDot({ status, size = 'md', className = '' }: StatusDotProps): React.JSX.Element {
  const reduced = useReducedMotion() ?? false
  const spec = SIZES[size]
  const label = STATUS_LABEL[status]
  return (
    <span role="img" aria-label={label} title={label} className={`relative inline-block shrink-0 ${spec.box} ${className}`}>
      <AnimatePresence initial={false}>
        <motion.span
          key={status}
          className="absolute inset-0 grid place-items-center"
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: POP_FROM_SCALE }}
          animate={{ opacity: 1, scale: 1, transition: reduced ? { duration: 0 } : POP }}
          exit={{ opacity: 0, transition: reduced ? { duration: 0 } : FADE_OUT }}
        >
          <Visual visual={STATUS_VISUAL[status]} spec={spec} />
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

/** Status eines Terminals; ohne Eintrag gilt es als bereit, ein beendeter Prozess immer als beendet. */
export function useTerminalStatus(id: string, running: boolean): TerminalStatus {
  const status = useTerminals((s) => s.statuses[id])
  return running ? (status ?? 'idle') : 'exited'
}
