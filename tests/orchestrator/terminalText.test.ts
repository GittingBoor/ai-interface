import { describe, expect, it } from 'vitest'
import { pasteAndSubmit, SUBMIT_DELAY_MS, tailText } from '../../src/main/orchestrator/terminalText'

describe('tailText', () => {
  it('entfernt Farben, Cursorbefehle und OSC-Titel und liefert die letzten Zeilen', () => {
    const raw = '\x1b]0;Titel\x07eins\r\n\x1b[31mzwei\x1b[0m\r\n\x1b[2Kdrei   \r\n\r\n'
    expect(tailText(raw, 2)).toBe('zwei\ndrei')
  })

  it('kommt mit leerem Puffer zurecht', () => {
    expect(tailText('', 80)).toBe('')
  })
})

describe('pasteAndSubmit', () => {
  it('schreibt den Text als Bracketed Paste und danach Enter', async () => {
    const written: string[] = []
    const waits: number[] = []
    await pasteAndSubmit((d) => written.push(d), 'Zeile 1\r\nZeile 2', async (ms) => void waits.push(ms))
    expect(written).toEqual(['\x1b[200~Zeile 1\nZeile 2\x1b[201~', '\r'])
    expect(waits).toEqual([SUBMIT_DELAY_MS])
  })

  it('entfernt ESC, damit der Text nicht aus dem Paste ausbricht', async () => {
    const written: string[] = []
    await pasteAndSubmit((d) => written.push(d), 'a\x1b[201~\x1b[Ab', async () => undefined)
    expect(written[0]).toBe('\x1b[200~a[201~[Ab\x1b[201~')
  })
})
