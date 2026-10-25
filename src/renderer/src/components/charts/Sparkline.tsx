import { useId } from 'react'

interface SparklineProps {
  readonly values: readonly number[]
  /** Linienfarbe als CSS-Wert. */
  readonly color?: string
  readonly className?: string
}

const VIEW_WIDTH = 100
const VIEW_HEIGHT = 28
const INSET = 2
const FILL_OPACITY = 0.18

/** Mini-Verlauf ohne Achsen; dehnt sich auf die Breite des Elterns. */
export function Sparkline({ values, color = 'var(--color-accent)', className = '' }: SparklineProps): React.JSX.Element | null {
  const gradient = `spark-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`
  if (values.length === 0) return null
  const max = Math.max(...values)
  const step = values.length > 1 ? VIEW_WIDTH / (values.length - 1) : 0
  const y = (v: number): number => VIEW_HEIGHT - INSET - (max > 0 ? (v / max) * (VIEW_HEIGHT - INSET * 2) : 0)
  const points = (values.length > 1 ? values : [values[0] ?? 0, values[0] ?? 0]).map((v, i) => `${(i * (step || VIEW_WIDTH)).toFixed(2)},${y(v).toFixed(2)}`)
  const line = `M${points.join('L')}`
  return (
    <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} preserveAspectRatio="none" aria-hidden className={`block h-7 w-full overflow-visible ${className}`}>
      <defs>
        <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity={FILL_OPACITY} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${line}L${VIEW_WIDTH},${VIEW_HEIGHT}L0,${VIEW_HEIGHT}Z`} fill={`url(#${gradient})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
