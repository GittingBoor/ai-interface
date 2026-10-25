import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { AlertTriangle } from 'lucide-react'
import { useMiniPc } from '@renderer/stores/miniPcStore'
import type { MeterTone } from '@renderer/lib/miniPc'

const PERCENT = 100
/** Auch bei 0 % bleibt ein Ansatz des Balkens sichtbar. */
const MIN_BAR_PERCENT = 1
const BAR_TRANSITION = { duration: 0.6, ease: [0.16, 1, 0.3, 1] } as const

export const TONE_BAR: Readonly<Record<MeterTone, string>> = {
  normal: 'bg-ink-3',
  warn: 'bg-warn',
  critical: 'bg-danger'
}

export const TONE_TEXT: Readonly<Record<MeterTone, string>> = {
  normal: 'text-ink',
  warn: 'text-warn',
  critical: 'text-danger-ink'
}

/** Kopfzellen der Tabellen im Gerätebereich. */
export const TABLE_HEAD = 'px-2 pb-2 font-[520]'
export const TABLE_CELL = 'border-t border-line px-2 py-2.5 align-top'

interface BarProps {
  readonly label: string
  /** Füllstand in Prozent (0–100). */
  readonly percent: number
  readonly tone: MeterTone
  /** Wert in Worten für Screenreader, z. B. „58 °C, Grenze 100 °C“. */
  readonly valueText: string
  readonly className?: string
}

/** Schmaler Füllbalken mit Meter-Rolle. */
export function Bar({ label, percent, tone, valueText, className = '' }: BarProps): React.JSX.Element {
  const clamped = Math.min(PERCENT, Math.max(0, percent))
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={PERCENT}
      aria-valuenow={Math.round(clamped)}
      aria-valuetext={valueText}
      className={`h-1 overflow-hidden rounded-full bg-raised ${className}`}
    >
      <motion.div
        className={`h-full rounded-full transition-colors duration-300 ${TONE_BAR[tone]}`}
        initial={false}
        animate={{ width: `${Math.max(MIN_BAR_PERCENT, clamped)}%` }}
        transition={BAR_TRANSITION}
      />
    </div>
  )
}

interface MeterProps {
  readonly label: string
  readonly percent: number
  readonly tone: MeterTone
  /** Angezeigter Wert, z. B. „7 %“ oder „58 °C“. */
  readonly value: string
  readonly detail: string
  readonly title?: string
}

/** Beschriftung, Wert, Balken und eine Detailzeile. */
export function Meter({ label, percent, tone, value, detail, title }: MeterProps): React.JSX.Element {
  return (
    <div className="min-w-0" title={title}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-xs text-ink-3">{label}</span>
        <span className={`num text-[0.9375rem] font-[600] ${TONE_TEXT[tone]}`}>{value}</span>
      </div>
      <Bar label={label} percent={percent} tone={tone} valueText={`${value}, ${detail}`} className="mt-2" />
      <p className="num mt-1.5 truncate text-2xs text-ink-3">{detail}</p>
    </div>
  )
}

interface FactProps {
  readonly label: string
  readonly children: ReactNode
  /** Lange Werte umbrechen statt abschneiden. */
  readonly wrap?: boolean
}

export function Fact({ label, children, wrap = false }: FactProps): React.JSX.Element {
  return (
    <div className="min-w-0">
      <dt className="text-2xs text-ink-3">{label}</dt>
      <dd className={`num mt-0.5 text-[0.8125rem] text-ink-2 ${wrap ? 'break-words' : 'truncate'}`}>{children}</dd>
    </div>
  )
}

export type StateTone = 'active' | 'idle' | 'warn' | 'critical'

const STATE_DOT: Readonly<Record<StateTone, string>> = {
  active: 'bg-accent',
  idle: 'border border-ink-3',
  warn: 'bg-warn',
  critical: 'bg-danger'
}

const STATE_TEXT: Readonly<Record<StateTone, string>> = {
  active: 'text-ink',
  idle: 'text-ink-3',
  warn: 'text-warn',
  critical: 'text-danger-ink'
}

/** Zustand als Punkt plus Wort, damit er nicht nur an der Farbe hängt. */
export function StateLabel({ tone, children }: { readonly tone: StateTone; readonly children: ReactNode }): React.JSX.Element {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs whitespace-nowrap ${STATE_TEXT[tone]}`}>
      <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${STATE_DOT[tone]}`} />
      {children}
    </span>
  )
}

/** Platzhalter für einen einzelnen Wert, solange die Gerätedaten noch laden. */
export function ValueSkeleton({ className = 'w-24' }: { readonly className?: string }): React.JSX.Element {
  return <span aria-hidden className={`skeleton inline-block h-3.5 align-middle ${className}`} />
}

/** Fehlermeldung, wenn die Gerätedaten fehlen; steht einmal oben, der Rest der Seite bleibt benutzbar. */
export function InfoError({ message }: { readonly message: string }): React.JSX.Element {
  const loading = useMiniPc((s) => s.infoLoading)
  const load = useMiniPc((s) => s.loadInfo)
  return (
    <p role="alert" className="flex items-start gap-1.5 text-xs leading-relaxed text-ink-2">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-danger-ink" aria-hidden />
      <span className="min-w-0">
        Gerätedaten nicht gelesen: <span className="break-words text-ink-3">{message}</span>{' '}
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="rounded-sm font-[560] text-accent-text underline decoration-accent-text/40 underline-offset-3 transition-colors hover:decoration-accent-text disabled:opacity-55"
        >
          {loading ? 'Lädt …' : 'Erneut versuchen'}
        </button>
      </span>
    </p>
  )
}
