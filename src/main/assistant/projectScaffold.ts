import { posix, win32 } from 'node:path'
import { ValidationError } from '../errors'
import { assertInside } from './pathGuard'

export type GitignoreKind = 'node' | 'python' | 'other'

export interface ScaffoldInput {
  /** Kategorie-Ordner in der Projektwurzel, z. B. `Projects`, `Uni`; leer = direkt in der Wurzel. */
  readonly category: string
  readonly name: string
  readonly claudeMd: string
  readonly plan: string
  readonly readme: string
  readonly gitignore: GitignoreKind
}

export interface ScaffoldPlan {
  readonly dir: string
  readonly files: readonly { readonly path: string; readonly content: string }[]
}

const GITIGNORE: Readonly<Record<GitignoreKind, readonly string[]>> = {
  node: ['node_modules/', 'dist/', 'out/', '.env', '.env.*'],
  python: ['.venv/', '__pycache__/', '*.pyc', '.env', '.env.*'],
  other: ['.env', '.env.*']
}

/** Name ohne Pfadbestandteile: keine Trenner, kein `..`, nicht leer. */
function validName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed || trimmed === '.' || trimmed === '..' || /[\\/:*?"<>|]/.test(trimmed)) {
    throw new ValidationError(`Projektname „${name}“ ist ungültig (keine Pfadzeichen wie / \\ : * ? " < > |).`)
  }
  return trimmed
}

/** Plant Ordner und Dateien nach der Projekt-Checkliste (ohne etwas zu schreiben). */
export function planScaffold(root: string, input: ScaffoldInput, categories: readonly string[], platform: NodeJS.Platform): ScaffoldPlan {
  const category = input.category.trim()
  if (category && !categories.includes(category)) {
    throw new ValidationError(`Kategorie „${input.category}“ gibt es in ${root} nicht (vorhanden: ${categories.join(', ')}).`)
  }
  const path = platform === 'win32' ? win32 : posix
  const dir = assertInside(root, path.join(root, category, validName(input.name)), platform)
  return {
    dir,
    files: [
      { path: path.join(dir, 'CLAUDE.md'), content: input.claudeMd },
      { path: path.join(dir, 'docs', 'PLAN.md'), content: input.plan },
      { path: path.join(dir, 'README.md'), content: input.readme },
      { path: path.join(dir, '.gitignore'), content: `${GITIGNORE[input.gitignore].join('\n')}\n` }
    ]
  }
}
