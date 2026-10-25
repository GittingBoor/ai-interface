import type { Settings, TodoChange, TodoState } from '@shared/types'
import { type Host, joinPath } from '../hosts/Host'
import { AppError } from '../errors'

export class VaultMissingError extends AppError {
  constructor() {
    super('VAULT_MISSING', 'Es ist kein Obsidian-Vault eingerichtet.', 'In den Einstellungen unter „Notizen“ einen Vault-Ordner wählen.')
  }
}
import { applyTodoChange, parseTodos } from './TodoMarkdown'

const WRITE_ATTEMPTS = 3

export class TodoConflictError extends AppError {
  constructor() {
    super('TODO_CONFLICT', 'Die TODO-Datei wird gerade woanders bearbeitet.', 'Kurz warten und erneut versuchen.')
  }
}

const NEW_FILE_TEMPLATE = ['---', 'tags: [server, todo]', '---', '# TODO', '', '## Allgemein', ''].join('\n')

/** Die Vault-TODO-Datei ist die einzige Quelle; jede Änderung liest frisch und schreibt atomar. */
export class TodoMarkdownStore {
  constructor(
    private readonly host: () => Host,
    private readonly settings: () => Settings,
    private readonly today: () => string
  ) {}

  path(): string {
    const s = this.settings()
    if (!s.vault.path) throw new VaultMissingError()
    return joinPath(this.host(), s.vault.path, s.todoFile)
  }

  async load(): Promise<TodoState> {
    const host = this.host()
    const path = this.path()
    const stat = await host.stat(path)
    if (!stat) return { exists: false, host: host.id, path, items: [], sections: [], modifiedAt: null }
    const items = parseTodos((await host.readFile(path)).toString('utf8'))
    const sections = [...new Set(items.map((i) => i.section).filter((s) => s.length > 0))]
    return { exists: true, host: host.id, path, items, sections, modifiedAt: stat.mtimeMs }
  }

  /** Liest frisch, wendet an und schreibt nur, wenn sich die Datei inzwischen nicht geändert hat (sonst neuer Versuch). */
  async apply(change: TodoChange): Promise<TodoState> {
    const host = this.host()
    const path = this.path()
    const effective = change.kind === 'toggle' ? { ...change, today: this.today() } : change
    for (let attempt = 0; attempt < WRITE_ATTEMPTS; attempt++) {
      const before = await this.signature()
      const current = (await host.readFile(path)).toString('utf8')
      const next = applyTodoChange(current, effective)
      if ((await this.signature()) !== before) continue
      await host.writeFileAtomic(path, next)
      return this.load()
    }
    throw new TodoConflictError()
  }

  async create(): Promise<TodoState> {
    const host = this.host()
    if (!(await host.stat(this.path()))) await host.writeFileAtomic(this.path(), NEW_FILE_TEMPLATE)
    return this.load()
  }

  /** Kurzer Fingerabdruck zum Erkennen externer Änderungen (Obsidian, OneDrive). */
  async signature(): Promise<string> {
    const stat = await this.host().stat(this.path())
    return stat ? `${stat.mtimeMs}:${stat.size}` : 'missing'
  }
}
