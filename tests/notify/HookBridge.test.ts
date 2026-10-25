import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { HookBridge } from '../../src/main/notify/HookBridge'
import type { HookEvent } from '../../src/main/notify/hookSettings'
import { FakeHost } from '../helpers/FakeHost'

function setup() {
  const dataDir = mkdtempSync(join(tmpdir(), 'aii-hooks-'))
  const local = new FakeHost('local', '/home/l')
  const mini = new FakeHost('mini-pc', '/home/alex')
  const events: HookEvent[] = []
  const bridge = new HookBridge((id) => (id === 'local' ? local : mini), dataDir, () => true, (e) => events.push(...e), () => undefined, () => ['mini-pc'])
  return { dataDir, local, mini, events, bridge }
}

describe('HookBridge', () => {
  it('schreibt die lokalen Hook-Einstellungen mit Spool-Pfad in Vorwärtsschrägstrichen', () => {
    const { bridge, dataDir } = setup()
    const path = bridge.localSettingsPath()
    expect(path).toBe(join(dataDir, 'hooks-local.json'))
    const text = readFileSync(path, 'utf8')
    const spool = JSON.stringify(`${dataDir.replaceAll('\\', '/')}/hook-events.log`).slice(1, -1)
    expect(text).toContain(spool)
    expect(text).not.toContain('\\\\')
  })

  it('legt die Hook-Einstellungen auf dem Mini-PC einmalig an', async () => {
    const { bridge, mini } = setup()
    expect(await bridge.remoteSettingsPath('mini-pc')).toBe('/home/alex/.cache/ai-interface/hooks.json')
    expect(mini.text('/home/alex/.cache/ai-interface/hooks.json')).toContain('/home/alex/.cache/ai-interface/hook-events.log')
    mini.files.delete('/home/alex/.cache/ai-interface/hooks.json')
    await bridge.remoteSettingsPath('mini-pc')
    expect(mini.files.has('/home/alex/.cache/ai-interface/hooks.json')).toBe(false)
  })

  it('liest Ereignisse beider Hosts', async () => {
    const { bridge, mini, events } = setup()
    await bridge.pollOnce()
    mini.setFile('/home/alex/.cache/ai-interface/hook-events.log', 't9\tdone\t{}\n')
    await bridge.pollOnce()
    expect(events.map((e) => [e.terminalId, e.host])).toEqual([['t9', 'mini-pc']])
  })
})
