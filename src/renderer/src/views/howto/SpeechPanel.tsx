import { useEffect, useState } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { SPEECH_HOTKEY_KEYS, SPEECH_MODELS } from '@shared/speech'
import { Button } from '@renderer/components/Button'
import { Field, Switch } from '@renderer/components/Controls'
import { Section } from '@renderer/components/Section'
import { useSpeech } from '@renderer/stores/speechStore'
import { useSettings } from '@renderer/stores/settingsStore'

const MB = 1_000_000

/** Mikrofone erst nach einer Freigabe mit Namen; vorher nur „Standard“. */
function useMicrophones(): readonly MediaDeviceInfo[] {
  const [devices, setDevices] = useState<readonly MediaDeviceInfo[]>([])
  useEffect(() => {
    const load = (): void => void navigator.mediaDevices.enumerateDevices().then((all) => setDevices(all.filter((d) => d.kind === 'audioinput' && d.deviceId !== 'default')))
    load()
    navigator.mediaDevices.addEventListener('devicechange', load)
    return () => navigator.mediaDevices.removeEventListener('devicechange', load)
  }, [])
  return devices
}

export function SpeechPanel(): React.JSX.Element {
  const status = useSpeech((s) => s.status)
  const { selectModel, removeModel, openSetup, loadStatus } = useSpeech.getState()
  const settings = useSettings((s) => s.settings)
  const update = useSettings((s) => s.update)
  const microphones = useMicrophones()

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  if (!settings) return <Section title="Spracheingabe">Lädt …</Section>
  if (status?.supported === false) {
    return (
      <Section title="Spracheingabe" description="Nur unter Windows automatisch eingerichtet. Hier Win+H bzw. /voice nutzen.">
        {null}
      </Section>
    )
  }

  return (
    <Section id="speech" title="Spracheingabe" description="whisper.cpp läuft lokal auf der Grafikkarte (Vulkan). Nichts verlässt den PC.">
      <ul className="divide-y divide-line rounded-lg border border-line">
        {SPEECH_MODELS.map((m) => {
          const installed = status?.installedModels.includes(m.id) ?? false
          const active = status?.model === m.id
          return (
            <li key={m.id} className={`flex items-center gap-3 px-3 py-2.5 transition-colors duration-150 ${active ? 'bg-accent-soft/50' : ''}`}>
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="speech-model"
                  checked={active}
                  onChange={() => void selectModel(m.id)}
                  className="size-3.5 shrink-0 accent-[var(--color-accent)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.8125rem] font-[560] text-ink">
                    {m.label} <span className="num font-normal text-ink-3">· {Math.round(m.bytes / MB)} MB</span>
                  </span>
                  <span className="block text-xs text-ink-3">{m.description}</span>
                </span>
              </label>
              {installed ? (
                <Button size="sm" variant="ghost" icon={Trash2} aria-label={`Modell ${m.label} entfernen`} onClick={() => void removeModel(m.id)}>
                  Entfernen
                </Button>
              ) : (
                <Button size="sm" variant="soft" icon={Download} aria-label={`Modell ${m.label} laden`} onClick={() => openSetup(m.id)}>
                  Laden
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      <div className="mt-4 grid gap-4">
        <Field label="Mikrofon">
          {(id) => (
            <select
              id={id}
              value={settings.speech.deviceId}
              onChange={(e) => void update({ speech: { ...settings.speech, deviceId: e.target.value } })}
              className="field text-[0.8125rem]"
            >
              <option value="">Windows-Standard</option>
              {microphones.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || 'Mikrofon (Name nach erster Aufnahme)'}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Switch
          checked={settings.speech.hotkeyEnabled}
          label={`Tastenkürzel ${SPEECH_HOTKEY_KEYS.join('+')}`}
          description="Startet und stoppt das Diktat ohne Maus. Standardmäßig aus."
          onChange={(v) => void update({ speech: { ...settings.speech, hotkeyEnabled: v } })}
        />
      </div>
    </Section>
  )
}
