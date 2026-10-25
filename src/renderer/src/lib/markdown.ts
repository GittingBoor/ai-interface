import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { vaultImageUrl } from './imageUrl'

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/
const EMBED = /!\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]/g
const WIKILINK = /\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g
const CODE_FENCE = /(```[\s\S]*?```|`[^`\n]*`)/g
/** Erlaubt zusätzlich das eigene Bildprotokoll `aiimg:`. */
const ALLOWED_URI = /^(?:(?:https?|mailto|aiimg|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i

const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c)

function transformObsidian(text: string): string {
  return text
    .replace(EMBED, (_m, file: string) => {
      const name = file.trim()
      return `<img src="${escapeHtml(vaultImageUrl(name))}" alt="${escapeHtml(name)}" loading="lazy">`
    })
    .replace(WIKILINK, (_m, target: string, alias?: string) => {
      const label = (alias ?? target).trim()
      return `<span class="wikilink" title="${escapeHtml(target.trim())}">${escapeHtml(label)}</span>`
    })
}

export function stripFrontmatter(markdown: string): string {
  return markdown.replace(FRONTMATTER, '')
}

/** Obsidian-Markdown als bereinigtes HTML. Code-Blöcke bleiben unangetastet. */
export function renderMarkdown(markdown: string): string {
  const body = stripFrontmatter(markdown)
    .split(CODE_FENCE)
    .map((part, i) => (i % 2 === 1 ? part : transformObsidian(part)))
    .join('')
  const html = marked.parse(body, { async: false, gfm: true, breaks: false })
  return DOMPurify.sanitize(html, { ALLOWED_URI_REGEXP: ALLOWED_URI })
}

/** Erste Überschrift oder null, für Listenvorschau. */
export function firstHeading(markdown: string): string | null {
  const match = /^#{1,3}\s+(.+)$/m.exec(stripFrontmatter(markdown))
  return match?.[1]?.trim() ?? null
}
