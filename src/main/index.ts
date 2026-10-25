import { join } from 'node:path'
import { app, BrowserWindow, Notification, session, shell } from 'electron'
import log from 'electron-log/main'
import { type ApiEvents, EVENT_CHANNEL_PREFIX } from '@shared/api'
import { TITLE_BAR_HEIGHT } from '@shared/titleBar'
import { applyAutostart } from './autostart'
import { Container } from './container'
import { handleImageProtocol, registerImageScheme, registerIpc } from './ipc'
import { AUTOSTART_FLAG, createUpdateService } from './update/startupUpdate'
import type { UpdateService } from './update/UpdateService'
import { guardWebviews } from './webLinks'

const WINDOW_SIZE = { width: 1440, height: 900, minWidth: 640, minHeight: 480 } as const
const BACKGROUND_COLOR = '#0c0d10'
const APP_TITLE = 'AI Interface'
/** Fensterknöpfe über der eigenen Titelleiste: Fläche wie `--color-canvas`, Symbole wie `--color-ink-2`. */
const TITLE_BAR_OVERLAY = { color: '#0f0e0c', symbolColor: '#bab7b2', height: TITLE_BAR_HEIGHT } as const
/** Muss zu `appId` in electron-builder.yml passen, sonst ordnet Windows die Benachrichtigungen nicht zu. */
const APP_USER_MODEL_ID = 'de.gittingboor.aiinterface'
/** Windows nimmt die .ico mit eigenen 16/24/32-px-Bildern, sonst wird die große PNG unscharf verkleinert. */
const WINDOW_ICON = process.platform === 'win32' ? 'icon.ico' : 'icon.png'
/** Echte Datei neben app.asar (extraResources); im Entwicklungsmodus direkt aus build/. */
const WINDOW_ICON_PATH = app.isPackaged ? join(process.resourcesPath, WINDOW_ICON) : join(import.meta.dirname, '../../build', WINDOW_ICON)

log.initialize()
log.errorHandler.startCatching()
registerImageScheme()

let mainWindow: BrowserWindow | null = null
let container: Container | null = null
let updates: UpdateService | null = null

function emit<E extends keyof ApiEvents>(event: E, payload: ApiEvents[E]): void {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(`${EVENT_CHANNEL_PREFIX}${event}`, payload)
}

function showNotification(title: string, body: string): void {
  if (Notification.isSupported()) new Notification({ title, body }).show()
}

function checkForUpdate(argv: readonly string[]): void {
  void updates?.startup(argv.includes(AUTOSTART_FLAG))
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    ...WINDOW_SIZE,
    show: false,
    backgroundColor: BACKGROUND_COLOR,
    title: APP_TITLE,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: TITLE_BAR_OVERLAY,
    icon: WINDOW_ICON_PATH,
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Für den Bereich Verknüpfungen; guardWebviews erlaubt nur abgesicherte http(s)-Seiten.
      webviewTag: true
    }
  })
  guardWebviews(window.webContents)
  // Sonst nimmt die Taskleiste das Symbol der Verknüpfung aus dem Symbol-Cache, der nach Updates veraltet ist.
  // Windows wertet das Symbol nur zusammen mit einem Neustart-Befehl aus.
  if (process.platform === 'win32') {
    window.setAppDetails({
      appId: APP_USER_MODEL_ID,
      appIconPath: WINDOW_ICON_PATH,
      appIconIndex: 0,
      relaunchCommand: `"${process.execPath}"`,
      relaunchDisplayName: APP_TITLE
    })
  }
  window.once('ready-to-show', () => {
    window.maximize()
    window.show()
  })
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event) => event.preventDefault())
  window.on('focus', () => void container?.quota.refreshSoon())
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) void window.loadURL(devUrl)
  else void window.loadFile(join(import.meta.dirname, '../renderer/index.html'))
  return window
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    // Ein älterer Autostart-Eintrag kann die App zuerst ohne Flag starten; der Login-Start kommt dann hier an.
    checkForUpdate(argv)
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  void app.whenReady().then(() => {
    app.setAppUserModelId(APP_USER_MODEL_ID)
    // Bisher erlaubte Electron alles; nur Kamera/Mikrofon wird eingeschränkt: Audio für das eigene Fenster.
    session.defaultSession.setPermissionRequestHandler((contents, permission, callback, details) => {
      if (permission !== 'media') return callback(true)
      const own = mainWindow !== null && contents === mainWindow.webContents
      const audioOnly = 'mediaTypes' in details && (details.mediaTypes ?? []).every((t) => t === 'audio')
      callback(own && audioOnly)
    })
    container = new Container(app.getPath('userData'), emit, (message, error) => log.error(message, error), {
      showNotification: ({ title, body, onClick }) => {
        if (!Notification.isSupported()) return
        const notification = new Notification({ title, body })
        notification.on('click', onClick)
        notification.show()
      },
      focusWindow: () => {
        if (!mainWindow) return
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.show()
        mainWindow.focus()
      },
      showInFolder: (path) => shell.showItemInFolder(path)
    })
    const settings = container.settings
    updates = createUpdateService({
      emit: (state) => emit('update:state', state),
      mode: () => settings.get().updateMode,
      log: (message) => log.info(message),
      logError: (message, error) => log.error(message, error),
      notify: showNotification
    })
    registerIpc(container, updates)
    handleImageProtocol(container)
    applyAutostart(container.settings.get().launchOnStartup)
    mainWindow = createMainWindow()
    container.start()
    checkForUpdate(process.argv)
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow()
    })
  })

  app.on('before-quit', () => container?.stop())
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
