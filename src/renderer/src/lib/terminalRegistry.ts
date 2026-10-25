import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Terminal, type ITheme } from '@xterm/xterm'
import type { TerminalInfo } from '@shared/types'
import { api } from '@renderer/api/client'
import { attempt } from '@renderer/api/call'
import { shouldPasteImage } from './pasteImage'
import { isNewlineCombo, isPasteCombo, mapTerminalKey } from './terminalKeys'

const SCROLLBACK_LINES = 8000
const FONT_SIZE = 13
const FONT_FAMILY = "'JetBrains Mono Variable', 'Cascadia Mono', Consolas, monospace"

/** Terminal-Farben passend zum Farbsystem „Glut“. */
const THEME: ITheme = {
  background: '#0f0e0c',
  foreground: '#e6e3de',
  cursor: '#fb9344',
  cursorAccent: '#0f0e0c',
  selectionBackground: '#fb934452',
  // Schieber wie die App-Scrollbar: Graphit, beim Ziehen Glut
  scrollbarSliderBackground: '#403c39b3',
  scrollbarSliderHoverBackground: '#8f8c86',
  scrollbarSliderActiveBackground: '#fb9344',
  black: '#1e1b19',
  red: '#ef6661',
  green: '#8ed09c',
  yellow: '#e4b750',
  blue: '#90baf1',
  magenta: '#c9a3f0',
  cyan: '#7fd1cf',
  white: '#d8d4ce',
  brightBlack: '#6f6b65',
  brightRed: '#ff8a80',
  brightGreen: '#a9e3b4',
  brightYellow: '#f2cd73',
  brightBlue: '#b4d0f7',
  brightMagenta: '#dcc0f7',
  brightCyan: '#a4e3e1',
  brightWhite: '#f2f0ec'
}

interface Session {
  readonly term: Terminal
  readonly fit: FitAddon
  readonly element: HTMLDivElement
  opened: boolean
  opening: boolean
  cols: number
  rows: number
}

/**
 * Hält die xterm-Instanzen unabhängig von React am Leben. Daten, die vor dem
 * Anlegen einer Sitzung eintreffen, werden gepuffert und dann eingespielt.
 */
class TerminalRegistry {
  private readonly sessions = new Map<string, Session>()
  private readonly pending = new Map<string, string[]>()
  private listening = false

  listen(): void {
    if (this.listening) return
    this.listening = true
    api.on('terminal:data', ({ id, data }) => {
      const session = this.sessions.get(id)
      if (session) session.term.write(data)
      else this.pending.set(id, [...(this.pending.get(id) ?? []), data])
    })
  }

  ensure(info: TerminalInfo, initial = ''): void {
    if (this.sessions.has(info.id)) return
    const term = new Terminal({
      theme: THEME,
      fontFamily: FONT_FAMILY,
      fontSize: FONT_SIZE,
      lineHeight: 1.25,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: SCROLLBACK_LINES,
      allowProposedApi: false,
      macOptionIsMeta: true
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.loadAddon(new WebLinksAddon())
    term.onData((data) => api.terminalInput.write(info.id, data))
    term.attachCustomKeyEventHandler((event) => {
      const sequence = mapTerminalKey(event)
      if (sequence !== null) api.terminalInput.write(info.id, sequence)
      // Alle Ereignistypen der Kombination blockieren, sonst sendet xterm zusätzlich ein Enter.
      return !isNewlineCombo(event) && !isPasteCombo(event)
    })
    const element = document.createElement('div')
    element.style.width = '100%'
    element.style.height = '100%'
    // Capture-Phase: vor xterm entscheiden, ob ein Bild statt Text eingefügt wird.
    element.addEventListener(
      'paste',
      (event) => {
        if (!event.clipboardData || !shouldPasteImage([...event.clipboardData.types])) return
        event.preventDefault()
        event.stopPropagation()
        void attempt(api.terminal.pasteImage(info.id))
      },
      true
    )
    this.sessions.set(info.id, { term, fit, element, opened: false, opening: false, cols: 0, rows: 0 })
    if (initial) term.write(initial)
    for (const chunk of this.pending.get(info.id) ?? []) term.write(chunk)
    this.pending.delete(info.id)
  }

  /** Hängt das Terminal in den Container (einmalig öffnen, danach nur verschieben). */
  attach(id: string, container: HTMLElement): void {
    const session = this.sessions.get(id)
    if (!session) return
    if (session.element.parentElement !== container) container.appendChild(session.element)
    if (session.opened || session.opening) return
    session.opening = true
    // Erst nach dem Laden der gebündelten Mono-Schrift öffnen, sonst misst xterm falsche Zellbreiten.
    void document.fonts
      .load(`${FONT_SIZE}px 'JetBrains Mono Variable'`)
      .catch(() => [])
      .then(() => {
        if (!this.sessions.has(id)) return
        session.term.open(session.element)
        session.opened = true
        this.fit(id)
        if (container.offsetParent !== null) session.term.focus()
      })
  }

  /** Passt die Größe an; meldet neue Spalten/Zeilen an den Main-Prozess. */
  fit(id: string): void {
    const session = this.sessions.get(id)
    if (!session?.opened || session.element.clientWidth === 0 || session.element.clientHeight === 0) return
    session.fit.fit()
    const { cols, rows } = session.term
    if (cols !== session.cols || rows !== session.rows) {
      session.cols = cols
      session.rows = rows
      api.terminalInput.resize(id, cols, rows)
    }
  }

  focus(id: string): void {
    this.sessions.get(id)?.term.focus()
  }

  /** Fügt Text wie eingefügt ein (Bracketed Paste): Zeilenumbrüche lösen kein Enter aus. */
  paste(id: string, text: string): boolean {
    const session = this.sessions.get(id)
    if (!session?.opened) return false
    session.term.paste(text)
    session.term.focus()
    return true
  }

  writeNotice(id: string, text: string): void {
    this.sessions.get(id)?.term.write(`\r\n\x1b[2m${text}\x1b[0m\r\n`)
  }

  dispose(id: string): void {
    const session = this.sessions.get(id)
    if (!session) return
    session.term.dispose()
    session.element.remove()
    this.sessions.delete(id)
    this.pending.delete(id)
  }
}

export const terminalRegistry = new TerminalRegistry()
