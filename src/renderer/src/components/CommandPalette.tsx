import { useMemo, useState, useEffect, useRef } from 'react'
import { CornerDownLeft, FolderOpen, Globe, ListPlus, Play, RefreshCw, RotateCcw, Server, Sparkles, type LucideIcon } from 'lucide-react'
import { usePalette } from '@renderer/stores/paletteStore'
import { useNav } from '@renderer/stores/navStore'
import { useFavorites } from '@renderer/stores/favoritesStore'
import { useTerminals } from '@renderer/stores/terminalStore'
import { useUsage } from '@renderer/stores/usageStore'
import { useSettings } from '@renderer/stores/settingsStore'
import { VIEWS } from '@renderer/lib/views'
import { hostLabel, useDevices } from '@renderer/lib/hosts'
import { pinnedFirst } from '@renderer/lib/projectOrganize'
import { ProjectMark } from './ProjectMark'
import { Modal } from './Modal'
import { Kbd } from './Controls'

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

const TODO_PREFIX = /^(todo|aufgabe)[:\s]+/i

function score(command: Command, query: string): number {
  if (!query) return 1
  const haystack = `${command.label} ${command.detail ?? ''} ${command.keywords}`.toLocaleLowerCase('de-DE')
  const words = query.toLocaleLowerCase('de-DE').split(/\s+/).filter(Boolean)
  if (!words.every((w) => haystack.includes(w))) return 0
  return command.label.toLocaleLowerCase('de-DE').startsWith(words[0] ?? '') ? 2 : 1
}

function useCommands(query: string): Command[] {
  const favorites = useFavorites((s) => s.favorites)
  const devices = useDevices()
  const links = useSettings((s) => s.settings?.links)
  const nav = useNav.getState()
  const launch = useTerminals.getState().launch
  const refresh = useUsage.getState().refresh

  return useMemo(() => {
    const todoText = query.replace(TODO_PREFIX, '').trim()
    const commands: Command[] = [
      ...VIEWS.map<Command>((v) => ({ id: `view-${v.id}`, group: 'Bereiche', label: v.label, ...(v.key ? { detail: `Strg+${v.key}` } : {}), icon: v.icon, keywords: 'gehe zu bereich', run: () => nav.go(v.id) })),
      {
        id: 'todo-add',
        group: 'Aktionen',
        label: TODO_PREFIX.test(query) && todoText ? `TODO anlegen: „${todoText}“` : 'TODO anlegen',
        icon: ListPlus,
        keywords: 'todo aufgabe neu anlegen hinzufügen',
        run: () => nav.requestTodoComposer(TODO_PREFIX.test(query) ? todoText : '')
      },
      ...devices
        .filter((d) => d.enabled)
        .map<Command>((d, i) => ({
          id: `device-${d.id}`,
          group: 'Verknüpfungen',
          label: `${d.name} öffnen`,
          ...(i === 0 ? { detail: 'Strg+9' } : {}),
          icon: Server,
          keywords: `gerät server system git ollama ssh zustand ${d.host}`,
          run: () => nav.openDevice(d.id)
        })),
      ...(links ?? []).map<Command>((l) => ({ id: `link-${l.id}`, group: 'Verknüpfungen', label: `${l.name} öffnen`, icon: Globe, keywords: `webseite verknüpfung ${l.url}`, run: () => nav.openLink(l.id) })),
      { id: 'skills-open', group: 'Aktionen', label: 'Skills öffnen', icon: Sparkles, keywords: 'skills agents befehle commands plugins codex zusammenfassung', run: () => nav.go('skills') },
      { id: 'refresh', group: 'Aktionen', label: 'Verbrauch aktualisieren', icon: RefreshCw, keywords: 'token neu laden sync', run: () => void refresh() },
      ...pinnedFirst(favorites).flatMap<Command>((f) => [
        { id: `fav-claude-${f.id}`, group: 'Projekte', label: `Claude starten in ${f.name}`, detail: hostLabel(f.host), icon: Play, mark: { color: f.color, icon: f.icon }, keywords: `${f.path} neu claude`, run: () => void launch(f, 'new') },
        { id: `fav-continue-${f.id}`, group: 'Projekte', label: `Fortsetzen in ${f.name}`, detail: hostLabel(f.host), icon: RotateCcw, mark: { color: f.color, icon: f.icon }, keywords: `${f.path} continue weiter`, run: () => void launch(f, 'continue') },
        { id: `fav-open-${f.id}`, group: 'Projekte', label: `${f.name} öffnen`, detail: f.path, icon: FolderOpen, mark: { color: f.color, icon: f.icon }, keywords: `projekt details ${f.starred ? 'angepinnt' : ''}`, run: () => nav.openFavorite(f.id) }
      ])
    ]
    return commands
      .map((c) => ({ c, s: score(c, TODO_PREFIX.test(query) && c.id === 'todo-add' ? '' : query) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.c)
  }, [favorites, devices, links, query, nav, launch, refresh])
}

export function CommandPalette(): React.JSX.Element {
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
      label="Befehlspalette"
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
          placeholder="Bereich, Projekt oder „todo: …“"
          className="h-12 flex-1 bg-transparent text-[0.9375rem] text-ink outline-none"
        />
        <Kbd>Esc</Kbd>
      </div>
      <ul ref={list} id="palette-list" role="listbox" aria-label="Befehle" className="max-h-[22rem] overflow-y-auto p-1.5">
        {commands.length === 0 ? <li className="px-3 py-6 text-center text-[0.8125rem] text-ink-3">Nichts gefunden. Tipp: „todo: Text“ legt ein TODO an.</li> : null}
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
