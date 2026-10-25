import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, CircleCheck, CircleDashed, CircleAlert, Play, PlayCircle } from 'lucide-react'
import type { Favorite, InterruptedRun } from '@shared/types'
import { Button } from '@renderer/components/Button'
import { ViewHeader } from '@renderer/components/Section'
import { EmptyState, ErrorState, SkeletonRows } from '@renderer/components/States'
import { HostBadge } from '@renderer/components/Host'
import { ProjectMark } from '@renderer/components/ProjectMark'
import { runKey, useRuns } from '@renderer/stores/runsStore'
import { useQuota } from '@renderer/stores/quotaStore'
import { useFavorites } from '@renderer/stores/favoritesStore'
import { findFavorite } from '@renderer/lib/projects'
import { useNow } from '@renderer/lib/hooks'
import { fiveHourAvailability } from '@renderer/lib/quota'
import { baseName, formatCountdown, formatInteger, formatRelative, formatTime } from '@renderer/lib/format'

const TICK_MS = 1_000
const PROMPT_MAX_CHARS = 180
const ROW_EXIT_S = 0.18

interface RunGroup {
  readonly key: string
  readonly name: string
  readonly title: string
  readonly favorite: Favorite | undefined
  readonly runs: readonly InterruptedRun[]
}

/** Nach Projekt gruppiert, jüngster Abbruch zuerst (die Liste kommt bereits so sortiert). */
function groupRuns(favorites: readonly Favorite[], runs: readonly InterruptedRun[]): RunGroup[] {
  const groups = new Map<string, RunGroup>()
  for (const run of runs) {
    const favorite = findFavorite(favorites, run.host, run.project)
    const key = favorite ? `fav-${favorite.id}` : `${run.host}-${run.project}`
    const prev = groups.get(key)
    groups.set(key, {
      key,
      name: favorite?.name ?? baseName(run.project),
      title: favorite?.path ?? run.project,
      favorite,
      runs: [...(prev?.runs ?? []), run]
    })
  }
  return [...groups.values()]
}

const shorten = (text: string): string => (text.length > PROMPT_MAX_CHARS ? `${text.slice(0, PROMPT_MAX_CHARS).trimEnd()} …` : text)

function QuotaHint({ now }: { readonly now: number }): React.JSX.Element {
  const state = useQuota((s) => s.state)
  const availability = fiveHourAvailability(state, now)
  if (availability.kind === 'free') {
    return (
      <p className="flex items-center gap-2.5 text-[0.8125rem] text-ink-2">
        <CircleCheck className="size-4 shrink-0 text-accent" aria-hidden strokeWidth={1.75} />
        <span>
          <span className="font-[600] text-ink">Kontingent frei</span> · 5-Stunden-Fenster bei <span className="num">{formatInteger(availability.percent)} %</span>. Du kannst
          fortsetzen.
        </span>
      </p>
    )
  }
  if (availability.kind === 'full') {
    const until = availability.resetsAt
    return (
      <p className="flex items-center gap-2.5 text-[0.8125rem] text-ink-2">
        <CircleAlert className="size-4 shrink-0 text-warn" aria-hidden strokeWidth={1.75} />
        <span>
          <span className="font-[600] text-ink">Kontingent voll</span>
          {until !== null ? (
            <>
              {' '}
              bis <span className="num">{formatTime(until)}</span> (in <span className="num">{formatCountdown(until - now)}</span>). Fortsetzen bricht bis dahin sofort wieder ab.
            </>
          ) : (
            '. Der Reset-Zeitpunkt ist unbekannt.'
          )}
        </span>
      </p>
    )
  }
  return (
    <p className="flex items-center gap-2.5 text-[0.8125rem] text-ink-2">
      <CircleDashed className="size-4 shrink-0 text-ink-3" aria-hidden strokeWidth={1.75} />
      <span>
        <span className="font-[600] text-ink">Kontingent unbekannt</span> · {state.status === 'loading' ? 'wird abgefragt …' : 'keine aktuelle Quelle, siehe unten links.'}
      </span>
    </p>
  )
}

interface RunRowProps {
  readonly run: InterruptedRun
  readonly name: string
  readonly now: number
  readonly resumed: boolean
  readonly busy: boolean
  onResume(): void
}

function RunRow({ run, name, now, resumed, busy, onResume }: RunRowProps): React.JSX.Element {
  const dismiss = useRuns((s) => s.dismiss)
  return (
    <motion.li
      layout
      initial={false}
      exit={{ opacity: 0, height: 0, transition: { duration: ROW_EXIT_S } }}
      className="overflow-hidden border-t border-line first:border-t-0"
    >
      <div className="flex items-start gap-6 py-3.5">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
            <HostBadge host={run.host} />
            <span className="num" title={new Date(run.hitAt).toLocaleString('de-DE')}>
              abgebrochen {formatRelative(run.hitAt, now)}
            </span>
            <span className="min-w-0 truncate font-mono text-2xs" title={run.message}>
              {run.message}
            </span>
          </p>
          {run.lastPrompt ? (
            <p className="mt-1.5 line-clamp-2 max-w-[72ch] text-[0.8125rem] leading-relaxed text-ink-2 italic" title={run.lastPrompt}>
              „{shorten(run.lastPrompt)}“
            </p>
          ) : (
            <p className="mt-1.5 text-[0.8125rem] text-ink-3">Letzte Eingabe nicht erfasst.</p>
          )}
          {resumed ? <p className="mt-1.5 text-xs text-accent-text">Im Terminal fortgesetzt · verschwindet, sobald Claude wieder antwortet.</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          <Button size="sm" variant="ghost" icon={Check} onClick={() => void dismiss(run)} title="Aus der Liste nehmen, ohne fortzusetzen">
            Erledigt
          </Button>
          <Button size="sm" variant={resumed ? 'secondary' : 'soft'} icon={Play} loading={busy} onClick={onResume} title={`claude --resume in ${name}`}>
            {resumed ? 'Erneut öffnen' : 'Fortsetzen'}
          </Button>
        </div>
      </div>
    </motion.li>
  )
}

export function RunsView(): React.JSX.Element {
  const runs = useRuns((s) => s.runs)
  const loaded = useRuns((s) => s.loaded)
  const error = useRuns((s) => s.error)
  const resumed = useRuns((s) => s.resumed)
  const load = useRuns((s) => s.load)
  const resume = useRuns((s) => s.resume)
  const favorites = useFavorites((s) => s.favorites)
  const quota = useQuota((s) => s.state)
  const now = useNow(TICK_MS)
  const quotaFull = fiveHourAvailability(quota, now).kind === 'full'
  const [busy, setBusy] = useState<string | null>(null)
  const groups = useMemo(() => groupRuns(favorites, runs), [favorites, runs])
  const pending = groups.flatMap((g) => g.runs.map((run) => ({ run, name: g.name }))).filter(({ run }) => !resumed.includes(runKey(run)))

  const resumeOne = async (run: InterruptedRun, name: string): Promise<void> => {
    setBusy(runKey(run))
    try {
      await resume(run, name)
    } finally {
      setBusy(null)
    }
  }

  const resumeAll = async (): Promise<void> => {
    for (const { run, name } of pending) await resumeOne(run, name)
  }

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title="Offen"
        actions={
          runs.length ? (
            <Button variant={quotaFull ? 'secondary' : 'primary'} icon={PlayCircle} disabled={!pending.length || busy !== null} onClick={() => void resumeAll()}>
              {pending.length > 1 ? `Alle fortsetzen (${pending.length})` : 'Alle fortsetzen'}
            </Button>
          ) : null
        }
      >
        Durchläufe, die am vollen Kontingent abgebrochen sind
      </ViewHeader>

      <div className="@container/main flex-1 overflow-y-auto px-8 pb-10">
        {error && !runs.length ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {!loaded ? <SkeletonRows rows={3} /> : null}
        {loaded && !error && !runs.length ? (
          <EmptyState icon={CircleCheck} title="Nichts offen – alle Durchläufe sind abgeschlossen">
            Bricht Claude am vollen Kontingent ab, landet der Durchlauf hier. Sobald das Kontingent wieder frei ist, setzt du ihn mit einem Klick fort.
          </EmptyState>
        ) : null}
        {runs.length ? (
          <div className="grid items-start gap-x-12 gap-y-8 @min-[100rem]/main:grid-cols-2">
            <div className="rounded-lg border border-line bg-canvas/60 px-4 py-3 @min-[100rem]/main:col-span-2">
              <QuotaHint now={now} />
            </div>
            <AnimatePresence initial={false}>
              {groups.map((g) => (
                <motion.section
                  key={g.key}
                  layout
                  exit={{ opacity: 0, transition: { duration: ROW_EXIT_S } }}
                  aria-label={g.name}
                  className="border-t border-line pt-4"
                >
                  <header className="mb-1 flex items-center gap-2.5" title={g.title}>
                    {g.favorite ? <ProjectMark color={g.favorite.color} icon={g.favorite.icon} size="lg" /> : <ProjectMark color="var(--color-ink-3)" icon={null} size="lg" />}
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-[620] text-ink">{g.name}</h2>
                      <p className="truncate font-mono text-2xs text-ink-3">{g.title}</p>
                    </div>
                    <span className="num ml-auto text-xs text-ink-3">{g.runs.length === 1 ? '1 Durchlauf' : `${g.runs.length} Durchläufe`}</span>
                  </header>
                  <ul>
                    <AnimatePresence initial={false}>
                      {g.runs.map((run) => (
                        <RunRow
                          key={runKey(run)}
                          run={run}
                          name={g.name}
                          now={now}
                          resumed={resumed.includes(runKey(run))}
                          busy={busy === runKey(run)}
                          onResume={() => void resumeOne(run, g.name)}
                        />
                      ))}
                    </AnimatePresence>
                  </ul>
                </motion.section>
              ))}
            </AnimatePresence>
          </div>
        ) : null}
      </div>
    </div>
  )
}
