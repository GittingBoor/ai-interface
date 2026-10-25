import { useState } from 'react'
import { CircleCheck, CircleX, PlugZap } from 'lucide-react'
import type { DeviceSettings, DeviceTestResult } from '@shared/types'
import { DEVICE_COLORS, deviceIdFrom } from '@shared/layout'
import { api } from '@renderer/api/client'
import { attempt } from '@renderer/api/call'
import { Button } from './Button'
import { ColorPicker } from './ColorPicker'
import { Field, Switch } from './Controls'
import { IconPicker } from './IconPicker'
import { ProjectMark } from './ProjectMark'

const PORT_MIN = 1
const PORT_MAX = 65_535
const DEFAULT_PORT = 22
const DEFAULT_PROJECTS_DIR = '~/projects'
const DEFAULT_ICON = 'lucide:server'

/** Neues Gerät mit freier ID und noch nicht vergebener Farbe. */
export function newDevice(existing: readonly DeviceSettings[], keyPath: string): DeviceSettings {
  const used = new Set(existing.map((d) => d.color.toLowerCase()))
  const color = DEVICE_COLORS.find((c) => !used.has(c.toLowerCase())) ?? DEVICE_COLORS[0] ?? '#5fb37a'
  return {
    id: '',
    name: '',
    color,
    icon: DEFAULT_ICON,
    projectsDir: DEFAULT_PROJECTS_DIR,
    enabled: true,
    host: '',
    port: DEFAULT_PORT,
    user: '',
    privateKeyPath: keyPath,
    hostFingerprint: ''
  }
}

/** Prüft ein Gerät; `null` = gültig. */
export function deviceError(device: DeviceSettings, others: readonly DeviceSettings[] = []): string | null {
  if (!device.name.trim()) return 'Bitte einen Namen eingeben.'
  const name = device.name.trim().toLowerCase()
  if (others.some((d) => d.id !== device.id && d.name.trim().toLowerCase() === name)) return `Ein Gerät namens „${device.name.trim()}“ gibt es schon.`
  if (!device.host.trim()) return 'Bitte Adresse (IP oder Hostname) eingeben.'
  if (!device.user.trim()) return 'Bitte den Benutzernamen auf dem Gerät eingeben.'
  if (!Number.isInteger(device.port) || device.port < PORT_MIN || device.port > PORT_MAX) return `Port zwischen ${PORT_MIN} und ${PORT_MAX}.`
  return null
}

/** Neues Gerät bekommt beim Speichern eine ID aus dem Namen; vorhandene behalten ihre ID. */
export function withId(device: DeviceSettings, others: readonly DeviceSettings[]): DeviceSettings {
  const trimmed = { ...device, name: device.name.trim(), host: device.host.trim(), user: device.user.trim(), projectsDir: device.projectsDir.trim() || '~' }
  return trimmed.id ? trimmed : { ...trimmed, id: deviceIdFrom(trimmed.name, others.map((d) => d.id)) }
}

interface DeviceFormProps {
  readonly value: DeviceSettings
  /** Übrige Geräte (Name muss eindeutig sein). */
  readonly others?: readonly DeviceSettings[]
  onChange(next: DeviceSettings): void
}

/** Formular für ein SSH-Gerät (Name, Aussehen, Verbindung, Projektordner) mit Verbindungstest. */
export function DeviceForm({ value, others = [], onChange }: DeviceFormProps): React.JSX.Element {
  const [iconOpen, setIconOpen] = useState(false)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<DeviceTestResult | null>(null)
  const set = <K extends keyof DeviceSettings>(key: K, v: DeviceSettings[K]): void => {
    setResult(null)
    onChange({ ...value, [key]: v })
  }
  const invalid = deviceError(value, others)

  const test = async (): Promise<void> => {
    setTesting(true)
    setResult(await attempt(api.setup.testDevice(value)))
    setTesting(false)
  }

  return (
    <div className="space-y-5">
      <Field label="Name" hint="So heißt das Gerät in der Seitenleiste, z. B. „Server“, „NAS“, „Raspberry Pi“">
        {(id, d) => (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIconOpen(true)}
              title="Symbol wählen"
              aria-label="Symbol wählen"
              className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-canvas transition-colors hover:border-line-strong"
            >
              <ProjectMark color={value.color} icon={value.icon} size="md" />
            </button>
            <input id={id} aria-describedby={d} value={value.name} onChange={(e) => set('name', e.target.value)} className="field" placeholder="Mini-PC" />
          </div>
        )}
      </Field>
      <Field label="Farbe">{() => <ColorPicker value={value.color} label="Gerätefarbe" onChange={(c) => set('color', c)} />}</Field>
      <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-4">
        <Field label="Adresse" hint="IP-Adresse oder Hostname">
          {(id, d) => <input id={id} aria-describedby={d} value={value.host} onChange={(e) => set('host', e.target.value)} className="field font-mono text-xs" spellCheck={false} placeholder="192.168.0.10" />}
        </Field>
        <Field label="Port">
          {(id) => <input id={id} inputMode="numeric" value={Number.isNaN(value.port) ? '' : String(value.port)} onChange={(e) => set('port', Number(e.target.value))} className="field num" />}
        </Field>
        <Field label="Benutzer" className="col-span-2">
          {(id) => <input id={id} value={value.user} onChange={(e) => set('user', e.target.value)} className="field font-mono text-xs" spellCheck={false} />}
        </Field>
        <Field label="Privater Schlüssel" className="col-span-2" hint="Pfad zur Schlüsseldatei auf diesem PC. Ohne Datei nutzt die App den SSH-Agent.">
          {(id, d) => <input id={id} aria-describedby={d} value={value.privateKeyPath} onChange={(e) => set('privateKeyPath', e.target.value)} className="field font-mono text-xs" spellCheck={false} />}
        </Field>
        <Field label="Projektordner auf dem Gerät" className="col-span-2" hint="Für Ordnerliste und Git-Stand, ~ = Home-Ordner">
          {(id, d) => <input id={id} aria-describedby={d} value={value.projectsDir} onChange={(e) => set('projectsDir', e.target.value)} className="field font-mono text-xs" spellCheck={false} />}
        </Field>
      </div>
      <Switch checked={value.enabled} onChange={(v) => set('enabled', v)} label="Eingeschaltet" description="Aus: keine SSH-Verbindung, das Gerät verschwindet aus Seitenleiste und Auswertungen." />
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" icon={PlugZap} loading={testing} disabled={invalid !== null} onClick={() => void test()}>
          Verbindung testen
        </Button>
        {result ? (
          <p role="status" className={`flex min-w-0 items-center gap-1.5 text-xs ${result.ok ? 'text-ink-2' : 'text-danger-ink'}`}>
            {result.ok ? <CircleCheck className="size-3.5 shrink-0 text-mini-ink" aria-hidden /> : <CircleX className="size-3.5 shrink-0" aria-hidden />}
            <span className="min-w-0 break-words">{result.message}</span>
          </p>
        ) : invalid ? (
          <p className="text-xs text-ink-3">{invalid}</p>
        ) : null}
      </div>
      <IconPicker
        open={iconOpen}
        value={value.icon}
        color={value.color}
        subject={value.name || 'Gerät'}
        onClose={() => setIconOpen(false)}
        onSelect={(icon) => {
          set('icon', icon)
          setIconOpen(false)
        }}
      />
    </div>
  )
}
