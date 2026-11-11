import { describe, expect, it } from 'vitest'
import { OTHER_LANGUAGE } from '@shared/knowledge'
import {
  aggregateAreas,
  aggregateLanguages,
  findManifests,
  hotspots,
  languageOf,
  mergeDependencies,
  monthlyActivity,
  parseDates,
  parseManifest,
  parseNumstat,
  parseShortlog
} from '../../src/main/knowledge/statsParse'

describe('parseNumstat', () => {
  it('reads lines per file and drops binaries and lockfiles', () => {
    const out = ['10\t0\tsrc/a.ts', '-\t-\tlogo.png', '500\t0\tpackage-lock.json', '3\t0\tsrc/mit leer.ts', ''].join('\u0000')
    expect(parseNumstat(out)).toEqual([
      { path: 'src/a.ts', lines: 10 },
      { path: 'src/mit leer.ts', lines: 3 }
    ])
  })
})

describe('languageOf', () => {
  it('maps extensions and special names', () => {
    expect(languageOf('src/App.tsx')).toBe('TypeScript')
    expect(languageOf('scripts/player.gd')).toBe('GDScript')
    expect(languageOf('Dockerfile')).toBe('Docker')
    expect(languageOf('foo.unbekannt')).toBe(OTHER_LANGUAGE)
  })
})

describe('aggregateLanguages', () => {
  it('sorts by lines and folds the rest into Other', () => {
    const files = [
      { path: 'a.ts', lines: 100 },
      { path: 'b.py', lines: 300 },
      { path: 'c.xyz', lines: 5 }
    ]
    expect(aggregateLanguages(files)).toEqual([
      { name: 'Python', lines: 300, files: 1 },
      { name: 'TypeScript', lines: 100, files: 1 },
      { name: OTHER_LANGUAGE, lines: 5, files: 1 }
    ])
  })
})

describe('aggregateAreas', () => {
  it('sums folders up to the second level', () => {
    const areas = aggregateAreas([
      { path: 'src/main/a.ts', lines: 10 },
      { path: 'src/main/deep/b.ts', lines: 5 },
      { path: 'src/c.ts', lines: 1 },
      { path: 'README.md', lines: 2 }
    ])
    expect(areas).toEqual([
      { path: 'src', lines: 16, files: 3 },
      { path: 'src/main', lines: 15, files: 2 },
      { path: '.', lines: 2, files: 1 }
    ])
  })
})

describe('git output', () => {
  it('parses shortlog with spaces in names', () => {
    expect(parseShortlog('    12\tAda Lovelace\n     3\tBob\n')).toEqual([
      { name: 'Ada Lovelace', commits: 12 },
      { name: 'Bob', commits: 3 }
    ])
  })

  it('fills months without commits', () => {
    const dates = parseDates('2026-03-02\r\n2026-01-15\n2026-01-01\nkaputt\n')
    expect(monthlyActivity(dates)).toEqual([
      { month: '2026-01', commits: 2 },
      { month: '2026-02', commits: 0 },
      { month: '2026-03', commits: 1 }
    ])
  })

  it('crosses the year boundary', () => {
    expect(monthlyActivity(['2025-12-01', '2026-01-01']).map((m) => m.month)).toEqual(['2025-12', '2026-01'])
  })

  it('counts hotspots only for existing files', () => {
    const files = [{ path: 'a.ts', lines: 10 }, { path: 'b.ts', lines: 20 }]
    expect(hotspots('a.ts\nb.ts\n\na.ts\nweg.ts\n', files)).toEqual([
      { path: 'a.ts', changes: 2, lines: 10 },
      { path: 'b.ts', changes: 1, lines: 20 }
    ])
  })
})

describe('manifests', () => {
  it('finds manifests up to depth 2 and skips vendor folders', () => {
    expect(findManifests(['package.json', 'node_modules/x/package.json', 'apps/web/package.json', 'a/b/c/package.json', 'requirements.txt'])).toEqual([
      'package.json',
      'requirements.txt',
      'apps/web/package.json'
    ])
  })

  it('parses package.json', () => {
    const deps = parseManifest('package.json', JSON.stringify({ dependencies: { react: '^19.0.0' }, devDependencies: { vitest: '^3.0.0' } }))
    expect(deps).toEqual([
      { name: 'react', version: '^19.0.0', dev: false, ecosystem: 'npm', manifest: 'package.json' },
      { name: 'vitest', version: '^3.0.0', dev: true, ecosystem: 'npm', manifest: 'package.json' }
    ])
  })

  it('returns nothing for broken JSON', () => {
    expect(parseManifest('package.json', '{kaputt')).toEqual([])
  })

  it('parses requirements.txt', () => {
    const deps = parseManifest('requirements.txt', '# Kommentar\nnumpy>=1.26\nrequests[socks]==2.0 ; python_version>"3"\n-r other.txt\ntorch\n')
    expect(deps.map((d) => [d.name, d.version])).toEqual([
      ['numpy', '>=1.26'],
      ['requests', '==2.0'],
      ['torch', null]
    ])
  })

  it('parses pyproject (PEP 621 and Poetry)', () => {
    const pep = parseManifest('pyproject.toml', '[project]\nname = "x"\ndependencies = [\n  "fastapi>=0.100",\n  "uvicorn",\n]\n')
    expect(pep.map((d) => d.name)).toEqual(['fastapi', 'uvicorn'])
    const poetry = parseManifest(
      'pyproject.toml',
      '[tool.poetry.dependencies]\npython = "^3.11"\nlibrosa = "^0.10"\n\n[tool.poetry.group.dev.dependencies]\npytest = { version = "^8" }\n'
    )
    expect(poetry.map((d) => [d.name, d.version, d.dev])).toEqual([
      ['librosa', '^0.10', false],
      ['pytest', '^8', true]
    ])
  })

  it('parses Cargo.toml and go.mod', () => {
    const cargo = parseManifest('Cargo.toml', '[package]\nname = "x"\n\n[dependencies]\nserde = { version = "1", features = ["derive"] }\ntokio = "1.40"\n')
    expect(cargo.map((d) => [d.name, d.version])).toEqual([
      ['serde', '1'],
      ['tokio', '1.40']
    ])
    const go = parseManifest('go.mod', 'module x\n\nrequire (\n\tgithub.com/a/b v1.2.0\n\tgithub.com/c/d v0.1.0 // indirect\n)\nrequire golang.org/x/e v0.3.0\n')
    expect(go.map((d) => d.name)).toEqual(['github.com/a/b', 'golang.org/x/e'])
  })

  it('merges duplicates, runtime wins over dev', () => {
    const a = { name: 'React', version: '1', ecosystem: 'npm' as const, dev: true, manifest: 'a/package.json' }
    const b = { ...a, name: 'react', dev: false, manifest: 'package.json' }
    expect(mergeDependencies([a, b])).toEqual([b])
  })
})
