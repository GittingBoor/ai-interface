import type { SpeechModelId } from '@shared/speech'

export interface DownloadAsset {
  readonly url: string
  readonly sha256: string
  readonly bytes: number
}

export interface ArchiveAsset extends DownloadAsset {
  readonly name: string
  /** Dateinamen (ohne Ordner), die aus dem Archiv übernommen werden. */
  readonly pick: readonly RegExp[]
}

export interface WhisperAssets {
  readonly archives: readonly ArchiveAsset[]
  readonly models: Readonly<Record<SpeechModelId, DownloadAsset>>
  /** Ohne diese Dateien gilt whisper.cpp als nicht eingerichtet. */
  readonly requiredBinaries: readonly string[]
  readonly serverFile: string
}

const MODEL_BASE_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main'

/**
 * Gepinnt und am 2026-09-28 getestet: whisper.cpp b5130 (ggml 0.23.0) mit dem Vulkan-Backend aus
 * llama.cpp b10798 (gleicher ggml-Stand). Nur gemeinsam aktualisieren.
 */
export const WHISPER_ASSETS: WhisperAssets = {
  archives: [
    {
      name: 'whisper.cpp',
      url: 'https://github.com/ggml-org/whisper.cpp/releases/download/b5130/whisper-bin-x64.zip',
      sha256: 'f9ec6c52a2e949b62ab51fa21d0d497958f9e41c3010c157c4e42932d5316f3c',
      bytes: 8_573_270,
      pick: [/^whisper-server\.exe$/, /^whisper\.dll$/, /^ggml\.dll$/, /^ggml-base\.dll$/, /^ggml-cpu-[\w-]+\.dll$/]
    },
    {
      name: 'Vulkan-Backend',
      url: 'https://github.com/ggml-org/llama.cpp/releases/download/b10798/llama-b10798-bin-win-vulkan-x64.zip',
      sha256: '187ef5203c5d5e8ecdfadfa0f8c36f478773bb8244ed231bda71a849a94ad5e7',
      bytes: 35_208_400,
      pick: [/^ggml-vulkan\.dll$/]
    }
  ],
  models: {
    'small-q5_1': { url: `${MODEL_BASE_URL}/ggml-small-q5_1.bin`, sha256: 'ae85e4a935d7a567bd102fe55afc16bb595bdb618e11b2fc7591bc08120411bb', bytes: 190_085_487 },
    'large-v3-turbo-q5_0': { url: `${MODEL_BASE_URL}/ggml-large-v3-turbo-q5_0.bin`, sha256: '394221709cd5ad1f40c46e6031ca61bce88931e6e088c188294c6d5a55ffa7e2', bytes: 574_041_195 },
    'large-v3-q5_0': { url: `${MODEL_BASE_URL}/ggml-large-v3-q5_0.bin`, sha256: 'd75795ecff3f83b5faa89d1900604ad8c780abd5739fae406de19f23ecd98ad1', bytes: 1_081_140_203 }
  },
  requiredBinaries: ['whisper-server.exe', 'whisper.dll', 'ggml.dll', 'ggml-base.dll', 'ggml-vulkan.dll'],
  serverFile: 'whisper-server.exe'
}
