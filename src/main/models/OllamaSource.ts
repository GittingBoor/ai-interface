import type { OllamaModel, OllamaStatus } from '@shared/types'
import type { Host } from '../hosts/Host'

const OLLAMA_URL = 'http://127.0.0.1:11434'
const REMOTE_TIMEOUT_S = 3

interface TagsResponse {
  readonly models?: readonly {
    readonly name: string
    readonly size?: number
    readonly modified_at?: string
    readonly details?: { readonly family?: string; readonly parameter_size?: string; readonly quantization_level?: string }
  }[]
}

interface PsResponse {
  readonly models?: readonly { readonly name: string }[]
}

export type JsonFetcher = (url: string) => Promise<unknown>

/** Fragt die Ollama-API ab: lokal per HTTP, entfernt per `curl` über SSH (kein offener Port nötig). */
export class OllamaSource {
  constructor(private readonly fetchJson: JsonFetcher) {}

  async list(host: Host): Promise<OllamaStatus> {
    try {
      const [tags, ps] = await Promise.all([this.get<TagsResponse>(host, '/api/tags'), this.get<PsResponse>(host, '/api/ps')])
      const running = new Set((ps.models ?? []).map((m) => m.name))
      const models: OllamaModel[] = (tags.models ?? []).map((m) => ({
        name: m.name,
        sizeBytes: m.size ?? 0,
        modifiedAt: m.modified_at ? Date.parse(m.modified_at) : 0,
        family: m.details?.family ?? '',
        parameterSize: m.details?.parameter_size ?? '',
        quantization: m.details?.quantization_level ?? '',
        running: running.has(m.name)
      }))
      return { host: host.id, installed: true, models }
    } catch {
      return { host: host.id, installed: false, models: [] }
    }
  }

  private async get<T>(host: Host, path: string): Promise<T> {
    if (host.id === 'local') return (await this.fetchJson(`${OLLAMA_URL}${path}`)) as T
    const result = await host.exec(`curl -s -m ${REMOTE_TIMEOUT_S} ${OLLAMA_URL}${path}`)
    if (result.code !== 0 || !result.stdout.trim()) throw new Error(`Ollama antwortet nicht (${result.code})`)
    return JSON.parse(result.stdout) as T
  }
}
