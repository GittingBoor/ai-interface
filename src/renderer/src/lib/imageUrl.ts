import { IMAGE_PROTOCOL } from '@shared/api'

type ImageKind = 'image' | 'vault'
type ImageResolver = (kind: ImageKind, key: string) => string | null

let resolver: ImageResolver | null = null

/** Die Mock-API ersetzt `aiimg://`-Adressen durch Data-URLs (im Browser gibt es das Protokoll nicht). */
export function registerImageResolver(next: ImageResolver): void {
  resolver = next
}

function resolve(kind: ImageKind, key: string): string {
  return resolver?.(kind, key) ?? `${IMAGE_PROTOCOL}://${kind}/${encodeURIComponent(key)}`
}

export const galleryImageUrl = (id: number): string => resolve('image', String(id))
export const vaultImageUrl = (fileName: string): string => resolve('vault', fileName)
