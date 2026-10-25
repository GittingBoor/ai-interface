import { Play, RotateCcw, SquareTerminal, type LucideIcon } from 'lucide-react'
import type { LaunchMode } from '@shared/types'
import { IconButton } from '@renderer/components/Button'
import { useTerminals } from '@renderer/stores/terminalStore'
import { useMiniPc } from '@renderer/stores/miniPcStore'

interface LaunchOption {
  readonly mode: LaunchMode
  readonly icon: LucideIcon
  readonly label: (name: string) => string
}

export const LAUNCH_OPTIONS: readonly LaunchOption[] = [
  { mode: 'new', icon: Play, label: (name) => `Claude starten in ${name}` },
  { mode: 'continue', icon: RotateCcw, label: (name) => `Claude fortsetzen in ${name}` },
  { mode: 'shell', icon: SquareTerminal, label: (name) => `Shell in ${name}` }
]

interface LaunchButtonsProps {
  readonly path: string
  readonly name: string
  readonly className?: string
}

/** Terminal auf dem angezeigten Gerät öffnen: Claude neu, fortsetzen oder nur Shell. */
export function LaunchButtons({ path, name, className = '' }: LaunchButtonsProps): React.JSX.Element {
  const opening = useTerminals((s) => s.opening)
  const launch = useTerminals((s) => s.launch)
  const host = useMiniPc((s) => s.device) ?? ''
  return (
    <div role="group" aria-label={`Terminal in ${name}`} className={`flex items-center gap-0.5 ${className}`}>
      {LAUNCH_OPTIONS.map((o) => (
        <IconButton key={o.mode} size="sm" icon={o.icon} label={o.label(name)} disabled={opening} onClick={() => void launch({ host, path, name }, o.mode)} />
      ))}
    </div>
  )
}
