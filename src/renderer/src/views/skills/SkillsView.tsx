import { useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CloudOff, FileWarning, MousePointerClick, RefreshCw, Search, SearchX, Sparkles, WandSparkles, X } from 'lucide-react'
import type { HostId, SkillEntry } from '@shared/types'
import { Button, IconButton } from '@renderer/components/Button'
import { Segmented } from '@renderer/components/Controls'
import { ViewHeader } from '@renderer/components/Section'
import { EmptyState, SkeletonRows } from '@renderer/components/States'
import { hostIds, hostLabel } from '@renderer/lib/hosts'
import {
  AI_LABEL,
  DEFAULT_FILTERS,
  facetCounts,
  filterEntries,
  missingSummaryIds,
  SCOPE_LABEL,
  SCOPE_ORDER,
  type AiFilter,
  type HostFilter,
  type KindFilter,
  type ScopeFilter,
  type SkillFilters
} from '@renderer/lib/skills'
import { useSkills, type SkillsTab, type SummaryProgress } from '@renderer/stores/skillsStore'
import { SkillList } from './SkillList'
import { SkillDetail } from './SkillDetail'
import { SkillGraph } from './SkillGraph'

const TAB_OPTIONS: readonly { readonly value: SkillsTab; readonly label: string }[] = [
  { value: 'list', label: 'Liste' },
  { value: 'graph', label: 'Grafik' }
]

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const
const SCAN_ERROR_PREVIEW = 6

export function SkillsView(): React.JSX.Element {
  const entries = useSkills((s) => s.entries)
  const relations = useSkills((s) => s.relations)
  const summaries = useSkills((s) => s.summaries)
  const loaded = useSkills((s) => s.loaded)
  const loading = useSkills((s) => s.loading)
  const progress = useSkills((s) => s.progress)
  const selectedId = useSkills((s) => s.selectedId)
  const tab = useSkills((s) => s.tab)
  const filters = useSkills((s) => s.filters)
  const { load, summarizeMissing, select, setTab, setFilters } = useSkills.getState()

  useEffect(() => {
    void useSkills.getState().load()
  }, [])

  const visible = useMemo(() => filterEntries(entries, filters, summaries), [entries, filters, summaries])
  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries])
  const selected = selectedId ? (byId.get(selectedId) ?? null) : null
  const missing = useMemo(() => missingSummaryIds(entries, summaries).length, [entries, summaries])
  const summarized = entries.filter((e) => summaries[e.hash] !== undefined).length

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title="Skills"
        actions={
          <>
            <Segmented label="Darstellung" value={tab} options={TAB_OPTIONS} onChange={(next: SkillsTab) => setTab(next)} />
            <Button variant="ghost" icon={RefreshCw} loading={loading && loaded} disabled={loading} onClick={() => void load()}>
              Neu laden
            </Button>
            <Button
              variant="soft"
              icon={WandSparkles}
              loading={progress !== null}
              disabled={!missing || progress !== null}
              title={missing ? `${missing} Einträge ohne Zusammenfassung` : 'Alle Einträge haben eine Zusammenfassung'}
              onClick={() => void summarizeMissing()}
            >
              Zusammenfassungen erzeugen
            </Button>
          </>
        }
      >
        {loaded ? `${entries.length} Einträge · ${summarized} mit KI-Zusammenfassung` : 'Skills, Agents und Befehle von Claude und Codex auf allen Rechnern'}
      </ViewHeader>

      <AnimatePresence initial={false}>{progress ? <ProgressStrip key="progress" progress={progress} /> : null}</AnimatePresence>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-y-auto px-8 pb-10 max-lg:px-5">
          <HostNotices />
          {loaded && entries.length > 0 ? <FilterBar entries={entries} filters={filters} summaries={summaries} onChange={setFilters} /> : null}
          {!loaded ? <SkeletonRows rows={8} /> : null}
          {loaded && entries.length === 0 ? (
            <EmptyState icon={Sparkles} title="Keine Skills gefunden">
              Gesucht wird in ~/.claude (skills, agents, commands, Plugins), in ~/.codex und in den Projektordnern der Favoriten, auf allen Rechnern.
            </EmptyState>
          ) : null}
          {loaded && entries.length > 0 && visible.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Nichts in dieser Auswahl"
              compact
              action={
                <Button size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
                  Filter zurücksetzen
                </Button>
              }
            >
              Die Suche umfasst Name, Beschreibung und KI-Zusammenfassung.
            </EmptyState>
          ) : null}
          {visible.length > 0 && tab === 'list' ? (
            <SkillList entries={visible} summaries={summaries} selectedId={selectedId} showHost={filters.host === 'all'} onSelect={select} />
          ) : null}
          {visible.length > 0 && tab === 'graph' ? <SkillGraph entries={visible} relations={relations} selectedId={selectedId} showHost={filters.host === 'all'} onSelect={select} /> : null}
        </div>

        <aside aria-label="Details" className="w-[23rem] shrink-0 overflow-y-auto border-l border-line/70 px-6 pb-10 max-[1180px]:w-[20rem] max-lg:w-[18rem] max-lg:px-5">
          <AnimatePresence mode="wait" initial={false}>
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
                className="pt-1"
              >
                <SkillDetail entry={selected} relations={relations} byId={byId} />
              </motion.div>
            ) : (
              <motion.div key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <EmptyState icon={MousePointerClick} title="Eintrag auswählen" compact>
                  Wähle links einen Skill, Agent oder Befehl, um Beschreibung, Zusammenfassung, Tools und Beziehungen zu sehen.
                </EmptyState>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>
    </div>
  )
}

function ProgressStrip({ progress }: { readonly progress: SummaryProgress }): React.JSX.Element {
  const share = progress.total ? progress.done / progress.total : 0
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.24, ease: EASE_OUT_EXPO }}
      className="shrink-0 overflow-hidden"
    >
      <div role="status" aria-live="polite" className="mx-8 mb-3 flex items-center gap-3">
        <div
          className="h-1 flex-1 overflow-hidden rounded-full bg-raised"
          role="progressbar"
          aria-label="Zusammenfassungen"
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.done}
        >
          <motion.div className="h-full rounded-full bg-accent" initial={false} animate={{ width: `${Math.max(2, share * 100)}%` }} transition={{ duration: 0.4, ease: EASE_OUT_EXPO }} />
        </div>
        <p className="num min-w-0 max-w-[45%] truncate text-xs text-ink-3">
          <span className="font-[600] text-ink-2">
            {progress.done}/{progress.total}
          </span>
          {progress.current ? ` · ${progress.current}` : ''}
        </p>
      </div>
    </motion.div>
  )
}

function HostNotices(): React.JSX.Element | null {
  const hostErrors = useSkills((s) => s.hostErrors)
  const scanErrors = useSkills((s) => s.scanErrors)
  const load = useSkills((s) => s.load)
  const failed = hostIds().filter((h) => hostErrors[h])
  if (!failed.length && !scanErrors.length) return null
  return (
    <div className="mb-4 space-y-2">
      {failed.map((host) => (
        <div key={host} role="alert" className="flex items-start gap-3 rounded-lg border border-warn/25 bg-warn-soft px-4 py-2.5">
          <CloudOff className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden strokeWidth={1.75} />
          <div className="min-w-0 flex-1">
            <p className="text-[0.8125rem] font-[600] text-ink">{hostLabel(host)} nicht erreichbar, gezeigt werden nur die übrigen Einträge</p>
            <p className="mt-0.5 truncate text-xs text-ink-2" title={hostErrors[host] ?? undefined}>
              {hostErrors[host]}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => void load()}>
            Erneut versuchen
          </Button>
        </div>
      ))}
      {scanErrors.length ? (
        <details className="group rounded-lg border border-line px-4 py-2 text-xs text-ink-3">
          <summary className="flex cursor-pointer items-center gap-2 list-none text-ink-2">
            <FileWarning className="size-3.5 text-warn" aria-hidden strokeWidth={1.75} />
            {scanErrors.length === 1 ? '1 Datei' : `${scanErrors.length} Dateien`} nicht lesbar
            <span className="text-ink-3 group-open:hidden">· anzeigen</span>
          </summary>
          <ul className="mt-2 space-y-0.5 font-mono text-2xs">
            {scanErrors.slice(0, SCAN_ERROR_PREVIEW).map((e) => (
              <li key={e} className="truncate" title={e}>
                {e}
              </li>
            ))}
            {scanErrors.length > SCAN_ERROR_PREVIEW ? <li>… und {scanErrors.length - SCAN_ERROR_PREVIEW} weitere</li> : null}
          </ul>
        </details>
      ) : null}
    </div>
  )
}

interface FilterBarProps {
  readonly entries: readonly SkillEntry[]
  readonly filters: SkillFilters
  readonly summaries: Readonly<Record<string, string>>
  onChange(patch: Partial<SkillFilters>): void
}

function FilterBar({ entries, filters, summaries, onChange }: FilterBarProps): React.JSX.Element {
  const counts = (key: 'host' | 'ai' | 'kind' | 'scope'): ReadonlyMap<string, number> => facetCounts(entries, filters, summaries, key, (e) => e[key])
  const host = counts('host')
  const ai = counts('ai')
  const kind = counts('kind')
  const scope = counts('scope')
  const n = (map: ReadonlyMap<string, number>, key: string): number => map.get(key) ?? 0

  return (
    <div className="mb-3 flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[14rem] flex-1 basis-[16rem]">
          <span className="sr-only">Skills durchsuchen</span>
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-3" aria-hidden />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => onChange({ query: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && filters.query) {
                e.stopPropagation()
                onChange({ query: '' })
              }
            }}
            placeholder="Name, Beschreibung oder Zusammenfassung"
            className="field pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden"
          />
          {filters.query ? <IconButton size="sm" icon={X} label="Suche leeren" className="absolute top-0.5 right-0.5 size-7" onClick={() => onChange({ query: '' })} /> : null}
        </label>
        <Segmented<HostFilter>
          label="Rechner"
          value={filters.host}
          onChange={(v) => onChange({ host: v })}
          options={[{ value: 'all', label: 'Alle', count: n(host, 'all') }, ...hostIds().map((h: HostId) => ({ value: h, label: hostLabel(h), count: n(host, h) }))]}
        />
        <Segmented<AiFilter>
          label="KI"
          value={filters.ai}
          onChange={(v) => onChange({ ai: v })}
          options={[
            { value: 'all', label: 'Alle', count: n(ai, 'all') },
            { value: 'claude', label: AI_LABEL.claude, count: n(ai, 'claude') },
            { value: 'codex', label: AI_LABEL.codex, count: n(ai, 'codex') }
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Segmented<KindFilter>
          label="Art"
          value={filters.kind}
          onChange={(v) => onChange({ kind: v })}
          options={[
            { value: 'all', label: 'Alle Arten', count: n(kind, 'all') },
            { value: 'skill', label: 'Skills', count: n(kind, 'skill') },
            { value: 'agent', label: 'Agents', count: n(kind, 'agent') },
            { value: 'command', label: 'Befehle', count: n(kind, 'command') }
          ]}
        />
        <Segmented<ScopeFilter>
          label="Herkunft"
          value={filters.scope}
          onChange={(v) => onChange({ scope: v })}
          options={[{ value: 'all', label: 'Jede Herkunft', count: n(scope, 'all') }, ...SCOPE_ORDER.map((s) => ({ value: s, label: SCOPE_LABEL[s], count: n(scope, s) }))]}
        />
      </div>
    </div>
  )
}
