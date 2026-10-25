const TICK_COUNT = 4
/** Gegen Rundungsreste wie 0,30000000000000004 bei kleinen Schritten. */
const PRECISION = 12

/** Runde Achsenwerte (0, 10 Mio., 20 Mio. …); `minStep = 1` für Zählwerte, sonst doppelte Beschriftungen. */
export function niceTicks(max: number, count: number = TICK_COUNT, minStep: number = 0): number[] {
  if (max <= 0) return [0]
  const rough = max / count
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = Math.max(minStep, [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? rough)
  const ticks: number[] = []
  for (let v = 0; v < max + step * 0.999; v += step) ticks.push(Number(v.toPrecision(PRECISION)))
  return ticks
}

/** Balken mit abgerundetem Datenende oben und eckiger Basis. */
export function roundedTopPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, width / 2, height))
  if (height <= 0) return ''
  return [
    `M${x},${y + height}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${x + width - r}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `V${y + height}`,
    'Z'
  ].join(' ')
}

const FULL_TURN = Math.PI * 2

function polar(cx: number, cy: number, r: number, angle: number): string {
  return `${cx + r * Math.sin(angle)},${cy - r * Math.cos(angle)}`
}

/** Ringsegment von `start` bis `end` (Bogenmaß, 0 = oben, im Uhrzeigersinn). */
export function ringSegmentPath(cx: number, cy: number, outer: number, inner: number, start: number, end: number): string {
  const sweep = Math.min(end - start, FULL_TURN - 1e-4)
  if (sweep <= 0) return ''
  const stop = start + sweep
  const large = sweep > Math.PI ? 1 : 0
  return [
    `M${polar(cx, cy, outer, start)}`,
    `A${outer},${outer} 0 ${large} 1 ${polar(cx, cy, outer, stop)}`,
    `L${polar(cx, cy, inner, stop)}`,
    `A${inner},${inner} 0 ${large} 0 ${polar(cx, cy, inner, start)}`,
    'Z'
  ].join(' ')
}
