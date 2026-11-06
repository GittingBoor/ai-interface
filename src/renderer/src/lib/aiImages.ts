import { messagesFor } from '@shared/i18n/messages'
import { activeLocale, activeTag } from '../i18n/activeLocale'

const MAX_NAMED_PROJECTS = 2

/** Toast-Text für neu übernommene KI-Bilder, z. B. „3 neue KI-Bilder in AI Interface“. */
export function aiImagesMessage(count: number, projectNames: readonly string[]): string {
  const t = messagesFor(activeLocale()).frame.app
  const images = t.newImages(count)
  const names = [...new Set(projectNames)]
  if (names.length === 0) return images
  if (names.length <= MAX_NAMED_PROJECTS) return t.imagesIn(images, new Intl.ListFormat(activeTag(), { type: 'conjunction' }).format(names))
  return t.imagesInProjects(images, names.length)
}
