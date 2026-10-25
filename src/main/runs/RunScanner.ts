import type { Host } from '../hosts/Host'
import type { ScanOffsets } from '../images/ScanOffsets'
import { SessionFileWalker } from '../images/SessionFileWalker'
import { extractRunEvents } from './extractRunEvents'
import type { InterruptedRunsRepo } from './InterruptedRunsRepo'

/** Beim ersten Lauf Abbrüche der letzten Woche nachholen. */
const BACKFILL_DAYS = 7

/** Liest neue Session-Zeilen eines Hosts und pflegt die offenen Durchläufe. */
export class RunScanner {
  private readonly walker: SessionFileWalker

  constructor(
    offsets: Pick<ScanOffsets, 'get' | 'set'>,
    private readonly runs: Pick<InterruptedRunsRepo, 'apply'>,
    now: () => number = Date.now
  ) {
    this.walker = new SessionFileWalker(offsets, BACKFILL_DAYS, now)
  }

  async scan(host: Host): Promise<void> {
    await this.walker.walk(host, (chunk) => {
      const events = extractRunEvents(chunk)
      this.runs.apply(host.id, events)
      return events.consumedBytes
    })
  }
}
