import type { ReactNode } from 'react'

/*
 * Leerzustand-Illustrationen im Markenstil: Graphit-Flächen, 1,5-px-Linien und als einziges
 * Farbsignal der Glut-Cursor aus der Bildmarke. Alle Farben kommen aus den Theme-Tokens.
 */

const VIEW_HEIGHT = 80
const HEIGHT_REM = 5
const STROKE = 1.5

interface IllustrationSvgProps {
  /** Linker Rand und Breite des Motivs, damit es bündig mit dem Text des Leerzustands steht. */
  readonly minX: number
  readonly width: number
  readonly children: ReactNode
}

function IllustrationSvg({ minX, width, children }: IllustrationSvgProps): React.JSX.Element {
  return (
    <svg
      viewBox={`${minX} 0 ${width} ${VIEW_HEIGHT}`}
      style={{ height: `${HEIGHT_REM}rem`, width: `${(width / VIEW_HEIGHT) * HEIGHT_REM}rem` }}
      fill="none"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}

/** Glut-Cursor, das wiederkehrende Motiv aus der Bildmarke. */
function Caret({ x, y, height }: { readonly x: number; readonly y: number; readonly height: number }): React.JSX.Element {
  return <rect x={x} y={y} width="3" height={height} rx="1" className="fill-accent" />
}

/** Leere Galerie: zwei Bildrahmen, im vorderen Berge und eine Glut-Sonne. */
export function EmptyGalleryIllustration(): React.JSX.Element {
  return (
    <IllustrationSvg minX={26} width={70}>
      <rect x="30" y="12" width="56" height="44" rx="5" transform="rotate(-8 58 34)" className="fill-raised stroke-line" />
      <rect x="38" y="20" width="56" height="44" rx="5" className="fill-raised-2 stroke-line-strong" />
      <path d="M44 56 L58 40 L66 48 L72 42 L88 56" className="stroke-ink-3" />
      <circle cx="80" cy="31" r="4" className="fill-accent" />
    </IllustrationSvg>
  )
}

/** Keine offenen TODOs: abgehakte Liste, in der letzten Zeile wartet der Cursor. */
export function EmptyTodosIllustration(): React.JSX.Element {
  const rows = [18, 34] as const
  return (
    <IllustrationSvg minX={21} width={78}>
      <rect x="22" y="6" width="76" height="68" rx="6" className="fill-raised stroke-line-strong" />
      {rows.map((y) => (
        <g key={y}>
          <rect x="32" y={y} width="10" height="10" rx="2.5" className="fill-raised-2 stroke-line-strong" />
          <path d={`M34.5 ${y + 5} l2 2 l3.5 -4`} className="stroke-ink-2" />
          <path d={`M49 ${y + 5} h${y === 18 ? 36 : 28}`} className="stroke-line-strong" />
        </g>
      ))}
      <rect x="32" y="50" width="10" height="10" rx="2.5" className="stroke-line-strong" strokeDasharray="2 2.5" />
      <Caret x={49} y={49} height={12} />
    </IllustrationSvg>
  )
}

/** Keine Protokolle: aufgeschlagenes Blatt mit Datumszeile, der Cursor steht am Zeilenende. */
export function EmptyProtocolsIllustration(): React.JSX.Element {
  return (
    <IllustrationSvg minX={27} width={64}>
      <path d="M32 10 h44 l14 14 v46 a4 4 0 0 1 -4 4 h-54 a4 4 0 0 1 -4 -4 v-56 a4 4 0 0 1 4 -4 z" className="fill-raised stroke-line-strong" />
      <path d="M76 10 v10 a4 4 0 0 0 4 4 h10" className="stroke-line-strong" />
      <rect x="38" y="20" width="22" height="6" rx="2" className="fill-line-strong" />
      <path d="M38 36 h40 M38 45 h34 M38 54 h24" className="stroke-line-strong" />
      <Caret x={66} y={48} height={12} />
    </IllustrationSvg>
  )
}

/** Mini-PC nicht erreichbar: Gerät mit dunkler Statusleuchte, die Leitung ist unterbrochen. */
export function MiniPcOfflineIllustration(): React.JSX.Element {
  return (
    <IllustrationSvg minX={13} width={100}>
      <rect x="14" y="22" width="44" height="40" rx="7" className="fill-raised stroke-line-strong" />
      <path d="M24 32 h16 M24 38 h16 M24 44 h16" className="stroke-line" />
      <circle cx="48" cy="52" r="3" className="stroke-ink-3" />
      <path d="M58 42 h12" className="stroke-line-strong" />
      <path d="M74 36 l4 12 M80 36 l4 12" className="stroke-danger" />
      <path d="M88 42 h8" className="stroke-line-strong" />
      <rect x="96" y="35" width="12" height="14" rx="3" className="fill-raised-2 stroke-line-strong" />
      <path d="M108 39 h4 M108 45 h4" className="stroke-line-strong" />
    </IllustrationSvg>
  )
}
