import { AlertTriangle, ArrowDown, ArrowUp, CloudDownload, GitBranch, Unlink } from 'lucide-react'
import type { Favorite, GitState } from '@shared/types'
import { Button } from '@renderer/components/Button'
import { useT } from '@renderer/i18n/useT'
import { ProjectMark } from '@renderer/components/ProjectMark'
import { useFavorites } from '@renderer/stores/favoritesStore'
import { useMiniPc } from '@renderer/stores/miniPcStore'
import { changeParts, favoriteForRepo } from '@renderer/lib/miniPc'
import { LaunchButtons } from './LaunchButtons'

const CELL = 'border-t border-line px-2 py-2.5 align-top'

function ProjectCell({ repo, favorite }: { readonly repo: GitState; readonly favorite: Favorite | undefined }): React.JSX.Element {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {favorite ? <ProjectMark color={favorite.color} icon={favorite.icon} size="sm" /> : <span className="size-4 shrink-0" aria-hidden />}
      <div className="min-w-0">
        <p className="truncate text-[0.8125rem] font-[560] text-ink" title={repo.path}>
          {favorite?.name ?? repo.name}
        </p>
        {favorite && favorite.name !== repo.name ? <p className="truncate font-mono text-2xs text-ink-3">{repo.name}</p> : null}
      </div>
    </div>
  )
}

function BranchCell({ repo }: { readonly repo: GitState }): React.JSX.Element {
  const t = useT().device
  if (repo.branch === null) {
    return (
      <span className="inline-flex h-5 items-center gap-1 rounded-full bg-warn-soft px-2 text-2xs font-[600] text-warn" title={t.gitDetachedTitle}>
        <Unlink className="size-3" aria-hidden />
        {t.gitDetached}
      </span>
    )
  }
  return (
    <span className="flex min-w-0 items-center gap-1.5 font-mono text-xs text-ink-2" title={repo.upstream ? t.gitUpstream(repo.upstream) : t.gitNoUpstreamTitle}>
      <GitBranch className="size-3 shrink-0 text-ink-3" aria-hidden />
      <span className="truncate">{repo.branch}</span>
    </span>
  )
}

function SyncCell({ repo }: { readonly repo: GitState }): React.JSX.Element {
  const t = useT().device
  if (!repo.upstream) return <span className="text-xs text-ink-3">{t.gitNoUpstream}</span>
  if (repo.ahead === 0 && repo.behind === 0) return <span className="text-xs text-ink-3">{t.gitInSync}</span>
  return (
    <span className="num inline-flex items-center gap-2.5 text-xs" aria-label={t.gitAheadBehind(repo.ahead, repo.behind)}>
      <span className={`inline-flex items-center gap-0.5 ${repo.ahead > 0 ? 'text-ink' : 'text-ink-3/70'}`} title={t.gitAheadTitle}>
        <ArrowUp className="size-3" aria-hidden />
        {repo.ahead}
      </span>
      <span className={`inline-flex items-center gap-0.5 ${repo.behind > 0 ? 'text-accent-text' : 'text-ink-3/70'}`} title={t.gitBehindTitle}>
        <ArrowDown className="size-3" aria-hidden />
        {repo.behind}
      </span>
    </span>
  )
}

function ChangesCell({ repo }: { readonly repo: GitState }): React.JSX.Element {
  const t = useT().device
  const parts = changeParts(repo)
  if (!parts.length) return <span className="text-xs text-ink-3">{t.gitClean}</span>
  return <span className="num text-xs text-ink-2">{parts.join(' · ')}</span>
}

function GitRow({ repo, favorite }: { readonly repo: GitState; readonly favorite: Favorite | undefined }): React.JSX.Element {
  const t = useT().device
  const fetching = useMiniPc((s) => s.fetching.includes(repo.path))
  const fetchRepo = useMiniPc((s) => s.fetchRepo)
  const name = favorite?.name ?? repo.name
  return (
    <tr className={`transition-opacity duration-200 ${fetching ? 'opacity-70' : ''}`}>
      <td className={CELL}>
        <ProjectCell repo={repo} favorite={favorite} />
        {repo.error ? (
          <p className="mt-1 flex items-start gap-1.5 pl-6 text-2xs leading-snug text-danger-ink">
            <AlertTriangle className="mt-px size-3 shrink-0" aria-hidden />
            <span className="line-clamp-2" title={repo.error}>
              {repo.error}
            </span>
          </p>
        ) : null}
      </td>
      <td className={`${CELL} max-w-[11rem]`}>
        <BranchCell repo={repo} />
      </td>
      <td className={CELL}>
        <SyncCell repo={repo} />
      </td>
      <td className={CELL}>
        <ChangesCell repo={repo} />
      </td>
      <td className={`${CELL} py-1.5`}>
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            icon={CloudDownload}
            loading={fetching}
            onClick={() => void fetchRepo(repo.path)}
            title={t.gitFetchTitle}
          >
            {fetching ? t.gitFetching : t.gitFetch}
          </Button>
          <span className="mx-0.5 h-4 w-px bg-line" aria-hidden />
          <LaunchButtons path={repo.path} name={name} />
        </div>
      </td>
    </tr>
  )
}

/** Git-Stand aller Projekte im Projektordner des Geräts. */
export function GitTable({ repos }: { readonly repos: readonly GitState[] }): React.JSX.Element {
  const t = useT().device
  const favorites = useFavorites((s) => s.favorites)
  const device = useMiniPc((s) => s.device)
  return (
    <div className="relative -mx-2 overflow-x-auto">
      <table className="w-full min-w-[46rem] border-separate border-spacing-0 text-[0.8125rem]">
        <thead>
          <tr className="text-left text-xs text-ink-3">
            <th className="px-2 pb-2 font-[520]">{t.gitColProject}</th>
            <th className="px-2 pb-2 font-[520]">{t.gitColBranch}</th>
            <th className="px-2 pb-2 font-[520]">{t.gitColRemote}</th>
            <th className="px-2 pb-2 font-[520]">{t.gitColChanges}</th>
            <th className="px-2 pb-2 text-right font-[520]">
              <span className="sr-only">{t.gitColActions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {repos.map((repo) => (
            <GitRow key={repo.path} repo={repo} favorite={favoriteForRepo(favorites, device ?? '', repo.path)} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
