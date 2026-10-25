import { describe, expect, it } from 'vitest'
import type { TerminalInfo } from '@shared/types'
import { bracketedPath, PasteImageService } from '../../src/main/terminal/PasteImageService'
import { FakeHost } from '../helpers/FakeHost'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])
const DAY_MS = 86_400_000

const terminal = (host: TerminalInfo['host']): TerminalInfo => ({ id: 't1', host, path: '/p', mode: 'new', title: 'x', running: true, startedAt: 0 })

describe('PasteImageService', () => {
  it('schreibt das Bild auf den Host des Terminals und fügt den Pfad als Bracketed Paste ein', async () => {
    const local = new FakeHost('local', '/home/l')
    const mini = new FakeHost('mini-pc', '/home/alex')
    const written: string[] = []
    const service = new PasteImageService(
      (id) => (id === 'local' ? local : mini),
      { info: () => terminal('mini-pc'), write: (_id, data) => written.push(data) },
      () => 1_700_000_000_000
    )
    const path = await service.paste('t1', PNG)
    expect(path.startsWith('/tmp/ai-interface-paste/1700000000000-')).toBe(true)
    expect(path.endsWith('.png')).toBe(true)
    expect([...(mini.files.get(path)?.data ?? [])]).toEqual([...PNG])
    expect(local.files.size).toBe(0)
    expect(written).toEqual([bracketedPath(path)])
  })

  it('räumt nur Dateien auf, die älter als die Frist sind', async () => {
    const host = new FakeHost('local', '/home/l')
    const service = new PasteImageService(() => host, { info: () => terminal('local'), write: () => undefined }, () => 10 * DAY_MS)
    host.setFile('/tmp/ai-interface-paste/alt.png', 'x')
    host.files.set('/tmp/ai-interface-paste/alt.png', { data: Buffer.from('x'), mtimeMs: 8 * DAY_MS })
    host.files.set('/tmp/ai-interface-paste/neu.png', { data: Buffer.from('y'), mtimeMs: 10 * DAY_MS - 1000 })
    expect(await service.cleanup(host, DAY_MS)).toBe(1)
    expect([...host.files.keys()]).toEqual(['/tmp/ai-interface-paste/neu.png'])
  })
})

describe('bracketedPath', () => {
  it('setzt Pfade mit Leerzeichen in Anführungszeichen', () => {
    expect(bracketedPath('C:\\Users\\A B\\x.png')).toBe('\x1b[200~"C:\\Users\\A B\\x.png"\x1b[201~')
    expect(bracketedPath('/tmp/x.png')).toBe('\x1b[200~/tmp/x.png\x1b[201~')
  })
})
