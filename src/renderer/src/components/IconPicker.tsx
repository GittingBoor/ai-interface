import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { Ban, Search } from 'lucide-react'
import { DynamicIcon } from 'lucide-react/dynamic'
import { formatIcon, isValidIcon, parseIcon } from '@shared/projectIcon'
import { searchIcons } from '@renderer/lib/lucideIcons'
import { EMOJI_GROUPS, searchEmoji, type EmojiEntry } from '@renderer/lib/emojiList'
import { Button } from './Button'
import { Kbd, Segmented } from './Controls'
import { Modal } from './Modal'
import { ProjectMark } from './ProjectMark'

type PickerTab = 'icons' | 'emoji'

interface IconPickerProps {
  readonly open: boolean
  /** Aktuelles Symbol (`emoji:…`/`lucide:…`) oder `null`. */
  readonly value: string | null
  /** Farbe für die Vorschau der Icons. */
  readonly color: string
  /** Wofür gewählt wird, z. B. „AI Interface“. */
  readonly subject: string
  onClose(): void
  onSelect(icon: string | null): void
}

const MAX_ICON_RESULTS = 120
const GRID_COLUMNS = 10
const ICON_PX = 18

const ARROW_STEP: Readonly<Record<string, number>> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: GRID_COLUMNS, ArrowUp: -GRID_COLUMNS }

/** Pfeiltasten bewegen den Fokus im Raster statt 120-mal Tab. */
function moveFocus(e: KeyboardEvent<HTMLElement>): void {
  const step = ARROW_STEP[e.key]
  if (step === undefined) return
  const cells = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button[data-cell]')]
  const index = cells.findIndex((c) => c === document.activeElement)
  if (index < 0) return
  e.preventDefault()
  cells[Math.max(0, Math.min(cells.length - 1, index + step))]?.focus()
}

interface CellProps {
  readonly label: string
  readonly selected: boolean
  onPick(): void
  readonly children: React.ReactNode
}

function Cell({ label, selected, onPick, children }: CellProps): React.JSX.Element {
  return (
    <button
      type="button"
      data-cell
      aria-label={label}
      aria-pressed={selected}
      title={label}
      onClick={onPick}
      className={`grid aspect-square place-items-center rounded-md transition-[background-color,transform] duration-100 hover:bg-raised-2 active:scale-95 ${selected ? 'bg-accent-soft ring-1 ring-accent/60' : ''}`}
    >
      {children}
    </button>
  )
}

function IconGrid({ query, value, color, onPick }: { readonly query: string; readonly value: string | null; readonly color: string; onPick(icon: string): void }): React.JSX.Element {
  const names = useMemo(() => searchIcons(query, MAX_ICON_RESULTS), [query])
  if (!names.length) return <p className="px-1 py-10 text-center text-xs text-ink-3">Kein Icon passt zu „{query}“. Suche auf Englisch, z. B. „house“ oder „music“.</p>
  return (
    <div role="group" aria-label="Icons" onKeyDown={moveFocus} className="grid grid-cols-10 gap-1">
      {names.map((name) => {
        const raw = formatIcon({ kind: 'lucide', name })
        return (
          <Cell key={name} label={name} selected={raw === value} onPick={() => onPick(raw)}>
            <DynamicIcon name={name} size={ICON_PX} color={color} strokeWidth={1.75} fallback={() => <span className="size-[18px] rounded-sm bg-raised-2" />} />
          </Cell>
        )
      })}
    </div>
  )
}

function EmojiCells({ entries, value, onPick }: { readonly entries: readonly EmojiEntry[]; readonly value: string | null; onPick(icon: string): void }): React.JSX.Element {
  return (
    <div role="group" onKeyDown={moveFocus} className="grid grid-cols-10 gap-1">
      {entries.map((entry) => {
        const raw = formatIcon({ kind: 'emoji', value: entry.emoji })
        return (
          <Cell key={entry.emoji} label={entry.words.split(' ')[0] ?? entry.emoji} selected={raw === value} onPick={() => onPick(raw)}>
            <span className="text-[1.125rem] leading-none">{entry.emoji}</span>
          </Cell>
        )
      })}
    </div>
  )
}

function FreeEmoji({ onPick }: { onPick(icon: string): void }): React.JSX.Element {
  const [text, setText] = useState('')
  const raw = formatIcon({ kind: 'emoji', value: text.trim() })
  const valid = isValidIcon(raw)
  const invalid = text.trim() !== '' && !valid
  return (
    <form
      className="flex flex-col gap-1"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onPick(raw)
      }}
    >
      <div className="flex items-center gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-ink-2">
          <span className="shrink-0">Eigenes Emoji</span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-invalid={invalid}
            placeholder="z. B. 🦖"
            className="field h-7 w-28 text-[0.9375rem] placeholder:text-[0.8125rem]"
          />
        </label>
        <Button size="sm" type="submit" disabled={!valid}>
          Übernehmen
        </Button>
      </div>
      <p className={`text-2xs ${invalid ? 'text-danger-ink' : 'text-ink-3'}`}>
        {invalid ? 'Nur ein einzelnes Emoji, kein Text.' : (
          <span className="inline-flex items-center gap-1">
            Emoji-Auswahl von Windows: <Kbd>Win</Kbd> <Kbd>.</Kbd>
          </span>
        )}
      </p>
    </form>
  )
}

function EmojiPane({ query, value, onPick }: { readonly query: string; readonly value: string | null; onPick(icon: string): void }): React.JSX.Element {
  const hits = useMemo(() => (query.trim() ? searchEmoji(query) : null), [query])
  return (
    <div className="flex flex-col gap-3">
      {hits === null ? (
        EMOJI_GROUPS.map((group) => (
          <section key={group.label} aria-label={group.label}>
            <h3 className="mb-1 px-1 text-2xs font-[600] text-ink-3">{group.label}</h3>
            <EmojiCells entries={group.entries} value={value} onPick={onPick} />
          </section>
        ))
      ) : hits.length ? (
        <EmojiCells entries={hits} value={value} onPick={onPick} />
      ) : (
        <p className="px-1 py-8 text-center text-xs text-ink-3">Kein Emoji passt zu „{query}“. Füge unten ein beliebiges Emoji ein.</p>
      )}
    </div>
  )
}

/** Dialog zur Wahl eines Symbols: Lucide-Icon, Emoji oder keins. */
export function IconPicker({ open, value, color, subject, onClose, onSelect }: IconPickerProps): React.JSX.Element {
  const [tab, setTab] = useState<PickerTab>('icons')
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) return
    setQuery('')
    setTab(parseIcon(value)?.kind === 'emoji' ? 'emoji' : 'icons')
  }, [open, value])

  const pick = (icon: string | null): void => {
    onSelect(icon)
    onClose()
  }

  return (
    <Modal
      open={open}
      label={`Symbol für ${subject}`}
      onClose={onClose}
      align="top"
      className="flex max-h-[70vh] w-full max-w-[29rem] flex-col overflow-hidden rounded-xl border border-line-strong/70 bg-raised shadow-[0_24px_60px_-12px_oklch(0_0_0/0.7)]"
    >
      <div className="flex items-center gap-3 px-4 pt-4">
        <ProjectMark color={color} icon={value} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="text-[0.9375rem] font-[640] text-ink">Symbol wählen</h2>
          <p className="truncate text-xs text-ink-3">{subject}</p>
        </div>
        <Segmented
          label="Art des Symbols"
          value={tab}
          onChange={(next: PickerTab) => setTab(next)}
          options={[
            { value: 'icons', label: 'Icons' },
            { value: 'emoji', label: 'Emoji' }
          ]}
        />
      </div>
      <div className="relative mx-4 mt-3">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-3" aria-hidden />
        <input
          data-autofocus
          type="search"
          aria-label={tab === 'icons' ? 'Icons suchen' : 'Emoji suchen'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tab === 'icons' ? 'Icons suchen, z. B. music, haus, code …' : 'Emoji suchen, z. B. musik, haus, uni …'}
          spellCheck={false}
          className="field pl-8"
        />
      </div>
      <div className="mt-3 min-h-[12rem] flex-1 overflow-y-auto px-3 pb-3">
        {tab === 'icons' ? <IconGrid query={query} value={value} color={color} onPick={pick} /> : <EmojiPane query={query} value={value} onPick={pick} />}
      </div>
      <div className="flex flex-col gap-3 border-t border-line bg-base/60 px-4 py-3">
        {tab === 'emoji' ? <FreeEmoji onPick={pick} /> : null}
        <div className="flex items-center justify-between gap-2">
          <Button size="sm" variant="ghost" icon={Ban} onClick={() => pick(null)} disabled={value === null} className="-ml-2">
            Kein Symbol
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
        </div>
      </div>
    </Modal>
  )
}
