import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronRight } from 'lucide-react'
import type { TerminalInfo } from '@shared/types'
import { api } from '@renderer/api/client'
import { attempt, unwrap } from '@renderer/api/call'
import { terminalRegistry } from '@renderer/lib/terminalRegistry'
import { useKnowledge } from '@renderer/stores/knowledgeStore'
import { TerminalPane } from '@renderer/views/terminal/TerminalPane'
import { useT } from '@renderer/i18n/useT'

const EXPAND_EASE = [0.16, 1, 0.3, 1] as const

/** Hintergrund-Terminals der laufenden Läufe; neu geladen, wenn sich die Läufe ändern. */
function useRuns(): readonly TerminalInfo[] {
  const runKey = useKnowledge((s) => s.progress.runs.map((r) => r.terminalId).join('|'))
  const [runs, setRuns] = useState<readonly TerminalInfo[]>([])
  useEffect(() => {
    let alive = true
    if (!runKey) {
      setRuns([])
      return
    }
    void attempt(api.knowledge.runs()).then((list) => alive && setRuns(list ?? []))
    return () => {
      alive = false
    }
  }, [runKey])
  return runs
}

/** Ein Lauf als xterm nur zum Mitlesen; Snapshot zuerst, danach live. */
function RunTerminal({ info }: { readonly info: TerminalInfo }): React.JSX.Element {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let alive = true
    setReady(false)
    void unwrap(api.terminal.snapshot(info.id))
      .catch(() => '')
      .then((snapshot) => {
        if (!alive) return
        terminalRegistry.ensureReadOnly(info, snapshot)
        setReady(true)
      })
    return () => {
      alive = false
      terminalRegistry.dispose(info.id)
    }
    // Nur bei einem anderen Terminal neu aufbauen; neu geladene Läufe liefern sonst neue Objekte.
  }, [info.id])
  const t = useT().knowledge
  return (
    <div className="h-72 overflow-hidden rounded-md border border-line bg-canvas p-2" aria-label={t.runOutput(info.title)}>
      {ready ? <TerminalPane id={info.id} active={false} visible /> : null}
    </div>
  )
}

interface TabsProps {
  readonly runs: readonly TerminalInfo[]
  readonly activeId: string
  onSelect(id: string): void
}

function RunTabs({ runs, activeId, onSelect }: TabsProps): React.JSX.Element {
  const t = useT().knowledge
  return (
    <div role="tablist" aria-label={t.runs} className="mb-2 flex flex-wrap gap-1">
      {runs.map((r) => (
        <button
          key={r.id}
          type="button"
          role="tab"
          aria-selected={r.id === activeId}
          onClick={() => onSelect(r.id)}
          className={`h-6 rounded-md px-2 text-xs transition-colors duration-150 ${r.id === activeId ? 'bg-raised-2 text-ink' : 'text-ink-3 hover:bg-raised hover:text-ink-2'}`}
        >
          {r.title.startsWith(t.runPrefix) ? r.title.slice(t.runPrefix.length).trimStart() : r.title}
        </button>
      ))}
    </div>
  )
}

function RunsBody({ runs }: { readonly runs: readonly TerminalInfo[] }): React.JSX.Element {
  const [selected, setSelected] = useState<string | null>(null)
  const active = runs.find((r) => r.id === selected) ?? runs[0]
  const t = useT().knowledge
  if (!active) return <p className="py-2 text-xs text-ink-3">{t.runsEmpty}</p>
  return (
    <>
      <RunTabs runs={runs} activeId={active.id} onSelect={setSelected} />
      <RunTerminal key={active.id} info={active} />
    </>
  )
}

/** Unauffälliger, eingeklappter Bereich mit den Agenten-Terminals zum Mitlesen. */
export function KnowledgeRuns(): React.JSX.Element {
  const runs = useRuns()
  const [open, setOpen] = useState(false)
  const t = useT().knowledge
  return (
    <section aria-label={t.runs} className="shrink-0 border-t border-line/70 px-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="knowledge-runs"
        className="group flex h-9 w-full items-center gap-2 text-left text-xs text-ink-3 transition-colors duration-150 hover:text-ink-2"
      >
        <ChevronRight aria-hidden className={`size-3.5 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
        <span className="font-[600] text-ink-2 group-hover:text-ink">
          {t.runs} <span className="num">({runs.length})</span>
        </span>
        <span className="truncate">{t.runsReadOnly}</span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id="knowledge-runs"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: EXPAND_EASE }}
            className="overflow-hidden"
          >
            <div className="pb-3">
              <RunsBody runs={runs} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  )
}
