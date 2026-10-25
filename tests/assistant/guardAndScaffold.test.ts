import { describe, expect, it } from 'vitest'
import { ValidationError } from '../../src/main/errors'
import { assertInside } from '../../src/main/assistant/pathGuard'
import { planScaffold, type ScaffoldInput } from '../../src/main/assistant/projectScaffold'

describe('assertInside', () => {
  it('erlaubt Pfade unterhalb der Wurzel (Windows ohne Groß-/Kleinschreibung)', () => {
    expect(assertInside('D:\\GitHub', 'D:\\GitHub\\Projects\\x', 'win32')).toBe('D:\\GitHub\\Projects\\x')
    expect(assertInside('D:\\GitHub', 'd:\\github\\X', 'win32')).toBe('d:\\github\\X')
    expect(assertInside('/home/alex/vault', '/home/alex/vault/a/b.md', 'linux')).toBe('/home/alex/vault/a/b.md')
  })

  it('lehnt Pfade außerhalb, Nachbarordner mit gleichem Präfix und ../ ab', () => {
    expect(() => assertInside('D:\\GitHub', 'D:\\GitHub2\\x', 'win32')).toThrow(ValidationError)
    expect(() => assertInside('D:\\GitHub', 'D:\\GitHub\\..\\x', 'win32')).toThrow(ValidationError)
    expect(() => assertInside('D:\\GitHub', 'C:\\Windows', 'win32')).toThrow(ValidationError)
    expect(() => assertInside('/home/alex/vault', '/home/alex/vault/../.ssh/id', 'linux')).toThrow(ValidationError)
    expect(() => assertInside('/home/alex/vault', '/home/alex/vault', 'linux')).toThrow(ValidationError)
  })
})

const INPUT: ScaffoldInput = {
  category: 'Projects',
  name: 'Beat Lab',
  claudeMd: '# CLAUDE.md – Beat Lab\n',
  plan: '# Beat Lab – Plan\n',
  readme: '# Beat Lab\n',
  gitignore: 'node'
}

describe('planScaffold', () => {
  it('legt Ordner und die vier Dateien der Checkliste an', () => {
    const plan = planScaffold('D:\\GitHub', INPUT, ['Projects', 'Uni', 'Tests'], 'win32')
    expect(plan.dir).toBe('D:\\GitHub\\Projects\\Beat Lab')
    expect(plan.files.map((f) => f.path)).toEqual([
      'D:\\GitHub\\Projects\\Beat Lab\\CLAUDE.md',
      'D:\\GitHub\\Projects\\Beat Lab\\docs\\PLAN.md',
      'D:\\GitHub\\Projects\\Beat Lab\\README.md',
      'D:\\GitHub\\Projects\\Beat Lab\\.gitignore'
    ])
    const gitignore = plan.files.find((f) => f.path.endsWith('.gitignore'))?.content ?? ''
    expect(gitignore).toContain('.env')
    expect(gitignore).toContain('node_modules/')
  })

  it('prüft Kategorie und Projektnamen', () => {
    expect(() => planScaffold('D:\\GitHub', { ...INPUT, category: 'Neu' }, ['Projects'], 'win32')).toThrow(/Kategorie/)
    expect(() => planScaffold('D:\\GitHub', { ...INPUT, name: '..\\x' }, ['Projects'], 'win32')).toThrow(ValidationError)
    expect(() => planScaffold('D:\\GitHub', { ...INPUT, name: 'a/b' }, ['Projects'], 'win32')).toThrow(ValidationError)
    expect(() => planScaffold('D:\\GitHub', { ...INPUT, name: '  ' }, ['Projects'], 'win32')).toThrow(ValidationError)
  })

  it('legt das Projekt ohne Kategorie direkt in der Wurzel an (flache Projektordner)', () => {
    const plan = planScaffold('/home/alex/projects', { ...INPUT, category: '' }, ['webshop', 'homeserver'], 'linux')
    expect(plan.dir).toBe('/home/alex/projects/Beat Lab')
  })

  it('Python-.gitignore enthält .venv und __pycache__', () => {
    const plan = planScaffold('/home/alex/projects', { ...INPUT, gitignore: 'python' }, ['Projects'], 'linux')
    const gitignore = plan.files.find((f) => f.path.endsWith('.gitignore'))?.content ?? ''
    expect(gitignore).toContain('.venv/')
    expect(gitignore).toContain('__pycache__/')
    expect(plan.dir).toBe('/home/alex/projects/Projects/Beat Lab')
  })
})
