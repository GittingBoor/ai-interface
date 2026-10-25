import { motion } from 'motion/react'
import { BotMessageSquare, ChevronDown, LockOpen, Search, SlidersHorizontal } from 'lucide-react'
import type { NavGroup, WebLinkSettings } from '@shared/types'
import { DEFAULT_NAVIGATION, visibleNavigation } from '@shared/layout'
import { activeNavId, useNav } from '@renderer/stores/navStore'
import { useSettings } from '@renderer/stores/settingsStore'
import { useDevices } from '@renderer/lib/hosts'
import { useRuns } from '@renderer/stores/runsStore'
import { openTodoCount, useTodos } from '@renderer/stores/todoStore'
import { useTerminals } from '@renderer/stores/terminalStore'
import { usePalette } from '@renderer/stores/paletteStore'
import { useAssistant } from '@renderer/stores/assistantStore'
import { usePrivacy } from '@renderer/stores/privacyStore'
import { navEntries, type NavEntry } from '@renderer/lib/views'
import { QuotaPanel, QuotaRail } from './QuotaPanel'
import { Kbd } from './Controls'
import { ASSISTANT_PANEL_ID } from './assistant/AssistantPanel'
import { ProjectMark } from './ProjectMark'
import { UpdateNotice } from './UpdateNotice'

const NO_LINKS: readonly WebLinkSettings[] = []

interface NavItemProps {
  readonly entry: NavEntry
  readonly active: boolean
  readonly count: number | null
  readonly accentCount: boolean
  onSelect(): void
}

function NavItem({ entry, active, count, accentCount, onSelect }: NavItemProps): React.JSX.Element {
  const Icon = entry.icon
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? 'page' : undefined}
        title={entry.key ? `${entry.label} (Strg+${entry.key})` : entry.label}
        className={`group relative flex h-9 w-full items-center justify-center gap-2.5 rounded-md text-[0.8125rem] transition-colors duration-150 lg:h-8 lg:justify-start lg:px-2.5 ${entry.nested ? 'lg:pl-6' : ''} ${active ? 'text-ink' : 'text-ink-2 hover:bg-base hover:text-ink'}`}
      >
        {active ? <motion.span layoutId="nav-active" className="absolute inset-0 rounded-md bg-raised" transition={{ type: 'spring', bounce: 0.12, duration: 0.32 }} /> : null}
        {Icon ? (
          <Icon
            className={`relative size-4 transition-colors ${active ? 'text-accent' : 'text-ink-3 group-hover:text-ink-2'}`}
            style={entry.color && !active ? { color: entry.color } : undefined}
            aria-hidden
            strokeWidth={1.75}
          />
        ) : (
          <span className="relative">
            <ProjectMark color={entry.color ?? 'var(--color-ink-3)'} icon={entry.deviceIcon} size="sm" />
          </span>
        )}
        <span className={`relative flex-1 truncate text-left max-lg:sr-only ${active ? 'font-[580]' : 'font-[480]'}`}>{entry.label}</span>
        {count !== null ? (
          <span
            className={`num relative text-2xs font-[600] max-lg:absolute max-lg:top-0.5 max-lg:right-1 max-lg:text-[0.625rem] max-lg:leading-none ${accentCount ? 'text-accent-text' : 'text-ink-3'}`}
          >
            {count}
          </span>
        ) : null}
      </button>
    </li>
  )
}

interface GroupHeaderProps {
  readonly group: NavGroup
  readonly collapsed: boolean
  readonly containsActive: boolean
  onToggle(): void
}

function GroupHeader({ group, collapsed, containsActive, onToggle }: GroupHeaderProps): React.JSX.Element {
  return (
    <>
      {/* Eingeklappte Leiste: nur eine Trennlinie, die Gruppen bleiben immer offen. */}
      <div aria-hidden className="mx-2 my-2 border-t border-line/70 lg:hidden" />
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="group/header mt-3 mb-0.5 hidden h-6 w-full items-center gap-1.5 rounded px-2.5 text-left text-2xs font-[600] tracking-[0.02em] text-ink-3 transition-colors hover:text-ink-2 lg:flex"
      >
        <span className="flex-1 truncate">{group.label}</span>
        {collapsed && containsActive ? <span aria-label="enthält den offenen Bereich" className="size-1.5 rounded-full bg-accent" /> : null}
        <ChevronDown aria-hidden className={`size-3 opacity-0 transition group-hover/header:opacity-100 group-focus-visible/header:opacity-100 ${collapsed ? '-rotate-90 opacity-100' : ''}`} />
      </button>
    </>
  )
}

export function Sidebar(): React.JSX.Element {
  const view = useNav((s) => s.view)
  const deviceId = useNav((s) => s.deviceId)
  const linkId = useNav((s) => s.linkId)
  const navigate = useNav((s) => s.navigate)
  const go = useNav((s) => s.go)
  const openSettings = useNav((s) => s.openSettings)
  const devices = useDevices()
  const navigation = useSettings((s) => s.settings?.navigation ?? DEFAULT_NAVIGATION)
  const links = useSettings((s) => s.settings?.links ?? NO_LINKS)
  const updateSettings = useSettings((s) => s.update)
  const openRuns = useRuns((s) => s.runs.length)
  const openTodos = useTodos((s) => openTodoCount(s.state))
  const runningTerminals = useTerminals((s) => s.terminals.filter((t) => t.running).length)
  const openPalette = usePalette((s) => s.show)
  const assistantOpen = useAssistant((s) => s.open)
  const assistantRunning = useAssistant((s) => s.running)
  const toggleAssistant = useAssistant((s) => s.toggle)
  const privacyOpen = usePrivacy((s) => s.status?.locked === false)

  const entryList = navEntries(devices, links)
  const entries = new Map(entryList.map((e) => [e.id, e]))
  const groups = visibleNavigation(navigation, entryList.map((e) => e.id))
  const active = activeNavId(view, deviceId, linkId)
  const toggleGroup = (id: string): void => {
    const collapsed = navigation.collapsed.includes(id) ? navigation.collapsed.filter((c) => c !== id) : [...navigation.collapsed, id]
    void updateSettings({ navigation: { ...navigation, collapsed } })
  }

  const badge = (id: string): number | null => {
    if (id === 'todos' && openTodos) return openTodos
    if (id === 'terminal' && runningTerminals) return runningTerminals
    if (id === 'runs' && openRuns) return openRuns
    return null
  }

  return (
    // Unter 1024 px (lg) klappt die Leiste zur Symbolleiste ein; die Namen bleiben für Screenreader und als Tooltip.
    // Nur die Bereiche scrollen; Suche oben und alles ab „Seitenleiste anpassen“ bleiben stehen.
    <aside className="flex w-14 shrink-0 flex-col overflow-hidden border-r border-line/70 bg-canvas lg:w-[13.5rem]">
      <button
        type="button"
        onClick={openPalette}
        title="Suchen (Strg+K)"
        className="mx-2 mt-3 mb-3 flex h-8 shrink-0 items-center justify-center gap-2 rounded-md border border-line bg-base text-left text-xs text-ink-3 transition-colors hover:border-line-strong hover:text-ink-2 lg:mx-3 lg:justify-start lg:px-2.5"
      >
        <Search className="size-3.5 shrink-0" aria-hidden />
        <span className="flex-1 max-lg:sr-only">Suchen …</span>
        <span className="flex gap-0.5 max-lg:hidden">
          <Kbd>Strg</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <nav aria-label="Bereiche" className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 pb-2 [scrollbar-width:none]">
        {groups.map((group, index) => {
          const collapsed = navigation.collapsed.includes(group.id)
          return (
            <div key={group.id} role="group" aria-label={group.label}>
              {index > 0 || groups.length > 1 ? (
                <GroupHeader group={group} collapsed={collapsed} containsActive={group.items.includes(active)} onToggle={() => toggleGroup(group.id)} />
              ) : null}
              <ul className={`space-y-px ${collapsed ? 'lg:hidden' : ''}`}>
                {group.items.map((id) => {
                  const entry = entries.get(id)
                  if (!entry) return null
                  return <NavItem key={id} entry={entry} active={id === active} count={badge(id)} accentCount={id === 'runs'} onSelect={() => navigate(id)} />
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      <div className="flex shrink-0 flex-col border-t border-line/70 pt-2">
        <button
          type="button"
          onClick={() => openSettings('navigation')}
          className="mx-3 mb-1 hidden h-7 items-center gap-2 rounded-md px-2.5 text-left text-2xs text-ink-3 transition-colors hover:bg-base hover:text-ink-2 lg:flex"
        >
          <SlidersHorizontal className="size-3.5" aria-hidden strokeWidth={1.75} />
          Seitenleiste anpassen
        </button>
        <UpdateNotice />
        {privacyOpen ? (
          <button
            type="button"
            onClick={() => go('settings')}
            title="Privatmodus ist aus: private Projekte sind sichtbar. In den Einstellungen wieder einschalten."
            className="mx-2 mb-2 flex h-7 shrink-0 items-center justify-center gap-2 rounded-md text-left text-2xs text-accent-text transition-colors hover:bg-base lg:mx-3 lg:justify-start lg:px-2.5"
          >
            <LockOpen className="size-3.5 shrink-0" aria-hidden strokeWidth={1.75} />
            <span className="flex-1 max-lg:sr-only">Privates sichtbar</span>
            <span className="sr-only">: Privatmodus ist aus. Zu den Einstellungen.</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={toggleAssistant}
          aria-expanded={assistantOpen}
          aria-controls={ASSISTANT_PANEL_ID}
          title="Assistent (Strg+J)"
          className={`group relative mx-2 mb-3 flex h-8 shrink-0 items-center justify-center gap-2 rounded-md border text-left text-xs transition-colors lg:mx-3 lg:justify-start lg:px-2.5 ${assistantOpen ? 'border-accent/40 bg-accent-soft text-accent-text' : 'border-line bg-base text-ink-2 hover:border-line-strong hover:text-ink'}`}
        >
          <BotMessageSquare className={`size-3.5 shrink-0 ${assistantOpen ? 'text-accent' : 'text-ink-3 group-hover:text-ink-2'}`} aria-hidden strokeWidth={1.75} />
          <span className="flex-1 max-lg:sr-only">Assistent</span>
          {assistantRunning ? (
            <span aria-label="arbeitet" className="size-1.5 animate-pulse-dot rounded-full bg-accent text-accent max-lg:absolute max-lg:top-1 max-lg:right-1" />
          ) : null}
          <span className="flex gap-0.5 max-lg:hidden">
            <Kbd>Strg</Kbd>
            <Kbd>J</Kbd>
          </span>
        </button>

        <div className="hidden lg:block">
          <QuotaPanel />
        </div>
        <div className="lg:hidden">
          <QuotaRail />
        </div>
      </div>
    </aside>
  )
}
