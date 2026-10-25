import type { HostId } from '@shared/types'
import { hostColor, hostLabel, hostTint } from '@renderer/lib/hosts'

export function HostDot({ host, className = '' }: { readonly host: HostId; readonly className?: string }): React.JSX.Element {
  return <span aria-hidden className={`inline-block size-2 shrink-0 rounded-full ${className}`} style={{ background: hostColor(host) }} />
}

/** Host-Kennzeichnung: Farbpunkt plus Name, nie nur Farbe. */
export function HostBadge({ host, subtle = false }: { readonly host: HostId; readonly subtle?: boolean }): React.JSX.Element {
  return (
    <span className={`inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full text-2xs font-[560] ${subtle ? 'text-ink-3' : 'px-2'}`} style={subtle ? undefined : hostTint(host)}>
      <HostDot host={host} className="size-1.5" />
      {hostLabel(host)}
    </span>
  )
}
