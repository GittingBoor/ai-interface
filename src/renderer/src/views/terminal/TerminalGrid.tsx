import { useEffect, useState } from 'react'
import { Group, Panel, Separator, type Layout } from 'react-resizable-panels'
import { MousePointerClick } from 'lucide-react'
import type { TerminalInfo } from '@shared/types'
import { TerminalMark } from './TerminalMark'
import { terminalRegistry } from '@renderer/lib/terminalRegistry'
import { hostLabel } from '@renderer/lib/hosts'
import { useTerminals } from '@renderer/stores/terminalStore'
import { TerminalPane } from './TerminalPane'
import { StatusDot, useTerminalStatus } from '@renderer/components/StatusDot'

/** Mindestgröße eines Slots in Pixeln, damit Claude Code noch lesbar bleibt. */
const MIN_SLOT_PX = 160

type Orientation = 'horizontal' | 'vertical'

interface TerminalGridProps {
  readonly visible: boolean
  /** Terminal, dessen Tab gerade gezogen wird. */
  readonly dragId: string | null
  onDropped(): void
}

interface SlotProps {
  readonly index: number
  readonly id: string | null
  readonly framed: boolean
  readonly visible: boolean
  readonly dragId: string | null
  onDropped(): void
}

function SlotHeader({ info, exitCode }: { readonly info: TerminalInfo; readonly exitCode: number | undefined }): React.JSX.Element {
  const status = useTerminalStatus(info.id, info.running)
  return (
    <div className="flex h-7 shrink-0 items-center gap-2 border-b border-line/70 px-3 text-2xs" title={`${hostLabel(info.host)}: ${info.path}`}>
      <TerminalMark info={info} compact />
      <span className="truncate font-[560] text-ink-2">{info.title}</span>
      <StatusDot status={status} size="sm" />
      <span className="min-w-0 flex-1 truncate font-mono text-ink-3/80">{info.path}</span>
      {info.running ? null : <span className="shrink-0 text-ink-3">{exitCode === undefined ? 'beendet' : `Code ${exitCode}`}</span>}
    </div>
  )
}

function Slot({ index, id, framed, visible, dragId, onDropped }: SlotProps): React.JSX.Element {
  const info = useTerminals((s) => (id ? s.terminals.find((t) => t.id === id) : undefined))
  const active = useTerminals((s) => id !== null && s.activeId === id)
  const exitCode = useTerminals((s) => (id ? s.exitCodes[id] : undefined))
  const activate = useTerminals((s) => s.activate)
  const place = useTerminals((s) => s.place)
  const [over, setOver] = useState(false)

  useEffect(() => {
    if (!dragId) setOver(false)
  }, [dragId])

  const frame = framed
    ? `rounded-lg border bg-canvas transition-[border-color,box-shadow] duration-200 ${active ? 'border-accent/45 shadow-[0_0_0_1px_oklch(0.76_0.155_55/0.12)]' : 'border-line'}`
    : ''

  return (
    <div
      role={id ? 'tabpanel' : undefined}
      id={id ? `term-panel-${id}` : undefined}
      aria-labelledby={id ? `term-tab-${id}` : undefined}
      aria-label={id ? undefined : `Leerer Bereich ${index + 1}`}
      onMouseDownCapture={() => id && activate(id)}
      onFocusCapture={() => id && activate(id)}
      className={`relative flex h-full w-full flex-col overflow-hidden ${frame}`}
    >
      {framed && info ? <SlotHeader info={info} exitCode={exitCode} /> : null}
      {id ? (
        <div className={`min-h-0 flex-1 ${framed ? 'px-3 pt-2 pb-1.5' : 'px-4 pt-3 pb-2'}`}>
          <TerminalPane id={id} active={active} visible={visible} />
        </div>
      ) : (
        <div className={`grid flex-1 place-items-center p-6 transition-opacity duration-150 ${dragId ? 'opacity-0' : ''}`}>
          <p className="flex max-w-[16rem] items-center gap-2 text-center text-xs text-ink-3">
            <MousePointerClick className="size-4 shrink-0 opacity-70" aria-hidden strokeWidth={1.75} />
            Terminal hierher ziehen oder mit + öffnen
          </p>
        </div>
      )}
      {dragId ? (
        <div
          aria-hidden
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            setOver(true)
          }}
          onDragLeave={(e) => {
            if (!(e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget))) setOver(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setOver(false)
            place(index, dragId)
            onDropped()
          }}
          className={`absolute inset-0 z-10 grid place-items-center rounded-[inherit] transition-[background-color,box-shadow] duration-150 ${over ? 'bg-accent-soft shadow-[inset_0_0_0_2px_var(--color-accent)]' : 'shadow-[inset_0_0_0_1px_var(--color-line-strong)]'}`}
        >
          {over ? <span className="pointer-events-none rounded-md bg-raised px-2.5 py-1 text-xs font-[560] text-accent-text shadow-[0_4px_16px_-4px_oklch(0_0_0/0.6)]">Hier anzeigen</span> : null}
        </div>
      ) : null}
    </div>
  )
}

function Handle({ orientation }: { readonly orientation: Orientation }): React.JSX.Element {
  const horizontal = orientation === 'horizontal'
  return (
    <Separator className={`group/sep relative flex shrink-0 items-center justify-center outline-none ${horizontal ? 'w-2' : 'h-2'}`}>
      <span
        aria-hidden
        className={`rounded-full bg-line-strong opacity-0 transition-[opacity,background-color] duration-150 group-data-[separator=active]/sep:bg-accent group-data-[separator=active]/sep:opacity-100 group-data-[separator=focus]/sep:bg-accent group-data-[separator=focus]/sep:opacity-100 group-data-[separator=hover]/sep:opacity-100 ${horizontal ? 'h-10 w-[3px]' : 'h-[3px] w-10'}`}
      />
    </Separator>
  )
}

/** Zeigt die Slots des aktuellen Layouts; Größen werden je Gruppe gespeichert. */
export function TerminalGrid({ visible, dragId, onDropped }: TerminalGridProps): React.JSX.Element {
  const slots = useTerminals((s) => s.slots)
  const mode = useTerminals((s) => s.layout.mode)
  const sizes = useTerminals((s) => s.layout.sizes)
  const setSizes = useTerminals((s) => s.setSizes)
  const slotKey = slots.join('|')

  // Nach Layout- oder Belegungswechsel alle sichtbaren Terminals neu vermessen.
  useEffect(() => {
    if (!visible) return
    const frame = requestAnimationFrame(() => {
      for (const id of slotKey.split('|')) if (id) terminalRegistry.fit(id)
    })
    return () => cancelAnimationFrame(frame)
  }, [mode, slotKey, visible])

  const slot = (index: number): React.JSX.Element => (
    <Slot index={index} id={slots[index] ?? null} framed={mode !== 'tabs'} visible={visible} dragId={dragId} onDropped={onDropped} />
  )

  const pair = (group: string, orientation: Orientation, first: number): React.JSX.Element => (
    <Group
      key={group}
      id={group}
      orientation={orientation}
      className="h-full w-full"
      defaultLayout={sizes[group]}
      onLayoutChanged={(layout: Layout) => setSizes(group, layout)}
    >
      <Panel id={`s${first}`} minSize={MIN_SLOT_PX}>
        {slot(first)}
      </Panel>
      <Handle orientation={orientation} />
      <Panel id={`s${first + 1}`} minSize={MIN_SLOT_PX}>
        {slot(first + 1)}
      </Panel>
    </Group>
  )

  switch (mode) {
    case 'tabs':
      return slot(0)
    case 'columns':
      return pair('columns', 'horizontal', 0)
    case 'rows':
      return pair('rows', 'vertical', 0)
    case 'grid':
      return (
        <Group key="grid" id="grid" orientation="vertical" className="h-full w-full" defaultLayout={sizes.grid} onLayoutChanged={(layout: Layout) => setSizes('grid', layout)}>
          <Panel id="top" minSize={MIN_SLOT_PX}>
            {pair('grid-top', 'horizontal', 0)}
          </Panel>
          <Handle orientation="vertical" />
          <Panel id="bottom" minSize={MIN_SLOT_PX}>
            {pair('grid-bottom', 'horizontal', 2)}
          </Panel>
        </Group>
      )
  }
}
