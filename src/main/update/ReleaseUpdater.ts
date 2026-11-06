import { mainT } from '../i18n'
import { UpdateError } from '../errors'
import type { UpdateCheck } from './StartupUpdater'

const RELEASES_URL = 'https://github.com/GittingBoor/ai-interface/releases'

/** Der Teil von `electron-updater`, den die App braucht (austauschbar für Tests). */
export interface ReleaseClient {
  checkForUpdates(): Promise<{ readonly isUpdateAvailable: boolean; readonly updateInfo: { readonly version: string } } | null>
  downloadUpdate(): Promise<readonly string[]>
}

/** Für installierte Releases: prüft das neueste GitHub-Release (`latest.yml`) und lädt dessen Installer herunter. */
export class ReleaseUpdater {
  constructor(private readonly client: ReleaseClient) {}

  async check(): Promise<UpdateCheck> {
    const result = await this.client.checkForUpdates()
    // null: Updater ist abgeschaltet (z. B. ohne app-update.yml im Paket).
    if (!result) return { kind: 'skipped', reason: mainT().errors.update.releaseInstall(RELEASES_URL) }
    return result.isUpdateAvailable ? { kind: 'available', remote: result.updateInfo.version } : { kind: 'up-to-date' }
  }

  async build(): Promise<string> {
    const [installer] = await this.client.downloadUpdate()
    if (!installer) throw new UpdateError(mainT().errors.update.step, mainT().errors.update.nothingNewer)
    return installer
  }
}
