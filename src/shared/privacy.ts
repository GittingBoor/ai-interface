import type { HostId } from './types'

export interface PrivateProject {
  readonly id: number
  readonly host: HostId
  readonly path: string
  readonly label: string
}

export interface PrivateProjectInput {
  readonly host: HostId
  readonly path: string
  readonly label: string
}

export interface PrivacyStatus {
  readonly locked: boolean
  readonly hasPin: boolean
  /** Nur die Anzahl, damit gesperrt keine Namen sichtbar werden. */
  readonly hiddenCount: number
}

/**
 * Sind private Inhalte gerade verborgen? Ohne PIN lässt sich nichts entsperren; was sich nur als privat markiert
 * (z. B. ein Add-on), bleibt dann sichtbar. Unbekannter Status gilt als gesperrt.
 */
export function privacyHides(status: PrivacyStatus | null): boolean {
  return status === null || (status.locked && status.hasPin)
}

export const PIN_PATTERN = /^\d{4,12}$/
