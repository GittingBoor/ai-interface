import { pathToFileURL } from 'node:url'
import { app, BrowserWindow, clipboard, dialog, ipcMain, net, protocol, shell } from 'electron'
import log from 'electron-log/main'
import { NotFoundError } from './errors'
import { API_CHANNELS, type AiApiCalls, type ApiHandlers, IMAGE_PROTOCOL, TERMINAL_RESIZE_CHANNEL, TERMINAL_WRITE_CHANNEL } from '@shared/api'
import { applyAutostart } from './autostart'
import type { Container } from './container'
import type { UpdateService } from './update/UpdateService'
import { wrapHandler } from './ipcWrap'
import { filterFavorites, filterFolders, filterGit, filterImages, filterMiniPc, filterSkills, filterTerminals, isImageHidden, type HiddenCheck } from './privacy/filters'

type MissingChannels = {
  [NS in keyof AiApiCalls]: Exclude<keyof AiApiCalls[NS], (typeof API_CHANNELS)[NS][number]>
}[keyof AiApiCalls]
const allChannelsListed: MissingChannels extends never ? true : false = true

const MIME: Readonly<Record<string, string>> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml'
}

const PNG_MIME = 'image/png'

/** PNG aus der Zwischenablage (Electron liefert Bilder dort als `image/png`), sonst `null`. */
async function readClipboardPng(): Promise<Uint8Array | null> {
  const items = await clipboard.read()
  const item = items.find((i) => i.types.includes(PNG_MIME))
  if (!item) return null
  const blob = (await item.getType(PNG_MIME)) as Blob
  return new Uint8Array(await blob.arrayBuffer())
}

function createHandlers(c: Container, updates: UpdateService): ApiHandlers {
  const hidden: HiddenCheck = (host, path) => c.privacy.isHidden(host, path)
  /** Verborgene Terminals verhalten sich wie nicht vorhanden. */
  const visibleTerminal = (id: string): string => {
    if (c.terminalHidden(id)) throw new NotFoundError('Terminal')
    return id
  }
  return {
    usage: {
      overview: () => c.usage.overview(),
      projects: (days) => c.usage.projects(days),
      projectBreakdown: (range, host) => c.usage.projectBreakdown(range, host),
      analytics: (query) => c.analytics.query(query),
      sessions: (limit, project) => c.usage.sessions(limit, project),
      refresh: async () => {
        const status = await c.usage.refresh()
        await c.scanImagesNow()
        return status
      }
    },
    hosts: { status: () => c.usage.hostStatus() },
    favorites: {
      list: () => filterFavorites(c.favorites.list(), hidden),
      add: (input) => c.favorites.add(input),
      update: (id, patch) => c.favorites.update(id, patch),
      remove: (id) => c.favorites.remove(id),
      reorder: (ids) => c.favorites.reorder(ids),
      pickFolder: async () => {
        const window = BrowserWindow.getFocusedWindow()
        const options = { properties: ['openDirectory' as const] }
        const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options)
        return result.canceled ? null : (result.filePaths[0] ?? null)
      },
      checkPath: async (host, path) => (await c.hosts.get(host).stat(path))?.isDirectory ?? false
    },
    categories: {
      list: () => c.categories.list(),
      add: (input) => c.categories.add(input),
      update: (id, patch) => c.categories.update(id, patch),
      remove: (id) => c.categories.remove(id),
      reorder: (ids) => c.categories.reorder(ids)
    },
    terminal: {
      open: (request) => c.terminals.open(request),
      list: () => filterTerminals(c.terminals.list(), hidden),
      snapshot: (id) => c.terminals.snapshot(visibleTerminal(id)),
      close: (id) => c.terminals.close(id),
      pasteImage: async (id) => {
        const png = await readClipboardPng()
        return png ? c.pasteImages.paste(visibleTerminal(id), png) : null
      },
      setViewing: (ids, windowFocused) => {
        c.notifications.setViewing(ids, windowFocused)
        c.terminalStatus.setViewing(ids, windowFocused)
      },
      statuses: () => Object.fromEntries(filterTerminals(c.terminals.list(), hidden).map((t) => [t.id, c.terminalStatus.status(t.id) ?? 'idle']))
    },
    orchestrator: {
      open: (mode) => c.orchestrator.open(mode),
      openClaudeMd: async () => {
        const failure = await shell.openPath(await c.orchestrator.claudeMdPath())
        if (failure) throw new NotFoundError('Ein Programm zum Öffnen der CLAUDE.md', failure)
      }
    },
    todos: {
      load: () => c.todos.load(),
      apply: (change) => c.todos.apply(change),
      create: () => c.todos.create()
    },
    images: {
      list: (project) => filterImages(c.images.list(project), hidden),
      add: (data, input) => c.images.add(data, input),
      update: (id, patch) => c.images.update(id, patch),
      remove: (id) => c.images.remove(id)
    },
    tasks: {
      list: () => c.visibleTasks(),
      check: (groupId, key) => c.tasks.check(groupId, key),
      uncheck: (groupId, key) => c.tasks.uncheck(groupId, key),
      review: () => c.taskReview.open()
    },
    vault: { list: () => c.vault.list(), read: (path) => c.vault.read(path) },
    models: {
      ollama: () => Promise.all(c.enabledHostIds().map((id) => c.ollama.list(c.hosts.get(id)))),
      listCustom: () => c.customModels.list(),
      upsertCustom: (input) => c.customModels.upsert(input),
      removeCustom: (id) => c.customModels.remove(id)
    },
    settings: {
      get: () => c.settings.get(),
      update: (patch) => {
        const updated = c.updateSettings(patch)
        if (patch.launchOnStartup !== undefined) applyAutostart(updated.launchOnStartup)
        return updated
      },
      resetFingerprint: (deviceId) => c.resetFingerprint(deviceId)
    },
    setup: {
      detect: () => c.setup.detect(),
      scanProjects: (root) => c.setup.scanProjects(root),
      scanVault: (path) => c.setup.scanVault(path),
      testDevice: (device) => c.setup.testDevice(device),
      finish: (input) => {
        const updated = c.setup.finish(input)
        applyAutostart(updated.launchOnStartup)
        return updated
      }
    },
    assistant: {
      send: (text) => c.assistant.send(text),
      stop: () => c.assistant.stop(),
      reset: () => c.assistant.reset(),
      confirm: (requestId, allowed) => c.assistant.confirm(requestId, allowed)
    },
    skills: {
      catalog: async (host) => filterSkills(await c.skills.catalog(host), hidden),
      summaries: (hashes) => c.skills.summaries(hashes),
      summarize: (ids) => c.skills.summarize(ids)
    },
    minipc: {
      snapshot: async (host) => filterMiniPc(host, await c.minipc.snapshot(host), hidden),
      info: (host) => c.minipc.info(host),
      git: async (host, dir) => filterGit(host, await c.minipc.git(host, dir), hidden),
      fetch: (host, path) => c.minipc.fetch(host, path)
    },
    runs: {
      list: () => c.openRuns(),
      dismiss: (host, sessionId) => {
        c.runs.dismiss(host, sessionId)
        return c.openRuns()
      }
    },
    quota: { get: () => c.quota.state(), refresh: () => c.quota.refresh() },
    speech: {
      status: () => c.speech.status(),
      install: (model) => c.speech.install(model),
      cancelInstall: () => c.speech.cancelInstall(),
      removeModel: (model) => c.speech.removeModel(model),
      setModel: (model) => c.speech.setModel(model),
      transcribe: (wav) => c.speech.transcribe(wav)
    },
    privacy: {
      status: () => c.privacy.status(),
      unlock: (pin) => c.privacy.unlock(pin),
      lock: () => c.privacy.lock(),
      setPin: (current, next) => c.privacy.setPin(current, next),
      list: () => c.privacy.list(),
      add: (input) => c.privacy.add(input),
      remove: (id) => c.privacy.remove(id)
    },
    fs: {
      list: async (host, path, showHidden) => filterFolders(host, await c.folders.list(host, path, showHidden), hidden),
      home: (host) => c.folders.home(host),
      pickFile: async () => {
        const window = BrowserWindow.getFocusedWindow()
        const options = { properties: ['openFile' as const], filters: [{ name: 'Start-Skripte', extensions: ['bat', 'cmd', 'sh'] }, { name: 'Alle Dateien', extensions: ['*'] }] }
        const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options)
        return result.canceled ? null : (result.filePaths[0] ?? null)
      },
      exists: async (path) => (await c.hosts.get('local').stat(path)) !== null
    },
    update: {
      state: () => updates.state(),
      check: () => updates.check(),
      install: () => void updates.install()
    },
    app: {
      info: () => ({
        version: app.getVersion(),
        platform: process.platform,
        dataDir: app.getPath('userData'),
        logFile: log.transports.file.getFile().path,
        packaged: app.isPackaged
      }),
      openLog: async () => {
        await shell.openPath(log.transports.file.getFile().path)
      },
      showInFolder: (path) => shell.showItemInFolder(path)
    }
  }
}

export function registerIpc(c: Container, updates: UpdateService): void {
  if (!allChannelsListed) throw new Error('API_CHANNELS unvollständig')
  const handlers = createHandlers(c, updates) as unknown as Record<string, Record<string, (...args: unknown[]) => unknown>>
  for (const [ns, methods] of Object.entries(API_CHANNELS)) {
    for (const method of methods) {
      const handler = handlers[ns]?.[method]
      if (!handler) throw new Error(`Kein Handler für ${ns}.${method}`)
      const wrapped = wrapHandler(handler, (error) => log.error(`${ns}.${method}`, error))
      ipcMain.handle(`${ns}.${method}`, (_event, ...args: unknown[]) => wrapped(...args))
    }
  }
  ipcMain.on(TERMINAL_WRITE_CHANNEL, (_e, id: string, data: string) => {
    try {
      if (c.terminalHidden(id)) return
      if (id === c.orchestrator.currentId()) c.orchestratorRelay.noteInput(data)
      c.terminals.write(id, data)
    } catch (error) {
      log.warn('terminal.write', error)
    }
  })
  ipcMain.on(TERMINAL_RESIZE_CHANNEL, (_e, id: string, cols: number, rows: number) => {
    try {
      c.terminals.resize(id, cols, rows)
    } catch (error) {
      log.warn('terminal.resize', error)
    }
  })
}

export function registerImageScheme(): void {
  protocol.registerSchemesAsPrivileged([{ scheme: IMAGE_PROTOCOL, privileges: { standard: true, secure: true, supportFetchAPI: true } }])
}

/** `aiimg://image/<id>` liefert Galerie-Bilder, `aiimg://vault/<name>` eingebettete Vault-Bilder. */
export function handleImageProtocol(c: Container): void {
  protocol.handle(IMAGE_PROTOCOL, async (request) => {
    const url = new URL(request.url)
    const name = decodeURIComponent(url.pathname.replace(/^\//, ''))
    try {
      if (url.hostname === 'image') {
        const id = Number(name)
        if (isImageHidden(c.images.get(id), (host, path) => c.privacy.isHidden(host, path))) return new Response('Nicht gefunden', { status: 404 })
        return net.fetch(pathToFileURL(c.images.filePath(id)).toString())
      }
      if (url.hostname === 'vault') {
        const data = await c.vault.readAsset(name)
        if (!data) return new Response('Nicht gefunden', { status: 404 })
        const type = MIME[name.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream'
        return new Response(new Uint8Array(data), { headers: { 'content-type': type } })
      }
    } catch (error) {
      log.warn('aiimg', request.url, error)
    }
    return new Response('Nicht gefunden', { status: 404 })
  })
}
