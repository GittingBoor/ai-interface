import type { DiskIoRate, DriveInfo, SystemStats } from '@shared/types'
import { Section } from '@renderer/components/Section'
import { useMiniPc } from '@renderer/stores/miniPcStore'
import { formatBytes } from '@renderer/lib/format'
import { NO_VALUE, formatRate } from '@renderer/lib/miniPcFormat'
import { TABLE_CELL, TABLE_HEAD, ValueSkeleton } from './parts'

interface DriveRow {
  readonly name: string
  readonly drive: DriveInfo | undefined
  readonly io: DiskIoRate | undefined
}

/** Führt die Laufwerke aus den Gerätedaten mit den Raten aus dem Snapshot zusammen. */
function driveRows(drives: readonly DriveInfo[], diskIo: readonly DiskIoRate[]): readonly DriveRow[] {
  const names = [...new Set([...drives.map((d) => d.name), ...diskIo.map((d) => d.name)])]
  return names.map((name) => ({ name, drive: drives.find((d) => d.name === name), io: diskIo.find((d) => d.name === name) }))
}

/** Laufwerke mit Modell, Größe und aktueller Lese- und Schreibrate. */
export function DriveList({ system }: { readonly system: SystemStats }): React.JSX.Element {
  const info = useMiniPc((s) => s.info)
  const infoError = useMiniPc((s) => s.infoError)
  const rows = driveRows(info?.drives ?? [], system.diskIo)
  const pending = info ? null : infoError ? NO_VALUE : <ValueSkeleton />
  return (
    <Section id="minipc-drives" title="Datenträger" description="Modell, Größe und aktueller Durchsatz">
      <div className="space-y-3">
        {rows.length > 0 ? (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[26rem] border-separate border-spacing-0 text-[0.8125rem]">
              <thead>
                <tr className="text-left text-xs text-ink-3">
                  <th className={TABLE_HEAD}>Laufwerk</th>
                  <th className={`${TABLE_HEAD} text-right`}>Größe</th>
                  <th className={`${TABLE_HEAD} text-right`}>Lesen</th>
                  <th className={`${TABLE_HEAD} text-right`}>Schreiben</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.name}>
                    <td className={TABLE_CELL}>
                      <p className="font-mono text-xs text-ink">{row.name}</p>
                      <p className="mt-0.5 text-2xs text-ink-3">{pending ?? (row.drive?.model || 'Modell unbekannt')}</p>
                    </td>
                    <td className={`${TABLE_CELL} num text-right text-ink-2`}>{pending ?? (row.drive ? formatBytes(row.drive.sizeBytes) : NO_VALUE)}</td>
                    <td className={`${TABLE_CELL} num text-right text-ink-2`}>{formatRate(row.io?.readRate ?? null)}</td>
                    <td className={`${TABLE_CELL} num text-right text-ink-2`}>{formatRate(row.io?.writeRate ?? null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : info ? (
          <p className="text-[0.8125rem] text-ink-3">Keine Laufwerke gemeldet.</p>
        ) : infoError ? null : (
          <ValueSkeleton className="w-48" />
        )}
      </div>
    </Section>
  )
}
