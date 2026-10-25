/** Vollständige Mock-Implementierung von `AiApi` für den Browser-Modus. */
import { speechModelInfo, type SpeechModelId, type SpeechStatus } from '@shared/speech'
import type { PrivateProject } from '@shared/privacy'
import { isInside } from '@shared/projectMatch'
import type { AiApi, ApiEvents } from '@shared/api'
import { fail, ok, type Result } from '@shared/result'
import type {
  GitState,
  MiniPcInfo,
  Category,
  InterruptedRun,
  QuotaState,
  CustomModel,
  Favorite,
  HostStatus,
  ImageMeta,
  Settings,
  TerminalInfo,
  TerminalStatus,
  TodoChange,
  TodoItem,
  TodoState,
  UpdateState
} from '@shared/types'
import { registerImageResolver } from '@renderer/lib/imageUrl'
import { hostIds } from '@renderer/lib/hosts'
import { mockAnalytics } from './mockAnalytics'
import {
  buildProtocols,
  MOCK_PROTOCOL_GROUPS,
  MOCK_PROJECT_TASKS,
  buildTodos,
  MOCK_CUSTOM_MODELS,
  MOCK_DAILY,
  MOCK_CATEGORIES,
  MOCK_FAVORITES,
  MOCK_HEATMAP,
  MOCK_IMAGE_SEEDS,
  MOCK_OLLAMA,
  MOCK_SESSIONS,
  MOCK_SETTINGS,
  modelUsage,
  projectsFor,
  totalsFor
} from './mockData'
import { mockMiniPcInfo, mockSystemDetails } from './mockMiniPc'
import { mockGalleryImage, mockVaultImage } from './mockImages'
import { MOCK_SKILL_SUMMARIES, mockSkillCatalog, mockSummaryFor } from './mockSkills'

const LATENCY_MIN_MS = 120
const MOCK_STATUS_SEQUENCE: readonly (readonly [TerminalStatus, number])[] = [
  ['working', 800],
  ['question', 5_000],
  ['working', 9_000],
  ['review', 14_000]
]
const LATENCY_MAX_MS = 320
const RECENT_SESSIONS = 8
const TERMINAL_PROMPT_DELAY_MS = 260

type Listener<E extends keyof ApiEvents> = (payload: ApiEvents[E]) => void

class MockEvents {
  private readonly listeners = new Map<keyof ApiEvents, Set<(payload: never) => void>>()

  on<E extends keyof ApiEvents>(event: E, listener: Listener<E>): () => void {
    const set = this.listeners.get(event) ?? new Set()
    set.add(listener as (payload: never) => void)
    this.listeners.set(event, set)
    return () => set.delete(listener as (payload: never) => void)
  }

  emit<E extends keyof ApiEvents>(event: E, payload: ApiEvents[E]): void {
    for (const listener of this.listeners.get(event) ?? []) (listener as Listener<E>)(payload)
  }
}

const HOUR = 3_600_000
/** `?minipc-offline` in der URL simuliert einen nicht erreichbaren Mini-PC. */
const MOCK_MINI_OFFLINE = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('minipc-offline')
const MINI_OFFLINE_MESSAGE = 'Mini-PC nicht erreichbar: connect ETIMEDOUT 192.168.1.20:22'

let mockRuns: InterruptedRun[] = [
  {
    host: 'mini-pc',
    sessionId: '8c1f2a90-3d4e-4b7a-9f11-2a6c0d5e7b31',
    project: '/home/alex/projects/wetter-dashboard',
    hitAt: Date.now() - 2.5 * HOUR,
    message: "You've hit your session limit · resets 3:20pm (Europe/Berlin)",
    lastPrompt: 'Pipeline für die Kuration fertig bauen und die Tests grün bekommen'
  },
  {
    host: 'local',
    sessionId: '1b7e5c44-9a02-4f6d-8e3b-7c9d1a2f4e60',
    project: 'C:\\Users\\Alex\\projects\\ai-interface',
    hitAt: Date.now() - 2.4 * HOUR,
    message: "You've hit your session limit · resets 3:20pm (Europe/Berlin)",
    lastPrompt: 'Galerie: Filter nach KI-Bildern einbauen'
  }
]

const mockConfirms: Record<string, (allowed: boolean) => void> = {}

/** Zum Testen im Browser: `?quota=expired`, `?quota=unavailable` oder `?quota=full`. */
function mockQuota(): QuotaState {
  const now = Date.now()
  const variant = new URLSearchParams(window.location.search).get('quota')
  if (variant === 'expired') {
    return { status: 'expired', reason: 'Anmeldung von Claude Code abgelaufen.', hint: 'Im Terminal `claude` starten und neu anmelden.', fetchedAt: now - 20_000 }
  }
  if (variant === 'unavailable') {
    return { status: 'unavailable', reason: 'Keine Zugangsdaten gefunden (~/.claude/.credentials.json).', hint: 'Claude Code auf diesem PC einmal anmelden.', fetchedAt: now - 20_000 }
  }
  if (variant === 'full') {
    return {
      status: 'ok',
      windows: [
        { kind: 'five_hour', percent: 100, resetsAt: now + 0.4 * HOUR },
        { kind: 'seven_day', percent: 91, resetsAt: now + 73 * HOUR },
        { kind: 'seven_day_opus', percent: 97, resetsAt: now + 73 * HOUR }
      ],
      fetchedAt: now - 20_000
    }
  }
  return {
    status: 'ok',
    windows: [
      { kind: 'five_hour', percent: 32, resetsAt: now + 1.3 * HOUR },
      { kind: 'seven_day', percent: 84, resetsAt: now + 73 * HOUR }
    ],
    fetchedAt: now - 20_000
  }
}

const delay = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MIN_MS + Math.random() * (LATENCY_MAX_MS - LATENCY_MIN_MS)))

const reply = <T>(data: T): Promise<Result<T>> => delay(ok(data))
const replyError = <T>(code: string, message: string, hint?: string): Promise<Result<T>> =>
  delay(fail<T>(hint ? { code, message, hint } : { code, message }))

class MockTerminal {
  private line = ''
  private running = true

  constructor(
    private readonly base: TerminalInfo,
    private readonly emit: (data: string) => void,
    private readonly onExit: (code: number) => void
  ) {}

  get info(): TerminalInfo {
    return { ...this.base, running: this.running }
  }

  start(): void {
    const where = this.info.host === 'local' ? 'Dieser PC' : 'alex@homeserver'
    if (this.info.mode === 'shell') {
      this.emit(`\x1b[2mVerbunden mit ${where}\x1b[0m\r\n`)
    } else {
      this.emit(
        `\x1b[38;2;251;147;68m✻\x1b[0m \x1b[1mClaude Code\x1b[0m \x1b[2m${this.info.mode === 'continue' || this.info.mode === 'resume' ? 'Sitzung fortgesetzt' : 'neue Sitzung'}\x1b[0m\r\n` +
          `\x1b[2m  cwd: ${this.info.path}\x1b[0m\r\n\r\n` +
          `\x1b[2m  Mock-Terminal: Eingaben werden zurückgegeben, „exit“ beendet.\x1b[0m\r\n\r\n`
      )
    }
    setTimeout(() => this.prompt(), TERMINAL_PROMPT_DELAY_MS)
  }

  private prompt(): void {
    this.emit(this.info.mode === 'shell' ? `\x1b[38;2;130;203;155m${this.info.host === 'local' ? 'PS' : 'alex@minipc'}\x1b[0m ${this.info.path}> ` : '\x1b[38;2;251;147;68m›\x1b[0m ')
  }

  write(data: string): void {
    if (!this.running) return
    for (const ch of data) {
      if (ch === '\r') {
        const input = this.line.trim()
        this.line = ''
        this.emit('\r\n')
        if (input === 'exit') {
          this.emit('\x1b[2mSitzung beendet.\x1b[0m\r\n')
          this.running = false
          this.onExit(0)
          return
        }
        if (input) this.emit(`\x1b[2mEcho:\x1b[0m ${input}\r\n`)
        this.prompt()
      } else if (ch === '\x7f') {
        if (this.line.length) {
          this.line = this.line.slice(0, -1)
          this.emit('\b \b')
        }
      } else if (ch >= ' ') {
        this.line += ch
        this.emit(ch)
      }
    }
  }
}

function applyTodo(items: TodoItem[], change: TodoChange): TodoItem[] | null {
  const find = (id: string): number => items.findIndex((t) => t.id === id)
  switch (change.kind) {
    case 'add':
      return [
        ...items,
        {
          id: Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0'),
          line: items.length,
          text: change.text.trim(),
          done: false,
          priority: change.priority,
          due: change.due,
          doneDate: null,
          section: change.section.trim(),
          notes: ''
        }
      ]
    case 'toggle': {
      const i = find(change.id)
      if (i === -1) return null
      return items.map((t, j) => (j === i ? { ...t, done: !t.done, doneDate: t.done ? null : change.today } : t))
    }
    case 'edit': {
      const i = find(change.id)
      if (i === -1) return null
      return items.map((t, j) => (j === i ? { ...t, text: change.text.trim(), priority: change.priority, due: change.due } : t))
    }
    case 'delete': {
      const i = find(change.id)
      if (i === -1) return null
      return items.filter((_, j) => j !== i)
    }
  }
}

const MOCK_AI_IMAGE_WIDTH = 1200
const MOCK_AI_IMAGE_HEIGHT = 800

interface MockWindow extends Window {
  __mockAiImages?: (count: number, project?: string) => void
}

export function createMockApi(): AiApi {
  const events = new MockEvents()
  let favorites: Favorite[] = [...MOCK_FAVORITES]
  let nextFavoriteId = favorites.length + 1
  let categories: Category[] = [...MOCK_CATEGORIES]
  let nextCategoryId = categories.length + 1
  let customModels: CustomModel[] = [...MOCK_CUSTOM_MODELS]
  let settings: Settings = MOCK_SETTINGS
  let todoItems: TodoItem[] = buildTodos()
  let todoExists = true
  const skillSummaries = new Map<string, string>(Object.entries(MOCK_SKILL_SUMMARIES))
  const protocols = buildProtocols()
  const checkedTasks = new Set<string>()
  const imageUrls = new Map<number, string>()
  let images: ImageMeta[] = MOCK_IMAGE_SEEDS.map((s) => {
    imageUrls.set(s.meta.id, mockGalleryImage(s.meta.id, s.width, s.height))
    return s.meta
  })
  let nextImageId = images.length + 1

  /** Nur im Mock: simuliert von einer KI erzeugte Bilder (`window.__mockAiImages(3)` in der Konsole). */
  const simulateAiImages = (count: number, project: string = MOCK_FAVORITES[0]?.path ?? ''): void => {
    const added: ImageMeta[] = Array.from({ length: count }, (_, i) => {
      const id = nextImageId++
      imageUrls.set(id, mockGalleryImage(id, MOCK_AI_IMAGE_WIDTH, MOCK_AI_IMAGE_HEIGHT))
      return { id, fileName: `${id}.png`, title: `Screenshot · browser_take_screenshot · Test ${i + 1}`, project, tags: [], bytes: 90_000, createdAt: Date.now(), host: 'local', source: 'auto', sessionId: 'mock-live' }
    })
    images = [...added, ...images]
    events.emit('images:added', { count, projects: [project] })
  }
  ;(window as MockWindow).__mockAiImages = simulateAiImages
  const terminals = new Map<string, MockTerminal>()
  const terminalStatuses = new Map<string, TerminalStatus>()
  /** Beispielablauf für die Status-Punkte: arbeitet, fragt, arbeitet, fertig. */
  const playStatuses = (id: string): void => {
    MOCK_STATUS_SEQUENCE.forEach(([status, afterMs]) =>
      setTimeout(() => {
        if (!terminals.has(id)) return
        terminalStatuses.set(id, status)
        events.emit('terminal:status', { id, status })
      }, afterMs)
    )
  }
  /** Mock-Privatmodus: PIN 1234, der letzte Beispiel-Favorit ist privat. */
  const MOCK_PIN = '1234'
  let privacyLocked = true
  let privacyHasPin = true
  const lastFavorite = MOCK_FAVORITES[MOCK_FAVORITES.length - 1]
  let privateProjects: PrivateProject[] = lastFavorite ? [{ id: 1, host: lastFavorite.host, path: lastFavorite.path, label: lastFavorite.name }] : []
  let nextPrivateId = 2
  const isPrivate = (host: Favorite['host'], path: string): boolean => privacyLocked && privateProjects.some((p) => isInside(p, host, path))
  const privacyStatus = () => ({ locked: privacyLocked, hasPin: privacyHasPin, hiddenCount: privateProjects.length })
  const privacyChanged = () => {
    events.emit('privacy:changed', privacyStatus())
    events.emit('data:changed', { at: Date.now() })
    return reply(privacyStatus())
  }
  let terminalCounter = 0
  let orchestratorId: string | null = null
  const MOCK_ORCHESTRATOR_PATH = '~/.config/AI Interface/orchestrator'
  const MOCK_REVIEW_PATH = '~/.config/AI Interface/aufgaben-pruefung'
  const MOCK_REVIEW_MS = 5_000

  const startMockTerminal = async (info: TerminalInfo): Promise<Result<TerminalInfo>> => {
    const term = new MockTerminal(
      info,
      (data) => events.emit('terminal:data', { id: info.id, data }),
      (code) => events.emit('terminal:exit', { id: info.id, code })
    )
    terminals.set(info.id, term)
    const result = await delay(ok(info))
    term.start()
    playStatuses(info.id)
    return result
  }

  registerImageResolver((kind, key) => {
    if (kind === 'image') return imageUrls.get(Number(key)) ?? null
    return mockVaultImage(key)
  })

  const hostStatus = (): HostStatus[] => [
    { id: 'local', label: 'Dieser PC', enabled: true, online: true, error: null, lastCollect: { host: 'local', files: 214, newRecords: 38, skippedLines: 0, failedFiles: 0, finishedAt: Date.now() - 42_000 } },
    ...settings.devices.map((d) => ({ id: d.id, label: d.name, enabled: d.enabled, online: d.enabled, error: null, lastCollect: { host: d.id, files: 131, newRecords: 12, skippedLines: 2, failedFiles: 0, finishedAt: Date.now() - 44_000 } }))
  ]

  const todoState = (): TodoState => {
    const sections = [...new Set(todoItems.map((t) => t.section))]
    return {
      exists: todoExists,
      host: settings.vault.host,
      path: `${settings.vault.path}\\${settings.todoFile.replace(/\//g, '\\')}`,
      items: todoExists ? todoItems.map((t, i) => ({ ...t, line: i })) : [],
      sections: todoExists ? sections : [],
      modifiedAt: todoExists ? Date.now() : null
    }
  }

  return {
    usage: {
      overview: () =>
        reply({
          today: totalsFor(1),
          week: totalsFor(7),
          month: totalsFor(30),
          daily: MOCK_DAILY,
          heatmap: MOCK_HEATMAP,
          models: modelUsage(),
          projects: projectsFor(30),
          recentSessions: MOCK_SESSIONS.slice(0, RECENT_SESSIONS),
          activeSessions: 2
        }),
      projects: (days) => reply(projectsFor(days)),
      analytics: (query) => reply(mockAnalytics(query)),
      projectBreakdown: (range, host) => {
        const days = range === 'week' ? 7 : range === 'month' ? 30 : 365
        return reply(
          projectsFor(days)
            .filter((p) => host === 'all' || p.host === host)
            .map((p) => ({ project: p.project, host: p.host, activeMs: p.messages * 95_000, totalTokens: p.totalTokens, costUsd: p.costUsd, sessions: p.sessions }))
            .sort((a, b) => b.totalTokens - a.totalTokens)
        )
      },
      sessions: (limit, project) =>
        reply(MOCK_SESSIONS.filter((s) => project === undefined || s.project === project || s.project.startsWith(project)).slice(0, limit)),
      refresh: async () => {
        const status = hostStatus()
        const result = await delay(ok(status))
        events.emit('usage:updated', status)
        return result
      }
    },
    hosts: { status: () => reply(hostStatus()) },
    categories: {
      list: () => reply([...categories].sort((a, b) => a.sortOrder - b.sortOrder)),
      add: (input) => {
        if (categories.some((c) => c.name.toLowerCase() === input.name.trim().toLowerCase())) return replyError('VALIDATION', `Die Art „${input.name}“ gibt es schon.`)
        const category: Category = { ...input, name: input.name.trim(), id: nextCategoryId++, sortOrder: categories.length }
        categories = [...categories, category]
        return reply(category)
      },
      update: (id, patch) => {
        const current = categories.find((c) => c.id === id)
        if (!current) return replyError('NOT_FOUND', 'Art wurde nicht gefunden.')
        const next: Category = { ...current, ...patch }
        categories = categories.map((c) => (c.id === id ? next : c))
        return reply(next)
      },
      remove: (id) => {
        const affected = favorites.filter((f) => f.categoryId === id).length
        favorites = favorites.map((f) => (f.categoryId === id ? { ...f, categoryId: null } : f))
        categories = categories.filter((c) => c.id !== id)
        return reply(affected)
      },
      reorder: (ids) => {
        categories = categories.map((c) => ({ ...c, sortOrder: ids.indexOf(c.id) }))
        return reply(undefined)
      }
    },
    favorites: {
      list: () => reply([...favorites].filter((f) => !isPrivate(f.host, f.path)).sort((a, b) => a.sortOrder - b.sortOrder)),
      add: (input) => {
        if (favorites.some((f) => f.host === input.host && f.path === input.path)) {
          return replyError('VALIDATION', 'Dieser Ordner ist bereits ein Favorit.', 'Wähle einen anderen Ordner oder benenne den vorhandenen Favoriten um.')
        }
        const fav: Favorite = { ...input, id: nextFavoriteId++, sortOrder: favorites.length, createdAt: Date.now(), categoryId: input.categoryId ?? null, starred: input.starred ?? true, icon: input.icon ?? null }
        favorites = [...favorites, fav]
        return reply(fav)
      },
      update: (id, patch) => {
        const current = favorites.find((f) => f.id === id)
        if (!current) return replyError('NOT_FOUND', 'Favorit wurde nicht gefunden.')
        const next: Favorite = { ...current, ...patch, name: patch.name?.trim() || current.name }
        favorites = favorites.map((f) => (f.id === id ? next : f))
        return reply(next)
      },
      remove: (id) => {
        favorites = favorites.filter((f) => f.id !== id)
        return reply(undefined)
      },
      reorder: (ids) => {
        favorites = favorites.map((f) => ({ ...f, sortOrder: ids.indexOf(f.id) }))
        return reply(undefined)
      },
      pickFolder: () => reply('C:\\Users\\Alex\\projects\\notizen-2026'),
      checkPath: (_host, path) => reply(path.startsWith('/') && !path.includes('gibtsnicht'))
    },
    terminal: {
      open: (request) =>
        startMockTerminal({ id: `t${++terminalCounter}`, host: request.host, path: request.path, mode: request.mode, title: request.title, running: true, startedAt: Date.now() }),
      list: () => reply([...terminals.values()].map((t) => t.info)),
      snapshot: () => reply(''),
      close: (id) => {
        terminals.delete(id)
        return reply(undefined)
      },
      pasteImage: () => reply(null),
      setViewing: () => reply(undefined),
      statuses: () => reply(Object.fromEntries([...terminals.keys()].map((id) => [id, terminalStatuses.get(id) ?? 'idle'])))
    },
    orchestrator: {
      open: (mode) => {
        const existing = orchestratorId ? terminals.get(orchestratorId) : undefined
        if (existing) return reply(existing.info)
        const id = `t${++terminalCounter}`
        orchestratorId = id
        return startMockTerminal({ id, host: 'local', path: MOCK_ORCHESTRATOR_PATH, mode, title: 'Orchestrator', running: true, startedAt: Date.now(), orchestrator: true })
      },
      openClaudeMd: () => reply(undefined)
    },
    todos: {
      load: () => reply(todoState()),
      apply: (change) => {
        const next = applyTodo(todoItems, change)
        if (!next) return replyError('TODO_NOT_FOUND', 'Der Eintrag existiert in der TODO-Datei nicht mehr.', 'TODOs neu laden, die Datei wurde extern geändert.')
        todoItems = next
        return reply(todoState())
      },
      create: () => {
        todoExists = true
        todoItems = []
        return reply(todoState())
      }
    },
    images: {
      list: (project) => reply(images.filter((i) => project === undefined || i.project === project)),
      add: (data, input) => {
        const id = nextImageId++
        const mime = input.extension === 'svg' ? 'image/svg+xml' : `image/${input.extension === 'jpg' ? 'jpeg' : input.extension}`
        imageUrls.set(id, URL.createObjectURL(new Blob([new Uint8Array(data)], { type: mime })))
        const meta: ImageMeta = { id, fileName: `${id}.${input.extension}`, title: input.title.trim() || 'Ohne Titel', project: input.project, tags: input.tags, bytes: data.byteLength, createdAt: Date.now(), host: null, source: 'manual', sessionId: null }
        images = [meta, ...images]
        return reply(meta)
      },
      update: (id, patch) => {
        const current = images.find((i) => i.id === id)
        if (!current) return replyError('NOT_FOUND', 'Bild wurde nicht gefunden.')
        const next: ImageMeta = { ...current, ...patch }
        images = images.map((i) => (i.id === id ? next : i))
        return reply(next)
      },
      remove: (id) => {
        images = images.filter((i) => i.id !== id)
        return reply(undefined)
      }
    },
    tasks: {
      list: () =>
        reply(
          MOCK_PROJECT_TASKS.map((p) => ({ ...p, tasks: p.tasks.filter((t) => !checkedTasks.has(`${p.groupId}|${t.key}`)) })).filter(
            (p) => p.tasks.length > 0
          )
        ),
      check: (groupId, key) => {
        checkedTasks.add(`${groupId}|${key}`)
        return reply(undefined)
      },
      uncheck: (groupId, key) => {
        checkedTasks.delete(`${groupId}|${key}`)
        return reply(undefined)
      },
      review: async () => {
        const info: TerminalInfo = { id: `mock-${++terminalCounter}`, host: 'local', path: MOCK_REVIEW_PATH, mode: 'new', title: 'Aufgaben-Prüfung', running: true, startedAt: Date.now() }
        const result = await startMockTerminal(info)
        setTimeout(() => {
          const group = MOCK_PROJECT_TASKS.find((p) => p.tasks.some((t) => !checkedTasks.has(`${p.groupId}|${t.key}`)))
          const task = group?.tasks.find((t) => !checkedTasks.has(`${group.groupId}|${t.key}`))
          if (group && task) checkedTasks.add(`${group.groupId}|${task.key}`)
          const checked = group && task ? [{ groupId: group.groupId, key: task.key, text: task.text, label: group.label, reason: 'Commit abc1234' }] : []
          events.emit('tasks:reviewed', { checked, summary: 'Beispiel-Prüfung beendet.', finished: true })
          terminals.delete(info.id)
          events.emit('terminal:closed', { id: info.id })
        }, MOCK_REVIEW_MS)
        return result
      }
    },
    vault: {
      list: () =>
        reply(
          MOCK_PROTOCOL_GROUPS.map((g) => ({
            ...g,
            entries: protocols
              .filter((p) => p.path.startsWith(`${g.id}/`))
              .map((p) => ({ path: p.path, name: p.name, modifiedAt: p.modifiedAt, size: p.content.length }))
              .sort((a, b) => b.name.localeCompare(a.name))
          }))
        ),
      read: (path) => {
        const doc = protocols.find((p) => p.path === path)
        return doc ? reply(doc) : replyError('NOT_FOUND', `Protokoll „${path}“ wurde nicht gefunden.`)
      }
    },
    models: {
      ollama: () => reply(MOCK_OLLAMA),
      listCustom: () => reply(customModels),
      upsertCustom: (input) => {
        const model: CustomModel = { ...input, id: input.id ?? Math.max(0, ...customModels.map((m) => m.id)) + 1, updatedAt: Date.now() }
        customModels = input.id === undefined ? [...customModels, model] : customModels.map((m) => (m.id === input.id ? model : m))
        return reply(model)
      },
      removeCustom: (id) => {
        customModels = customModels.filter((m) => m.id !== id)
        return reply(undefined)
      }
    },
    settings: {
      get: () => reply(settings),
      update: (patch) => {
        settings = { ...settings, ...patch }
        return reply(settings)
      },
      resetFingerprint: (deviceId) => {
        settings = { ...settings, devices: settings.devices.map((d) => (d.id === deviceId ? { ...d, hostFingerprint: '' } : d)) }
        return reply(settings)
      }
    },
    setup: {
      detect: () =>
        reply({
          platform: 'win32',
          homeDir: 'C:\\Users\\Alex',
          proposalPath: 'C:\\Users\\Alex\\ai-interface-setup.json',
          proposal: null,
          proposalError: null,
          projectRootCandidates: ['D:\\GitHub', 'C:\\Users\\Alex\\source\\repos'],
          vaultCandidates: ['C:\\Users\\Alex\\OneDrive\\Obsidian Vault'],
          sshKeyCandidates: ['C:\\Users\\Alex\\.ssh\\id_ed25519'],
          existingInstall: false
        }),
      scanProjects: (root) =>
        reply(
          ['ai-interface', 'Playlist_Builder_v2', 'Wetter-Dashboard', 'Bildarchiv', 'Notizen-Export', 'uni-mathe'].map((name, i) => ({
            path: `${root}\\${name}`,
            name,
            isGit: i < 4,
            hasClaudeMd: i % 2 === 0
          }))
        ),
      scanVault: () => reply({ todoFiles: ['Programmieren/Server/TODO.md', 'Privat/TODO.md'], protocolDirs: ['Programmieren/Server/homeserver/Protokoll'], topDirs: ['Programmieren', 'Privat', 'Uni'] }),
      testDevice: (device) => reply(device.host.startsWith('192.') ? { ok: true, message: `Verbunden mit ${device.user}@${device.host}.` } : { ok: false, message: `${device.name} ist nicht erreichbar: Timed out while waiting for handshake` }),
      finish: (input) => {
        settings = {
          ...settings,
          setupDone: true,
          projectsRoot: input.projectsRoot,
          devices: input.devices,
          vault: { host: 'local', path: input.vault.path },
          launchOnStartup: input.launchOnStartup
        }
        return reply(settings)
      }
    },
    assistant: {
      send: async (text) => {
        const turnId = `turn-${Date.now()}`
        const say = async (chunk: string): Promise<void> => {
          await delay(null)
          events.emit('assistant:event', { type: 'text', turnId, text: chunk })
        }
        events.emit('assistant:event', { type: 'tool', turnId, name: 'list_projects', summary: '{}' })
        if (/projekt/i.test(text)) {
          await say('Ich lege das Projekt **Beat Lab** unter `D:\\GitHub\\Projects` an: Ordner mit CLAUDE.md, Plan, README und .gitignore, danach `git init`.')
          const requestId = `req-${Date.now()}`
          const decision = new Promise<boolean>((resolve) => (mockConfirms[requestId] = resolve))
          events.emit('assistant:event', {
            type: 'confirm',
            requestId,
            tool: 'create_project_folder',
            preview: 'Ordner: D:\\GitHub\\Projects\\Beat Lab\nDateien:\n- CLAUDE.md\n- docs\\PLAN.md\n- README.md\n- .gitignore\nDanach: git init -b main'
          })
          const allowed = await decision
          events.emit('assistant:event', { type: 'confirm-resolved', requestId, allowed })
          await say(allowed ? 'Erledigt. Soll ich das Projekt auch in der App eintragen?' : 'Okay, ich lege nichts an. Was soll ich anders machen?')
        } else {
          await say('Dein 5-Stunden-Kontingent liegt bei **32 %**, das Wochenkontingent bei **84 %**.')
        }
        events.emit('assistant:event', { type: 'done', turnId })
        return reply(undefined)
      },
      stop: () => reply(undefined),
      reset: () => reply(undefined),
      confirm: (requestId, allowed) => {
        mockConfirms[requestId]?.(allowed)
        return reply(undefined)
      }
    },
    skills: {
      catalog: (host) => reply(mockSkillCatalog(host)),
      summaries: (hashes) => reply(Object.fromEntries(hashes.flatMap((h) => (skillSummaries.has(h) ? [[h, skillSummaries.get(h) ?? '']] : [])))),
      summarize: async (ids) => {
        for (const [i, id] of ids.entries()) {
          const entry = hostIds().flatMap((h) => mockSkillCatalog(h).entries).find((e) => e.id === id)
          if (!entry) return replyError('NOT_FOUND', `Eintrag ${id} nicht gefunden`, 'Katalog neu laden und erneut versuchen.')
          events.emit('skills:progress', { done: i, total: ids.length, current: entry.name })
          await delay(null)
          skillSummaries.set(entry.hash, mockSummaryFor(entry.name))
        }
        events.emit('skills:progress', { done: ids.length, total: ids.length, current: '' })
        return reply(ids.length)
      }
    },
    minipc: {
      snapshot: () =>
        MOCK_MINI_OFFLINE
          ? reply({ online: false, error: MINI_OFFLINE_MESSAGE, system: null, claude: [], fetchedAt: Date.now() })
          : reply({
          online: true,
          error: null,
          fetchedAt: Date.now(),
          system: {
            cpuPercent: 7.4,
            memTotal: 16_651_272_192,
            memUsed: 3_452_784_640,
            disks: [{ mount: '/', total: 485_127_979_008, used: 36_905_701_376 }],
            uptimeSec: 456_968,
            load: [0.12, 0.2, 0.14],
            cores: 4,
            ...mockSystemDetails()
          },
          claude: [
            { pid: 1810112, cwd: '/home/alex/projects', status: 'idle', startedAt: Date.now() - 26 * HOUR, name: 'projects-fd' },
            { pid: 1830901, cwd: '/home/alex/projects/wetter-dashboard', status: 'busy', startedAt: Date.now() - 0.4 * HOUR, name: 'wetter' }
          ]
        }),
      info: () => (MOCK_MINI_OFFLINE ? replyError<MiniPcInfo>('HOST_UNREACHABLE', MINI_OFFLINE_MESSAGE) : reply({ ...mockMiniPcInfo, fetchedAt: Date.now() })),
      git: () =>
        MOCK_MINI_OFFLINE
          ? replyError<GitState[]>('HOST_UNREACHABLE', MINI_OFFLINE_MESSAGE)
          : reply([
          { path: '/home/alex/projects/ai-interface', name: 'ai-interface', branch: 'feature/app', upstream: 'origin/feature/app', ahead: 0, behind: 2, staged: 0, unstaged: 0, untracked: 0, error: null },
          { path: '/home/alex/projects/wetter-dashboard', name: 'wetter-dashboard', branch: 'main', upstream: 'origin/main', ahead: 1, behind: 0, staged: 0, unstaged: 42, untracked: 3, error: null },
          { path: '/home/alex/projects/old-experiment', name: 'old-experiment', branch: null, upstream: null, ahead: 0, behind: 0, staged: 1, unstaged: 0, untracked: 0, error: 'fatal: unable to access remote: Could not resolve host: github.com' },
          { path: '/home/alex/projects/Playlist_Builder_v2', name: 'Playlist_Builder_v2', branch: 'main', upstream: 'origin/main', ahead: 0, behind: 0, staged: 0, unstaged: 0, untracked: 0, error: null }
        ]),
      fetch: (path) => reply({ path, name: path.split('/').pop() ?? path, branch: 'main', upstream: 'origin/main', ahead: 0, behind: 0, staged: 0, unstaged: 0, untracked: 0, error: null })
    },
    runs: {
      list: () => reply(mockRuns),
      dismiss: (host, sessionId) => {
        mockRuns = mockRuns.filter((r) => !(r.host === host && r.sessionId === sessionId))
        return reply(mockRuns)
      }
    },
    quota: {
      get: () => reply(mockQuota()),
      refresh: () => reply(mockQuota())
    },
    fs: {
      list: (host, path, showHidden) => {
        const sep = host === 'local' ? '\\' : '/'
        const base = path.replace(/^~/, host === 'local' ? 'C:\\Users\\Alex' : '/home/alex').replace(/[\\/]+$/, '')
        const names = ['projects', 'ai-interface', 'Drum-Trainer', 'smarthome', 'Playlist_Builder_v2', '.config', 'notizen.md']
        return reply(
          names
            .filter((n) => showHidden || !n.startsWith('.'))
            .map((name) => ({ name, path: `${base}${sep}${name}`, isDirectory: !name.includes('.md'), hidden: name.startsWith('.') }))
        )
      },
      home: (host) => reply(host === 'local' ? 'C:\\Users\\Alex' : '/home/alex'),
      pickFile: () => reply('C:\\Tools\\start.bat'),
      exists: (path) => reply(!path.toLowerCase().includes('gibtsnicht'))
    },
    update: (() => {
      let updateState: UpdateState = { phase: 'available', detail: null, checkedAt: Date.now() }
      const setUpdate = (next: UpdateState): void => {
        updateState = next
        events.emit('update:state', next)
      }
      return {
        state: () => reply(updateState),
        check: () => reply(updateState),
        install: () => {
          setUpdate({ ...updateState, phase: 'building' })
          setTimeout(() => setUpdate({ ...updateState, phase: 'failed', detail: 'Im Browser-Modus wird nichts installiert.' }), 2500)
          return reply(undefined)
        }
      }
    })(),
    app: {
      info: () => reply({ version: '0.1.0', platform: 'win32', dataDir: 'C:\\Users\\Alex\\AppData\\Roaming\\ai-interface', logFile: 'C:\\Users\\Alex\\AppData\\Roaming\\ai-interface\\logs\\main.log', packaged: false }),
      openLog: () => reply(undefined),
      showInFolder: () => reply(undefined)
    },
    speech: (() => {
      let speechStatus: SpeechStatus = { supported: true, binariesInstalled: true, installedModels: ['large-v3-turbo-q5_0'], model: 'large-v3-turbo-q5_0', installing: null }
      return {
        status: () => reply(speechStatus),
        install: async (model: SpeechModelId) => {
          const total = speechModelInfo(model).bytes
          for (let step = 1; step <= 10; step++) {
            await new Promise((r) => setTimeout(r, 150))
            events.emit('speech:progress', { model, receivedBytes: (total * step) / 10, totalBytes: total })
          }
          speechStatus = { ...speechStatus, installedModels: [...speechStatus.installedModels, model] }
          return reply(speechStatus)
        },
        cancelInstall: () => reply(undefined),
        removeModel: (model: SpeechModelId) => {
          speechStatus = { ...speechStatus, installedModels: speechStatus.installedModels.filter((m) => m !== model) }
          return reply(speechStatus)
        },
        setModel: (model: SpeechModelId) => {
          speechStatus = { ...speechStatus, model }
          settings = { ...settings, speech: { ...settings.speech, model } }
          return reply(speechStatus)
        },
        transcribe: async () => {
          await new Promise((r) => setTimeout(r, 600))
          return reply('Das ist ein diktierter Beispieltext.')
        }
      }
    })(),
    privacy: {
      status: () => reply(privacyStatus()),
      unlock: (pin) => {
        if (!privacyHasPin) return replyError('PIN_REQUIRED', 'Für den Privatmodus ist noch keine PIN festgelegt.')
        if (pin !== MOCK_PIN) return replyError('WRONG_PIN', 'PIN falsch.', 'PIN erneut eingeben (Mock: 1234).')
        privacyLocked = false
        return privacyChanged()
      },
      lock: () => {
        privacyLocked = true
        return privacyChanged()
      },
      setPin: (current, next) => {
        if (privacyHasPin && current !== MOCK_PIN) return replyError('WRONG_PIN', 'PIN falsch.')
        if (!/^d{4,12}$/.test(next)) return replyError('INVALID_PIN', 'Die PIN muss aus 4 bis 12 Ziffern bestehen.')
        privacyHasPin = true
        privacyLocked = false
        return privacyChanged()
      },
      list: () => (privacyLocked ? replyError('PRIVACY_LOCKED', 'Der Privatmodus ist aktiv.') : reply(privateProjects)),
      add: (input) => {
        const added = { id: nextPrivateId++, ...input }
        privateProjects = [...privateProjects, added]
        void privacyChanged()
        return reply(added)
      },
      remove: (id) => {
        privateProjects = privateProjects.filter((p) => p.id !== id)
        void privacyChanged()
        return reply(undefined)
      }
    },
    terminalInput: {
      write: (id, data) => terminals.get(id)?.write(data),
      resize: () => undefined
    },
    on: (event, listener) => events.on(event, listener)
  }
}
