import { useId, useMemo, useState, type ReactNode } from 'react'
import { Check, Search } from 'lucide-react'
import { AGENT_COLOR_HEX, AGENT_COLORS, toolGroups, toolPresets, type AgentColor, type OptionInfo } from '@shared/agents'
import { useT } from '@renderer/i18n/useT'
import { Rich } from './Rich'

/** Formularblock des Builders: Titel, Erklärung, Inhalt. Haarlinie statt Karte. */
export function BuilderBlock({ id, title, explain, children, aside }: { readonly id: string; readonly title: string; readonly explain: ReactNode; readonly children: ReactNode; readonly aside?: ReactNode }): React.JSX.Element {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-4 border-t border-line pt-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[60ch] min-w-48 flex-1">
          <h2 id={`${id}-title`} className="text-[0.9375rem] font-[640] tracking-[-0.005em] text-ink">
            {title}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-3">{explain}</p>
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}

/** Farbwahl aus den acht Farben, die Claude Code kennt (plus „keine“). */
export function ColorChoice({ value, onChange }: { readonly value: AgentColor | null; readonly onChange: (c: AgentColor | null) => void }): React.JSX.Element {
  const f = useT().agents.fields
  return (
    <div role="radiogroup" aria-label={f.colorGroup} className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        role="radio"
        aria-checked={value === null}
        aria-label={f.noColor}
        title={f.noColor}
        onClick={() => onChange(null)}
        className={`grid size-7 place-items-center rounded-full border border-dashed transition-[box-shadow] ${value === null ? 'border-ink-2 shadow-[0_0_0_2px_var(--color-canvas),0_0_0_3.5px_var(--color-ink-2)]' : 'border-line-strong hover:border-ink-3'}`}
      >
        <span className="h-px w-3 rotate-45 bg-ink-3" />
      </button>
      {AGENT_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          title={c}
          onClick={() => onChange(c)}
          className="grid size-7 place-items-center rounded-full transition-[box-shadow,transform] duration-150 hover:scale-105"
          style={{ background: AGENT_COLOR_HEX[c], boxShadow: value === c ? `0 0 0 2px var(--color-canvas), 0 0 0 3.5px ${AGENT_COLOR_HEX[c]}` : undefined }}
        >
          {value === c ? <Check className="size-3.5 text-canvas" strokeWidth={3} aria-hidden /> : null}
        </button>
      ))}
    </div>
  )
}

interface ChoiceListProps<T extends string> {
  readonly label: string
  readonly value: T | null
  readonly options: readonly OptionInfo<T>[]
  /** Beschriftung der Option „nicht gesetzt“ (Claude nimmt den Standard). */
  readonly inheritLabel: string
  readonly inheritExplain: string
  readonly onChange: (value: T | null) => void
  readonly columns?: 2 | 3
}

/** Auswahl mit Erklärung je Option; die erste Option heißt „wie Sitzung“ und lässt das Feld weg. */
export function ChoiceList<T extends string>({ label, value, options, inheritLabel, inheritExplain, onChange, columns = 3 }: ChoiceListProps<T>): React.JSX.Element {
  const all: readonly { readonly value: T | null; readonly label: string; readonly explain: string }[] = [{ value: null, label: inheritLabel, explain: inheritExplain }, ...options]
  return (
    <div role="radiogroup" aria-label={label} className={`grid gap-1.5 ${columns === 3 ? 'grid-cols-[repeat(auto-fill,minmax(12rem,1fr))]' : 'grid-cols-[repeat(auto-fill,minmax(16rem,1fr))]'}`}>
      {all.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value ?? 'inherit'}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-[background-color,border-color] duration-150 ${
              active ? 'border-accent/50 bg-accent-soft/70' : 'border-line bg-canvas hover:border-line-strong'
            }`}
          >
            <span className={`text-[0.8125rem] font-[600] ${active ? 'text-accent-text' : o.value === null ? 'text-ink-2' : 'text-ink'}`}>{o.label}</span>
            <span className="text-2xs leading-snug text-ink-3">{o.explain}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Tools als Gruppen zum Ankreuzen plus Schnellauswahl; freie Namen (MCP, Muster) als Textfeld. */
export function ToolPicker({ tools, onChange }: { readonly tools: readonly string[]; readonly onChange: (tools: string[]) => void }): React.JSX.Element {
  const text = useT().agents
  const f = text.fields
  const groups = toolGroups(text)
  const presets = toolPresets(text)
  const known = new Set(groups.flatMap((g) => g.tools.map((tool) => tool.name)))
  const extra = tools.filter((t) => !known.has(t))
  const extraId = useId()
  const toggle = (name: string): void => onChange(tools.includes(name) ? tools.filter((t) => t !== name) : [...tools, name])
  const preset = presets.find((p) => p.tools.length === tools.length && p.tools.every((name) => tools.includes(name)))
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={f.presets}>
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={preset?.id === p.id}
            title={p.explain}
            onClick={() => onChange([...p.tools, ...extra])}
            className={`h-7 rounded-full border px-3 text-xs font-[560] transition-colors ${preset?.id === p.id ? 'border-accent/50 bg-accent-soft text-accent-text' : 'border-line text-ink-2 hover:border-line-strong hover:text-ink'}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {tools.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong px-3 py-2.5 text-xs leading-relaxed text-ink-3">
          <Rich text={f.inheritAllNote} />
        </p>
      ) : null}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-x-6 gap-y-4">
        {groups.map((g) => (
          <fieldset key={g.id} className="min-w-0">
            <legend className="mb-1.5 text-2xs font-[620] tracking-[0.02em] text-ink-3">{g.label}</legend>
            <div className="space-y-0.5">
              {g.tools.map((tool) => {
                const on = tools.includes(tool.name)
                return (
                  <label key={tool.name} className="flex cursor-pointer items-start gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-raised">
                    <input type="checkbox" checked={on} onChange={() => toggle(tool.name)} className="mt-0.5 size-3.5 shrink-0 accent-[var(--color-accent)]" />
                    <span className="min-w-0">
                      <span className="flex items-baseline gap-1.5">
                        <span className={`text-[0.8125rem] font-[560] ${on ? 'text-ink' : 'text-ink-2'}`}>{tool.label}</span>
                        <code className="font-mono text-2xs text-ink-3">{tool.name}</code>
                      </span>
                      <span className="block text-2xs leading-snug text-ink-3">{tool.explain}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={extraId} className="text-xs font-[560] text-ink-2">
          {f.moreTools}
        </label>
        <input
          id={extraId}
          className="field font-mono text-xs"
          placeholder={f.moreToolsPlaceholder}
          defaultValue={extra.join(', ')}
          key={extra.join(',')}
          onBlur={(e) => {
            const next = e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
            onChange([...tools.filter((t) => known.has(t)), ...next])
          }}
        />
        <p className="text-2xs text-ink-3">{f.moreToolsHint}</p>
      </div>
    </div>
  )
}

/** Skills zum Vorladen: Chips zum Umschalten, mit Suche bei vielen Skills. */
export function SkillPicker({ available, selected, onChange }: { readonly available: readonly string[]; readonly selected: readonly string[]; readonly onChange: (skills: string[]) => void }): React.JSX.Element {
  const f = useT().agents.fields
  const [query, setQuery] = useState('')
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const all = [...new Set([...selected, ...available])]
    return q ? all.filter((s) => s.toLowerCase().includes(q)) : all
  }, [available, selected, query])
  const toggle = (name: string): void => onChange(selected.includes(name) ? selected.filter((s) => s !== name) : [...selected, name])
  return (
    <div className="space-y-2.5">
      {available.length > 12 ? (
        <label className="relative block max-w-xs">
          <span className="sr-only">{f.filterSkills}</span>
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-3" aria-hidden />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={f.searchSkill} className="field pl-8" />
        </label>
      ) : null}
      {shown.length === 0 ? <p className="text-xs text-ink-3">{available.length ? f.noSkillMatch : f.noSkillsFound}</p> : null}
      <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto pr-1">
        {shown.map((name) => {
          const on = selected.includes(name)
          return (
            <button
              key={name}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(name)}
              className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors ${on ? 'border-accent/50 bg-accent-soft text-accent-text' : 'border-line text-ink-2 hover:border-line-strong hover:text-ink'}`}
            >
              {on ? <Check className="size-3" strokeWidth={2.5} aria-hidden /> : null}
              {name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
