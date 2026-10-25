import { useEffect, useState } from 'react'
import { Check, CircleCheck, CircleDashed, CircleX, Copy, ExternalLink, Info, RefreshCw, TriangleAlert } from 'lucide-react'
import type { PrerequisiteStatus } from '@shared/types'
import { api } from '@renderer/api/client'
import { attempt, reportError } from '@renderer/api/call'
import { Button, IconButton } from '@renderer/components/Button'

const COPIED_MS = 1600

/** Zusatzhinweis je Voraussetzung, wenn der Befehl allein nicht reicht. */
const FIX_HINT: Readonly<Partial<Record<PrerequisiteStatus['id'], string>>> = {
  login: 'In einem Terminal ausführen und im Browser anmelden.'
}

function CopyCommand({ command }: { readonly command: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), COPIED_MS)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
    } catch (error) {
      reportError(error)
    }
  }

  return (
    <div className="flex h-8 max-w-full items-center gap-1 rounded-md border border-line bg-canvas py-0.5 pr-0.5 pl-2.5">
      <code className="min-w-0 flex-1 truncate font-mono text-xs text-ink" title={command}>
        {command}
      </code>
      <IconButton size="sm" icon={copied ? Check : Copy} label={copied ? 'Kopiert' : `${command} kopieren`} onClick={() => void copy()} />
      <span role="status" className="sr-only">
        {copied ? 'Kopiert' : ''}
      </span>
    </div>
  )
}

function StatusIcon({ item }: { readonly item: PrerequisiteStatus }): React.JSX.Element {
  if (item.ok) return <CircleCheck className="mt-px size-4 shrink-0 text-status-idle" aria-hidden />
  if (item.required) return <CircleX className="mt-px size-4 shrink-0 text-warn" aria-hidden />
  return <CircleDashed className="mt-px size-4 shrink-0 text-ink-3" aria-hidden />
}

function statusText(item: PrerequisiteStatus): string {
  if (item.ok) return 'vorhanden'
  return item.required ? 'fehlt' : 'fehlt, optional'
}

function PrerequisiteRow({ item }: { readonly item: PrerequisiteStatus }): React.JSX.Element {
  const hint = FIX_HINT[item.id]
  return (
    <li className="flex gap-3 py-3">
      <StatusIcon item={item} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-[0.8125rem] font-[600] text-ink">
          {item.label}
          <span className={`text-2xs font-[560] ${item.ok ? 'sr-only' : item.required ? 'text-warn' : 'text-ink-3'}`}>{statusText(item)}</span>
        </p>
        {item.ok ? (
          <p className="mt-0.5 truncate font-mono text-2xs text-ink-3" title={item.detail}>
            {item.detail}
          </p>
        ) : (
          <p className="mt-0.5 max-w-[60ch] text-xs leading-relaxed text-ink-3">{item.detail}</p>
        )}
        {!item.ok && (item.fixCommand || item.helpUrl) ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            {item.fixCommand ? (
              <div className="w-[22rem] max-w-full">
                <CopyCommand command={item.fixCommand} />
              </div>
            ) : null}
            {item.helpUrl ? (
              <a
                href={item.helpUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-sm text-xs font-[540] text-accent-text underline-offset-[3px] hover:underline"
              >
                Anleitung
                <ExternalLink className="size-3" aria-hidden />
                <span className="sr-only">(öffnet im Browser)</span>
              </a>
            ) : null}
            {hint ? <p className="basis-full text-xs text-ink-3">{hint}</p> : null}
          </div>
        ) : null}
      </div>
    </li>
  )
}

function summary(items: readonly PrerequisiteStatus[]): string {
  const missing = items.filter((i) => !i.ok)
  if (!missing.length) return `Alles da: ${items.map((i) => i.label).join(', ')}.`
  return `${missing.length} von ${items.length} ${missing.length === 1 ? 'fehlt' : 'fehlen'}: ${missing.map((i) => i.label).join(', ')}.`
}

function Notice({ items }: { readonly items: readonly PrerequisiteStatus[] }): React.JSX.Element | null {
  const missing = items.filter((i) => !i.ok)
  if (!missing.length) return null
  if (missing.some((i) => i.required)) {
    return (
      <div className="mt-3 flex gap-3 rounded-lg border border-warn/30 bg-warn-soft px-4 py-3 text-[0.8125rem] leading-relaxed text-ink-2">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
        <p>
          <span className="font-[600] text-ink">Vor dem Start noch erledigen.</span> Ohne diese Punkte startet Claude Code in der App nicht. Du kannst die Einrichtung trotzdem abschließen und es später nachholen.
        </p>
      </div>
    )
  }
  return (
    <p className="mt-3 flex gap-2.5 text-xs leading-relaxed text-ink-3">
      <Info className="mt-px size-4 shrink-0" aria-hidden />
      <span>Das Wichtigste ist da. Was unten fehlt, schaltet nur einzelne Funktionen frei.</span>
    </p>
  )
}

/** Prüft Claude Code, Anmeldung und Git Bash auf diesem PC. Blockiert die Einrichtung nicht. */
export function PrerequisiteCheck(): React.JSX.Element {
  const [items, setItems] = useState<readonly PrerequisiteStatus[] | null>(null)
  const [checking, setChecking] = useState(true)

  const check = async (): Promise<void> => {
    setChecking(true)
    const result = await attempt(api.setup.prerequisites())
    setChecking(false)
    if (result) setItems(result)
  }

  useEffect(() => {
    void check()
  }, [])

  const allOk = items !== null && items.every((i) => i.ok)

  return (
    <section aria-labelledby="setup-prereq-title" className="mt-8">
      <div className="flex items-end justify-between gap-4 border-b border-line pb-2">
        <div className="min-w-0">
          <h2 id="setup-prereq-title" className="text-[0.875rem] font-[620] text-ink">
            Voraussetzungen
          </h2>
          <p role="status" className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-3">
            {allOk ? <CircleCheck className="size-3.5 shrink-0 text-status-idle" aria-hidden /> : null}
            <span className="min-w-0">{items ? summary(items) : checking ? 'Prüfe diesen PC …' : 'Prüfung fehlgeschlagen.'}</span>
          </p>
        </div>
        <Button size="sm" icon={RefreshCw} loading={checking} onClick={() => void check()}>
          Erneut prüfen
        </Button>
      </div>
      {items && !allOk ? (
        <>
          <Notice items={items} />
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <PrerequisiteRow key={item.id} item={item} />
            ))}
          </ul>
        </>
      ) : null}
    </section>
  )
}
