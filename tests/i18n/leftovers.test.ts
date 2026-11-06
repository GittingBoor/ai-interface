import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { scanSource } from '../helpers/germanScanner'

/** Deutsche Literale außerhalb der Wörterbücher (`src/shared/i18n`); das Verfahren steht in `tests/helpers/germanScanner.ts`. */

const SRC_ROOT = join(process.cwd(), 'src')
const DICTIONARY_DIR = 'src/shared/i18n/'

/** Noch nicht umgestellte Pfade (Ordner oder Dateien, relativ zum Projekt). Alle Bereiche sind umgestellt; neue Bereiche tragen sich hier bis zur Umstellung ein. */
const PENDING: readonly string[] = []

/** Modellseitige Prompts, Tool-Beschreibungen und Beispieldaten des Browser-Modus (Projekte, Skills) bleiben deutsch. */
const MODEL_FACING: readonly string[] = [
  'src/main/assistant/systemPrompt.ts',
  'src/main/assistant/tools.ts',
  'src/main/orchestrator/orchestratorPrompt.ts',
  'src/main/tasks/TaskReviewService.ts',
  'src/main/tasks/taskReviewTools.ts',
  'src/main/orchestrator/orchestratorTools.ts',
  // Projektwissen: Prompt, mitgelieferte CLAUDE.md, Werkzeuge und Prüfmeldungen liest der Agent.
  'src/main/knowledge/knowledgePrompt.ts',
  'src/main/knowledge/knowledgeSchema.ts',
  'src/main/knowledge/knowledgeTools.ts',
  'src/main/knowledge/protocolGuard.ts',
  'src/main/knowledge/KnowledgeWorkspace.ts',
  'src/main/hosts/projectRead.ts',
  'src/renderer/src/api/mockData.ts',
  'src/renderer/src/api/mockSkills.ts',
  // Agents: Entwurfs-Prompt der KI und Beispieldaten des Browser-Modus.
  'src/main/agents/agentAssistPrompt.ts',
  'src/renderer/src/api/mockAgents.ts'
]

/** Reine Suchdaten ohne Oberflächentexte: Suchwörter (deutsch und englisch) für Symbole. */
const STATIC_DATA: readonly string[] = [
  'src/renderer/src/lib/emojiList.ts',
  'src/renderer/src/lib/lucideIcons.ts'
]

function listSources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return listSources(path)
    return /\.tsx?$/.test(name) && !name.endsWith('.d.ts') ? [path] : []
  })
}

function isCovered(file: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => file === prefix || file.startsWith(`${prefix}/`))
}

function findLeftovers(file: string): string[] {
  const source = readFileSync(join(process.cwd(), file), 'utf8')
  return scanSource(source, file.endsWith('.tsx')).map((f) => `${file}:${f.line}: ${f.text}`)
}

describe('Deutsche Reste außerhalb der Wörterbücher', () => {
  it('findet keine Literale in bereits umgestellten Dateien', () => {
    const skipped = [...PENDING, ...MODEL_FACING, ...STATIC_DATA]
    const report = listSources(SRC_ROOT)
      .map((path) => relative(process.cwd(), path).split(sep).join('/'))
      .filter((file) => !file.startsWith(DICTIONARY_DIR) && !isCovered(file, skipped))
      .flatMap(findLeftovers)
    expect(report, `Deutsche Texte außerhalb von ${DICTIONARY_DIR}:\n${report.join('\n')}`).toEqual([])
  })

  it('führt nur vorhandene Pfade in PENDING, MODEL_FACING und STATIC_DATA', () => {
    for (const entry of [...PENDING, ...MODEL_FACING, ...STATIC_DATA]) {
      expect(() => statSync(join(process.cwd(), entry)), entry).not.toThrow()
    }
  })
})
