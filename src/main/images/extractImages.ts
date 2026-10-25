const NEWLINE = '\n'
/** Schneller Vorfilter: nur Zeilen mit Bildblock werden als JSON gelesen. */
const IMAGE_MARKER = '"type":"image"'
/** Playwright speichert Screenshots mit Dateiname auf der Platte und liefert nur einen Link. */
const SCREENSHOT_MARKER = '[Screenshot'
const SCREENSHOT_LINK = /\[Screenshot[^\]]*\]\(([^)\r\n]+?\.(?:png|jpe?g|webp))\)/gi

export interface ExtractedImage {
  readonly sessionId: string
  readonly cwd: string
  readonly timestamp: number
  readonly mediaType: string
  readonly data: Buffer
  /** Werkzeugname, falls das zugehörige `tool_use` im selben Ausschnitt steht. */
  readonly tool: string | null
  /** Vom Nutzer ins Terminal eingefügt statt von einem Werkzeug geliefert. */
  readonly fromUser: boolean
}

/** Screenshot, den ein Werkzeug als Datei abgelegt hat; `path` ist so, wie das Werkzeug ihn meldet. */
export interface ExtractedFile {
  readonly sessionId: string
  readonly cwd: string
  readonly timestamp: number
  readonly path: string
}

export interface ExtractOptions {
  readonly importReadImages: boolean
  readonly minBytes: number
}

interface ImageBlock {
  readonly type?: string
  readonly source?: { readonly type?: string; readonly media_type?: string; readonly data?: string }
}

interface ContentBlock extends ImageBlock {
  readonly text?: string
  readonly id?: string
  readonly name?: string
  readonly tool_use_id?: string
  readonly content?: unknown
}

interface RawEntry {
  readonly type?: string
  readonly cwd?: string
  readonly sessionId?: string
  readonly timestamp?: string
  /** Gesetzt in Subagenten-Sessions; deren „user“-Zeilen stammen vom Hauptagenten, nicht vom Nutzer. */
  readonly isSidechain?: boolean
  readonly message?: { readonly content?: unknown }
  readonly toolUseResult?: unknown
}

const blocks = (value: unknown): ContentBlock[] => (Array.isArray(value) ? (value as ContentBlock[]) : [])

/** `Read` liefert `toolUseResult = { type: 'image', file: … }`: die KI hat eine vorhandene Datei angesehen. */
function isReadResult(entry: RawEntry): boolean {
  const result = entry.toolUseResult as { type?: unknown; file?: unknown } | undefined
  return typeof result === 'object' && result !== null && !Array.isArray(result) && result.type === 'image' && result.file !== undefined
}

function origin(entry: RawEntry): Pick<ExtractedImage, 'sessionId' | 'cwd' | 'timestamp'> {
  const timestamp = Date.parse(entry.timestamp ?? '')
  return { sessionId: entry.sessionId ?? 'unbekannt', cwd: entry.cwd ?? '', timestamp: Number.isNaN(timestamp) ? Date.now() : timestamp }
}

function toImage(block: ImageBlock, entry: RawEntry, tool: string | null, minBytes: number, fromUser = false): ExtractedImage | null {
  const source = block.source
  if (block.type !== 'image' || source?.type !== 'base64' || !source.data || !source.media_type) return null
  const data = Buffer.from(source.data, 'base64')
  if (data.byteLength < minBytes) return null
  return { ...origin(entry), mediaType: source.media_type, data, tool, fromUser }
}

/** Dateipfade aus Screenshot-Links im Text eines Werkzeugergebnisses, ohne Dubletten. */
function screenshotFiles(content: unknown, entry: RawEntry): ExtractedFile[] {
  const texts = typeof content === 'string' ? [content] : blocks(content).map((b) => (b.type === 'text' ? (b.text ?? '') : ''))
  const paths = new Set<string>()
  for (const text of texts) for (const match of text.matchAll(SCREENSHOT_LINK)) if (match[1]) paths.add(match[1].trim())
  return [...paths].map((path) => ({ ...origin(entry), path }))
}

export interface ExtractResult {
  readonly images: ExtractedImage[]
  readonly files: ExtractedFile[]
  readonly consumedBytes: number
}

/**
 * Bilder und Screenshot-Dateien aus Werkzeugergebnissen eines JSONL-Ausschnitts, dazu vom Nutzer eingefügte
 * Bilder (`fromUser`). `Read`-Ergebnisse nur mit `importReadImages`. Eine unvollständige letzte Zeile bleibt liegen.
 */
export function extractImages(chunk: string, options: ExtractOptions): ExtractResult {
  const lastNewline = chunk.lastIndexOf(NEWLINE)
  if (lastNewline === -1) return { images: [], files: [], consumedBytes: 0 }
  const complete = chunk.slice(0, lastNewline + 1)
  const toolNames = new Map<string, string>()
  const images: ExtractedImage[] = []
  const files: ExtractedFile[] = []
  for (const line of complete.split(NEWLINE)) {
    const hasImage = line.includes(IMAGE_MARKER) || line.includes(SCREENSHOT_MARKER)
    if (!hasImage && !line.includes('"tool_use"')) continue
    let entry: RawEntry
    try {
      entry = JSON.parse(line) as RawEntry
    } catch {
      continue
    }
    const content = blocks(entry.message?.content)
    for (const block of content) if (block.type === 'tool_use' && block.id && block.name) toolNames.set(block.id, block.name)
    if (!hasImage || entry.type !== 'user' || !entry.cwd) continue
    if (isReadResult(entry) && !options.importReadImages) continue
    for (const block of content) {
      if (block.type === 'image' && !entry.isSidechain) {
        const pasted = toImage(block, entry, null, options.minBytes, true)
        if (pasted) images.push(pasted)
      }
      if (block.type !== 'tool_result') continue
      const tool = block.tool_use_id ? (toolNames.get(block.tool_use_id) ?? null) : null
      files.push(...screenshotFiles(block.content, entry))
      for (const inner of blocks(block.content)) {
        const image = toImage(inner, entry, tool, options.minBytes)
        if (image) images.push(image)
      }
    }
  }
  return { images, files, consumedBytes: Buffer.byteLength(complete, 'utf8') }
}
