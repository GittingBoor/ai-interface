import { File, FileArchive, FileAudio, FileCode, FileSpreadsheet, FileText, FileType, FileVideo, Folder, X, type LucideIcon } from 'lucide-react'
import { IconButton } from '@renderer/components/Button'
import { extensionOf, type FileKind } from '@renderer/lib/fileKind'
import { formatBytes } from '@renderer/lib/format'
import { useT } from '@renderer/i18n/useT'
import { attachmentsOf, useAttachments, type TerminalAttachment } from '@renderer/stores/attachmentStore'

interface KindStyle {
  readonly icon: LucideIcon
  /** Tönung der Symbol-Kachel, nur aus vorhandenen Theme-Farben. */
  readonly tile: string
}

const NEUTRAL_TILE = 'bg-raised-2 text-ink-2'

const KIND_STYLES: Readonly<Record<Exclude<FileKind, 'image'>, KindStyle>> = {
  pdf: { icon: FileText, tile: 'bg-danger-soft text-danger-ink' },
  audio: { icon: FileAudio, tile: 'bg-status-question/15 text-status-question' },
  video: { icon: FileVideo, tile: 'bg-accent-soft text-accent-text' },
  code: { icon: FileCode, tile: 'bg-status-review/15 text-status-review' },
  spreadsheet: { icon: FileSpreadsheet, tile: 'bg-status-idle/15 text-status-idle' },
  archive: { icon: FileArchive, tile: 'bg-warn-soft text-warn' },
  text: { icon: FileType, tile: NEUTRAL_TILE },
  document: { icon: FileText, tile: NEUTRAL_TILE },
  folder: { icon: Folder, tile: NEUTRAL_TILE },
  other: { icon: File, tile: NEUTRAL_TILE }
}

const TILE = 'grid size-7 shrink-0 place-items-center overflow-hidden rounded-[5px]'

/** Einblenden über @starting-style; reduzierte Bewegung kürzt die globale Regel auf null. */
const ENTER = 'transition-[opacity,translate] duration-200 ease-out-expo starting:translate-y-1 starting:opacity-0'

function Thumb({ item }: { readonly item: TerminalAttachment }): React.JSX.Element {
  if (item.kind === 'image' && item.previewUrl) {
    return (
      <span className={`${TILE} bg-raised-2 ring-1 ring-line-strong/50 ring-inset`}>
        <img src={item.previewUrl} alt="" width={28} height={28} draggable={false} className="size-full object-cover" />
      </span>
    )
  }
  const style = item.kind === 'image' ? KIND_STYLES.other : KIND_STYLES[item.kind]
  const Icon = style.icon
  return (
    <span className={`${TILE} ${style.tile}`}>
      <Icon className="size-3.5" aria-hidden strokeWidth={1.75} />
    </span>
  )
}

function Chip({ item }: { readonly item: TerminalAttachment }): React.JSX.Element {
  const t = useT().terminal
  const folder = item.kind === 'folder'
  const type = folder ? t.folder : extensionOf(item.name) || t.file
  return (
    <li title={item.path} className={`flex h-9 max-w-[13rem] shrink-0 items-center gap-2 rounded-md border border-line bg-base py-1 pr-2.5 pl-1 ${ENTER}`}>
      <Thumb item={item} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-2xs font-[560] text-ink-2">{item.name}</span>
        <span className="truncate text-2xs text-ink-3 tabular-nums">
          {type}
          {folder ? null : ` · ${formatBytes(item.size)}`}
        </span>
      </span>
    </li>
  )
}

/** Ohne sichtbaren Balken scrollt das Mausrad die Reihe seitwärts. */
function scrollSideways(e: React.WheelEvent<HTMLUListElement>): void {
  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) e.currentTarget.scrollLeft += e.deltaY
}

/** Vorschau der ins Terminal gezogenen Dateien; unten im Slot, nimmt dem Terminal Platz statt es zu überdecken. */
export function AttachmentStrip({ terminalId }: { readonly terminalId: string }): React.JSX.Element | null {
  const t = useT().terminal
  const items = useAttachments((s) => attachmentsOf(s, terminalId))
  const clear = useAttachments((s) => s.clear)
  if (items.length === 0) return null

  return (
    <div className={`flex shrink-0 items-center gap-1 border-t border-line/70 py-1.5 pr-1.5 pl-3 ${ENTER}`}>
      <ul
        aria-label={t.attachments}
        tabIndex={0}
        onWheel={scrollSideways}
        className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto rounded-md [scrollbar-width:none]"
      >
        {items.map((item) => (
          <Chip key={item.key} item={item} />
        ))}
      </ul>
      <IconButton size="sm" icon={X} label={t.hideAttachments} onClick={() => clear(terminalId)} />
    </div>
  )
}
