import type { HostId } from '@shared/types'

export interface DirEntry {
  readonly name: string
  readonly isDirectory: boolean
}

export interface FileStat {
  readonly size: number
  readonly mtimeMs: number
  readonly isDirectory: boolean
}

export interface ExecResult {
  readonly stdout: string
  readonly stderr: string
  readonly code: number
}

/** Dateizugriff und Befehle auf einem Rechner (lokal oder per SSH). */
export interface Host {
  readonly id: HostId
  /** Pfadtrenner des Zielsystems. */
  readonly separator: '/' | '\\'
  homeDir(): Promise<string>
  readDir(path: string): Promise<DirEntry[]>
  /** Liest ab Byte `start` bis zum Ende. */
  /** `length` begrenzt die gelesenen Bytes (ohne: bis zum Dateiende). */
  readFile(path: string, start?: number, length?: number): Promise<Buffer>
  /** `null`, wenn der Pfad nicht existiert. */
  stat(path: string): Promise<FileStat | null>
  writeFileAtomic(path: string, data: string): Promise<void>
  /** Schreibt Binärdaten, legt fehlende Ordner an. */
  writeFileBytes(path: string, data: Uint8Array): Promise<void>
  /** Löscht eine Datei; fehlende Dateien sind kein Fehler. */
  remove(path: string): Promise<void>
  /** Temp-Ordner des Systems. */
  tempDir(): Promise<string>
  exec(command: string): Promise<ExecResult>
}

export const joinPath = (host: Pick<Host, 'separator'>, ...parts: string[]): string =>
  parts
    .filter((p) => p.length > 0)
    .map((p, i) => (i === 0 ? p.replace(/[\\/]+$/, '') : p.replace(/^[\\/]+|[\\/]+$/g, '')))
    .join(host.separator)
    .replace(/[\\/]/g, host.separator)

/** Alle bekannten Rechner (dieser PC und die Geräte aus den Einstellungen). */
export interface HostDirectory {
  ids(): HostId[]
  label(id: HostId): string
  isEnabled(id: HostId): boolean
  get(id: HostId): Host
}
