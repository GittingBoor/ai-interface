import { createHash } from 'node:crypto'
import { copyFile, mkdir, mkdtemp, open, readdir, rename, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { SPEECH_MODEL_IDS, type SpeechModelId, type SpeechProgress } from '@shared/speech'
import { DownloadCancelledError, DownloadChecksumError, DownloadError } from '../errors'
import type { DownloadAsset, WhisperAssets } from './whisperAssets'

/** Fortschritt höchstens alle 2 MB melden, damit IPC nicht überläuft. */
const PROGRESS_STEP_BYTES = 2 * 1024 * 1024
const PART_SUFFIX = '.part'

export interface InstallerDeps {
  readonly rootDir: string
  readonly assets: WhisperAssets
  readonly fetch: (url: string, init: { signal: AbortSignal }) => Promise<Response>
  readonly extractZip: (zipPath: string, targetDir: string) => Promise<void>
}

interface ProgressCounter {
  received: number
  lastReported: number
  readonly total: number
  readonly report: (received: number) => void
}

const exists = (path: string): Promise<boolean> =>
  stat(path).then(
    () => true,
    () => false
  )

const isAbort = (error: unknown): boolean => error instanceof Error && error.name === 'AbortError'

/** Lädt whisper.cpp und Modelle nach `<rootDir>/bin` bzw. `<rootDir>/models`. */
export class WhisperInstaller {
  private readonly binDir: string
  private readonly modelsDir: string

  constructor(private readonly deps: InstallerDeps) {
    this.binDir = join(deps.rootDir, 'bin')
    this.modelsDir = join(deps.rootDir, 'models')
  }

  get serverPath(): string {
    return join(this.binDir, this.deps.assets.serverFile)
  }

  modelPath(id: SpeechModelId): string {
    return join(this.modelsDir, `ggml-${id}.bin`)
  }

  async binariesInstalled(): Promise<boolean> {
    const present = await Promise.all(this.deps.assets.requiredBinaries.map((f) => exists(join(this.binDir, f))))
    return present.every(Boolean)
  }

  async installedModels(): Promise<SpeechModelId[]> {
    const present = await Promise.all(SPEECH_MODEL_IDS.map(async (id) => ((await exists(this.modelPath(id))) ? id : null)))
    return present.filter((id): id is SpeechModelId => id !== null)
  }

  /** Lädt fehlende Binärdateien und das Modell; wirft `DownloadCancelledError` bei Abbruch. */
  async install(model: SpeechModelId, signal: AbortSignal, onProgress: (p: SpeechProgress) => void): Promise<void> {
    const needBinaries = !(await this.binariesInstalled())
    const modelAsset = this.deps.assets.models[model]
    const archiveBytes = needBinaries ? this.deps.assets.archives.reduce((sum, a) => sum + a.bytes, 0) : 0
    const counter: ProgressCounter = {
      received: 0,
      lastReported: 0,
      total: archiveBytes + modelAsset.bytes,
      report: (received) => onProgress({ model, receivedBytes: received, totalBytes: archiveBytes + modelAsset.bytes })
    }
    if (needBinaries) await this.installBinaries(signal, counter)
    await mkdir(this.modelsDir, { recursive: true })
    await this.download(`Modell ${model}`, modelAsset, this.modelPath(model), signal, counter)
    counter.report(counter.received)
  }

  async removeModel(id: SpeechModelId): Promise<void> {
    await rm(this.modelPath(id), { force: true })
  }

  private async installBinaries(signal: AbortSignal, counter: ProgressCounter): Promise<void> {
    await mkdir(this.deps.rootDir, { recursive: true })
    const staging = await mkdtemp(join(this.deps.rootDir, 'staging-'))
    try {
      await mkdir(this.binDir, { recursive: true })
      for (const archive of this.deps.assets.archives) {
        const zipPath = join(staging, `${archive.name.replace(/\W+/g, '_')}.zip`)
        await this.download(archive.name, archive, zipPath, signal, counter)
        const extracted = join(staging, `${archive.name.replace(/\W+/g, '_')}-files`)
        await mkdir(extracted, { recursive: true })
        await this.deps.extractZip(zipPath, extracted)
        await this.copyPicked(extracted, archive.pick)
      }
    } finally {
      await rm(staging, { recursive: true, force: true })
    }
  }

  /** Übernimmt passende Dateien aus beliebiger Ordnertiefe flach nach `bin/`. */
  private async copyPicked(dir: string, pick: readonly RegExp[]): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) await this.copyPicked(path, pick)
      else if (pick.some((p) => p.test(entry.name))) await copyFile(path, join(this.binDir, entry.name))
    }
  }

  private async download(what: string, asset: DownloadAsset, target: string, signal: AbortSignal, counter: ProgressCounter): Promise<void> {
    const part = `${target}${PART_SUFFIX}`
    const hash = createHash('sha256')
    try {
      const response = await this.deps.fetch(asset.url, { signal })
      if (!response.ok || !response.body) throw new DownloadError(what, `HTTP ${response.status}`)
      const file = await open(part, 'w')
      try {
        for await (const chunk of response.body) {
          if (signal.aborted) throw new DownloadCancelledError()
          const data = chunk as Uint8Array
          hash.update(data)
          await file.write(data)
          counter.received += data.length
          if (counter.received - counter.lastReported >= PROGRESS_STEP_BYTES) {
            counter.lastReported = counter.received
            counter.report(counter.received)
          }
        }
      } finally {
        await file.close()
      }
      if (hash.digest('hex') !== asset.sha256) throw new DownloadChecksumError(what)
      await rename(part, target)
    } catch (error) {
      await rm(part, { force: true })
      if (error instanceof DownloadCancelledError || error instanceof DownloadChecksumError || error instanceof DownloadError) throw error
      if (isAbort(error) || signal.aborted) throw new DownloadCancelledError()
      throw new DownloadError(what, error instanceof Error ? error.message : String(error))
    }
  }
}
