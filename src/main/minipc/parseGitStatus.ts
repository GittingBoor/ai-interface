import type { GitState } from '@shared/types'

/** Blockanfang je Projekt in der Ausgabe von `gitBatchScript`. */
export const GIT_BLOCK = '@@AII@@'
export const GIT_ERROR = '@@AII-ERR@@'

const UNCHANGED = '.'
const DETACHED = '(detached)'

function emptyState(path: string): GitState {
  const clean = path.replace(/\/+$/, '')
  return { path: clean, name: clean.split('/').pop() ?? clean, branch: null, upstream: null, ahead: 0, behind: 0, staged: 0, unstaged: 0, untracked: 0, error: null }
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] }

function applyLine(state: Mutable<GitState>, line: string): void {
  if (line.startsWith('# branch.head ')) {
    const head = line.slice('# branch.head '.length)
    state.branch = head === DETACHED ? null : head
  } else if (line.startsWith('# branch.upstream ')) {
    state.upstream = line.slice('# branch.upstream '.length)
  } else if (line.startsWith('# branch.ab ')) {
    const [ahead = '+0', behind = '-0'] = line.slice('# branch.ab '.length).split(' ')
    state.ahead = Math.abs(Number(ahead))
    state.behind = Math.abs(Number(behind))
  } else if (line.startsWith('? ')) {
    state.untracked++
  } else if (/^[12u] /.test(line)) {
    const xy = line.slice(2, 4)
    if (xy[0] !== UNCHANGED) state.staged++
    if (xy[1] !== UNCHANGED) state.unstaged++
  }
}

/** Liest `git status --porcelain=v2 --branch` mehrerer Projekte (Blöcke mit `@@AII@@ <pfad>`). */
export function parseGitStatusBatch(stdout: string): GitState[] {
  const states: Mutable<GitState>[] = []
  let current: Mutable<GitState> | null = null
  for (const raw of stdout.split('\n')) {
    const line = raw.replace(/\r$/, '')
    if (line.startsWith(`${GIT_BLOCK} `)) {
      current = emptyState(line.slice(GIT_BLOCK.length + 1))
      states.push(current)
    } else if (line.startsWith(`${GIT_ERROR} `)) {
      const rest = line.slice(GIT_ERROR.length + 1)
      const space = rest.indexOf(' ')
      const errorState: Mutable<GitState> = emptyState(space === -1 ? rest : rest.slice(0, space))
      errorState.error = space === -1 ? 'Fehler' : rest.slice(space + 1)
      states.push(errorState)
      current = null
    } else if (current && line) {
      applyLine(current, line)
    }
  }
  return states
}
