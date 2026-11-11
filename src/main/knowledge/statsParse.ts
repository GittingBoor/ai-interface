import { OTHER_LANGUAGE } from '@shared/knowledge'
import type { AreaSize, Contributor, Dependency, DependencyEcosystem, Hotspot, LanguageShare, MonthActivity } from '@shared/knowledge'

/** Zeilen je versionierter Textdatei. */
export interface FileLines {
  readonly path: string
  readonly lines: number
}

const DECIMAL = 10
const MAX_LANGUAGES = 8
const MAX_AREAS = 40
const AREA_DEPTH = 2
const MAX_CONTRIBUTORS = 12
const MAX_HOTSPOTS = 12
const MAX_MONTHS = 48
const MONTHS_PER_YEAR = 12
const MONTH_LENGTH = 7
const ROOT_AREA = '.'

/** Erzeugte oder gesperrte Dateien verfälschen Größe und Hotspots. */
const IGNORED_NAMES: ReadonlySet<string> = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  'poetry.lock',
  'uv.lock',
  'Pipfile.lock',
  'Cargo.lock',
  'go.sum',
  'composer.lock',
  'Gemfile.lock'
])
const IGNORED_SUFFIX = /\.(min\.js|min\.css|map)$/i

const LANGUAGE_BY_EXT: Readonly<Record<string, string>> = {
  ts: 'TypeScript', tsx: 'TypeScript', mts: 'TypeScript', cts: 'TypeScript',
  js: 'JavaScript', jsx: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript',
  py: 'Python', pyi: 'Python', ipynb: 'Jupyter',
  rs: 'Rust', go: 'Go', java: 'Java', kt: 'Kotlin', kts: 'Kotlin', swift: 'Swift',
  c: 'C', h: 'C', cpp: 'C++', cc: 'C++', cxx: 'C++', hpp: 'C++', hh: 'C++',
  cs: 'C#', fs: 'F#', rb: 'Ruby', php: 'PHP', lua: 'Lua', dart: 'Dart', scala: 'Scala',
  gd: 'GDScript', tscn: 'Godot Scene', tres: 'Godot Resource', gdshader: 'Shader', glsl: 'Shader', hlsl: 'Shader', shader: 'Shader',
  vue: 'Vue', svelte: 'Svelte', astro: 'Astro',
  html: 'HTML', htm: 'HTML', css: 'CSS', scss: 'SCSS', sass: 'SCSS', less: 'CSS',
  json: 'JSON', jsonc: 'JSON', yml: 'YAML', yaml: 'YAML', toml: 'TOML', xml: 'XML', ini: 'Config', cfg: 'Config',
  md: 'Markdown', mdx: 'Markdown', rst: 'Text', txt: 'Text',
  sh: 'Shell', bash: 'Shell', zsh: 'Shell', ps1: 'PowerShell', bat: 'Batch', cmd: 'Batch',
  sql: 'SQL', r: 'R', m: 'MATLAB', jl: 'Julia', tex: 'LaTeX'
}

const LANGUAGE_BY_NAME: Readonly<Record<string, string>> = {
  Dockerfile: 'Docker',
  Makefile: 'Make',
  CMakeLists: 'CMake'
}

const baseNameOf = (path: string): string => path.slice(path.lastIndexOf('/') + 1)

export function isIgnoredFile(path: string): boolean {
  return IGNORED_NAMES.has(baseNameOf(path)) || IGNORED_SUFFIX.test(path)
}

export function languageOf(path: string): string {
  const name = baseNameOf(path)
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return LANGUAGE_BY_NAME[name] ?? OTHER_LANGUAGE
  return LANGUAGE_BY_EXT[name.slice(dot + 1).toLowerCase()] ?? LANGUAGE_BY_NAME[name.slice(0, dot)] ?? OTHER_LANGUAGE
}

/** `git diff --numstat -z <leerer Baum> HEAD`: „hinzu\tweg\tpfad\0“; Binärdateien („-“) und Erzeugtes fallen weg. */
export function parseNumstat(output: string): FileLines[] {
  return output
    .split('\0')
    .map((record) => /^(\d+|-)\t(\d+|-)\t(.+)$/s.exec(record.replace(/^\n/, '')))
    .filter((match): match is RegExpExecArray => match !== null && match[1] !== '-')
    .map((match) => ({ path: match[3] ?? '', lines: Number.parseInt(match[1] ?? '0', DECIMAL) }))
    .filter((file) => !isIgnoredFile(file.path))
}

const byLinesDesc = <T extends { readonly lines: number }>(a: T, b: T): number => b.lines - a.lines

export function aggregateLanguages(files: readonly FileLines[]): LanguageShare[] {
  const totals = new Map<string, { lines: number; files: number }>()
  for (const file of files) {
    const name = languageOf(file.path)
    const entry = totals.get(name) ?? { lines: 0, files: 0 }
    totals.set(name, { lines: entry.lines + file.lines, files: entry.files + 1 })
  }
  const sorted = [...totals].map(([name, t]) => ({ name, ...t })).sort(byLinesDesc)
  const named = sorted.filter((l) => l.name !== OTHER_LANGUAGE)
  const top = named.slice(0, MAX_LANGUAGES)
  const rest = [...named.slice(MAX_LANGUAGES), ...sorted.filter((l) => l.name === OTHER_LANGUAGE)]
  if (rest.length === 0) return top
  const other = rest.reduce((sum, l) => ({ name: OTHER_LANGUAGE, lines: sum.lines + l.lines, files: sum.files + l.files }), { name: OTHER_LANGUAGE, lines: 0, files: 0 })
  return [...top, other]
}

/** Ordner bis zur zweiten Ebene; Dateien direkt im Projekt zählen zu „.“. */
export function aggregateAreas(files: readonly FileLines[]): AreaSize[] {
  const totals = new Map<string, { lines: number; files: number }>()
  const add = (path: string, lines: number): void => {
    const entry = totals.get(path) ?? { lines: 0, files: 0 }
    totals.set(path, { lines: entry.lines + lines, files: entry.files + 1 })
  }
  for (const file of files) {
    const dirs = file.path.split('/').slice(0, -1)
    if (dirs.length === 0) add(ROOT_AREA, file.lines)
    for (let depth = 1; depth <= Math.min(AREA_DEPTH, dirs.length); depth += 1) add(dirs.slice(0, depth).join('/'), file.lines)
  }
  return [...totals].map(([path, t]) => ({ path, ...t })).sort(byLinesDesc).slice(0, MAX_AREAS)
}

/** `git shortlog -sn HEAD`: „   12\tName“. */
export function parseShortlog(output: string): Contributor[] {
  return output
    .split(/\r?\n/)
    .map((line) => /^\s*(\d+)\s+(.+?)\s*$/.exec(line))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => ({ name: match[2] ?? '', commits: Number.parseInt(match[1] ?? '0', DECIMAL) }))
}

export const topContributors = (all: readonly Contributor[]): Contributor[] => [...all].sort((a, b) => b.commits - a.commits).slice(0, MAX_CONTRIBUTORS)

/** Ein Datum ('JJJJ-MM-TT') je Zeile. */
export function parseDates(output: string): string[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d{4}-\d{2}-\d{2}$/.test(line))
}

function nextMonth(month: string): string {
  const year = Number.parseInt(month.slice(0, 4), DECIMAL)
  const index = Number.parseInt(month.slice(5, MONTH_LENGTH), DECIMAL)
  return index === MONTHS_PER_YEAR ? `${year + 1}-01` : `${year}-${String(index + 1).padStart(2, '0')}`
}

/** Commits je Monat, lückenlos vom ersten bis zum letzten Monat, höchstens die letzten 48. */
export function monthlyActivity(dates: readonly string[]): MonthActivity[] {
  if (dates.length === 0) return []
  const counts = new Map<string, number>()
  for (const date of dates) counts.set(date.slice(0, MONTH_LENGTH), (counts.get(date.slice(0, MONTH_LENGTH)) ?? 0) + 1)
  const months = [...counts.keys()].sort()
  const first = months[0] ?? ''
  const last = months.at(-1) ?? first
  const result: MonthActivity[] = []
  for (let month = first; month <= last; month = nextMonth(month)) result.push({ month, commits: counts.get(month) ?? 0 })
  return result.slice(-MAX_MONTHS)
}

/** `git log --format= --name-only`: Dateinamen je Commit; nur Dateien, die es noch gibt. */
export function hotspots(output: string, files: readonly FileLines[]): Hotspot[] {
  const lines = new Map(files.map((f) => [f.path, f.lines]))
  const changes = new Map<string, number>()
  for (const raw of output.split(/\r?\n/)) {
    const path = raw.trim()
    if (path && lines.has(path)) changes.set(path, (changes.get(path) ?? 0) + 1)
  }
  return [...changes]
    .map(([path, count]) => ({ path, changes: count, lines: lines.get(path) ?? 0 }))
    .sort((a, b) => b.changes - a.changes || b.lines - a.lines)
    .slice(0, MAX_HOTSPOTS)
}

const MANIFESTS: Readonly<Record<string, DependencyEcosystem>> = {
  'package.json': 'npm',
  'requirements.txt': 'pypi',
  'requirements-dev.txt': 'pypi',
  'pyproject.toml': 'pypi',
  'Cargo.toml': 'crates',
  'go.mod': 'go'
}
const MANIFEST_MAX_DEPTH = 2
const MAX_MANIFESTS = 6
const VENDOR_DIR = /(^|\/)(node_modules|vendor|third_party|\.venv|dist|build)\//

/** Manifeste im Projekt und in Unterordnern bis zur zweiten Ebene, flachste zuerst. */
export function findManifests(paths: readonly string[]): string[] {
  return paths
    .filter((path) => baseNameOf(path) in MANIFESTS && path.split('/').length <= MANIFEST_MAX_DEPTH + 1 && !VENDOR_DIR.test(path))
    .sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))
    .slice(0, MAX_MANIFESTS)
}

type Dep = Omit<Dependency, 'manifest' | 'ecosystem'>

function parsePackageJson(content: string): Dep[] {
  let json: unknown
  try {
    json = JSON.parse(content)
  } catch {
    return []
  }
  if (typeof json !== 'object' || json === null) return []
  const read = (key: string, dev: boolean): Dep[] => {
    const section = (json as Record<string, unknown>)[key]
    if (typeof section !== 'object' || section === null) return []
    return Object.entries(section).map(([name, version]) => ({ name, version: typeof version === 'string' ? version : null, dev }))
  }
  return [...read('dependencies', false), ...read('devDependencies', true)]
}

const REQUIREMENT = /^([A-Za-z0-9][A-Za-z0-9._-]*)(?:\[[^\]]*\])?\s*(.*)$/

function requirement(line: string, dev: boolean): Dep | null {
  const match = REQUIREMENT.exec(line.split(';')[0]?.trim() ?? '')
  if (!match?.[1]) return null
  return { name: match[1], version: match[2]?.trim() || null, dev }
}

function parseRequirements(content: string, dev: boolean): Dep[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*/, '').trim())
    .filter((line) => line.length > 0 && !line.startsWith('-'))
    .map((line) => requirement(line, dev))
    .filter((dep): dep is Dep => dep !== null)
}

interface TomlEntry {
  readonly section: string
  readonly key: string
  readonly value: string
}

/** Schlüssel-Wert-Zeilen mit ihrem Abschnitt; reicht für Abhängigkeitslisten. */
function tomlEntries(content: string): TomlEntry[] {
  let section = ''
  const entries: TomlEntry[] = []
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, '').trim()
    const header = /^\[([^\]]+)\]$/.exec(line)
    if (header) section = header[1]?.trim() ?? ''
    const pair = /^"?([A-Za-z0-9_.-]+)"?\s*=\s*(.+)$/.exec(line)
    if (!header && pair) entries.push({ section, key: pair[1] ?? '', value: pair[2] ?? '' })
  }
  return entries
}

function tomlVersion(value: string): string | null {
  return /^"([^"]*)"/.exec(value)?.[1] ?? /version\s*=\s*"([^"]*)"/.exec(value)?.[1] ?? null
}

const POETRY_DEV = /^tool\.poetry\.(dev-dependencies|group\.[^.]+\.dependencies)$/

function parsePyproject(content: string): Dep[] {
  const array = /^dependencies\s*=\s*\[([\s\S]*?)\]/m.exec(content)?.[1] ?? ''
  const pep621 = [...array.matchAll(/["']([^"']+)["']/g)].map((m) => requirement(m[1] ?? '', false)).filter((dep): dep is Dep => dep !== null)
  const poetry = tomlEntries(content)
    .filter((e) => (e.section === 'tool.poetry.dependencies' || POETRY_DEV.test(e.section)) && e.key !== 'python')
    .map((e) => ({ name: e.key, version: tomlVersion(e.value), dev: POETRY_DEV.test(e.section) }))
  return [...pep621, ...poetry]
}

function parseCargo(content: string): Dep[] {
  return tomlEntries(content)
    .filter((e) => e.section === 'dependencies' || e.section === 'dev-dependencies')
    .map((e) => ({ name: e.key, version: tomlVersion(e.value), dev: e.section === 'dev-dependencies' }))
}

function parseGoMod(content: string): Dep[] {
  const block = [...content.matchAll(/^require\s*\(([\s\S]*?)\)/gm)].flatMap((m) => (m[1] ?? '').split(/\r?\n/))
  const single = [...content.matchAll(/^require\s+([^\s(]+\s+\S+.*)$/gm)].map((m) => m[1] ?? '')
  return [...block, ...single]
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.includes('// indirect'))
    .map((line) => line.split(/\s+/))
    .map(([name = '', version]) => ({ name, version: version ?? null, dev: false }))
    .filter((dep) => dep.name.length > 0 && !dep.name.startsWith('//'))
}

/** Abhängigkeiten aus einem Manifest; unbekannte oder kaputte Dateien liefern eine leere Liste. */
export function parseManifest(path: string, content: string): Dependency[] {
  const name = baseNameOf(path)
  const ecosystem = MANIFESTS[name]
  if (!ecosystem) return []
  const deps = ((): Dep[] => {
    switch (name) {
      case 'package.json':
        return parsePackageJson(content)
      case 'pyproject.toml':
        return parsePyproject(content)
      case 'Cargo.toml':
        return parseCargo(content)
      case 'go.mod':
        return parseGoMod(content)
      default:
        return parseRequirements(content, name.includes('dev'))
    }
  })()
  return deps.map((dep) => ({ ...dep, ecosystem, manifest: path }))
}

const MAX_DEPENDENCIES = 120

/** Doppelte (gleiches Ökosystem und gleicher Name) zusammenfassen; Laufzeit schlägt Entwicklung. */
export function mergeDependencies(all: readonly Dependency[]): Dependency[] {
  const byKey = new Map<string, Dependency>()
  for (const dep of all) {
    const key = `${dep.ecosystem}:${dep.name.toLowerCase()}`
    const known = byKey.get(key)
    if (!known || (known.dev && !dep.dev)) byKey.set(key, dep)
  }
  return [...byKey.values()].slice(0, MAX_DEPENDENCIES)
}
