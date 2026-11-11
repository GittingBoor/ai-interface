import type { KnowledgeFlow } from '@shared/knowledge'

/** Schmaler als das wird keine Spalte; reicht der Platz nicht, verkleinert sich das ganze Diagramm. */
const MIN_COLUMN = 116
const HEAD_MAX_WIDTH = 184
const HEAD_INSET = 16
export const HEAD_HEIGHT = 32
const FIRST_ROW = HEAD_HEIGHT + 18
export const ROW_HEIGHT = 40
const ARROW_OFFSET = 25
const LABEL_RISE = 8
const BOTTOM_ROOM = 14
/** Mittlere Zeichenbreite bei 11,5 px Schrift, für das Kürzen ohne Messung. */
const CHAR_WIDTH = 6.1
const LABEL_SLACK = 28
export const SELF_LOOP = 26
const SELF_LABEL_GAP = 8
const EDGE_MARGIN = 4
/** Links bleibt Platz für die Schrittnummern. */
const NUMBER_ROOM = 26

export interface SequenceHead {
  readonly name: string
  readonly x: number
  readonly width: number
}

export interface SequenceRow {
  readonly index: number
  readonly from: number
  readonly to: number
  readonly label: string
  readonly fullLabel: string
  readonly top: number
  readonly arrowY: number
  readonly labelX: number
  readonly labelY: number
  readonly anchor: 'start' | 'middle' | 'end'
  /** Selbstaufruf: Schleife nach rechts (1) oder, an der letzten Spalte, nach links (-1). */
  readonly loop: 0 | 1 | -1
}

export interface SequenceLayout {
  readonly heads: readonly SequenceHead[]
  readonly rows: readonly SequenceRow[]
  readonly width: number
  readonly height: number
  readonly lifelineTop: number
  readonly lifelineBottom: number
}

/** Beteiligte in der Reihenfolge ihres ersten Auftretens. */
export function participantsOf(flow: KnowledgeFlow): string[] {
  const seen: string[] = []
  for (const s of flow.steps) for (const name of [s.from, s.to]) if (!seen.includes(name)) seen.push(name)
  return seen
}

const clip = (text: string, chars: number): string => (text.length > chars ? `${text.slice(0, Math.max(1, chars - 1))}…` : text)

function placeRow(flow: KnowledgeFlow, index: number, centers: readonly number[], names: readonly string[], column: number, width: number): SequenceRow {
  const step = flow.steps[index] ?? { from: '', to: '', label: '' }
  const from = names.indexOf(step.from)
  const to = names.indexOf(step.to)
  const top = FIRST_ROW + index * ROW_HEIGHT
  const arrowY = top + ARROW_OFFSET
  const x1 = centers[from] ?? 0
  const x2 = centers[to] ?? 0
  if (from === to) {
    const loop = from === names.length - 1 && names.length > 1 ? -1 : 1
    const chars = Math.floor((column - SELF_LOOP - SELF_LABEL_GAP * 2) / CHAR_WIDTH)
    const labelX = x1 + loop * (SELF_LOOP + SELF_LABEL_GAP)
    return { index, from, to, label: clip(step.label, chars), fullLabel: step.label, top, arrowY, labelX, labelY: arrowY - LABEL_RISE + 2, anchor: loop === 1 ? 'start' : 'end', loop }
  }
  const chars = Math.floor((Math.abs(x2 - x1) + column - LABEL_SLACK) / CHAR_WIDTH)
  const label = clip(step.label, chars)
  const half = (label.length * CHAR_WIDTH) / 2
  const labelX = Math.min(width - half - EDGE_MARGIN, Math.max(half + NUMBER_ROOM, (x1 + x2) / 2))
  return { index, from, to, label, fullLabel: step.label, top, arrowY, labelX, labelY: arrowY - LABEL_RISE, anchor: 'middle', loop: 0 }
}

/** Sequenzdiagramm, das sich auf `available` Pixel verteilt; Beschriftungen werden gekürzt statt abgeschnitten. */
export function layoutSequence(flow: KnowledgeFlow, available: number): SequenceLayout {
  const names = participantsOf(flow)
  const column = Math.max(MIN_COLUMN, available / Math.max(1, names.length))
  const width = column * names.length
  const centers = names.map((_, i) => column * (i + 0.5))
  const headWidth = Math.min(HEAD_MAX_WIDTH, column - HEAD_INSET)
  const heads = names.map((name, i) => ({ name, x: (centers[i] ?? 0) - headWidth / 2, width: headWidth }))
  const rows = flow.steps.map((_, i) => placeRow(flow, i, centers, names, column, width))
  const lifelineBottom = FIRST_ROW + rows.length * ROW_HEIGHT
  return { heads, rows, width, height: lifelineBottom + BOTTOM_ROOM, lifelineTop: HEAD_HEIGHT, lifelineBottom }
}

export const headChars = (width: number): number => Math.floor((width - HEAD_INSET) / CHAR_WIDTH)
export const clipLabel = clip
