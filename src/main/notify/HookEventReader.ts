import type { Host } from '../hosts/Host'
import { type HookEvent, parseSpool } from './hookSettings'

/** Hook-Payloads (z. B. letzte Antwort bei `Stop`) sind oft mehrere KB groß; alte Einträge braucht niemand. */
const DEFAULT_MAX_SPOOL_BYTES = 1024 * 1024

/** Liest neue Hook-Ereignisse aus der Spool-Datei eines Hosts (Offset-basiert). */
export class HookEventReader {
  private offset = 0
  private started = false

  constructor(
    private readonly host: Host,
    private readonly spoolPath: () => Promise<string>,
    private readonly onEvents: (events: HookEvent[]) => void,
    private readonly now: () => number = Date.now,
    private readonly maxSpoolBytes: number = DEFAULT_MAX_SPOOL_BYTES
  ) {}

  async poll(): Promise<void> {
    const path = await this.spoolPath()
    const stat = await this.host.stat(path)
    if (!this.started) {
      // Alte Ereignisse (vor dem App-Start) lösen keine Benachrichtigung aus; eine zu große Datei wird geleert.
      this.started = true
      if (stat && stat.size > this.maxSpoolBytes) {
        await this.host.writeFileAtomic(path, '')
        this.offset = 0
      } else {
        this.offset = stat?.size ?? 0
      }
      return
    }
    if (!stat) {
      this.offset = 0
      return
    }
    if (stat.size < this.offset) this.offset = 0
    if (stat.size === this.offset) return
    const chunk = (await this.host.readFile(path, this.offset)).toString('utf8')
    const { events, consumedBytes } = parseSpool(chunk, this.host.id, this.now())
    this.offset += consumedBytes
    if (events.length) this.onEvents(events)
  }
}
