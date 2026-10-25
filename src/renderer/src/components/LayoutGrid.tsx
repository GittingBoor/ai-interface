import { useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, MoveHorizontal } from 'lucide-react'
import type { SectionLayout, SectionWidth } from '@shared/types'
import { moveItem, resolveSections } from '@shared/layout'
import { useSettings } from '@renderer/stores/settingsStore'
import { IconButton } from './Button'

export interface LayoutSection {
  readonly id: string
  readonly label: string
  readonly width: SectionWidth
  /** `null` = gerade nichts zu zeigen (z. B. Daten fehlen); der Platz bleibt frei. */
  render(): ReactNode
}

/** Spaltenanteil im 12er-Raster; schmale Fenster zeigen alles in voller Breite. */
const WIDTH_CLASS: Readonly<Record<SectionWidth, string>> = {
  full: 'col-span-12',
  wide: 'col-span-12 @min-[52rem]:col-span-8',
  half: 'col-span-12 @min-[52rem]:col-span-6',
  narrow: 'col-span-12 @min-[52rem]:col-span-4'
}
const WIDTH_LABEL: Readonly<Record<SectionWidth, string>> = { full: 'ganze Breite', wide: 'zwei Drittel', half: 'halbe Breite', narrow: 'ein Drittel' }
const WIDTH_CYCLE: readonly SectionWidth[] = ['full', 'wide', 'half', 'narrow']
const DRAG_TYPE = 'application/x-aii-section'
const EMPTY_LAYOUT: SectionLayout = { order: [], hidden: [] }

/** Gespeicherte Anordnung einer Seite lesen und ändern. */
export function usePageLayout(page: string): { readonly layout: SectionLayout; save(next: SectionLayout): void; reset(): void } {
  const layouts = useSettings((s) => s.settings?.layouts)
  const update = useSettings((s) => s.update)
  const layout = layouts?.[page] ?? EMPTY_LAYOUT
  const write = (next: SectionLayout | null): void => {
    const all = { ...(layouts ?? {}) }
    if (next) all[page] = next
    else delete all[page]
    void update({ layouts: all })
  }
  return { layout, save: (next) => write(next), reset: () => write(null) }
}

interface LayoutGridProps {
  readonly page: string
  readonly sections: readonly LayoutSection[]
  readonly editing: boolean
  readonly className?: string
}

interface ToolbarProps {
  readonly label: string
  readonly width: SectionWidth
  readonly first: boolean
  readonly last: boolean
  onMove(delta: number): void
  onWidth(): void
  onHide(): void
}

function Toolbar({ label, width, first, last, onMove, onWidth, onHide }: ToolbarProps): React.JSX.Element {
  return (
    <div className="mb-3 flex items-center gap-1 rounded-md border border-line bg-raised px-1.5 py-1">
      <GripVertical className="size-3.5 shrink-0 cursor-grab text-ink-3" aria-hidden />
      <span className="min-w-0 flex-1 truncate px-1 text-xs font-[600] text-ink-2">{label}</span>
      <IconButton size="sm" icon={ArrowUp} label={`${label} nach vorne`} disabled={first} onClick={() => onMove(-1)} />
      <IconButton size="sm" icon={ArrowDown} label={`${label} nach hinten`} disabled={last} onClick={() => onMove(1)} />
      <IconButton size="sm" icon={MoveHorizontal} label={`Breite: ${WIDTH_LABEL[width]} (ändern)`} onClick={onWidth} />
      <IconButton size="sm" icon={EyeOff} label={`${label} ausblenden`} onClick={onHide} />
    </div>
  )
}

/**
 * Raster aus Abschnitten, deren Reihenfolge, Breite und Sichtbarkeit der Nutzer festlegt (gespeichert je Seite).
 * Im Bearbeiten-Modus: Ziehen oder Pfeile zum Verschieben, Breite umschalten, ausblenden und wieder einblenden.
 */
export function LayoutGrid({ page, sections, editing, className = 'grid grid-cols-12 gap-x-10 gap-y-9' }: LayoutGridProps): React.JSX.Element {
  const { layout, save } = usePageLayout(page)
  const [dragging, setDragging] = useState<string | null>(null)
  const byId = new Map(sections.map((s) => [s.id, s]))
  const resolved = resolveSections(layout, sections.map((s) => s.id))
  const order = resolved.map((r) => r.id)
  const visible = resolved.filter((r) => !r.hidden)
  const hidden = resolved.filter((r) => r.hidden)
  const widthOf = (s: LayoutSection): SectionWidth => layout.widths?.[s.id] ?? s.width

  const setOrder = (next: readonly string[]): void => save({ ...layout, order: next })
  const setHidden = (id: string, hide: boolean): void => save({ ...layout, order, hidden: hide ? [...layout.hidden, id] : layout.hidden.filter((h) => h !== id) })
  const cycleWidth = (s: LayoutSection): void => {
    const next = WIDTH_CYCLE[(WIDTH_CYCLE.indexOf(widthOf(s)) + 1) % WIDTH_CYCLE.length] ?? 'full'
    save({ ...layout, order, widths: { ...layout.widths, [s.id]: next } })
  }
  const moveVisible = (id: string, delta: number): void => {
    const target = visible[visible.findIndex((v) => v.id === id) + delta]
    if (!target) return
    setOrder(moveItem(order, id, order.indexOf(target.id) - order.indexOf(id)))
  }
  const dropOn = (targetId: string) => (e: React.DragEvent): void => {
    const id = e.dataTransfer.getData(DRAG_TYPE)
    setDragging(null)
    if (!id || id === targetId) return
    e.preventDefault()
    setOrder(moveItem(order, id, order.indexOf(targetId) - order.indexOf(id)))
  }

  return (
    <>
      {/* Im Bearbeiten-Modus Platz für den Rahmen (outline-offset), sonst schneidet der Scrollbereich ihn oben ab. */}
      <div className={editing ? `${className} pt-3` : className}>
        {visible.map((r, i) => {
          const section = byId.get(r.id)
          if (!section) return null
          const content = section.render()
          if (content === null && !editing) return null
          return (
            <div
              key={r.id}
              className={`min-w-0 ${WIDTH_CLASS[widthOf(section)]} ${editing ? `rounded-lg outline outline-1 outline-offset-8 transition-opacity ${dragging === r.id ? 'opacity-40 outline-accent' : 'outline-line-strong/60 outline-dashed'}` : ''}`}
              draggable={editing}
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_TYPE, r.id)
                e.dataTransfer.effectAllowed = 'move'
                setDragging(r.id)
              }}
              onDragEnd={() => setDragging(null)}
              onDragOver={(e) => editing && e.dataTransfer.types.includes(DRAG_TYPE) && e.preventDefault()}
              onDrop={dropOn(r.id)}
            >
              {editing ? (
                <Toolbar
                  label={section.label}
                  width={widthOf(section)}
                  first={i === 0}
                  last={i === visible.length - 1}
                  onMove={(d) => moveVisible(r.id, d)}
                  onWidth={() => cycleWidth(section)}
                  onHide={() => setHidden(r.id, true)}
                />
              ) : null}
              {content ?? <p className="py-6 text-xs text-ink-3">Gerade keine Daten.</p>}
            </div>
          )
        })}
      </div>
      {editing && hidden.length ? (
        <div className="mt-10 border-t border-line pt-4">
          <p className="mb-2 text-xs font-[600] text-ink-3">Ausgeblendet</p>
          <div className="flex flex-wrap gap-2">
            {hidden.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setHidden(h.id, false)}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line bg-canvas px-2.5 text-xs text-ink-2 transition-colors hover:border-accent/50 hover:text-ink"
              >
                <Eye className="size-3.5" aria-hidden />
                {byId.get(h.id)?.label ?? h.id} einblenden
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  )
}
