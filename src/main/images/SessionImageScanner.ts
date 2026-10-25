import type { Favorite, ImageMeta } from '@shared/types'
import { findProjectFor } from '@shared/projectMatch'
import { HostUnreachableError } from '../errors'
import { type Host, joinPath } from '../hosts/Host'
import { type ExtractedFile, type ExtractedImage, extractImages } from './extractImages'
import type { AutoImageInput } from './ImageStore'
import type { ScanOffsets } from './ScanOffsets'
import { SessionFileWalker } from './SessionFileWalker'

/** Beim ersten Lauf nur Sessions der letzten Tage nachlesen. */
const BACKFILL_DAYS = 30
/** Kleinere Bilder sind meist Icons oder Platzhalter. */
const MIN_IMAGE_BYTES = 4096
const MCP_PREFIX = /^mcp__[^_]+(?:_[^_]+)*?__/
/** Playwright legt Screenshots mit Dateinamen hier ab; relative Pfade gelten mal ab Projekt, mal ab diesem Ordner. */
const PLAYWRIGHT_OUTPUT_DIR = '.playwright-mcp'
const ABSOLUTE_PATH = /^(?:[a-zA-Z]:)?[\\/]/
const CURRENT_DIR_PREFIX = /^\.[\\/]/

const EXTENSION: Readonly<Record<string, string>> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }

const formatDate = (timestamp: number): string => new Date(timestamp).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })
const fileName = (path: string): string => path.split(/[\\/]/).pop() ?? path
const fileExtension = (path: string): string => (path.split('.').pop() ?? '').toLowerCase().replace('jpeg', 'jpg')

/** Mögliche Orte einer gemeldeten Screenshot-Datei, in Prüfreihenfolge. */
function candidatePaths(host: Host, file: ExtractedFile): string[] {
  if (ABSOLUTE_PATH.test(file.path)) return [file.path]
  const relative = file.path.replace(CURRENT_DIR_PREFIX, '')
  return [joinPath(host, file.cwd, relative), joinPath(host, file.cwd, PLAYWRIGHT_OUTPUT_DIR, relative)]
}

function titleFor(image: ExtractedImage): string {
  const date = formatDate(image.timestamp)
  if (image.fromUser) return `Von dir · ${date}`
  if (!image.tool) return `KI-Bild · ${date}`
  return `Screenshot · ${image.tool.replace(MCP_PREFIX, '')} · ${date}`
}

/** Übernimmt Bilder aus Claude-Sessions in die Galerie des Projekts, in dem die Session lief. */
export class SessionImageScanner {
  private readonly walker: SessionFileWalker

  constructor(
    offsets: Pick<ScanOffsets, 'get' | 'set'>,
    private readonly store: { addAuto(input: AutoImageInput): ImageMeta | null },
    private readonly projects: () => readonly Favorite[],
    private readonly options: () => { readonly importReadImages: boolean },
    now: () => number = Date.now
  ) {
    this.walker = new SessionFileWalker(offsets, BACKFILL_DAYS, now)
  }

  async scan(host: Host): Promise<ImageMeta[]> {
    const added: ImageMeta[] = []
    await this.walker.walk(host, async (chunk) => {
      const { images, files, consumedBytes } = extractImages(chunk, { importReadImages: this.options().importReadImages, minBytes: MIN_IMAGE_BYTES })
      for (const image of images) {
        const meta = this.storeImage(host, image)
        if (meta) added.push(meta)
      }
      for (const file of files) {
        const meta = await this.storeFile(host, file)
        if (meta) added.push(meta)
      }
      return consumedBytes
    }, true)
    return added
  }

  /** Screenshot-Datei übernehmen, solange sie noch existiert (KIs räumen sie oft wieder weg). */
  private async storeFile(host: Host, file: ExtractedFile): Promise<ImageMeta | null> {
    const project = findProjectFor(this.projects(), host.id, file.cwd)
    const extension = fileExtension(file.path)
    if (!project || !Object.values(EXTENSION).includes(extension)) return null
    const data = await this.readFirst(host, candidatePaths(host, file))
    if (!data) return null
    return this.store.addAuto({
      data,
      extension,
      title: `Screenshot · ${fileName(file.path)} · ${formatDate(file.timestamp)}`,
      project: project.path,
      host: host.id,
      source: 'auto',
      sessionId: file.sessionId,
      createdAt: file.timestamp
    })
  }

  private async readFirst(host: Host, paths: readonly string[]): Promise<Buffer | null> {
    for (const path of paths) {
      try {
        const stat = await host.stat(path)
        if (!stat || stat.isDirectory || stat.size < MIN_IMAGE_BYTES) continue
        return await host.readFile(path)
      } catch (error) {
        if (error instanceof HostUnreachableError) throw error
        // Unlesbare Datei: nächsten Ort versuchen.
      }
    }
    return null
  }

  private storeImage(host: Host, image: ExtractedImage): ImageMeta | null {
    const project = findProjectFor(this.projects(), host.id, image.cwd)
    const extension = EXTENSION[image.mediaType]
    if (!project || !extension) return null
    return this.store.addAuto({
      data: image.data,
      extension,
      title: titleFor(image),
      project: project.path,
      host: host.id,
      source: image.fromUser ? 'user' : 'auto',
      sessionId: image.sessionId,
      createdAt: image.timestamp
    })
  }
}
