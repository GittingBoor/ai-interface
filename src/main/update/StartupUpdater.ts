import { join } from 'node:path'
import { UpdateError } from '../errors'

export interface CommandResult {
  readonly code: number
  readonly stdout: string
  readonly stderr: string
}

export interface CommandRunner {
  exec(command: string, args: readonly string[], cwd: string): Promise<CommandResult>
}

export interface UpdaterFiles {
  exists(path: string): boolean
  readText(path: string): string
}

export type UpdateCheck =
  | { readonly kind: 'up-to-date' }
  | { readonly kind: 'skipped'; readonly reason: string }
  | { readonly kind: 'available'; readonly remote: string }

const BRANCH = 'main'
const REMOTE_REF = `origin/${BRANCH}`
const PRODUCT_NAME = 'AI Interface'
const RELEASES_URL = 'https://github.com/GittingBoor/ai-interface/releases'

/** Prüft, ob GitHub neuer ist als der installierte Build, und baut auf Wunsch den Installer aus dem lokalen Repo. */
export class StartupUpdater {
  constructor(
    private readonly repoDir: string,
    private readonly buildCommit: string,
    private readonly runner: CommandRunner,
    private readonly files: UpdaterFiles
  ) {}

  async check(): Promise<UpdateCheck> {
    // Release-Builds (GitHub Actions) kennen keinen lokalen Repo-Ordner, aus dem sie neu bauen könnten.
    if (!this.repoDir) return skipped(`Installiert aus einem Release: neue Versionen unter ${RELEASES_URL}`)
    if (!this.buildCommit) return skipped('Build enthält keine Commit-Kennung')
    if (!this.files.exists(this.repoDir)) return skipped(`Repo ${this.repoDir} fehlt`)
    await this.git('fetch', 'origin', BRANCH)
    const remote = (await this.git('rev-parse', REMOTE_REF)).trim()
    if (remote === this.buildCommit) return { kind: 'up-to-date' }
    const blocker = await this.findBlocker(remote)
    return blocker ? skipped(blocker) : { kind: 'available', remote }
  }

  /** Prüft erneut (das Repo kann sich seit der Anzeige geändert haben), zieht origin/main und liefert den Installer-Pfad. */
  async build(): Promise<string> {
    const check = await this.check()
    if (check.kind !== 'available') throw new UpdateError('Prüfung', check.kind === 'skipped' ? check.reason : 'kein neuerer Stand auf GitHub')
    await this.git('merge', '--ff-only', REMOTE_REF)
    if (await this.needsInstall(check.remote)) await this.npm('ci')
    await this.npm('run', 'dist:win')
    return this.installerPath()
  }

  private async findBlocker(remote: string): Promise<string | null> {
    const ancestor = await this.runner.exec('git', ['merge-base', '--is-ancestor', this.buildCommit, remote], this.repoDir)
    if (ancestor.code !== 0) return `installierter Stand ${this.buildCommit} liegt nicht in ${REMOTE_REF}`
    const branch = (await this.git('rev-parse', '--abbrev-ref', 'HEAD')).trim()
    if (branch !== BRANCH) return `Repo steht auf Branch ${branch} statt ${BRANCH}`
    if ((await this.git('status', '--porcelain')).trim()) return 'Repo hat uncommittete Änderungen'
    return null
  }

  private async needsInstall(remote: string): Promise<boolean> {
    if (!this.files.exists(join(this.repoDir, 'node_modules'))) return true
    const diff = await this.runner.exec('git', ['diff', '--quiet', this.buildCommit, remote, '--', 'package-lock.json'], this.repoDir)
    return diff.code !== 0
  }

  private installerPath(): string {
    const { version } = JSON.parse(this.files.readText(join(this.repoDir, 'package.json'))) as { version: string }
    return join(this.repoDir, 'release', `${PRODUCT_NAME} Setup ${version}.exe`)
  }

  private git(...args: string[]): Promise<string> {
    return this.checked('git', args)
  }

  private npm(...args: string[]): Promise<string> {
    return this.checked('npm', args)
  }

  private async checked(command: string, args: readonly string[]): Promise<string> {
    const result = await this.runner.exec(command, args, this.repoDir)
    if (result.code !== 0) throw new UpdateError(`${command} ${args.join(' ')}`, result.stderr.trim() || `Exit-Code ${result.code}`)
    return result.stdout
  }
}

function skipped(reason: string): UpdateCheck {
  return { kind: 'skipped', reason }
}
