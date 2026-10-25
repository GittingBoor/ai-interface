import type { NotificationSettings, TerminalInfo } from '@shared/types'
import type { HookEvent, HookEventKind } from './hookSettings'

const MAX_BODY_LENGTH = 140
/** Gleiche Ereignisse eines Terminals innerhalb dieses Abstands zählen nur einmal. */
const DEDUPE_WINDOW_MS = 3_000

type NotifiedKind = Exclude<HookEventKind, 'working' | 'ended'>

const TITLE: Readonly<Record<NotifiedKind, string>> = {
  permission: 'Erlaubnis nötig',
  question: 'Frage von Claude',
  done: 'Claude ist fertig'
}

export interface ShownNotification {
  readonly title: string
  readonly body: string
  onClick(): void
}

export interface NotificationDeps {
  settings(): NotificationSettings
  terminal(id: string): TerminalInfo | undefined
  show(notification: ShownNotification): void
  focusTerminal(id: string): void
  now(): number
}

const shorten = (text: string): string => (text.length <= MAX_BODY_LENGTH ? text : `${text.slice(0, MAX_BODY_LENGTH - 1)}…`)

/** Entscheidet, welche Hook-Ereignisse als Desktop-Benachrichtigung erscheinen. */
export class NotificationService {
  private viewing: ReadonlySet<string> = new Set()
  private windowFocused = false
  private readonly lastShown = new Map<string, number>()

  constructor(private readonly deps: NotificationDeps) {}

  /** Vom Renderer: welche Terminals gerade zu sehen sind und ob das Fenster den Fokus hat. */
  setViewing(ids: readonly string[], windowFocused: boolean): void {
    this.viewing = new Set(ids)
    this.windowFocused = windowFocused
  }

  handle(events: readonly HookEvent[]): void {
    for (const event of events) this.handleOne(event)
  }

  private handleOne(event: HookEvent): void {
    if (event.kind === 'working' || event.kind === 'ended') return
    const kind: NotifiedKind = event.kind
    if (!this.deps.settings()[kind]) return
    const terminal = this.deps.terminal(event.terminalId)
    if (!terminal) return
    if (this.windowFocused && this.viewing.has(terminal.id)) return
    const key = `${terminal.id}|${kind}`
    const now = this.deps.now()
    const last = this.lastShown.get(key)
    if (last !== undefined && now - last < DEDUPE_WINDOW_MS) return
    this.lastShown.set(key, now)
    this.deps.show({
      title: `${TITLE[kind]} · ${terminal.title}`,
      body: shorten(event.message),
      onClick: () => this.deps.focusTerminal(terminal.id)
    })
  }
}
