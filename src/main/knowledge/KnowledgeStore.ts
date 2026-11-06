import type { ProjectKnowledge } from '@shared/knowledge'
import { KNOWLEDGE_DIR, KNOWLEDGE_FILE } from '@shared/knowledge'
import type { Host } from '../hosts/Host'
import { joinPath } from '../hosts/Host'
import { mainT } from '../i18n'
import { projectKnowledgeSchema } from './knowledgeSchema'

export type StoredKnowledge =
  | { readonly kind: 'ok'; readonly knowledge: ProjectKnowledge }
  | { readonly kind: 'missing' }
  | { readonly kind: 'invalid'; readonly reason: string }

const EXCLUDE_ENTRY = `${KNOWLEDGE_DIR}/`
const JSON_INDENT = 2

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | null)?.code === 'ENOENT'
}

/** Speichert das Projektwissen im Projektordner und hält es per `.git/info/exclude` aus Git heraus. */
export class KnowledgeStore {
  async read(host: Host, projectPath: string): Promise<StoredKnowledge> {
    const path = this.filePath(host, projectPath)
    if (!(await host.stat(path))) return { kind: 'missing' }
    let raw: string
    try {
      raw = (await host.readFile(path)).toString('utf8')
    } catch (error) {
      if (isNotFound(error)) return { kind: 'missing' }
      throw error
    }
    return this.parse(raw)
  }

  /** Schreibt atomar und trägt `.ai-interface/` in `.git/info/exclude` ein, falls `.git` ein Ordner ist. */
  async write(host: Host, projectPath: string, knowledge: ProjectKnowledge): Promise<void> {
    await host.writeFileAtomic(this.filePath(host, projectPath), JSON.stringify(knowledge, null, JSON_INDENT))
    await this.ensureExcluded(host, projectPath)
  }

  private filePath(host: Host, projectPath: string): string {
    return joinPath(host, projectPath, KNOWLEDGE_DIR, KNOWLEDGE_FILE)
  }

  private parse(raw: string): StoredKnowledge {
    let json: unknown
    try {
      json = JSON.parse(raw)
    } catch {
      return { kind: 'invalid', reason: mainT().knowledge.invalidJson }
    }
    const result = projectKnowledgeSchema.safeParse(json)
    if (!result.success) return { kind: 'invalid', reason: mainT().knowledge.invalidFormat }
    return { kind: 'ok', knowledge: result.data }
  }

  private async ensureExcluded(host: Host, projectPath: string): Promise<void> {
    const gitDir = await host.stat(joinPath(host, projectPath, '.git'))
    if (!gitDir?.isDirectory) return
    const excludePath = joinPath(host, projectPath, '.git', 'info', 'exclude')
    const current = (await host.stat(excludePath)) ? (await host.readFile(excludePath)).toString('utf8') : ''
    if (current.split(/\r?\n/).some((line) => line.trim() === EXCLUDE_ENTRY)) return
    const separator = current.length === 0 || current.endsWith('\n') ? '' : '\n'
    await host.writeFileAtomic(excludePath, `${current}${separator}${EXCLUDE_ENTRY}\n`)
  }
}
