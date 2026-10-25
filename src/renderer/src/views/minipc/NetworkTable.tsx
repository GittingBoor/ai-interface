import type { NetAddress, NetRate, SystemStats } from '@shared/types'
import { Section } from '@renderer/components/Section'
import { useMiniPc } from '@renderer/stores/miniPcStore'
import { formatBytes } from '@renderer/lib/format'
import { NO_VALUE, formatPercent, formatRate, linkStateText, shortAddress, sortAddresses } from '@renderer/lib/miniPcFormat'
import { StateLabel, TABLE_CELL, TABLE_HEAD, ValueSkeleton, type StateTone } from './parts'

/** Linux benennt WLAN-Schnittstellen mit „wl…“ (wlan0, wlp2s0). */
const WIFI_PREFIX = 'wl'
const LINK_UP = 'UP'

interface NetRow {
  readonly name: string
  readonly rate: NetRate | undefined
  readonly address: NetAddress | undefined
}

function netRows(net: readonly NetRate[], addresses: readonly NetAddress[]): readonly NetRow[] {
  const names = [...new Set([...net.map((n) => n.name), ...addresses.map((a) => a.name)])]
  return names.map((name) => ({ name, rate: net.find((n) => n.name === name), address: addresses.find((a) => a.name === name) }))
}

function Addresses({ addresses }: { readonly addresses: readonly string[] }): React.JSX.Element {
  if (addresses.length === 0) return <span className="text-xs text-ink-3">keine Adresse</span>
  return (
    <ul className="space-y-0.5">
      {sortAddresses(addresses).map((address) => (
        <li key={address} className="font-mono text-xs whitespace-nowrap text-ink-2" title={address}>
          {shortAddress(address)}
        </li>
      ))}
    </ul>
  )
}

interface FlowCellProps {
  readonly rate: number | null
  /** Volumen seit dem Start; `null`, wenn die Schnittstelle nicht im Snapshot steht. */
  readonly total: number | null
}

/** Aktuelle Rate, darunter das Volumen seit dem Start. */
function FlowCell({ rate, total }: FlowCellProps): React.JSX.Element {
  return (
    <td className={`${TABLE_CELL} num text-right whitespace-nowrap text-ink-2`}>
      {formatRate(rate)}
      {total !== null ? <p className="mt-0.5 text-2xs text-ink-3">gesamt {formatBytes(total)}</p> : null}
    </td>
  )
}

interface NetworkRowProps {
  readonly row: NetRow
  readonly wifiPercent: number | null
  /** Ersatz für Zustand und Adressen, solange die Gerätedaten fehlen. */
  readonly pending: React.ReactNode
}

function NetworkRow({ row, wifiPercent, pending }: NetworkRowProps): React.JSX.Element {
  const state = row.address?.state
  const tone: StateTone = state?.toUpperCase() === LINK_UP ? 'active' : 'idle'
  const isWifi = row.name.startsWith(WIFI_PREFIX)
  return (
    <tr>
      <td className={TABLE_CELL}>
        <p className="font-mono text-xs text-ink">{row.name}</p>
        <p className="mt-0.5 text-2xs whitespace-nowrap text-ink-3">
          {isWifi ? 'WLAN' : 'Kabel'}
          {isWifi && wifiPercent !== null ? <span className="num"> · Signal {formatPercent(wifiPercent)}</span> : null}
        </p>
      </td>
      <td className={TABLE_CELL}>{state ? <StateLabel tone={tone}>{linkStateText(state)}</StateLabel> : pending}</td>
      <td className={TABLE_CELL}>{row.address ? <Addresses addresses={row.address.addresses} /> : pending}</td>
      <FlowCell rate={row.rate?.rxRate ?? null} total={row.rate?.rxBytes ?? null} />
      <FlowCell rate={row.rate?.txRate ?? null} total={row.rate?.txBytes ?? null} />
    </tr>
  )
}

/** Schnittstellen mit Zustand, Adressen, Durchsatz und Gesamtvolumen seit dem Start. */
export function NetworkTable({ system }: { readonly system: SystemStats }): React.JSX.Element {
  const info = useMiniPc((s) => s.info)
  const infoError = useMiniPc((s) => s.infoError)
  const rows = netRows(system.net, info?.addresses ?? [])
  const pending = info || infoError ? NO_VALUE : <ValueSkeleton className="w-20" />
  return (
    <Section id="minipc-network" title="Netzwerk" description="Durchsatz je Schnittstelle, Volumen seit dem Start">
      <div className="space-y-3">
        {rows.length > 0 ? (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[30rem] border-separate border-spacing-0 text-[0.8125rem]">
              <thead>
                <tr className="text-left text-xs text-ink-3">
                  <th className={TABLE_HEAD}>Schnittstelle</th>
                  <th className={TABLE_HEAD}>Zustand</th>
                  <th className={TABLE_HEAD}>Adressen</th>
                  <th className={`${TABLE_HEAD} text-right`}>Download</th>
                  <th className={`${TABLE_HEAD} text-right`}>Upload</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <NetworkRow key={row.name} row={row} wifiPercent={system.wifiPercent} pending={pending} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[0.8125rem] text-ink-3">Keine Netzwerkschnittstelle gemeldet.</p>
        )}
      </div>
    </Section>
  )
}
