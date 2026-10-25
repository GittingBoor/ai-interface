import { Bot, Braces, CircleOff, Cloud, FolderGit2, Puzzle, Sparkles, SquareSlash, UserRound, type LucideIcon } from 'lucide-react'
import type { SkillEntry, SkillKind, SkillScope } from '@shared/types'
import { KIND_LABEL } from '@renderer/lib/skills'

export const KIND_ICON: Readonly<Record<SkillKind, LucideIcon>> = { skill: Sparkles, agent: Bot, command: SquareSlash }

export const SCOPE_ICON: Readonly<Record<SkillScope, LucideIcon>> = {
  user: UserRound,
  synced: Cloud,
  plugin: Puzzle,
  project: FolderGit2,
  disabled: CircleOff
}

export const CODEX_ICON: LucideIcon = Braces

export function KindIcon({ kind, className = 'size-3.5' }: { readonly kind: SkillKind; readonly className?: string }): React.JSX.Element {
  const Icon = KIND_ICON[kind]
  return <Icon className={`shrink-0 ${className}`} aria-label={KIND_LABEL[kind]} role="img" strokeWidth={1.75} />
}

/** Kleine Kennzeichen hinter dem Namen: Codex und deaktiviert. */
export function EntryTags({ entry }: { readonly entry: SkillEntry }): React.JSX.Element | null {
  if (entry.ai !== 'codex' && entry.scope !== 'disabled') return null
  return (
    <>
      {entry.ai === 'codex' ? <Tag>Codex</Tag> : null}
      {entry.scope === 'disabled' ? <Tag muted>aus</Tag> : null}
    </>
  )
}

function Tag({ children, muted = false }: { readonly children: string; readonly muted?: boolean }): React.JSX.Element {
  return (
    <span
      className={`inline-flex h-[1.125rem] shrink-0 items-center rounded-[4px] border px-1.5 text-[0.625rem] font-[600] tracking-[0.01em] ${muted ? 'border-dashed border-line-strong text-ink-3' : 'border-line-strong/70 bg-raised-2 text-ink-2'}`}
    >
      {children}
    </span>
  )
}
