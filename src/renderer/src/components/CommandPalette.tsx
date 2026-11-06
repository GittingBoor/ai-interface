import { useMemo, useState, useEffect, useRef } from 'react'
import { Bot, Workflow, CornerDownLeft, FolderOpen, Globe, ListPlus, Play, RefreshCw, RotateCcw, Server, Sparkles, type LucideIcon } from 'lucide-react'
import { usePalette } from '@renderer/stores/paletteStore'
import { useNav } from '@renderer/stores/navStore'
import { useAgents } from '@renderer/stores/agentsStore'
import { useFavorites } from '@renderer/stores/favoritesStore'
import { useTerminals } from '@renderer/stores/terminalStore'
import { useUsage } from '@renderer/stores/usageStore'
import { useSettings } from '@renderer/stores/settingsStore'
import type { Messages } from '@shared/i18n/messages'
import { VIEWS, viewLabel } from '@renderer/lib/views'
import { hostLabel, useDevices } from '@renderer/lib/hosts'
import { pinnedFirst } from '@renderer/lib/projectOrganize'
import { ProjectMark } from './ProjectMark'
import { Modal } from './Modal'
import { Kbd } from './Controls'
import { activeTag } from '@renderer/i18n/activeLocale'
import { useT } from '@renderer/i18n/useT'

interface Command {
  readonly id: string
  readonly group: string
  readonly label: string
  readonly detail?: string
  readonly icon: LucideIcon
  readonly keywords: string
  /** Projektkennzeichen (Farbe und Symbol). */
  readonly mark?: { readonly color: string; readonly icon: string | null }
  run(): void
}

/** `todo:` und das Wort der Sprache (z. B. „aufgabe“) leiten ein neues TODO ein. */
function todoPrefix(t: Messages): RegExp {
  return new RegExp(`^(todo|${t.frame.palette.todoWord})[:\\s：]+`, 'i')
}

function score(command: Command, query: string): number {
  if (!query) return 1
  const haystack = `${command.label} ${command.detail ?? ''} ${command.keywords}`.toLocaleLowerCase(activeTag())
  const words = query.toLocaleLowerCase(activeTag()).split(/\s+/).filter(Boolean)
  if (!words.every((w) => haystack.includes(w))) return 0
  return command.label.toLocaleLowerCase(activeTag()).startsWith(words[0] ?? '') ? 2 : 1
}

function useCommands(query: string): Command[] {
  const t = useT()
  const favorites = useFavorites((s) => s.favorites)
  const devices = useDevices()
  const links = useSettings((s) => s.settings?.links)
  const nav = useNav.getState()
  const launch = useTerminals.getState().launch
  const refresh = useUsage.getState().refresh

  return useMemo(() => {
    const p = t.frame.palette
    const prefix = todoPrefix(t)
    const todoText = query.replace(prefix, '').trim()
    const commands: Command[] = [
      ...VIEWS.map<Command>((v) => ({ id: `view-${v.id}`, group: p.groupViews, label: viewLabel(v.id, t), ...(v.key ? { detail: t.frame.shortcut(v.key) } : {}), icon: v.icon, keywords: p.keywordsView, run: () => nav.go(v.id) })),
      {
        id: 'todo-add',
        group: p.groupActions,
        label: prefix.test(query) && todoText ? p.todoAddWith(todoText) : p.todoAdd,
        icon: ListPlus,
        keywords: p.keywordsTodo,
        run: () => nav.requestTodoComposer(prefix.test(query) ? todoText : '')
      },
      ...devices
        .filter((d) => d.enabled)
        .map<Command>((d, i) => ({
          id: `device-${d.id}`,
          group: t.nav.groups.devices,
          label: p.open(d.name),
          ...(i === 0 ? { detail: t.frame.shortcut('9') } : {}),
          icon: Server,
          keywords: p.keywordsDevice(d.host),
          run: () => nav.openDevice(d.id)
        })),
      ...(links ?? []).map<Command>((l) => ({ id: `link-${l.id}`, group: t.nav.groups.devices, label: p.open(l.name), icon: Globe, keywords: p.keywordsLink(l.url), run: () => nav.openLink(l.id) })),
      { id: 'skills-open', group: p.groupActions, label: p.skillsOpen, icon: Sparkles, keywords: p.keywordsSkills, run: () => nav.go('skills') },
      { id: 'agents-open', group: p.groupActions, label: p.agentsOpen, icon: Bot, keywords: p.keywordsAgents, run: () => nav.go('agents') },
      { id: 'agent-new', group: p.groupActions, label: p.agentNew, icon: Bot, keywords: p.keywordsAgentNew, run: () => { nav.go('agents'); useAgents.getState().openBuilder(null) } },
      { id: 'automations-open', group: p.groupActions, label: p.automationsOpen, icon: Workflow, keywords: p.keywordsAutomations, run: () => nav.go('automations') },
      { id: 'refresh', group: p.groupActions, label: p.refreshUsage, icon: RefreshCw, keywords: p.keywordsRefresh, run: () => void refresh() },
      ...pinnedFirst(favorites).flatMap<Command>((f) => [
        { id: `fav-claude-${f.id}`, group: p.groupProjects, label: p.startClaude(f.name), detail: hostLabel(f.host), icon: Play, mark: { color: f.color, icon: f.icon }, keywords: p.keywordsStart(f.path), run: () => void launch(f, 'new') },
        { id: `fav-continue-${f.id}`, group: p.groupProjects, label: p.continueIn(f.name), detail: hostLabel(f.host), icon: RotateCcw, mark: { color: f.color, icon: f.icon }, keywords: p.keywordsContinue(f.path), run: () => void launch(f, 'continue') },
        { id: `fav-open-${f.id}`, group: p.groupProjects, label: p.open(f.name), detail: f.path, icon: FolderOpen, mark: { color: f.color, icon: f.icon }, keywords: `${p.keywordsProject} ${f.starred ? p.keywordsPinned : ''}`, run: () => nav.openFavorite(f.id) }
      ])
    ]
    return commands
      .map((c) => ({ c, s: score(c, prefix.test(query) && c.id === 'todo-add' ? '' : query) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.c)
  }, [favorites, devices, links, query, nav, launch, refresh, t])
}

export function CommandPalette(): React.JSX.Element {
  const t = useT()
  const open = usePalette((s) => s.open)
  const hide = usePalette((s) => s.hide)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const commands = useCommands(query)
  const list = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setIndex(0)
    }
  }, [open])

  useEffect(() => setIndex(0), [query])

  useEffect(() => {
    list.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [index])

  const run = (command: Command | undefined): void => {
    if (!command) return
    hide()
    command.run()
  }

  const groups = commands.reduce<Map<string, { command: Command; index: number }[]>>((acc, command, i) => {
    acc.set(command.group, [...(acc.get(command.group) ?? []), { command, index: i }])
    return acc
  }, new Map())

  return (
    <Modal
      open={open}
      label={t.frame.palette.dialog}
      onClose={hide}
      align="top"
      backdrop="bg-canvas/60"
      className="w-full max-w-[36rem] overflow-hidden rounded-xl border border-line-strong/70 bg-raised shadow-[0_28px_70px_-16px_oklch(0_0_0/0.75)]"
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        <input
          data-autofocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setIndex((i) => Math.min(i + 1, commands.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setIndex((i) => Math.max(i - 1, 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              run(commands[index])
            }
          }}
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={commands[index] ? `cmd-${commands[index].id}` : undefined}
          placeholder={t.frame.palette.placeholder}
          className="h-12 flex-1 bg-transparent text-[0.9375rem] text-ink outline-none"
        />
        <Kbd>Esc</Kbd>
      </div>
      <ul ref={list} id="palette-list" role="listbox" aria-label={t.frame.palette.list} className="max-h-[22rem] overflow-y-auto p-1.5">
        {commands.length === 0 ? <li className="px-3 py-6 text-center text-[0.8125rem] text-ink-3">{t.frame.palette.empty}</li> : null}
        {[...groups.entries()].map(([group, items]) => (
          <li key={group} role="presentation">
            <p className="px-2.5 pt-2.5 pb-1 text-2xs font-[600] text-ink-3">{group}</p>
            <ul role="presentation">
              {items.map(({ command, index: i }) => {
                const Icon = command.icon
                const active = i === index
                return (
                  <li
                    key={command.id}
                    id={`cmd-${command.id}`}
                    data-index={i}
                    role="option"
                    aria-selected={active}
                    onMouseMove={() => setIndex(i)}
                    onClick={() => run(command)}
                    className={`flex h-9 cursor-pointer items-center gap-3 rounded-md px-2.5 text-[0.8125rem] ${active ? 'bg-raised-2 text-ink' : 'text-ink-2'}`}
                  >
                    <span className="relative grid size-4 place-items-center">
                      <Icon className={`size-4 ${active ? 'text-accent' : 'text-ink-3'}`} aria-hidden strokeWidth={1.75} />
                    </span>
                    {command.mark ? <ProjectMark color={command.mark.color} icon={command.mark.icon} size="sm" /> : null}
                    <span className="flex-1 truncate">{command.label}</span>
                    {command.detail ? <span className="max-w-[14rem] truncate text-xs text-ink-3">{command.detail}</span> : null}
                    {active ? <CornerDownLeft className="size-3.5 text-ink-3" aria-hidden /> : null}
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
