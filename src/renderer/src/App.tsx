import { useEffect, type ComponentType } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { api } from '@renderer/api/client'
import { Sidebar } from '@renderer/components/Sidebar'
import { TitleBar } from '@renderer/components/TitleBar'
import { Toaster } from '@renderer/components/Toaster'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import { CommandPalette } from '@renderer/components/CommandPalette'
import { AssistantPanel } from '@renderer/components/assistant/AssistantPanel'
import { useAssistant } from '@renderer/stores/assistantStore'
import { useNav, type ViewId } from '@renderer/stores/navStore'
import { useUsage } from '@renderer/stores/usageStore'
import { useFavorites } from '@renderer/stores/favoritesStore'
import { useCategories } from '@renderer/stores/categoriesStore'
import { isTerminalTarget } from '@renderer/lib/keyboard'
import { useTodos } from '@renderer/stores/todoStore'
import { useSettings } from '@renderer/stores/settingsStore'
import { useTerminals } from '@renderer/stores/terminalStore'
import { usePalette } from '@renderer/stores/paletteStore'
import { useInterval } from '@renderer/lib/hooks'
import { reloadSharedData, useLiveData } from '@renderer/lib/liveData'
import { aiImagesMessage } from '@renderer/lib/aiImages'
import { baseName } from '@renderer/lib/format'
import { notify } from '@renderer/stores/toastStore'
import { DEVICE_KEY, VIEWS } from '@renderer/lib/views'
import { SetupWizard } from '@renderer/views/setup/SetupWizard'
import { AnalyticsView } from '@renderer/views/analytics/AnalyticsView'
import { HomeView } from '@renderer/views/home/HomeView'
import { ProjectsView } from '@renderer/views/projects/ProjectsView'
import { TerminalView } from '@renderer/views/terminal/TerminalView'
import { ModelsView } from '@renderer/views/models/ModelsView'
import { TodosView } from '@renderer/views/todos/TodosView'
import { ProtocolsView } from '@renderer/views/protocols/ProtocolsView'
import { GalleryView } from '@renderer/views/gallery/GalleryView'
import { SettingsView } from '@renderer/views/settings/SettingsView'
import { RunsView } from '@renderer/views/runs/RunsView'
import { useQuota } from '@renderer/stores/quotaStore'
import { useRuns } from '@renderer/stores/runsStore'
import { MiniPcView } from '@renderer/views/minipc/MiniPcView'
import { LinkView } from '@renderer/views/links/LinkView'
import { SkillsView } from '@renderer/views/skills/SkillsView'
import { HowToView } from '@renderer/views/howto/HowToView'
import { SpeechSetupDialog } from '@renderer/components/speech/SpeechSetupDialog'
import { useSpeech } from '@renderer/stores/speechStore'
import { usePrivacy } from '@renderer/stores/privacyStore'
import { useUpdate } from '@renderer/stores/updateStore'
import { useSkills } from '@renderer/stores/skillsStore'
import { useTaskReview } from '@renderer/stores/taskReviewStore'
import { hotkeyTarget, isDictationHotkey } from '@renderer/lib/speechText'
import { ASSISTANT_PANEL_ID } from '@renderer/components/assistant/AssistantPanel'

const USAGE_POLL_MS = 60_000
/** Mindestabstand zwischen zwei Neuladungen beim Fensterfokus. */
const FOCUS_RELOAD_MIN_MS = 5_000

/** Terminal fehlt hier absichtlich: es bleibt dauerhaft gemountet. */
const PAGES: Readonly<Record<Exclude<ViewId, 'terminal'>, ComponentType>> = {
  home: HomeView,
  overview: AnalyticsView,
  projects: ProjectsView,
  runs: RunsView,
  models: ModelsView,
  todos: TodosView,
  protocols: ProtocolsView,
  gallery: GalleryView,
  device: MiniPcView,
  link: LinkView,
  skills: SkillsView,
  howto: HowToView,
  settings: SettingsView
}

function useBootstrap(): void {
  useEffect(() => {
    void useUsage.getState().load()
    void useFavorites.getState().load()
    void useCategories.getState().load()
    void useTodos.getState().load()
    void useSettings.getState().load()
    void useTerminals.getState().init()
    void useQuota.getState().load()
    void useRuns.getState().load()
    void useSpeech.getState().loadStatus()
    void usePrivacy.getState().load()
    void useUpdate.getState().load()
    const offQuota = api.on('quota:updated', (state) => useQuota.getState().receive(state))
    const offRuns = api.on('runs:updated', (runs) => useRuns.getState().receive(runs))
    const offUpdate = api.on('update:state', (state) => useUpdate.getState().receive(state))
    const offRunsShow = api.on('runs:show', () => {
      usePalette.getState().hide()
      useNav.getState().go('runs')
    })
    const offUsage = api.on('usage:updated', (hosts) => {
      useUsage.getState().setHosts(hosts)
      void useUsage.getState().load()
    })
    const offTodos = api.on('todos:changed', (state) => useTodos.getState().receive(state))
    const offTaskReview = api.on('tasks:reviewed', (result) => useTaskReview.getState().receive(result))
    const offData = api.on('data:changed', () => reloadSharedData())
    const offAssistant = api.on('assistant:event', (event) => useAssistant.getState().receive(event))
    // Privatmodus: alles neu laden, was private Projekte enthalten kann (Favoriten/Galerie über data:changed).
    const offPrivacy = api.on('privacy:changed', (status) => {
      usePrivacy.getState().receive(status)
      // Der Main-Prozess setzt den Assistenten beim Sperren zurück; der sichtbare Verlauf muss mit.
      if (status.locked) useAssistant.setState({ messages: [], running: false })
      void useUsage.getState().load()
      void useRuns.getState().load()
      void useTerminals.getState().sync()
      if (useSkills.getState().loaded) void useSkills.getState().load()
    })
    const offImages = api.on('images:added', ({ count, projects }) => {
      useLiveData.getState().bump()
      const favorites = useFavorites.getState().favorites
      const names = projects.map((path) => favorites.find((f) => f.path === path)?.name ?? baseName(path))
      notify.info(aiImagesMessage(count, names), 'Zu sehen in der Galerie unter „Nur KI-Bilder“.')
    })
    let lastFocusReload = Date.now()
    const onFocus = (): void => {
      if (Date.now() - lastFocusReload < FOCUS_RELOAD_MIN_MS) return
      lastFocusReload = Date.now()
      reloadSharedData()
    }
    window.addEventListener('focus', onFocus)
    return () => {
      offUsage()
      offTodos()
      offTaskReview()
      offData()
      offAssistant()
      offPrivacy()
      offImages()
      offQuota()
      offRuns()
      offRunsShow()
      offUpdate()
      window.removeEventListener('focus', onFocus)
    }
  }, [])
  useInterval(() => void useUsage.getState().load(), USAGE_POLL_MS)
}

function useShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!e.ctrlKey || e.altKey || e.metaKey) return
      const key = e.key.toLowerCase()
      // Strg+J gilt überall, auch im Terminal; nur ohne weitere Modifikatoren.
      if (key === 'j' && !e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        useAssistant.getState().toggle()
        return
      }
      if (key === 'k') {
        if (isTerminalTarget(e.target instanceof Element ? e.target : null)) return
        e.preventDefault()
        e.stopPropagation()
        usePalette.getState().toggle()
        return
      }
      if (key === DEVICE_KEY && !e.shiftKey) {
        const device = useSettings.getState().settings?.devices.find((d) => d.enabled)
        if (!device) return
        e.preventDefault()
        e.stopPropagation()
        usePalette.getState().hide()
        useNav.getState().openDevice(device.id)
        return
      }
      const view = VIEWS.find((v) => v.key !== '' && v.key === key)
      if (view && !e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        usePalette.getState().hide()
        useNav.getState().go(view.id)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])
}

/** Esc verwirft ein laufendes Diktat; Strg+Shift+Leertaste (falls eingeschaltet) startet/stoppt es. */
function useSpeechShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const speech = useSpeech.getState()
      if (e.key === 'Escape' && speech.phase === 'recording') {
        e.preventDefault()
        e.stopPropagation()
        speech.cancel()
        return
      }
      if (!isDictationHotkey(e) || !useSettings.getState().settings?.speech.hotkeyEnabled) return
      e.preventDefault()
      e.stopPropagation()
      const active = document.activeElement
      const target =
        speech.phase === 'recording' && speech.target
          ? speech.target
          : hotkeyTarget({
              assistantFocused: active instanceof Element && active.closest(`#${ASSISTANT_PANEL_ID}`) !== null,
              assistantOpen: useAssistant.getState().open,
              terminalVisible: useNav.getState().view === 'terminal',
              activeTerminalId: useTerminals.getState().activeId
            })
      if (target) void speech.toggle(target)
      else notify.info('Kein Ziel für das Diktat', 'Assistent öffnen (Strg+J) oder ein Terminal anzeigen.')
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])
}

export function App(): React.JSX.Element {
  const view = useNav((s) => s.view)
  const setupDone = useSettings((s) => s.settings?.setupDone ?? null)
  useBootstrap()
  useShortcuts()
  useSpeechShortcuts()
  const Page = view === 'terminal' ? null : PAGES[view]

  // Erste Einrichtung (neue Installation oder erneut gestartet): nur der Assistent, sonst nichts.
  if (setupDone === false) {
    return (
      <MotionConfig reducedMotion="user">
        <div className="flex h-full flex-col">
          <TitleBar />
          <div className="min-h-0 flex-1">
            <SetupWizard />
          </div>
        </div>
        <ConfirmDialog />
        <Toaster />
      </MotionConfig>
    )
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-full flex-col bg-canvas">
        <TitleBar />
        <div className="flex min-h-0 flex-1 bg-base">
          <Sidebar />
          <main className="relative min-w-0 flex-1 border-t border-line/70">
            <AnimatePresence mode="wait" initial={false}>
              {Page ? (
                <motion.div
                  key={view}
                  className="absolute inset-0"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.08 } }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Page />
                </motion.div>
              ) : null}
            </AnimatePresence>
            <div className={`absolute inset-0 ${view === 'terminal' ? '' : 'invisible pointer-events-none'}`} aria-hidden={view !== 'terminal'}>
              <TerminalView visible={view === 'terminal'} />
            </div>
          </main>
          <AssistantPanel />
        </div>
      </div>
      <CommandPalette />
      <ConfirmDialog />
      <SpeechSetupDialog />
      <Toaster />
    </MotionConfig>
  )
}
