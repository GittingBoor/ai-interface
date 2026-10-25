import type { FolderEntry, HostId } from '@shared/types'
import { type Host, joinPath } from '../hosts/Host'

const HOME_PREFIX = /^~(?=$|[\/])/

/** Listet Ordnerinhalte auf einem Host (Ordner-Browser, Mini-PC-Bereich). */
export class FolderLister {
  constructor(private readonly hosts: (id: HostId) => Host) {}

  async home(host: HostId): Promise<string> {
    return this.hosts(host).homeDir()
  }

  async list(hostId: HostId, path: string, showHidden: boolean): Promise<FolderEntry[]> {
    const host = this.hosts(hostId)
    const dir = HOME_PREFIX.test(path) ? path.replace(HOME_PREFIX, await host.homeDir()) : path
    const entries = await host.readDir(dir)
    return entries
      .map((e) => ({ name: e.name, path: joinPath(host, dir, e.name), isDirectory: e.isDirectory, hidden: e.name.startsWith('.') }))
      .filter((e) => showHidden || !e.hidden)
      .sort((a, b) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name, 'de'))
  }
}
