import { describe, expect, it } from 'vitest'
import type { Favorite, FolderEntry, GitState, HostId, ImageMeta, InterruptedRun, MiniPcSnapshot, SkillCatalogResult, SkillEntry, TerminalInfo } from '@shared/types'
import {
  filterFavorites,
  filterFolders,
  filterGit,
  filterImages,
  filterMiniPc,
  filterRuns,
  filterSkills,
  filterTerminals,
  isImageHidden
} from '../../src/main/privacy/filters'

const LOCAL_PRIVATE = 'D:\\GitHub\\Privat\\Tagebuch-App'
const REMOTE_PRIVATE = '/home/alex/projects/geheim'
const hidden = (host: HostId, path: string | null): boolean =>
  path !== null &&
  ((host === 'local' && path.toLowerCase().startsWith(LOCAL_PRIVATE.toLowerCase())) || (host === 'mini-pc' && path.startsWith(REMOTE_PRIVATE)))

const cast = <T>(value: unknown): T => value as T

describe('Privatfilter', () => {
  it('Favoriten', () => {
    const items = cast<Favorite[]>([
      { id: 1, host: 'local', path: LOCAL_PRIVATE },
      { id: 2, host: 'local', path: 'D:\\GitHub\\Projects\\ai-interface' }
    ])
    expect(filterFavorites(items, hidden).map((f) => f.id)).toEqual([2])
  })

  it('Bilder und Bild per ID', () => {
    const priv = cast<ImageMeta>({ id: 1, host: 'local', project: `${LOCAL_PRIVATE}\\Eintraege 2026` })
    const loose = cast<ImageMeta>({ id: 2, host: null, project: null })
    const pub = cast<ImageMeta>({ id: 3, host: 'local', project: 'D:\\GitHub\\Games\\Echoreich' })
    expect(filterImages([priv, loose, pub], hidden).map((i) => i.id)).toEqual([2, 3])
    expect(isImageHidden(priv, hidden)).toBe(true)
    expect(isImageHidden(loose, hidden)).toBe(false)
  })

  it('Offene Durchläufe und Terminals', () => {
    const runs = cast<InterruptedRun[]>([
      { host: 'local', sessionId: 'a', project: LOCAL_PRIVATE },
      { host: 'mini-pc', sessionId: 'b', project: LOCAL_PRIVATE }
    ])
    expect(filterRuns(runs, hidden).map((r) => r.sessionId)).toEqual(['b'])
    const terms = cast<TerminalInfo[]>([
      { id: 't1', host: 'mini-pc', path: `${REMOTE_PRIVATE}/src` },
      { id: 't2', host: 'mini-pc', path: '/home/alex/projects/ai-interface' }
    ])
    expect(filterTerminals(terms, hidden).map((t) => t.id)).toEqual(['t2'])
  })

  it('Ordnerliste, Git-Stände und Mini-PC-Sessions', () => {
    const folders = cast<FolderEntry[]>([
      { name: 'Tagebuch', path: LOCAL_PRIVATE },
      { name: 'InvokeAI', path: 'D:\\GitHub\\ImageGeneration\\InvokeAI' }
    ])
    expect(filterFolders('local', folders, hidden).map((f) => f.name)).toEqual(['InvokeAI'])
    expect(filterFolders('mini-pc', folders, hidden)).toHaveLength(2)
    const git = cast<GitState[]>([{ path: REMOTE_PRIVATE, name: 'geheim' }, { path: '/home/alex/projects/x', name: 'x' }])
    expect(filterGit('mini-pc', git, hidden).map((g) => g.name)).toEqual(['x'])
    const snapshot = cast<MiniPcSnapshot>({ online: true, claude: [{ pid: 1, cwd: REMOTE_PRIVATE }, { pid: 2, cwd: null }, { pid: 3, cwd: '/tmp' }] })
    expect(filterMiniPc('mini-pc', snapshot, hidden).claude.map((c) => c.pid)).toEqual([2, 3])
  })

  it('Skills: Projekt-Skills und ihre Beziehungen', () => {
    const entry = (id: string, project: string | null): SkillEntry => cast<SkillEntry>({ id, host: 'local', path: `${project ?? 'C:\\Users\\Alex\\.claude'}\\skills\\${id}`, project })
    const result = cast<SkillCatalogResult>({
      host: 'local',
      entries: [entry('a', LOCAL_PRIVATE), entry('b', null), entry('c', 'D:\\GitHub\\Projects\\ai-interface')],
      relations: [
        { from: 'a', to: 'b', kind: 'uses' },
        { from: 'b', to: 'c', kind: 'uses' }
      ],
      errors: []
    })
    const filtered = filterSkills(result, hidden)
    expect(filtered.entries.map((e) => e.id)).toEqual(['b', 'c'])
    expect(filtered.relations).toEqual([{ from: 'b', to: 'c', kind: 'uses' }])
  })
})
