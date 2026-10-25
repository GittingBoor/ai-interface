import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProtocolDocument, ProtocolGroup } from '@shared/types'
import { openDatabase } from '../../src/main/db/Database'
import { OpenTasksService, type ProtocolSource } from '../../src/main/tasks/OpenTasksService'
import { TaskChecksRepo } from '../../src/main/tasks/TaskChecksRepo'

const group = (id: string, files: Readonly<Record<string, string>>, over: Partial<ProtocolGroup> = {}): ProtocolGroup => ({
  id,
  label: id,
  favoriteId: null,
  color: null,
  icon: null,
  // modifiedAt absichtlich gegenläufig: entscheidend ist das Datum im Dateinamen.
  entries: Object.keys(files).map((name, i) => ({ path: `${id}/${name}`, name, modifiedAt: 1000 - i, size: 1 })),
  ...over
})

class FakeVault implements ProtocolSource {
  readonly docs = new Map<string, string>()
  groups: ProtocolGroup[] = []
  failing = new Set<string>()

  add(id: string, files: Readonly<Record<string, string>>, over: Partial<ProtocolGroup> = {}): void {
    this.groups.push(group(id, files, over))
    for (const [name, content] of Object.entries(files)) this.docs.set(`${id}/${name}`, content)
  }

  async list(): Promise<ProtocolGroup[]> {
    return this.groups
  }

  async read(path: string): Promise<ProtocolDocument> {
    if (this.failing.has(path)) throw new Error('kaputt')
    return { path, name: path, content: this.docs.get(path) ?? '', modifiedAt: 0 }
  }
}

const open = (...items: readonly string[]): string => ['## S', '**Offen:**', ...items.map((i) => `- [ ] ${i}`)].join('\n')

let vault: FakeVault
let logError: ReturnType<typeof vi.fn>
let service: OpenTasksService
beforeEach(() => {
  vault = new FakeVault()
  logError = vi.fn()
  service = new OpenTasksService(vault, new TaskChecksRepo(openDatabase(':memory:')), logError)
})

describe('OpenTasksService', () => {
  it('nimmt je Projekt das Protokoll mit dem jüngsten Datum im Dateinamen', async () => {
    vault.add('P/Protokoll', { '2026-10-18.md': open('neu'), '2026-10-02.md': open('alt') })
    const [p] = await service.list()
    expect(p?.tasks.map((t) => t.text)).toEqual(['neu'])
    expect(p?.protocolPath).toBe('P/Protokoll/2026-10-18.md')
    expect(p?.protocolDate).toBe(new Date(2026, 9, 18).getTime())
  })

  it('blendet erledigte und abgehakte Aufgaben aus, uncheck holt sie zurück', async () => {
    vault.add('P/Protokoll', { '2026-10-18.md': `${open('a', 'b')}\n- [x] c` })
    const first = await service.list()
    const key = first[0]?.tasks.find((t) => t.text === 'a')?.key ?? ''
    service.check('P/Protokoll', key)
    expect((await service.list())[0]?.tasks.map((t) => t.text)).toEqual(['b'])
    service.uncheck('P/Protokoll', key)
    expect((await service.list())[0]?.tasks.map((t) => t.text)).toEqual(['a', 'b'])
  })

  it('lässt Projekte ohne offene Aufgaben weg und sortiert nach Protokolldatum', async () => {
    vault.add('A/Protokoll', { '2026-10-01.md': open('x') })
    vault.add('B/Protokoll', { '2026-10-15.md': open('y') })
    vault.add('C/Protokoll', { '2026-10-16.md': '## S\n**Offen:** –' })
    expect((await service.list()).map((p) => p.groupId)).toEqual(['B/Protokoll', 'A/Protokoll'])
  })

  it('ein Lesefehler lässt die anderen Projekte durch und wird gemeldet', async () => {
    vault.add('A/Protokoll', { '2026-10-01.md': open('x') })
    vault.add('B/Protokoll', { '2026-10-15.md': open('y') })
    vault.failing.add('B/Protokoll/2026-10-15.md')
    expect((await service.list()).map((p) => p.groupId)).toEqual(['A/Protokoll'])
    expect(logError).toHaveBeenCalledOnce()
  })

  it('ignoriert Dateien ohne Datum im Namen', async () => {
    vault.add('A/Protokoll', { 'Notizen.md': open('x') })
    expect(await service.list()).toEqual([])
  })
})
