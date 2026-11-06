import { useEffect, useState } from 'react'
import { Check, Copy, FileCode2, GitCommitHorizontal, NotebookText, type LucideIcon } from 'lucide-react'
import type { KnowledgeLink, KnowledgeProject } from '@shared/knowledge'
import { api } from '@renderer/api/client'
import { reportError, unwrap } from '@renderer/api/call'
import { baseName, formatDayShort } from '@renderer/lib/format'
import { useNav } from '@renderer/stores/navStore'
import { useT } from '@renderer/i18n/useT'
import type { Messages } from '@shared/i18n/messages'

const SHORT_HASH = 7
const COPIED_MS = 1400
const DATE_NAME = /^(\d{4}-\d{2}-\d{2})/

interface ChipProps {
  readonly icon: LucideIcon
  readonly label: string
  readonly title: string
  readonly mono?: boolean
  onClick(): void
}

function LinkChip({ icon: Icon, label, title, mono = false, onClick }: ChipProps): React.JSX.Element {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`inline-flex h-6 max-w-[16rem] items-center gap-1.5 rounded-md border border-line px-1.5 text-2xs text-ink-2 transition-colors duration-150 hover:border-line-strong hover:bg-raised hover:text-ink ${mono ? 'font-mono' : ''}`}
    >
      <Icon aria-hidden className="size-3 shrink-0 text-ink-3" strokeWidth={1.75} />
      <span className="truncate">{label}</span>
    </button>
  )
}

/** Kopiert Text und zeigt kurz einen Haken. */
function useCopy(): { readonly copied: boolean; copy(text: string): void } {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), COPIED_MS)
    return () => clearTimeout(timer)
  }, [copied])
  const copy = (text: string): void => {
    navigator.clipboard.writeText(text).then(() => setCopied(true), reportError)
  }
  return { copied, copy }
}

function protocolLabel(ref: string, t: Messages['knowledge']): string {
  const name = baseName(ref).replace(/\.md$/i, '')
  const date = DATE_NAME.exec(name)?.[1]
  return date ? t.protocolLabel(formatDayShort(date)) : name
}

function CommitLink({ hash }: { readonly hash: string }): React.JSX.Element {
  const { copied, copy } = useCopy()
  const short = hash.slice(0, SHORT_HASH)
  const t = useT().knowledge
  return (
    <>
      <LinkChip icon={copied ? Check : GitCommitHorizontal} label={short} mono title={copied ? t.copied : t.copyCommit(short)} onClick={() => copy(hash)} />
      <span role="status" className="sr-only">
        {copied ? t.copied : ''}
      </span>
    </>
  )
}

function FileLink({ project, path }: { readonly project: KnowledgeProject; readonly path: string }): React.JSX.Element {
  const { copied, copy } = useCopy()
  const local = project.host === 'local'
  const t = useT().knowledge
  const open = (): void => {
    if (local) unwrap(api.knowledge.openFile(project.favoriteId, path)).catch(reportError)
    else copy(`${project.path.replace(/\/+$/, '')}/${path}`)
  }
  const title = local ? t.openFile(path) : copied ? t.pathCopied : t.copyPath(path)
  return <LinkChip icon={copied ? Check : local ? FileCode2 : Copy} label={baseName(path)} mono title={title} onClick={open} />
}

interface LinkProps {
  readonly link: KnowledgeLink
  readonly project: KnowledgeProject
}

/** Verweis aus der Zeitleiste: Protokoll öffnen, Commit kopieren, Datei öffnen bzw. Pfad kopieren. */
export function KnowledgeLinkChip({ link, project }: LinkProps): React.JSX.Element {
  const t = useT().knowledge
  switch (link.kind) {
    case 'protocol': {
      const label = protocolLabel(link.ref, t)
      return <LinkChip icon={NotebookText} label={label} title={t.openProtocol(label)} onClick={() => useNav.getState().openProtocol(link.ref)} />
    }
    case 'commit':
      return <CommitLink hash={link.ref} />
    case 'file':
      return <FileLink project={project} path={link.ref} />
  }
}
