import { describe, expect, it } from 'vitest'
import { parseGitStatusBatch } from '../../src/main/minipc/parseGitStatus'
import { parseClaudeSessions, parseSystem } from '../../src/main/minipc/parseSystem'

const GIT = [
  '@@AII@@ /home/alex/projects/ai-interface/',
  '# branch.oid c9d5695605a5ff0e024690907bc3009857e916b3',
  '# branch.head feature/app',
  '# branch.upstream origin/feature/app',
  '# branch.ab +2 -1',
  '1 M. N... 100644 100644 100644 12bf 12bf src/a.ts',
  '1 .M N... 100644 100644 100644 98580 98580 README.md',
  '1 MM N... 100644 100644 100644 aebe aebe b.ts',
  '? neu.txt',
  '@@AII@@ /home/alex/projects/detached/',
  '# branch.oid 047f17aa',
  '# branch.head (detached)',
  '@@AII@@ /home/alex/projects/ohne-remote/',
  '# branch.oid (initial)',
  '# branch.head main',
  '@@AII-ERR@@ /home/alex/projects/kaputt/ fatal: not a git repository',
  ''
].join('\n')

describe('parseGitStatusBatch', () => {
  it('liest Branch, ahead/behind und Änderungen je Projekt', () => {
    const [aii, detached, noRemote, broken] = parseGitStatusBatch(GIT)
    expect(aii).toEqual({
      path: '/home/alex/projects/ai-interface',
      name: 'ai-interface',
      branch: 'feature/app',
      upstream: 'origin/feature/app',
      ahead: 2,
      behind: 1,
      staged: 2,
      unstaged: 2,
      untracked: 1,
      error: null
    })
    expect(detached).toMatchObject({ name: 'detached', branch: null, upstream: null, ahead: 0, behind: 0, staged: 0 })
    expect(noRemote).toMatchObject({ branch: 'main', upstream: null })
    expect(broken).toMatchObject({ name: 'kaputt', error: 'fatal: not a git repository', branch: null })
  })

  it('verträgt Windows-Zeilenenden und leere Eingabe', () => {
    expect(parseGitStatusBatch('')).toEqual([])
    expect(parseGitStatusBatch(GIT.replaceAll('\n', '\r\n'))[0]?.branch).toBe('feature/app')
  })
})

const SYSTEM = [
  '@@STAT1@@',
  'cpu  4755818 63 880172 175580816 16942 0 126377 0 0 0',
  '@@STAT2@@',
  'cpu  4755822 63 880176 175581006 16942 0 126377 0 0 0',
  '@@MEM@@',
  'MemTotal:       16261008 kB',
  'MemAvailable:   12889584 kB',
  '@@DF@@',
  '/          485127979008 36905353216',
  '/home      485127979008 36905353216',
  '@@UP@@',
  '455128.50 1755810.09',
  '@@LOAD@@',
  '0.05 0.20 0.14 1/658 2310913',
  '@@NPROC@@',
  '4',
  ''
].join('\n')

describe('parseSystem', () => {
  it('berechnet CPU aus zwei Stichproben und liest RAM, Speicher, Uptime, Last', () => {
    const stats = parseSystem(SYSTEM)
    // Δtotal = 4+4+190 = 198, Δidle = 190 → 8/198
    expect(stats.cpuPercent).toBeCloseTo((8 / 198) * 100, 5)
    expect(stats.memTotal).toBe(16261008 * 1024)
    expect(stats.memUsed).toBe((16261008 - 12889584) * 1024)
    expect(stats.disks).toEqual([
      { mount: '/', total: 485127979008, used: 36905353216 },
      { mount: '/home', total: 485127979008, used: 36905353216 }
    ])
    expect(stats.uptimeSec).toBe(455128)
    expect(stats.load).toEqual([0.05, 0.2, 0.14])
    expect(stats.cores).toBe(4)
  })

  it('entfernt doppelte Einhängepunkte', () => {
    const doubled = SYSTEM.replace('/home      485127979008', '/          485127979008')
    expect(parseSystem(doubled).disks).toHaveLength(1)
  })
})

describe('parseClaudeSessions', () => {
  it('liest Sitzungsdateien und behält nur laufende Prozesse', () => {
    const out = [
      '@@SESS@@',
      JSON.stringify({ pid: 1810112, sessionId: 'a', cwd: '/home/alex/projects', startedAt: 1790446506140, status: 'idle', name: 'projects-fd' }),
      JSON.stringify({ pid: 99, sessionId: 'b', cwd: '/tmp', startedAt: 1, status: 'busy' }),
      'kein json',
      '@@ALIVE@@',
      '1810112',
      ''
    ].join('\n')
    expect(parseClaudeSessions(out)).toEqual([{ pid: 1810112, cwd: '/home/alex/projects', status: 'idle', startedAt: 1790446506140, name: 'projects-fd' }])
  })
})
