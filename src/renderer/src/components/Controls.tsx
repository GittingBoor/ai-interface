import { useId, type ReactNode } from 'react'
import { motion } from 'motion/react'

interface SegmentOption<T extends string> {
  readonly value: T
  readonly label: string
  readonly count?: number
}

interface SegmentedProps<T extends string> {
  readonly label: string
  readonly value: T
  readonly options: readonly SegmentOption<T>[]
  onChange(value: T): void
}

/** Segmentierte Auswahl (Radiogruppe) mit gleitender Markierung. */
export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>): React.JSX.Element {
  const group = useId()
  const move = (dir: 1 | -1): void => {
    const index = options.findIndex((o) => o.value === value)
    const next = options[(index + dir + options.length) % options.length]
    if (next) onChange(next.value)
  }
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex h-8 max-w-full items-center gap-0.5 self-start overflow-x-auto rounded-md border border-line bg-canvas p-0.5 [scrollbar-width:none]"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') move(1)
        if (e.key === 'ArrowLeft') move(-1)
      }}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={`relative h-full shrink-0 rounded-[5px] px-2.5 text-xs font-[560] whitespace-nowrap transition-colors duration-150 ${active ? 'text-ink' : 'text-ink-3 hover:text-ink-2'}`}
          >
            {active ? (
              <motion.span layoutId={`seg-${group}`} className="absolute inset-0 rounded-[5px] bg-raised-2" transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }} />
            ) : null}
            <span className="relative flex items-center gap-1.5">
              {o.label}
              {o.count !== undefined ? <span className="num text-ink-3">{o.count}</span> : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}

interface SwitchProps {
  readonly checked: boolean
  readonly label: string
  readonly description?: string
  onChange(checked: boolean): void
}

export function Switch({ checked, label, description, onChange }: SwitchProps): React.JSX.Element {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <label htmlFor={id} className="text-[0.8125rem] font-[560] text-ink">
          {label}
        </label>
        {description ? <p className="mt-0.5 text-xs text-ink-3">{description}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-accent' : 'bg-line-strong'}`}
      >
        <motion.span
          className="absolute top-0.5 left-0.5 size-4 rounded-full bg-ink shadow-[0_1px_2px_oklch(0_0_0/0.4)]"
          animate={{ x: checked ? 16 : 0 }}
          transition={{ type: 'spring', stiffness: 600, damping: 35 }}
        />
      </button>
    </div>
  )
}

interface FieldProps {
  readonly label: string
  readonly hint?: ReactNode
  readonly error?: string | null
  readonly children: (id: string, describedBy: string | undefined) => ReactNode
  readonly className?: string
}

/** Beschriftetes Formularfeld; Kind bekommt id und aria-describedby. */
export function Field({ label, hint, error, children, className = '' }: FieldProps): React.JSX.Element {
  const id = useId()
  const hintId = `${id}-hint`
  const describedBy = error || hint ? hintId : undefined
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-xs font-[560] text-ink-2">
        {label}
      </label>
      {children(id, describedBy)}
      {error ? (
        <p id={hintId} className="text-xs text-danger-ink">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function Kbd({ children }: { readonly children: ReactNode }): React.JSX.Element {
  return (
    <kbd className="inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded border border-line-strong/70 bg-raised px-1 font-sans text-[0.625rem] font-[600] text-ink-3">
      {children}
    </kbd>
  )
}
