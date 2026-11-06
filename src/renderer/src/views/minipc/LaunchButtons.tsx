import { Play, RotateCcw, SquareTerminal, type LucideIcon } from 'lucide-react'
import type { LaunchMode } from '@shared/types'
import type { Messages } from '@shared/i18n/messages'
import { IconButton } from '@renderer/components/Button'
import { useT } from '@renderer/i18n/useT'
import { useTerminals } from '@renderer/stores/terminalStore'
import { useMiniPc } from '@renderer/stores/miniPcStore'

interface LaunchOption {
  readonly mode: LaunchMode
  readonly icon: LucideIcon
  readonly label: (t: Messages['device'], name: string) => string
}

export const LAUNCH_OPTIONS: readonly LaunchOption[] = [
  { mode: 'new', icon: Play, label: (t, name) => t.launchNew(name) },
  { mode: 'continue', icon: RotateCcw, label: (t, name) => t.launchContinue(name) },
  { mode: 'shell', icon: SquareTerminal, label: (t, name) => t.launchShell(name) }
]

interface LaunchButtonsProps {
  readonly path: string
  readonly name: string
  readonly className?: string
}

/** Terminal auf dem angezeigten Gerät öffnen: Claude neu, fortsetzen oder nur Shell. */
export function LaunchButtons({ path, name, className = '' }: LaunchButtonsProps): React.JSX.Element {
  const t = useT().device
  const opening = useTerminals((s) => s.opening)
  const launch = useTerminals((s) => s.launch)
  const host = useMiniPc((s) => s.device) ?? ''
  return (
    <div role="group" aria-label={t.launchGroup(name)} className={`flex items-center gap-0.5 ${className}`}>
      {LAUNCH_OPTIONS.map((o) => (
        <IconButton key={o.mode} size="sm" icon={o.icon} label={o.label(t, name)} disabled={opening} onClick={() => void launch({ host, path, name }, o.mode)} />
      ))}
    </div>
  )
}
