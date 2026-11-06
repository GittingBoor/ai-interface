import { AlertTriangle } from 'lucide-react'
import type { HostStatus } from '@shared/types'
import { HostDot } from '@renderer/components/Host'
import { hostIds, hostLabel } from '@renderer/lib/hosts'
import { formatInteger, formatRelative } from '@renderer/lib/format'
import { useT } from '@renderer/i18n/useT'

type HostState = 'online' | 'offline' | 'disabled' | 'unknown'

const STATE_STYLE: Readonly<Record<HostState, string>> = {
  online: 'text-ink-2 bg-raised',
  offline: 'text-danger-ink bg-danger-soft',
  disabled: 'text-ink-3 bg-raised',
  unknown: 'text-ink-3 bg-raised'
}

const stateOf = (status: HostStatus | undefined): HostState =>
  !status ? 'unknown' : !status.enabled ? 'disabled' : status.online ? 'online' : 'offline'

export function HostPanel({ hosts, now }: { readonly hosts: readonly HostStatus[]; readonly now: number }): React.JSX.Element {
  const messages = useT()
  const t = messages.usage.overview.host
  return (
    <ul className="divide-y divide-line">
      {hostIds().map((id) => {
        const status = hosts.find((h) => h.id === id)
        const state = stateOf(status)
        const collect = status?.lastCollect
        return (
          <li key={id} className="py-3.5 first:pt-0">
            <div className="flex items-center gap-2.5">
              <HostDot host={id} className="size-2.5" />
              <span className="flex-1 text-[0.8125rem] font-[600] text-ink">{hostLabel(id)}</span>
              <span className={`inline-flex h-5 items-center gap-1.5 rounded-full px-2 text-2xs font-[600] ${STATE_STYLE[state]}`}>
                {messages.frame.quota.hostStates[state]}
              </span>
            </div>
            <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 pl-5 text-xs">
              <dt className="text-ink-3">{t.lastCollect}</dt>
              <dd className="num text-right text-ink-2">{collect ? formatRelative(collect.finishedAt, now) : t.never}</dd>
              {collect ? (
                <>
                  <dt className="text-ink-3">{t.files}</dt>
                  <dd className="num text-right text-ink-2">{formatInteger(collect.files)}</dd>
                  <dt className="text-ink-3">{t.newRecords}</dt>
                  <dd className="num text-right text-ink-2">{formatInteger(collect.newRecords)}</dd>
                  {collect.skippedLines > 0 ? (
                    <>
                      <dt className="text-ink-3">{t.skipped}</dt>
                      <dd className="num text-right text-warn">{t.lines(collect.skippedLines)}</dd>
                    </>
                  ) : null}
                </>
              ) : null}
            </dl>
            {status?.error ? (
              <p className="mt-2.5 ml-5 flex gap-2 rounded-md bg-danger-soft px-2.5 py-2 text-xs leading-snug text-danger-ink">
                <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />
                {status.error}
              </p>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
