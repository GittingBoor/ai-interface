import type { TerminalStatus, TerminalStatusChange } from '@shared/types'
import type { HookEvent, HookEventKind } from '../notify/hookSettings'

type Listener = (change: TerminalStatusChange) => void

const STATUS_BY_HOOK: Readonly<Record<Exclude<HookEventKind, 'done'>, TerminalStatus>> = {
  working: 'working',
  question: 'question',
  permission: 'permission',
  ended: 'exited'
}

interface Entry {
  status: TerminalStatus
  lastAnswer: string | null
  /** Text der offenen Frage oder Erlaubnis-Abfrage. */
  prompt: string | null
}

/** Zustand je Terminal aus Hook-Ereignissen; „fertig“ bleibt blau, bis das Terminal angesehen wird. */
export class TerminalStatusTracker {
  private readonly entries = new Map<string, Entry>()
  private readonly listeners = new Set<Listener>()
  private viewing: ReadonlySet<string> = new Set()
  private windowFocused = false

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  add(id: string): void {
    this.entries.set(id, { status: 'idle', lastAnswer: null, prompt: null })
  }

  remove(id: string): void {
    this.entries.delete(id)
  }

  status(id: string): TerminalStatus | undefined {
    return this.entries.get(id)?.status
  }

  /** Letzte Antwort von Claude aus dem `Stop`-Hook. */
  lastAnswer(id: string): string | null {
    return this.entries.get(id)?.lastAnswer ?? null
  }

  /** Offene Frage oder Erlaubnis-Abfrage, sonst `null`. */
  pendingPrompt(id: string): string | null {
    return this.entries.get(id)?.prompt ?? null
  }

  handle(events: readonly HookEvent[]): void {
    for (const event of events) this.handleOne(event)
  }

  exit(id: string): void {
    this.set(id, 'exited')
  }

  /** Vom Renderer: welche Terminals gerade zu sehen sind; angesehene „fertig“-Terminals werden bereit. */
  setViewing(ids: readonly string[], windowFocused: boolean): void {
    this.viewing = new Set(ids)
    this.windowFocused = windowFocused
    for (const id of ids) if (this.isSeen(id) && this.status(id) === 'review') this.set(id, 'idle')
  }

  private handleOne(event: HookEvent): void {
    const entry = this.entries.get(event.terminalId)
    if (!entry || entry.status === 'exited') return
    entry.prompt = event.kind === 'question' || event.kind === 'permission' ? event.message : null
    if (event.kind !== 'done') return this.set(event.terminalId, STATUS_BY_HOOK[event.kind])
    entry.lastAnswer = event.message
    this.set(event.terminalId, this.isSeen(event.terminalId) ? 'idle' : 'review')
  }

  private isSeen(id: string): boolean {
    return this.windowFocused && this.viewing.has(id)
  }

  private set(id: string, status: TerminalStatus): void {
    const entry = this.entries.get(id)
    if (!entry || entry.status === status) return
    entry.status = status
    for (const listener of this.listeners) listener({ id, status })
  }
}
