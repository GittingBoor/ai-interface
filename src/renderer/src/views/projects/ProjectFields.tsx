import { useState } from 'react'
import { ChevronDown, Star } from 'lucide-react'
import type { Category } from '@shared/types'
import { IconPicker } from '@renderer/components/IconPicker'
import { ProjectMark } from '@renderer/components/ProjectMark'

const NO_CATEGORY = ''
const NEUTRAL_MARK = 'var(--color-line-strong)'

interface CategorySelectProps {
  readonly id?: string
  readonly value: number | null
  readonly categories: readonly Category[]
  onChange(categoryId: number | null): void
}

/** Auswahl der Art inklusive „Ohne Art“, mit Symbol der gewählten Art im Feld. */
export function CategorySelect({ id, value, categories, onChange }: CategorySelectProps): React.JSX.Element {
  const current = categories.find((c) => c.id === value) ?? null
  return (
    <div className="relative">
      <ProjectMark
        color={current?.color ?? NEUTRAL_MARK}
        icon={current?.icon ?? null}
        size="sm"
        className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
      />
      <select
        id={id}
        value={value === null ? NO_CATEGORY : String(value)}
        onChange={(e) => onChange(e.target.value === NO_CATEGORY ? null : Number(e.target.value))}
        className="field cursor-pointer appearance-none pr-8 pl-8"
      >
        <option value={NO_CATEGORY}>Ohne Art</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-ink-3" aria-hidden />
    </div>
  )
}

interface IconFieldProps {
  readonly id?: string
  readonly value: string | null
  readonly color: string
  readonly subject: string
  onChange(icon: string | null): void
}

/** Knopf mit aktuellem Symbol, öffnet die Symbolauswahl. */
export function IconField({ id, value, color, subject, onChange }: IconFieldProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        id={id}
        type="button"
        onClick={() => setOpen(true)}
        className="field flex cursor-pointer items-center gap-2 text-left"
        aria-haspopup="dialog"
      >
        <ProjectMark color={color} icon={value} size="sm" />
        <span className={`flex-1 truncate ${value ? 'text-ink' : 'text-ink-3'}`}>{value ? 'Ändern …' : 'Wählen …'}</span>
      </button>
      <IconPicker open={open} value={value} color={color} subject={subject} onClose={() => setOpen(false)} onSelect={onChange} />
    </>
  )
}

interface StarToggleProps {
  readonly starred: boolean
  /** Name des Projekts für die Beschriftung. */
  readonly name: string
  readonly size?: 'sm' | 'md'
  readonly className?: string
  onToggle(): void
}

/** Stern in der Optik des Anpinnens; der umgebende Knopf braucht die Klasse `group/star`. */
export function StarGlyph({ starred }: { readonly starred: boolean }): React.JSX.Element {
  return (
    <Star
      aria-hidden
      strokeWidth={1.75}
      className={`size-4 shrink-0 transition-[color,fill,transform] duration-200 ease-out group-active/star:scale-90 ${starred ? 'fill-accent text-accent' : 'fill-transparent text-ink-3 group-hover/star:text-ink-2'}`}
    />
  )
}

/** Stern-Knopf: Projekt anpinnen oder lösen. */
export function StarToggle({ starred, name, size = 'sm', className = '', onToggle }: StarToggleProps): React.JSX.Element {
  const label = starred ? `${name} lösen` : `${name} anpinnen`
  return (
    <button
      type="button"
      aria-pressed={starred}
      aria-label={label}
      title={starred ? 'Angepinnt · klicken zum Lösen' : 'Anpinnen'}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className={`group/star inline-flex shrink-0 items-center justify-center rounded-md transition-colors duration-150 hover:bg-raised-2 ${size === 'sm' ? 'size-7' : 'size-8'} ${className}`}
    >
      <StarGlyph starred={starred} />
    </button>
  )
}
