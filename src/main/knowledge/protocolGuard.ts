import type { ProtocolEntry } from '@shared/types'
import { NotFoundError } from '../errors'

/** Lässt nur Protokolle zu, die zur Protokollgruppe des Projekts gehören; alles andere gilt als nicht vorhanden. */
export function assertOwnProtocol(entries: readonly ProtocolEntry[], path: string): void {
  if (!entries.some((entry) => entry.path === path)) throw new NotFoundError(`Protokoll „${path}“`, 'Nur Protokolle dieses Projekts sind lesbar.')
}
