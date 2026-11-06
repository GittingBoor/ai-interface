import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Terminal, type ITheme } from '@xterm/xterm'
import type { TerminalInfo } from '@shared/types'
import { api } from '@renderer/api/client'
import { attempt, reportError } from '@renderer/api/call'
import { notify } from '@renderer/stores/toastStore'
import { currentT } from '@renderer/i18n/useT'
import { pasteExtensionOf, shouldPasteImage } from './pasteImage'
import { isNewlineCombo, isPasteCombo, mapTerminalKey } from './terminalKeys'

const SCROLLBACK_LINES = 8000
const FONT_SIZE = 13
const MAX_PENDING_CHUNKS = 200
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
  /** Nur zum Mitlesen (Hintergrundläufe): keine Eingabe, kein Fokus. */
  readonly readOnly: boolean
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
      else this.buffer(id, data)
    })
  }

  /** Daten ohne Sitzung (z. B. Hintergrundläufe) nur begrenzt vorhalten. */
  private buffer(id: string, data: string): void {
    const chunks = [...(this.pending.get(id) ?? []), data]
    this.pending.set(id, chunks.slice(-MAX_PENDING_CHUNKS))
  }

  ensure(info: TerminalInfo, initial = ''): void {
    if (this.sessions.has(info.id)) return
    const term = this.create(info, false)
    if (initial) term.write(initial)
    for (const chunk of this.pending.get(info.id) ?? []) term.write(chunk)
    this.pending.delete(info.id)
  }

  /**
   * Hintergrundlauf nur zum Mitlesen. Der Snapshot enthält alles, was vor seiner Antwort
   * gepuffert wurde; der Puffer wird deshalb verworfen statt doppelt eingespielt.
   * Synchron direkt nach dem Snapshot aufrufen, damit dazwischen keine Daten ankommen.
   */
  ensureReadOnly(info: TerminalInfo, snapshot: string): void {
    if (this.sessions.has(info.id)) return
    this.pending.delete(info.id)
    const term = this.create(info, true)
    if (snapshot) term.write(snapshot)
  }

  private create(info: TerminalInfo, readOnly: boolean): Terminal {
    const term = new Terminal({
      theme: THEME,
      fontFamily: FONT_FAMILY,
      fontSize: FONT_SIZE,
      lineHeight: 1.25,
      cursorBlink: !readOnly,
      cursorStyle: 'bar',
      disableStdin: readOnly,
      scrollback: SCROLLBACK_LINES,
      allowProposedApi: false,
      macOptionIsMeta: true
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.loadAddon(new WebLinksAddon())
    const element = document.createElement('div')
    element.style.width = '100%'
    element.style.height = '100%'
    this.sessions.set(info.id, { term, fit, element, readOnly, opened: false, opening: false, cols: 0, rows: 0 })
    if (!readOnly) this.wireInput(info.id, term, element)
    return term
  }

  private wireInput(id: string, term: Terminal, element: HTMLDivElement): void {
    term.onData((data) => api.terminalInput.write(id, data))
    term.attachCustomKeyEventHandler((event) => {
      const sequence = mapTerminalKey(event)
      if (sequence !== null) api.terminalInput.write(id, sequence)
      // Alle Ereignistypen der Kombination blockieren, sonst sendet xterm zusätzlich ein Enter.
      return !isNewlineCombo(event) && !isPasteCombo(event)
    })
    // Capture-Phase: vor xterm entscheiden, ob ein Bild statt Text eingefügt wird.
    element.addEventListener(
      'paste',
      (event) => {
        if (!event.clipboardData || !shouldPasteImage([...event.clipboardData.types])) return
        event.preventDefault()
        event.stopPropagation()
        void attempt(api.terminal.pasteImage(id))
      },
      true
    )
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
        if (!session.readOnly && container.offsetParent !== null) session.term.focus()
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

  /** Legt hereingezogene Bilder im Terminal ab; andere Dateien werden gemeldet und übersprungen. */
  dropFiles(id: string, files: readonly File[]): void {
    const images = files.flatMap((file) => {
      const extension = pasteExtensionOf(file.name)
      return extension ? [{ file, extension }] : []
    })
    if (images.length < files.length) {
      const t = currentT().terminal
      notify.error(t.notImage, t.imageTypes)
    }
    if (!images.length) return
    void Promise.all(images.map(async ({ file, extension }) => ({ data: new Uint8Array(await file.arrayBuffer()), extension })))
      .then(async (dropped) => {
        await attempt(api.terminal.dropImages(id, dropped))
        this.focus(id)
      })
      .catch(reportError)
  }

  writeNotice(id: string, text: string): void {
    this.sessions.get(id)?.term.write(`\r\n\x1b[2m${text}\x1b[0m\r\n`)
  }

  dispose(id: string): void {
    this.pending.delete(id)
    const session = this.sessions.get(id)
    if (!session) return
    session.term.dispose()
    session.element.remove()
    this.sessions.delete(id)
  }
}

export const terminalRegistry = new TerminalRegistry()
