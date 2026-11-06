import { useState } from 'react'
import type { DeviceSettings, WebLinkSettings } from '@shared/types'
import { DEVICE_COLORS, deviceIdFrom } from '@shared/layout'
import { normalizeUrl } from '@shared/links'
import { useT } from '@renderer/i18n/useT'
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
  const t = useT()
  const [iconOpen, setIconOpen] = useState(false)
  const set = <K extends keyof WebLinkSettings>(key: K, v: WebLinkSettings[K]): void => onChange({ ...value, [key]: v })
  return (
    <div className="space-y-5">
      <Field label={t.frame.fields.name} hint={t.frame.link.nameHint}>
        {(id, d) => (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIconOpen(true)}
              title={t.frame.iconPicker.choose}
              aria-label={t.frame.iconPicker.choose}
              className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-canvas transition-colors hover:border-line-strong"
            >
              <ProjectMark color={value.color} icon={value.icon} size="md" />
            </button>
            <input id={id} aria-describedby={d} value={value.name} onChange={(e) => set('name', e.target.value)} className="field" placeholder={t.frame.link.namePlaceholder} />
          </div>
        )}
      </Field>
      <Field label={t.frame.fields.color}>{() => <ColorPicker value={value.color} label={t.frame.link.colorLabel} onChange={(c) => set('color', c)} />}</Field>
      <Field label={t.frame.fields.address} hint={t.frame.link.addressHint}>
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
      <Field label={t.frame.link.placement} hint={t.frame.link.placementHint}>
        {(id, d) => (
          <select id={id} aria-describedby={d} value={value.deviceId ?? ''} onChange={(e) => set('deviceId', e.target.value || null)} className="field">
            <option value="">{t.frame.link.noDevice}</option>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
                {device.enabled ? '' : t.frame.link.deviceOff}
              </option>
            ))}
          </select>
        )}
      </Field>
      <p className="text-xs leading-relaxed text-ink-3">
        {t.frame.link.loginNote}
      </p>
      <IconPicker
        open={iconOpen}
        value={value.icon}
        color={value.color}
        subject={value.name || t.frame.link.subjectFallback}
        onClose={() => setIconOpen(false)}
        onSelect={(icon) => {
          set('icon', icon)
          setIconOpen(false)
        }}
      />
    </div>
  )
}
