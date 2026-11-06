import { mainT } from '../i18n'

const PREVIEW_CONTENT_CHARS = 600
const NO_ICON = ''

function excerpt(text: string): string {
  return text.length > PREVIEW_CONTENT_CHARS ? `${text.slice(0, PREVIEW_CONTENT_CHARS)}\n…` : text
}

/** Bestätigungsvorschauen für den Nutzer: in der Sprache der App, getrennt von den modellseitigen Werkzeugtexten. */
export function previewCreateFolder(dir: string, filePaths: readonly string[], plan: string): string {
  const t = mainT().assistant.previews
  return [t.folder(dir), t.files, ...filePaths.map((path) => `- ${path}`), t.gitInit, '', excerpt(plan)].join('\n')
}

export function previewNote(path: string, content: string): string {
  return `${mainT().assistant.previews.note(path)}\n\n${excerpt(content)}`
}

export function previewAddProject(name: string, host: string, path: string, category: string | undefined, color: string, icon: string | undefined): string {
  return mainT().assistant.previews.project(name, host, path, category ?? '', color, icon ?? NO_ICON)
}

export function previewCreateCategory(name: string, color: string, icon: string | undefined): string {
  return mainT().assistant.previews.category(name, color, icon ?? NO_ICON)
}

export function previewAddTodo(section: string, text: string): string {
  return mainT().assistant.previews.todo(section, text)
}
