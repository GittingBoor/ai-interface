/** Art einer hereingezogenen Datei, bestimmt das Symbol in der Vorschau. */
export type FileKind = 'image' | 'pdf' | 'audio' | 'video' | 'code' | 'text' | 'archive' | 'document' | 'spreadsheet' | 'folder' | 'other'

const EXTENSION_KINDS: Readonly<Record<Exclude<FileKind, 'folder' | 'other'>, readonly string[]>> = {
  image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif', 'heic', 'tif', 'tiff'],
  pdf: ['pdf'],
  audio: ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'opus', 'mid', 'midi', 'aiff'],
  video: ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v'],
  code: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'py', 'rs', 'go', 'java', 'kt', 'c', 'h', 'cpp', 'hpp', 'cs', 'rb', 'php', 'swift', 'sh', 'ps1', 'sql', 'html', 'css', 'json', 'yaml', 'yml', 'toml', 'xml', 'ipynb'],
  text: ['txt', 'md', 'log', 'ini', 'cfg', 'env', 'rtf'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz'],
  document: ['doc', 'docx', 'odt', 'ppt', 'pptx', 'odp', 'pages', 'key', 'epub'],
  spreadsheet: ['xls', 'xlsx', 'ods', 'csv', 'tsv', 'numbers']
}

const MIME_PREFIX_KINDS: readonly (readonly [string, FileKind])[] = [
  ['image/', 'image'],
  ['audio/', 'audio'],
  ['video/', 'video'],
  ['text/', 'text']
]

/** Endung in Großbuchstaben (`PDF`), leer ohne Endung. */
export function extensionOf(name: string): string {
  return /\.([^./\\]+)$/.exec(name)?.[1]?.toUpperCase() ?? ''
}

/** Ordner haben im Browser weder Typ noch Größe; erkannt wird das nur zusammen mit fehlender Endung. */
export function fileKindOf(name: string, mime: string, size: number): FileKind {
  const extension = extensionOf(name).toLowerCase()
  for (const [kind, extensions] of Object.entries(EXTENSION_KINDS)) {
    if (extensions.includes(extension)) return kind as FileKind
  }
  if (mime === 'application/pdf') return 'pdf'
  const byMime = MIME_PREFIX_KINDS.find(([prefix]) => mime.startsWith(prefix))
  if (byMime) return byMime[1]
  return !extension && !mime && size === 0 ? 'folder' : 'other'
}
