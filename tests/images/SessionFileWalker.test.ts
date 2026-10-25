import { describe, expect, it } from 'vitest'
import { openDatabase } from '../../src/main/db/Database'
import { ScanOffsets } from '../../src/main/images/ScanOffsets'
import { SessionFileWalker } from '../../src/main/images/SessionFileWalker'
import { FakeHost } from '../helpers/FakeHost'

const FILE = '/home/alex/.claude/projects/p/s.jsonl'
const NOW = 1_000_000

/** Handler wie die Scanner: verbraucht nur vollständige Zeilen. */
function collector(): { lines: string[]; chunkSizes: number[]; handle: (chunk: string) => number } {
  const lines: string[] = []
  const chunkSizes: number[] = []
  return {
    lines,
    chunkSizes,
    handle: (chunk) => {
      chunkSizes.push(Buffer.byteLength(chunk))
      const end = chunk.lastIndexOf('\n')
      if (end === -1) return 0
      lines.push(...chunk.slice(0, end).split('\n'))
      return Buffer.byteLength(chunk.slice(0, end + 1))
    }
  }
}

describe('SessionFileWalker', () => {
  it('liest große Dateien in Blöcken und verliert keine Zeile', async () => {
    const host = new FakeHost('mini-pc', '/home/alex')
    const content = Array.from({ length: 20 }, (_, i) => `zeile-${String(i).padStart(2, '0')}`).join('\n') + '\n'
    host.setFile(FILE, content)
    const walker = new SessionFileWalker(new ScanOffsets(openDatabase(':memory:'), 'run_offsets'), 30, () => NOW, 32)
    const c = collector()
    await walker.walk(host, c.handle)
    expect(c.lines).toEqual(Array.from({ length: 20 }, (_, i) => `zeile-${String(i).padStart(2, '0')}`))
    expect(Math.max(...c.chunkSizes)).toBeLessThanOrEqual(32)
  })

  it('verarbeitet Zeilen, die länger als ein Block sind', async () => {
    const host = new FakeHost('mini-pc', '/home/alex')
    const long = 'x'.repeat(100)
    host.setFile(FILE, `kurz\n${long}\nende\n`)
    const walker = new SessionFileWalker(new ScanOffsets(openDatabase(':memory:'), 'run_offsets'), 30, () => NOW, 16)
    const c = collector()
    await walker.walk(host, c.handle)
    expect(c.lines).toEqual(['kurz', long, 'ende'])
  })

  it('lässt eine unvollständige letzte Zeile für den nächsten Lauf liegen', async () => {
    const host = new FakeHost('mini-pc', '/home/alex')
    host.setFile(FILE, 'a\nb\nhal')
    const offsets = new ScanOffsets(openDatabase(':memory:'), 'run_offsets')
    const walker = new SessionFileWalker(offsets, 30, () => NOW, 4)
    const c = collector()
    await walker.walk(host, c.handle)
    host.appendFile(FILE, 'b\n')
    await walker.walk(host, c.handle)
    expect(c.lines).toEqual(['a', 'b', 'halb'])
  })

  it('liest Subagenten-Dateien nur auf Wunsch', async () => {
    const host = new FakeHost('mini-pc', '/home/alex')
    host.setFile(FILE, 'haupt\n')
    host.setFile('/home/alex/.claude/projects/p/s/subagents/agent-1.jsonl', 'sub\n')
    const walker = (): SessionFileWalker => new SessionFileWalker(new ScanOffsets(openDatabase(':memory:'), 'run_offsets'), 30, () => NOW)
    const without = collector()
    await walker().walk(host, without.handle)
    expect(without.lines).toEqual(['haupt'])
    const withSub = collector()
    await walker().walk(host, withSub.handle, true)
    expect(withSub.lines).toEqual(['haupt', 'sub'])
  })
})
