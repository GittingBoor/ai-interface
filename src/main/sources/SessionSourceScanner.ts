import type { Favorite, Source } from '@shared/types'
import { findProjectFor } from '@shared/projectMatch'
import type { Host } from '../hosts/Host'
import type { ScanOffsets } from '../images/ScanOffsets'
import { SessionFileWalker } from '../images/SessionFileWalker'
import { extractSources } from './extractSources'
import type { AutoSourceInput } from './SourceRepo'

/** Beim ersten Lauf nur Sessions der letzten Tage nachlesen (wie die Galerie). */
const BACKFILL_DAYS = 30

/** Übernimmt Seiten, die Claude gelesen hat, in die Quellen des Projekts, in dem die Session lief (sonst „Allgemein“). */
export class SessionSourceScanner {
  private readonly walker: SessionFileWalker

  constructor(
    offsets: Pick<ScanOffsets, 'get' | 'set'>,
    private readonly store: { addAuto(input: AutoSourceInput): Source | null },
    private readonly projects: () => readonly Favorite[],
    now: () => number = Date.now
  ) {
    this.walker = new SessionFileWalker(offsets, BACKFILL_DAYS, now)
  }

  async scan(host: Host): Promise<Source[]> {
    const added: Source[] = []
    await this.walker.walk(
      host,
      (chunk) => {
        const { sources, consumedBytes } = extractSources(chunk)
        for (const source of sources) {
          const project = findProjectFor(this.projects(), host.id, source.cwd)
          const stored = this.store.addAuto({
            url: source.url,
            note: source.note,
            host: host.id,
            project: project?.path ?? null,
            sessionId: source.sessionId,
            createdAt: source.timestamp
          })
          if (stored) added.push(stored)
        }
        return consumedBytes
      },
      true
    )
    return added
  }
}
