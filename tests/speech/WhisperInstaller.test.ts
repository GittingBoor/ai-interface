import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SpeechProgress } from '@shared/speech'
import { WhisperInstaller } from '../../src/main/speech/WhisperInstaller'
import type { WhisperAssets } from '../../src/main/speech/whisperAssets'
import { DownloadCancelledError, DownloadChecksumError } from '../../src/main/errors'

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text)
const sha = (data: Uint8Array): string => createHash('sha256').update(data).digest('hex')

const WHISPER_ZIP = bytes('whisper-zip')
const VULKAN_ZIP = bytes('vulkan-zip')
const MODEL = bytes('modell-daten-'.repeat(1000))

/** Archivinhalt, den das Fake-Entpacken ablegt (Pfad im Archiv → Inhalt). */
const ARCHIVE_FILES: Record<string, Record<string, string>> = {
  'whisper-zip': { 'Release/whisper-server.exe': 'server', 'Release/whisper.dll': 'w', 'Release/ggml.dll': 'whisper-ggml', 'Release/ggml-base.dll': 'whisper-base', 'Release/ggml-cpu-x64.dll': 'cpu', 'Release/SDL2.dll': 'sdl' },
  'vulkan-zip': { 'ggml.dll': 'llama-ggml', 'ggml-base.dll': 'llama-base', 'ggml-vulkan.dll': 'vk', 'llama.dll': 'llama' }
}

function assets(modelSha = sha(MODEL)): WhisperAssets {
  return {
    archives: [
      { name: 'whisper.cpp', url: 'https://x/whisper.zip', sha256: sha(WHISPER_ZIP), bytes: WHISPER_ZIP.length, pick: [/^whisper-server\.exe$/, /^whisper\.dll$/, /^ggml\.dll$/, /^ggml-base\.dll$/, /^ggml-cpu-[\w-]+\.dll$/] },
      { name: 'Vulkan-Backend', url: 'https://x/vulkan.zip', sha256: sha(VULKAN_ZIP), bytes: VULKAN_ZIP.length, pick: [/^ggml-vulkan\.dll$/] }
    ],
    models: {
      'small-q5_1': { url: 'https://x/small.bin', sha256: modelSha, bytes: MODEL.length },
      'large-v3-turbo-q5_0': { url: 'https://x/turbo.bin', sha256: modelSha, bytes: MODEL.length },
      'large-v3-q5_0': { url: 'https://x/large.bin', sha256: modelSha, bytes: MODEL.length }
    },
    requiredBinaries: ['whisper-server.exe', 'whisper.dll', 'ggml.dll', 'ggml-base.dll', 'ggml-vulkan.dll'],
    serverFile: 'whisper-server.exe'
  }
}

const BODIES: Record<string, Uint8Array> = { 'https://x/whisper.zip': WHISPER_ZIP, 'https://x/vulkan.zip': VULKAN_ZIP, 'https://x/small.bin': MODEL, 'https://x/turbo.bin': MODEL, 'https://x/large.bin': MODEL }

let root: string
let fetched: string[]

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'whisper-test-'))
  fetched = []
})
afterEach(() => undefined)

function installer(customAssets = assets(), fetchImpl?: (url: string, init: { signal: AbortSignal }) => Promise<Response>): WhisperInstaller {
  return new WhisperInstaller({
    rootDir: root,
    assets: customAssets,
    fetch:
      fetchImpl ??
      (async (url) => {
        fetched.push(url)
        const body = BODIES[url]
        return body ? new Response(body) : new Response('', { status: 404 })
      }),
    extractZip: async (zipPath, target) => {
      const key = new TextDecoder().decode(await readFile(zipPath))
      for (const [path, content] of Object.entries(ARCHIVE_FILES[key] ?? {})) {
        await mkdir(join(target, ...path.split('/').slice(0, -1)), { recursive: true })
        await writeFile(join(target, ...path.split('/')), content)
      }
    }
  })
}

describe('WhisperInstaller', () => {
  it('ist anfangs nicht eingerichtet', async () => {
    const inst = installer()
    expect(await inst.binariesInstalled()).toBe(false)
    expect(await inst.installedModels()).toEqual([])
  })

  it('lädt Binärdateien und Modell, übernimmt nur die gewählten Dateien', async () => {
    const inst = installer()
    const progress: SpeechProgress[] = []
    await inst.install('small-q5_1', new AbortController().signal, (p) => progress.push(p))
    expect(await inst.binariesInstalled()).toBe(true)
    expect(await inst.installedModels()).toEqual(['small-q5_1'])
    const bin = (await readdir(join(root, 'bin'))).sort()
    expect(bin).toEqual(['ggml-base.dll', 'ggml-cpu-x64.dll', 'ggml-vulkan.dll', 'ggml.dll', 'whisper-server.exe', 'whisper.dll'])
    // Die whisper-eigenen ggml-DLLs dürfen nicht von denen aus dem llama-Zip überschrieben werden.
    expect(await readFile(join(root, 'bin', 'ggml.dll'), 'utf8')).toBe('whisper-ggml')
    expect(await readFile(join(root, 'bin', 'ggml-base.dll'), 'utf8')).toBe('whisper-base')
    expect(progress.at(-1)).toEqual({ model: 'small-q5_1', receivedBytes: WHISPER_ZIP.length + VULKAN_ZIP.length + MODEL.length, totalBytes: WHISPER_ZIP.length + VULKAN_ZIP.length + MODEL.length })
  })

  it('lädt Binärdateien beim zweiten Modell nicht erneut', async () => {
    const inst = installer()
    await inst.install('small-q5_1', new AbortController().signal, () => undefined)
    fetched = []
    await inst.install('large-v3-q5_0', new AbortController().signal, () => undefined)
    expect(fetched).toEqual(['https://x/large.bin'])
    expect((await inst.installedModels()).sort()).toEqual(['large-v3-q5_0', 'small-q5_1'])
  })

  it('löscht die Datei bei falscher Prüfsumme', async () => {
    const inst = installer(assets('0'.repeat(64)))
    await expect(inst.install('small-q5_1', new AbortController().signal, () => undefined)).rejects.toBeInstanceOf(DownloadChecksumError)
    expect(await inst.installedModels()).toEqual([])
    expect((await readdir(join(root, 'models'))).filter((f) => f.endsWith('.part'))).toEqual([])
  })

  it('bricht ab und räumt die Teil-Datei weg', async () => {
    const controller = new AbortController()
    const inst = installer(assets(), async (url, init) => {
      if (url.endsWith('.bin')) {
        controller.abort()
        if (init.signal.aborted) throw new DOMException('abgebrochen', 'AbortError')
      }
      return new Response(BODIES[url] ?? new Uint8Array())
    })
    await expect(inst.install('small-q5_1', controller.signal, () => undefined)).rejects.toBeInstanceOf(DownloadCancelledError)
    expect(await inst.installedModels()).toEqual([])
  })

  it('entfernt ein Modell', async () => {
    const inst = installer()
    await inst.install('small-q5_1', new AbortController().signal, () => undefined)
    await inst.removeModel('small-q5_1')
    expect(await inst.installedModels()).toEqual([])
  })
})
