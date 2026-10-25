import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Plus, ServerOff } from 'lucide-react'
import type { OllamaStatus } from '@shared/types'
import { api } from '@renderer/api/client'
import { errorMessage, unwrap } from '@renderer/api/call'
import { Button } from '@renderer/components/Button'
import { HostBadge } from '@renderer/components/Host'
import { Section, ViewHeader } from '@renderer/components/Section'
import { ErrorState, SkeletonRows } from '@renderer/components/States'
import { useUsage } from '@renderer/stores/usageStore'
import { hostIds, hostLabel } from '@renderer/lib/hosts'
import { formatBytes, formatInteger, formatRelative, formatTokens, formatUsd } from '@renderer/lib/format'
import { CustomModels } from './CustomModels'

function ClaudeModels(): React.JSX.Element {
  const models = useUsage((s) => s.overview?.models)
  if (!models) return <SkeletonRows rows={3} />
  const sorted = [...models].sort((a, b) => b.totalTokens - a.totalTokens)
  const total = sorted.reduce((s, m) => s + m.totalTokens, 0) || 1
  if (!sorted.length) return <p className="text-[0.8125rem] text-ink-3">In den letzten 30 Tagen wurde kein Claude-Modell genutzt.</p>
  return (
    <div className="-mx-2 overflow-x-auto">
      <table className="num w-full min-w-[48rem] border-separate border-spacing-0 text-[0.8125rem]">
        <thead>
          <tr className="text-left text-xs text-ink-3">
            <th className="px-2 pb-2 font-[520]">Modell</th>
            <th className="w-[26%] px-2 pb-2 font-[520]">Anteil</th>
            <th className="px-2 pb-2 text-right font-[520]">Token</th>
            <th className="px-2 pb-2 text-right font-[520]">Output</th>
            <th className="px-2 pb-2 text-right font-[520]">Nachrichten</th>
            <th className="px-2 pb-2 text-right font-[520]">Kosten</th>
            <th className="px-2 pb-2 text-right font-[520]">Zuletzt</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((m, i) => {
            const share = m.totalTokens / total
            return (
              <tr key={m.model}>
                <td className="border-t border-line px-2 py-2.5 font-mono text-xs text-ink">{m.model}</td>
                <td className="border-t border-line px-2 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-raised">
                      <motion.div
                        className="h-full origin-left rounded-full bg-ink-3"
                        style={{ width: `${Math.max(1, share * 100)}%` }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.6, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs text-ink-3">{Math.round(share * 100)} %</span>
                  </div>
                </td>
                <td className="border-t border-line px-2 py-2.5 text-right text-ink">{formatTokens(m.totalTokens)}</td>
                <td className="border-t border-line px-2 py-2.5 text-right text-ink-2">{formatTokens(m.outputTokens)}</td>
                <td className="border-t border-line px-2 py-2.5 text-right text-ink-2">{formatInteger(m.messages)}</td>
                <td className="border-t border-line px-2 py-2.5 text-right text-ink-2">
                  {m.costUsd === null ? <span className="text-warn" title="Kein Preis hinterlegt, in den Einstellungen ergänzen">ohne Preis</span> : formatUsd(m.costUsd)}
                </td>
                <td className="border-t border-line px-2 py-2.5 text-right text-ink-3">{formatRelative(m.lastUsed)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** Ollama-Stand eines Rechners (auch im Gerätebereich genutzt). */
export function OllamaHost({ status }: { readonly status: OllamaStatus }): React.JSX.Element {
  const running = status.models.filter((m) => m.running).length
  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <HostBadge host={status.host} />
        <span className="text-xs text-ink-3">
          {status.installed ? `${status.models.length} Modelle${running ? ` · ${running} geladen` : ''}` : 'nicht installiert'}
        </span>
      </div>
      {!status.installed ? (
        <div className="flex items-start gap-3 rounded-lg border border-dashed border-line-strong/70 px-4 py-4">
          <ServerOff className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
          <div className="text-xs leading-relaxed text-ink-3">
            <p className="text-[0.8125rem] font-[560] text-ink-2">Ollama läuft auf {hostLabel(status.host)} nicht.</p>
            <p className="mt-1">Nach der Installation erscheinen die Modelle hier automatisch. Die API wird auf Port 11434 abgefragt.</p>
          </div>
        </div>
      ) : status.models.length === 0 ? (
        <p className="text-xs text-ink-3">Ollama ist installiert, aber es ist noch kein Modell geladen. „ollama pull &lt;modell&gt;“ lädt eines.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {status.models.map((m) => (
            <li key={m.name} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate font-mono text-xs text-ink">
                  {m.name}
                  {m.running ? (
                    <span className="inline-flex h-4.5 items-center gap-1 rounded-full bg-accent-soft px-1.5 font-sans text-2xs font-[600] text-accent-text">
                      <span className="size-1.5 animate-pulse-dot rounded-full bg-accent text-accent" aria-hidden />
                      läuft
                    </span>
                  ) : null}
                </p>
                <p className="num mt-0.5 text-2xs text-ink-3">
                  {m.parameterSize} · {m.quantization} · {m.family}
                </p>
              </div>
              <span className="num text-xs text-ink-2">{formatBytes(m.sizeBytes)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function OllamaSection(): React.JSX.Element {
  const [statuses, setStatuses] = useState<OllamaStatus[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = (): void => {
    setError(null)
    unwrap(api.models.ollama())
      .then(setStatuses)
      .catch((e: unknown) => setError(errorMessage(e)))
  }
  useEffect(load, [])
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!statuses) return <SkeletonRows rows={3} />
  return (
    <div className="grid grid-cols-2 gap-10">
      {hostIds().map((h) => {
        const status = statuses.find((s) => s.host === h) ?? { host: h, installed: false, models: [] }
        return <OllamaHost key={h} status={status} />
      })}
    </div>
  )
}

export function ModelsView(): React.JSX.Element {
  const [creating, setCreating] = useState(false)
  return (
    <div className="flex h-full flex-col">
      <ViewHeader title="Modelle">Claude-Nutzung, lokale Modelle über Ollama und eigene Modelle</ViewHeader>
      <div className="flex-1 space-y-10 overflow-y-auto px-8 pb-10">
        <Section title="Claude · 30 Tage" description="Nach Token sortiert, Kosten als API-Gegenwert">
          <ClaudeModels />
        </Section>
        <Section title="Ollama" description="Lokale Modelle je Rechner">
          <OllamaSection />
        </Section>
        <Section
          title="Eigene Modelle"
          description="Selbst trainierte oder angepasste Modelle"
          actions={
            <Button size="sm" icon={Plus} onClick={() => setCreating(true)} disabled={creating}>
              Modell eintragen
            </Button>
          }
        >
          <CustomModels creating={creating} onCreatingChange={setCreating} />
        </Section>
      </div>
    </div>
  )
}
