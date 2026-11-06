import { useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Bot, MousePointerClick, Plus, RefreshCw, Search, SearchX, X } from 'lucide-react'
import { Button, IconButton } from '@renderer/components/Button'
import { Segmented } from '@renderer/components/Controls'
import { ViewHeader } from '@renderer/components/Section'
import { EmptyState, SkeletonRows } from '@renderer/components/States'
import { matchesAgent } from '@renderer/lib/agents'
import { useAgents, type AgentsMode } from '@renderer/stores/agentsStore'
import { useT } from '@renderer/i18n/useT'
import { useAutomations } from '@renderer/stores/automationsStore'
import { useSkills } from '@renderer/stores/skillsStore'
import { AgentList } from './AgentList'
import { AgentDetail } from './AgentDetail'
import { AgentBuilder } from './AgentBuilder'
import { AgentGuide } from './AgentGuide'

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const

export function AgentsView(): React.JSX.Element {
  const mode = useAgents((s) => s.mode)
  useEffect(() => {
    const skills = useSkills.getState()
    if (!skills.loaded) void skills.load()
    if (!useAutomations.getState().loaded) void useAutomations.getState().load()
  }, [])

  if (mode === 'builder') return <AgentBuilder />
  return (
    <div className="flex h-full flex-col">
      <Header mode={mode} />
      {mode === 'guide' ? <AgentGuide /> : <Browse />}
    </div>
  )
}

function Header({ mode }: { readonly mode: Exclude<AgentsMode, 'builder'> }): React.JSX.Element {
  const t = useT().agents
  const entries = useSkills((s) => s.entries)
  const loaded = useSkills((s) => s.loaded)
  const loading = useSkills((s) => s.loading)
  const agents = entries.filter((e) => e.kind === 'agent')
  const hosts = new Set(agents.map((a) => a.host)).size
  return (
    <ViewHeader
      title={t.title}
      actions={
        <>
          <Segmented
            label={t.viewLabel}
            value={mode}
            options={[
              { value: 'browse', label: t.modeBrowse },
              { value: 'guide', label: t.modeGuide }
            ]}
            onChange={(m) => useAgents.getState().setMode(m)} />
          <Button variant="ghost" icon={RefreshCw} loading={loading && loaded} disabled={loading} onClick={() => void useSkills.getState().load()}>
            {t.reload}
          </Button>
          <Button variant="primary" icon={Plus} onClick={() => void useAgents.getState().openBuilder(null)}>
            {t.build}
          </Button>
        </>
      }
    >
      {loaded ? t.subtitle(agents.length, hosts) : t.subtitleIdle}
    </ViewHeader>
  )
}

function Browse(): React.JSX.Element {
  const t = useT().agents
  const entries = useSkills((s) => s.entries)
  const summaries = useSkills((s) => s.summaries)
  const loaded = useSkills((s) => s.loaded)
  const query = useAgents((s) => s.query)
  const selectedId = useAgents((s) => s.selectedId)
  const agents = useMemo(() => entries.filter((e) => e.kind === 'agent'), [entries])
  const visible = useMemo(() => agents.filter((a) => matchesAgent(a, query, summaries[a.hash])), [agents, query, summaries])
  const selected = selectedId ? (agents.find((a) => a.id === selectedId) ?? null) : null
  const showHost = new Set(agents.map((a) => a.host)).size > 1

  // Erster Besuch: den ersten Agent zeigen statt eines leeren Detailbereichs.
  useEffect(() => {
    if (!selectedId && visible[0]) useAgents.getState().select(visible[0].id)
  }, [selectedId, visible])

  return (
    <div className="flex min-h-0 flex-1">
      <div className="min-w-0 flex-1 overflow-y-auto px-8 pb-10 max-lg:px-5">
        {loaded && agents.length > 0 ? <SearchField value={query} /> : null}
        {!loaded ? <SkeletonRows rows={6} /> : null}
        {loaded && agents.length === 0 ? (
          <EmptyState
            icon={Bot}
            title={t.emptyTitle}
            action={
              <Button variant="primary" icon={Plus} onClick={() => void useAgents.getState().openBuilder(null)}>
                {t.buildFirst}
              </Button>
            }
          >
            {t.emptyBody}
          </EmptyState>
        ) : null}
        {loaded && agents.length > 0 && visible.length === 0 ? (
          <EmptyState icon={SearchX} title={t.noMatchTitle} compact action={<Button size="sm" onClick={() => useAgents.getState().setQuery('')}>{t.clearSearch}</Button>}>
            {t.noMatchBody}
          </EmptyState>
        ) : null}
        {visible.length > 0 ? <AgentList entries={visible} summaries={summaries} selectedId={selectedId} showHost={showHost} /> : null}
      </div>
      <aside aria-label={t.detailsAria} className="w-[27rem] shrink-0 overflow-y-auto border-l border-line/70 px-6 pb-10 max-[1280px]:w-[23rem] max-lg:w-[19rem] max-lg:px-5">
        <AnimatePresence mode="wait" initial={false}>
          {selected ? (
            <motion.div key={selected.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: EASE_OUT_EXPO }} className="pt-1">
              <AgentDetail entry={selected} />
            </motion.div>
          ) : (
            <motion.div key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EmptyState icon={MousePointerClick} title={t.pickTitle} compact>
                {t.pickBody}
              </EmptyState>
            </motion.div>
          )}
        </AnimatePresence>
      </aside>
    </div>
  )
}

function SearchField({ value }: { readonly value: string }): React.JSX.Element {
  const t = useT().agents
  const setQuery = useAgents((s) => s.setQuery)
  return (
    <label className="relative mb-3 block max-w-xl">
      <span className="sr-only">{t.searchLabel}</span>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-3" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && value) {
            e.stopPropagation()
            setQuery('')
          }
        }}
        placeholder={t.searchPlaceholder}
        className="field pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? <IconButton size="sm" icon={X} label={t.clearSearch} className="absolute top-0.5 right-0.5 size-7" onClick={() => setQuery('')} /> : null}
    </label>
  )
}
