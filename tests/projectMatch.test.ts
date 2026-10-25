import { describe, expect, it } from 'vitest'
import { findProjectFor } from '../src/shared/projectMatch'

const A = { host: 'local' as const, path: 'D:\\GitHub\\Projects\\a' }
const B = { host: 'local' as const, path: 'D:\\GitHub\\Projects\\b' }
const A_SUB = { host: 'local' as const, path: 'D:\\GitHub\\Projects\\a\\sub' }
const MINI_A = { host: 'mini-pc' as const, path: '/home/alex/projects/a' }

describe('findProjectFor', () => {
  it('ordnet nur dem passenden Projekt zu', () => {
    expect(findProjectFor([A, B], 'local', 'D:\\GitHub\\Projects\\a')).toBe(A)
    expect(findProjectFor([A, B], 'local', 'D:\\GitHub\\Projects\\b\\src')).toBe(B)
  })

  it('nimmt bei verschachtelten Projekten das tiefste', () => {
    expect(findProjectFor([A, B], 'local', 'D:\\GitHub\\Projects\\a\\sub\\deep')).toBe(A)
    expect(findProjectFor([A, A_SUB, B], 'local', 'D:\\GitHub\\Projects\\a\\sub\\deep')).toBe(A_SUB)
  })

  it('respektiert die Pfadgrenze', () => {
    expect(findProjectFor([A, B], 'local', 'D:\\GitHub\\Projects\\ab')).toBeUndefined()
    expect(findProjectFor([MINI_A], 'mini-pc', '/home/alex/projects/ab')).toBeUndefined()
  })

  it('ignoriert unter Windows Groß-/Kleinschreibung und Schrägstrichart', () => {
    expect(findProjectFor([A], 'local', 'd:\\github\\projects\\A\\x')).toBe(A)
    expect(findProjectFor([A], 'local', 'D:/GitHub/Projects/a/x')).toBe(A)
  })

  it('beachtet unter Linux Groß-/Kleinschreibung und trennt die Hosts', () => {
    expect(findProjectFor([MINI_A], 'mini-pc', '/home/alex/projects/A')).toBeUndefined()
    expect(findProjectFor([MINI_A], 'local', '/home/alex/projects/a')).toBeUndefined()
    expect(findProjectFor([{ host: 'local', path: '/home/alex/projects/a' }, MINI_A], 'mini-pc', '/home/alex/projects/a/x')).toBe(MINI_A)
  })

  it('verträgt einen abschließenden Trenner im Projektpfad', () => {
    expect(findProjectFor([{ host: 'mini-pc', path: '/home/alex/projects/a/' }], 'mini-pc', '/home/alex/projects/a/x')).toBeDefined()
  })
})
