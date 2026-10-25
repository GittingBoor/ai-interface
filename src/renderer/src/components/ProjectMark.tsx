import { DynamicIcon } from 'lucide-react/dynamic'
import { parseIcon } from '@shared/projectIcon'
import { isIconName } from '@renderer/lib/lucideIcons'

export type ProjectMarkSize = 'sm' | 'md' | 'lg'

interface ProjectMarkProps {
  readonly color: string
  readonly icon: string | null
  readonly size?: ProjectMarkSize
  readonly className?: string
}

interface SizeSpec {
  /** Feste Box, damit Listen mit und ohne Symbol bündig bleiben. */
  readonly box: string
  readonly iconPx: number
  readonly emoji: string
  readonly square: string
}

const SIZES: Readonly<Record<ProjectMarkSize, SizeSpec>> = {
  sm: { box: 'size-4', iconPx: 13, emoji: 'text-[0.8125rem]', square: 'size-2.5 rounded-[3px]' },
  md: { box: 'size-5', iconPx: 15, emoji: 'text-[0.9375rem]', square: 'size-3 rounded-[4px]' },
  lg: { box: 'size-8 rounded-lg', iconPx: 17, emoji: 'text-[1.0625rem]', square: 'size-3.5 rounded-[4px]' }
}

const TILE_TINT_PERCENT = 15
const LUCIDE_STROKE = 2

function Square({ color, className }: { readonly color: string; readonly className: string }): React.JSX.Element {
  return <span className={`block shrink-0 ${className}`} style={{ background: color }} />
}

function MarkContent({ color, icon, spec }: { readonly color: string; readonly icon: string | null; readonly spec: SizeSpec }): React.JSX.Element {
  const parsed = parseIcon(icon)
  if (parsed?.kind === 'emoji') return <span className={`leading-none ${spec.emoji}`}>{parsed.value}</span>
  if (parsed?.kind === 'lucide' && isIconName(parsed.name)) {
    return <DynamicIcon name={parsed.name} size={spec.iconPx} color={color} strokeWidth={LUCIDE_STROKE} fallback={() => null} />
  }
  return <Square color={color} className={spec.square} />
}

/** Kennzeichen eines Projekts oder einer Art: Lucide-Icon oder Emoji, sonst Farbquadrat. */
export function ProjectMark({ color, icon, size = 'md', className = '' }: ProjectMarkProps): React.JSX.Element {
  const spec = SIZES[size]
  const tile = size === 'lg' ? { background: `color-mix(in oklch, ${color} ${TILE_TINT_PERCENT}%, transparent)` } : undefined
  return (
    <span aria-hidden className={`inline-grid shrink-0 place-items-center ${spec.box} ${className}`} style={tile}>
      <MarkContent color={color} icon={icon} spec={spec} />
    </span>
  )
}
