import type { SystemStats, TopProcess } from '@shared/types'
import { Section } from '@renderer/components/Section'
import { formatBytes, formatInteger } from '@renderer/lib/format'
import { formatPercentFine } from '@renderer/lib/miniPcFormat'
import { TABLE_CELL, TABLE_HEAD } from './parts'

const TOP_COUNT = 5

function ProcessRow({ process }: { readonly process: TopProcess }): React.JSX.Element {
  return (
    <tr>
      <td className={`${TABLE_CELL} max-w-[18rem]`}>
        <p className="truncate font-mono text-xs text-ink" title={process.command}>
          {process.command}
        </p>
      </td>
      <td className={`${TABLE_CELL} num text-right text-xs text-ink-3`}>{process.pid}</td>
      <td className={`${TABLE_CELL} num text-right whitespace-nowrap text-ink-2`}>{formatPercentFine(process.cpuPercent)}</td>
      <td className={`${TABLE_CELL} num text-right whitespace-nowrap text-ink-2`}>{formatBytes(process.memBytes)}</td>
    </tr>
  )
}

/** Die Prozesse mit dem höchsten CPU-Anteil und die Gesamtzahl. */
export function ProcessTable({ system }: { readonly system: SystemStats }): React.JSX.Element {
  const top = system.processes.slice(0, TOP_COUNT)
  return (
    <Section id="minipc-processes" title="Prozesse" description={`Die ${top.length} mit dem höchsten CPU-Anteil von ${formatInteger(system.processCount)} Prozessen`}>
      {top.length > 0 ? (
        <div className="space-y-2.5">
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[26rem] border-separate border-spacing-0 text-[0.8125rem]">
              <thead>
                <tr className="text-left text-xs text-ink-3">
                  <th className={TABLE_HEAD}>Prozess</th>
                  <th className={`${TABLE_HEAD} text-right`}>PID</th>
                  <th className={`${TABLE_HEAD} text-right`}>CPU Ø seit Start</th>
                  <th className={`${TABLE_HEAD} text-right`}>RAM</th>
                </tr>
              </thead>
              <tbody>
                {top.map((p) => (
                  <ProcessRow key={p.pid} process={p} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="max-w-[70ch] text-2xs leading-relaxed text-ink-3">
            CPU ist der Schnitt über die gesamte Laufzeit des Prozesses (wie bei ps), nicht die Last in diesem Moment. 100 % entsprechen einem voll ausgelasteten Kern.
          </p>
        </div>
      ) : (
        <p className="text-[0.8125rem] text-ink-3">Keine Prozesse gelesen.</p>
      )}
    </Section>
  )
}
