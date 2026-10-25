export const READ_TAIL_LINES = 80
/** Claude Code verschluckt ein Enter, das im selben Paket wie der Paste ankommt. */
export const SUBMIT_DELAY_MS = 150

const PASTE_START = '\x1b[200~'
const PASTE_END = '\x1b[201~'
const SUBMIT = '\r'
// CSI-Sequenzen, OSC (Titel, Links) bis BEL oder ST, übrige Zwei-Zeichen-Escapes.
const ANSI = /\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[@-Z\\-_]/g
const ESC = /\x1b/g

/** Lesbarer Text der letzten `lines` Zeilen eines Terminalpuffers. */
export function tailText(raw: string, lines: number): string {
  const rows = raw
    .replace(ANSI, '')
    .split(/\r?\n/)
    .map((row) => row.replace(/\r/g, '').trimEnd())
  while (rows.length && rows[rows.length - 1] === '') rows.pop()
  return rows.slice(-lines).join('\n')
}

/** Text als ein Block einfügen (mehrzeilig wird nicht zeilenweise abgeschickt), dann absenden. */
export async function pasteAndSubmit(write: (data: string) => void, text: string, sleep: (ms: number) => Promise<void>): Promise<void> {
  write(`${PASTE_START}${text.replace(ESC, '').replace(/\r\n/g, '\n')}${PASTE_END}`)
  await sleep(SUBMIT_DELAY_MS)
  write(SUBMIT)
}
