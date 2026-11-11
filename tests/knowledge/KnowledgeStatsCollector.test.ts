import { describe, expect, it } from 'vitest'
import type { ExecResult } from '../../src/main/hosts/Host'
import { KnowledgeStatsCollector } from '../../src/main/knowledge/KnowledgeStatsCollector'
import { FakeHost } from '../helpers/FakeHost'

const ok = (stdout: string): ExecResult => ({ stdout, stderr: '', code: 0 })
const fail: ExecResult = { stdout: '', stderr: 'fatal', code: 128 }

function gitRepo(): FakeHost {
  const host = new FakeHost()
  host.execHandler = (command) => {
    if (command.includes('rev-parse HEAD')) return ok('abc123\n')
    if (command.includes('--numstat')) return ok(['40\t0\tsrc/app.ts', '10\t0\tpackage.json', '5\t0\tREADME.md', ''].join('\u0000'))
    if (command.includes('--format=%ad')) return ok('2026-02-10\n2026-01-03\n')
    if (command.includes('shortlog')) return ok('     2\tAda\n')
    if (command.includes('--name-only')) return ok('src/app.ts\n\nsrc/app.ts\nREADME.md\n')
    return fail
  }
  host.setFile('/p/package.json', JSON.stringify({ dependencies: { zod: '^4' } }))
  return host
}

describe('KnowledgeStatsCollector', () => {
  it('returns null without git', async () => {
    const host = new FakeHost()
    host.execHandler = () => fail
    expect(await new KnowledgeStatsCollector(() => undefined).collect(host, '/p')).toBeNull()
  })

  it('combines git output and manifests', async () => {
    const stats = await new KnowledgeStatsCollector(() => undefined, () => 42).collect(gitRepo(), '/p')
    expect(stats).toMatchObject({
      computedAt: 42,
      files: 3,
      lines: 55,
      commits: 2,
      firstCommit: '2026-01-03',
      lastCommit: '2026-02-10',
      contributorCount: 1,
      contributors: [{ name: 'Ada', commits: 2 }],
      activity: [
        { month: '2026-01', commits: 1 },
        { month: '2026-02', commits: 1 }
      ]
    })
    expect(stats?.hotspots[0]).toEqual({ path: 'src/app.ts', changes: 2, lines: 40 })
    expect(stats?.dependencies).toEqual([{ name: 'zod', version: '^4', ecosystem: 'npm', dev: false, manifest: 'package.json' }])
  })

  it('logs an unreadable manifest and keeps the rest', async () => {
    const host = gitRepo()
    host.failRead = (path) => path.endsWith('package.json')
    const errors: string[] = []
    const stats = await new KnowledgeStatsCollector((message) => errors.push(message)).collect(host, '/p')
    expect(stats?.dependencies).toEqual([])
    expect(stats?.files).toBe(3)
    expect(errors).toHaveLength(1)
  })
})
