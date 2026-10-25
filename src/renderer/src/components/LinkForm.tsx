import { useState } from 'react'
import type { DeviceSettings, WebLinkSettings } from '@shared/types'
import { DEVICE_COLORS, deviceIdFrom } from '@shared/layout'
import { normalizeUrl } from '@shared/links'
import { ColorPicker } from './ColorPicker'
import { Field } from './Controls'
import { IconPicker } from './IconPicker'
import { ProjectMark } from './ProjectMark'

const DEFAULT_ICON = 'lucide:globe'

/** Neue Webseite mit noch nicht vergebener Farbe, standardmäßig unter dem ersten Gerät. */
export function newLink(existing: readonly WebLinkSettings[], devices: readonly DeviceSettings[]): WebLinkSettings {
  const used = new Set(existing.map((l) => l.color.toLowerCase()))
  const color = DEVICE_COLORS.find((c) => !used.has(c.toLowerCase())) ?? DEVICE_COLORS[0] ?? '#5fb3c8'
  return { id: '', name: '', url: '', color, icon: DEFAULT_ICON, deviceId: devices[0]?.id ?? null }
}

/** Beim Speichern: Eingaben säubern, Protokoll ergänzen; neue Webseiten bekommen eine ID aus dem Namen. */
export function withLinkId(link: WebLinkSettings, others: readonly WebLinkSettings[]): WebLinkSettings {
  const trimmed = { ...link, name: link.name.trim(), url: normalizeUrl(link.url) }
  return trimmed.id ? trimmed : { ...trimmed, id: deviceIdFrom(trimmed.name, others.map((l) => l.id)) }
}

interface LinkFormProps {
  readonly value: WebLinkSettings
  readonly devices: readonly DeviceSettings[]
  onChange(next: WebLinkSettings): void
}

/** Formular für eine Webseite: Name, Aussehen, Adresse und das Gerät, unter dem sie in der Seitenleiste steht. */
export function LinkForm({ value, devices, onChange }: LinkFormProps): React.JSX.Element {
  const [iconOpen, setIconOpen] = useState(false)
  const set = <K extends keyof WebLinkSettings>(key: K, v: WebLinkSettings[K]): void => onChange({ ...value, [key]: v })
  return (
    <div className="space-y-5">
      <Field label="Name" hint="So heißt die Seite in der Seitenleiste, z. B. „Smart Home“, „Router“, „Server-Panel“">
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
            <input id={id} aria-describedby={d} value={value.name} onChange={(e) => set('name', e.target.value)} className="field" placeholder="Smart Home" />
          </div>
        )}
      </Field>
      <Field label="Farbe">{() => <ColorPicker value={value.color} label="Farbe der Webseite" onChange={(c) => set('color', c)} />}</Field>
      <Field label="Adresse" hint="Mit Port, falls nötig. Ohne http:// wird https:// ergänzt.">
        {(id, d) => (
          <input
            id={id}
            aria-describedby={d}
            value={value.url}
            onChange={(e) => set('url', e.target.value)}
            className="field font-mono text-xs"
            spellCheck={false}
            placeholder="http://192.168.0.10:8123"
          />
        )}
      </Field>
      <Field label="In der Seitenleiste unter" hint="Die Seite erscheint eingerückt unter dem Gerät, ohne Gerät für sich allein.">
        {(id, d) => (
          <select id={id} aria-describedby={d} value={value.deviceId ?? ''} onChange={(e) => set('deviceId', e.target.value || null)} className="field">
            <option value="">Kein Gerät</option>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
                {device.enabled ? '' : ' (aus)'}
              </option>
            ))}
          </select>
        )}
      </Field>
      <p className="text-xs leading-relaxed text-ink-3">
        Anmeldungen (z. B. Home Assistant, Cloudflare Access) machst du direkt in der Seite. Die App speichert keine Passwörter, nur die Cookies der Seite, damit du angemeldet bleibst.
      </p>
      <IconPicker
        open={iconOpen}
        value={value.icon}
        color={value.color}
        subject={value.name || 'Webseite'}
        onClose={() => setIconOpen(false)}
        onSelect={(icon) => {
          set('icon', icon)
          setIconOpen(false)
        }}
      />
    </div>
  )
}
