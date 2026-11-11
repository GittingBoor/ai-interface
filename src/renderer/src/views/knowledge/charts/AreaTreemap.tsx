import { useMemo, useState } from 'react'
import type { AreaSize } from '@shared/knowledge'
import { ChartTooltip, TooltipRow } from '@renderer/components/charts/ChartTooltip'
import { formatInteger, formatPercentPoints } from '@renderer/lib/format'
import { useElementSize } from '@renderer/lib/hooks'
import { useT } from '@renderer/i18n/useT'
import type { FileOpener } from '../KnowledgeLinks'
import { seriesColor, tintFill } from '../knowledgePalette'
import { folderTree, squarify, type FolderChild, type FolderNode, type PlacedItem, type Rect } from './treemap'

const ASPECT = 0.3
const MIN_HEIGHT = 220
const MAX_HEIGHT = 300
const HEADER = 22
/** Kleiner als das bekommt ein Ordner keine Unterteilung, sondern bleibt eine Fläche. */
const NEST_MIN_WIDTH = 96
const NEST_MIN_HEIGHT = 64
const GAP = 2
const LABEL_MIN_WIDTH = 56
const LABEL_MIN_HEIGHT = 30
const PARENT_FILL = 10
const BORDER_PARENT = 30
const BORDER_LEAF = 45
const CHILD_FILLS: readonly number[] = [30, 22]
const REST_FILL = 14
const PERCENT = 100
const ROOT = '.'

interface Tile {
  readonly key: string
  readonly path: string
  readonly label: string
  readonly lines: number
  readonly files: number
  readonly color: string
  readonly fill: number
  readonly rect: Rect
}

const inset = (r: Rect, by: number): Rect => ({ x: r.x + by, y: r.y + by, width: Math.max(0, r.width - by * 2), height: Math.max(0, r.height - by * 2) })
const leaf = (path: string): string => path.split('/').pop() ?? path

interface TileNames {
  readonly root: string
  readonly rest: string
}

function childTiles(parent: PlacedItem<FolderNode>, color: string, names: TileNames): Tile[] {
  const body = { x: parent.x, y: parent.y + HEADER, width: parent.width, height: parent.height - HEADER }
  const placed = squarify<FolderChild>(parent.data.children.map((c) => ({ value: c.lines, data: c })), body)
  return placed.map((p, i) => ({
    key: `${parent.data.path}/${p.data.path ?? ''}`,
    path: p.data.path ?? parent.data.path,
    label: p.data.path ? leaf(p.data.path) : names.rest,
    lines: p.data.lines,
    files: p.data.files,
    color,
    fill: p.data.path ? (CHILD_FILLS[i % CHILD_FILLS.length] ?? REST_FILL) : REST_FILL,
    rect: inset(p, GAP)
  }))
}

function buildTiles(areas: readonly AreaSize[], width: number, height: number, names: TileNames): { parents: Tile[]; children: Tile[] } {
  const tree = folderTree(areas)
  const placed = squarify(tree.map((f) => ({ value: f.lines, data: f })), { x: 0, y: 0, width, height })
  const order = [...tree].sort((a, b) => b.lines - a.lines).map((f) => f.path)
  const parents: Tile[] = []
  const children: Tile[] = []
  for (const p of placed) {
    const color = seriesColor(order.indexOf(p.data.path))
    const nested = p.data.children.length > 0 && p.width >= NEST_MIN_WIDTH && p.height >= NEST_MIN_HEIGHT
    const label = p.data.path === ROOT ? names.root : p.data.path
    parents.push({ key: p.data.path, path: p.data.path, label, lines: p.data.lines, files: p.data.files, color, fill: nested ? PARENT_FILL : CHILD_FILLS[0] ?? REST_FILL, rect: inset(p, GAP) })
    if (nested) children.push(...childTiles(p, color, names))
  }
  return { parents, children }
}

interface TreemapProps {
  readonly areas: readonly AreaSize[]
  readonly totalLines: number
  readonly opener: FileOpener
}

/** Ordner als Flächen nach Codezeilen; Unterordner liegen in ihrem Ordner. Klick öffnet den Ordner. */
export function AreaTreemap({ areas, totalLines, opener }: TreemapProps): React.JSX.Element {
  const [frame, size] = useElementSize<HTMLDivElement>()
  const t = useT().knowledge
  const height = Math.round(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, size.width * ASPECT)))
  const names = useMemo(() => ({ root: t.view.projectRoot, rest: t.view.restFolder }), [t])
  const tiles = useMemo(() => buildTiles(areas, size.width, height, names), [areas, size.width, height, names])
  const [hover, setHover] = useState<{ readonly tile: Tile; readonly x: number; readonly y: number } | null>(null)
  const describe = tiles.parents.map((p) => `${p.label} ${formatInteger(p.lines)}`).join(', ')

  const track = (tile: Tile) => (event: React.MouseEvent) => {
    const box = event.currentTarget.parentElement?.getBoundingClientRect()
    setHover({ tile, x: event.clientX - (box?.left ?? 0), y: event.clientY - (box?.top ?? 0) })
  }

  return (
    <div ref={frame} role="group" aria-label={t.view.foldersLabel(describe)} className="relative w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
      {tiles.parents.map((tile) => (
        <TileBox key={tile.key} tile={tile} header={tiles.children.some((c) => c.key.startsWith(`${tile.key}/`))} opener={opener} onMove={track(tile)} />
      ))}
      {tiles.children.map((tile) => (
        <TileBox key={tile.key} tile={tile} header={false} opener={opener} onMove={track(tile)} />
      ))}
      {hover ? (
        <ChartTooltip x={hover.x} y={hover.y} containerWidth={size.width}>
          <p className="mb-1 truncate font-mono text-2xs text-ink">{hover.tile.path === ROOT ? t.view.projectRoot : hover.tile.path}</p>
          <TooltipRow label={t.view.lines} value={formatInteger(hover.tile.lines)} swatch={hover.tile.color} />
          <TooltipRow label={t.view.filesLabel} value={formatInteger(hover.tile.files)} />
          {totalLines > 0 ? <TooltipRow label={t.view.share} value={formatPercentPoints((hover.tile.lines / totalLines) * PERCENT)} /> : null}
        </ChartTooltip>
      ) : null}
    </div>
  )
}

interface TileProps {
  readonly tile: Tile
  /** Ordner mit Unterteilung: Beschriftung oben als Kopfzeile. */
  readonly header: boolean
  readonly opener: FileOpener
  onMove(event: React.MouseEvent): void
}

function TileBox({ tile, header, opener, onMove }: TileProps): React.JSX.Element {
  const { rect } = tile
  const labelled = rect.width >= LABEL_MIN_WIDTH && rect.height >= (header ? HEADER - GAP : LABEL_MIN_HEIGHT)
  return (
    <button
      type="button"
      onClick={() => opener.open(tile.path)}
      onMouseMove={onMove}
      title={opener.title(tile.path)}
      aria-label={`${tile.label}: ${formatInteger(tile.lines)}`}
      className={`absolute flex overflow-hidden rounded-[5px] border text-left transition-[filter,border-color] duration-150 hover:brightness-125 ${header ? 'items-start' : 'flex-col justify-end'}`}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        background: tintFill(tile.color, tile.fill),
        borderColor: `color-mix(in oklch, ${tile.color} ${header ? BORDER_PARENT : BORDER_LEAF}%, transparent)`
      }}
    >
      {labelled ? (
        <span className={`flex min-w-0 max-w-full items-baseline gap-1.5 px-2 ${header ? 'pt-1' : 'pb-1.5'}`}>
          <span className="truncate font-mono text-2xs font-[560] text-ink">{tile.label}</span>
          <span className="num shrink-0 text-[0.625rem] text-ink-3">{formatInteger(tile.lines)}</span>
        </span>
      ) : null}
    </button>
  )
}
