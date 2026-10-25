import { WhisperStartError } from '../errors'

const HOST = '127.0.0.1'
const LANGUAGE = 'de'
const POLL_INTERVAL_MS = 150
const PROBE_TIMEOUT_MS = 1_000
const CPU_FLAG = '-ng'

export interface ServerProcess {
  readonly exited: boolean
  kill(): void
  onExit(listener: (code: number | null) => void): void
}

export interface ServerDeps {
  readonly spawn: (command: string, args: readonly string[]) => ServerProcess
  readonly fetch: (url: string, init?: { signal?: AbortSignal }) => Promise<Response>
  readonly freePort: () => Promise<number>
  readonly sleep: (ms: number) => Promise<void>
  readonly log: (message: string) => void
  /** Großes Modell + erstes Kompilieren der Vulkan-Shader kann dauern. */
  readonly readyTimeoutMs: number
}

interface Running {
  readonly process: ServerProcess
  readonly url: string
  readonly modelPath: string
}

/** Hält genau einen `whisper-server` mit dem gewählten Modell am Leben. */
export class WhisperServer {
  private running: Running | null = null
  private starting: { readonly modelPath: string; readonly promise: Promise<Running> } | null = null
  /** Prozess des laufenden Startversuchs, damit stop() ihn auch beenden kann. */
  private startingProcess: ServerProcess | null = null
  /** Zählt bei jedem stop() hoch; ein Start aus einer älteren Generation wird verworfen. */
  private generation = 0

  constructor(
    private readonly serverPath: string,
    private readonly deps: ServerDeps
  ) {}

  /** Geladenes oder gerade ladendes Modell (Windows sperrt die Datei in beiden Fällen). */
  get runningModel(): string | null {
    if (this.starting) return this.starting.modelPath
    return this.running && !this.running.process.exited ? this.running.modelPath : null
  }

  async url(modelPath: string): Promise<string> {
    for (;;) {
      if (this.running && !this.running.process.exited && this.running.modelPath === modelPath) return this.running.url
      if (!this.starting) break
      // Laufenden Start abwarten (auch den eines anderen Modells), dann neu entscheiden.
      const pending = this.starting
      if (pending.modelPath === modelPath) return (await pending.promise).url
      await pending.promise.catch(() => undefined)
    }
    this.stop()
    const generation = this.generation
    const entry = { modelPath, promise: this.start(modelPath, generation) }
    this.starting = entry
    try {
      const started = await entry.promise
      this.running = started
      return started.url
    } finally {
      if (this.starting === entry) this.starting = null
    }
  }

  stop(): void {
    this.generation++
    if (this.startingProcess && !this.startingProcess.exited) this.startingProcess.kill()
    this.startingProcess = null
    this.starting = null
    if (this.running && !this.running.process.exited) this.running.process.kill()
    this.running = null
  }

  private async start(modelPath: string, generation: number): Promise<Running> {
    const gpu = await this.tryStart(modelPath, [], generation)
    if (gpu) return gpu
    this.throwIfStopped(generation)
    this.deps.log('whisper-server: GPU-Start fehlgeschlagen, versuche CPU')
    const cpu = await this.tryStart(modelPath, [CPU_FLAG], generation)
    if (cpu) return cpu
    this.throwIfStopped(generation)
    throw new WhisperStartError('whisper-server antwortet weder mit GPU noch mit CPU')
  }

  private throwIfStopped(generation: number): void {
    if (generation !== this.generation) throw new WhisperStartError('Start abgebrochen, weil die Spracherkennung beendet wurde')
  }

  private async tryStart(modelPath: string, extra: readonly string[], generation: number): Promise<Running | null> {
    const port = await this.deps.freePort()
    this.throwIfStopped(generation)
    const args = ['-m', modelPath, '--host', HOST, '--port', String(port), '-l', LANGUAGE, ...extra]
    const process = this.deps.spawn(this.serverPath, args)
    this.startingProcess = process
    const url = `http://${HOST}:${port}`
    const ready = await this.waitReady(url, process)
    if (this.startingProcess === process) this.startingProcess = null
    if (ready && generation === this.generation) return { process, url, modelPath }
    if (!process.exited) process.kill()
    return null
  }

  private async waitReady(url: string, process: ServerProcess): Promise<boolean> {
    const deadline = Date.now() + this.deps.readyTimeoutMs
    while (Date.now() < deadline) {
      if (process.exited) return false
      try {
        const response = await this.deps.fetch(`${url}/`, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) })
        if (response.ok) return true
      } catch {
        // Server lädt noch das Modell: weiter warten.
      }
      await this.deps.sleep(POLL_INTERVAL_MS)
    }
    return false
  }
}
