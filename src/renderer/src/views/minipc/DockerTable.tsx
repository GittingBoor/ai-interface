import type { DockerContainer } from '@shared/types'
import { Section } from '@renderer/components/Section'
import { SkeletonRows } from '@renderer/components/States'
import { useMiniPc } from '@renderer/stores/miniPcStore'
import { formatBytes, formatTime } from '@renderer/lib/format'
import { NO_VALUE, dockerStateText, dockerStatusText, formatPercentFine } from '@renderer/lib/miniPcFormat'
import { StateLabel, TABLE_CELL, TABLE_HEAD, type StateTone } from './parts'

const SKELETON_ROWS = 3
const RUNNING = 'running'
const UNHEALTHY = '(unhealthy)'
const STATE_TONE: Readonly<Record<string, StateTone>> = {
  running: 'active',
  restarting: 'warn',
  dead: 'critical'
}

function containerTone(container: DockerContainer): StateTone {
  if (container.status.includes(UNHEALTHY)) return 'warn'
  return STATE_TONE[container.state] ?? 'idle'
}

function ContainerRow({ container }: { readonly container: DockerContainer }): React.JSX.Element {
  return (
    <tr>
      <td className={`${TABLE_CELL} max-w-[16rem]`}>
        <p className="truncate font-[560] text-ink" title={container.name}>
          {container.name}
        </p>
        <p className="mt-0.5 truncate font-mono text-2xs text-ink-3" title={container.image}>
          {container.image}
        </p>
      </td>
      <td className={TABLE_CELL}>
        <StateLabel tone={containerTone(container)}>{dockerStateText(container.state)}</StateLabel>
        <p className="num mt-0.5 text-2xs whitespace-nowrap text-ink-3" title={container.status}>
          {dockerStatusText(container.status)}
        </p>
      </td>
      <td className={`${TABLE_CELL} num text-right whitespace-nowrap text-ink-2`}>{container.cpuPercent === null ? NO_VALUE : formatPercentFine(container.cpuPercent)}</td>
      <td className={`${TABLE_CELL} num text-right whitespace-nowrap text-ink-2`}>
        {container.memBytes === null ? NO_VALUE : formatBytes(container.memBytes)}
        {container.memLimitBytes !== null ? <p className="mt-0.5 text-2xs text-ink-3">von {formatBytes(container.memLimitBytes)}</p> : null}
      </td>
    </tr>
  )
}

function ContainerTable({ containers }: { readonly containers: readonly DockerContainer[] }): React.JSX.Element {
  return (
    <div className="-mx-2 overflow-x-auto">
      <table className="w-full min-w-[32rem] border-separate border-spacing-0 text-[0.8125rem]">
        <thead>
          <tr className="text-left text-xs text-ink-3">
            <th className={TABLE_HEAD}>Container</th>
            <th className={TABLE_HEAD}>Status</th>
            <th className={`${TABLE_HEAD} text-right`}>CPU</th>
            <th className={`${TABLE_HEAD} text-right`}>RAM belegt</th>
          </tr>
        </thead>
        <tbody>
          {containers.map((c) => (
            <ContainerRow key={c.name} container={c} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function describe(containers: readonly DockerContainer[] | null | undefined, fetchedAt: number | undefined): string {
  const stamp = fetchedAt ? `Stand ${formatTime(fetchedAt)} Uhr, alle 5 Minuten` : 'Wird alle 5 Minuten abgefragt'
  if (!containers || containers.length === 0) return stamp
  const running = containers.filter((c) => c.state === RUNNING).length
  return `${running} von ${containers.length} laufen · ${stamp}`
}

/** Docker-Container mit Status, CPU und Arbeitsspeicher. */
export function DockerTable(): React.JSX.Element {
  const info = useMiniPc((s) => s.info)
  const infoError = useMiniPc((s) => s.infoError)
  return (
    <Section id="minipc-docker" title="Docker" description={describe(info?.docker, info?.fetchedAt)}>
      {!info ? (
        infoError ? (
          <p className="text-[0.8125rem] text-ink-3">Gerätedaten fehlen.</p>
        ) : (
          <SkeletonRows rows={SKELETON_ROWS} />
        )
      ) : info.docker === null ? (
        <p className="text-[0.8125rem] text-ink-3">Docker nicht verfügbar: nicht installiert oder für diesen Nutzer nicht lesbar.</p>
      ) : info.docker.length === 0 ? (
        <p className="text-[0.8125rem] text-ink-3">Es gibt keine Container.</p>
      ) : (
        <ContainerTable containers={info.docker} />
      )}
    </Section>
  )
}
