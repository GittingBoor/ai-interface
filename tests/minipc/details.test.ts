import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SystemStats } from '@shared/types'
import { infoScript, systemScript } from '../../src/main/minipc/commands'
import { MiniPcService } from '../../src/main/minipc/MiniPcService'
import { parseInfo } from '../../src/main/minipc/parseInfo'
import { parseCounters, parseSystem } from '../../src/main/minipc/parseSystem'
import { withRates } from '../../src/main/minipc/rates'
import { FakeHost } from '../helpers/FakeHost'

/** Echte Ausgaben des Mini-PCs (GMKtec NucBox G3 Pro, Debian 13). */
const fixture = (name: string): string => readFileSync(join(__dirname, 'fixtures', name), 'utf8')
const SYSTEM = fixture('system.txt')
const INFO = fixture('info.txt')
const GIB = 1024 ** 3
const MIB = 1024 ** 2

describe('parseSystem (erweiterte Werte)', () => {
  const stats = parseSystem(SYSTEM)

  it('liest Temperaturen mit Bezeichnung und Grenzwert', () => {
    expect(stats.temps).toEqual([
      { chip: 'acpitz', label: '', celsius: 27.8, critCelsius: null },
      { chip: 'pch_cannonlake', label: '', celsius: 53, critCelsius: null },
      { chip: 'coretemp', label: 'Package id 0', celsius: 56, critCelsius: 100 },
      { chip: 'coretemp', label: 'Core 0', celsius: 56, critCelsius: 100 },
      { chip: 'coretemp', label: 'Core 1', celsius: 57, critCelsius: 100 }
    ])
  })

  it('kennt ohne Sensor-Treiber keine Drehzahl, aber die ACPI-Kühlstufen', () => {
    expect(stats.fans).toEqual([])
    expect(stats.cooling.filter((c) => c.type === 'Fan')).toHaveLength(5)
    expect(stats.cooling[0]).toEqual({ type: 'Processor', state: 0, maxState: 3 })
  })

  it('liest eine Lüfterdrehzahl, sobald ein Treiber sie liefert', () => {
    const withFan = SYSTEM.replace('@@FAN@@', '@@FAN@@\nit8613||2310|')
    expect(parseSystem(withFan).fans).toEqual([{ chip: 'it8613', label: '', rpm: 2310 }])
  })

  it('berechnet Auslastung und Takt je Kern', () => {
    expect(stats.corePercents).toHaveLength(4)
    // cpu0: Δ user 0, system 4, idle 46 → 4/50
    expect(stats.corePercents[0]).toBeCloseTo(8, 5)
    expect(stats.coreMhz.map(Math.round)).toEqual([1000, 1000, 1000, 1000])
    expect(stats.governor).toBe('powersave')
    expect(stats.throttleCount).toBe(0)
  })

  it('liest Cache und Auslagerung', () => {
    expect(stats.memCached).toBe(5998604 * 1024)
    expect(stats.swapTotal).toBe(16654332 * 1024)
    expect(stats.swapUsed).toBe((16654332 - 16629756) * 1024)
  })

  it('zeigt nur echte Netzwerkschnittstellen und die WLAN-Qualität', () => {
    expect(stats.net.map((n) => n.name)).toEqual(['enp1s0', 'wlp2s0'])
    expect(stats.net[1]).toEqual({ name: 'wlp2s0', rxBytes: 19174602767, txBytes: 2829147956, rxRate: null, txRate: null })
    expect(stats.wifiPercent).toBe(100)
  })

  it('liest die Prozesse mit der höchsten CPU-Last', () => {
    expect(stats.processCount).toBe(199)
    expect(stats.processes).toHaveLength(5)
    expect(stats.processes[0]).toEqual({ pid: 3299850, cpuPercent: 152, memBytes: 5279904 * 1024, command: 'uvicorn' })
  })

  it('kommt mit der alten, kurzen Ausgabe zurecht', () => {
    const old = parseSystem('@@STAT1@@\ncpu  1 0 1 8 0\n@@STAT2@@\ncpu  2 0 2 16 0\n')
    expect(old).toMatchObject({ temps: [], fans: [], cooling: [], net: [], diskIo: [], processes: [], corePercents: [], governor: null, throttleCount: null, wifiPercent: null })
  })
})

describe('withRates', () => {
  const stats: SystemStats = parseSystem(SYSTEM)
  const counters = parseCounters(SYSTEM)

  it('liefert ohne vorherigen Abruf keine Raten', () => {
    const result = withRates(stats, null, { at: 1000, counters })
    expect(result.net[1]).toMatchObject({ rxRate: null, txRate: null })
    expect(result.diskIo).toEqual([{ name: 'sda', readRate: null, writeRate: null }])
    expect(result.powerWatts).toBeNull()
  })

  it('berechnet Durchsatz und Leistung aus zwei Abrufen', () => {
    const before = {
      net: counters.net.map((n) => ({ ...n, rxBytes: n.rxBytes - 20_000, txBytes: n.txBytes - 5_000 })),
      disks: counters.disks.map((d) => ({ ...d, readBytes: d.readBytes - 1_000, writtenBytes: d.writtenBytes - 40_000 })),
      energyUj: 1_000_000
    }
    const result = withRates(stats, { at: 0, counters: before }, { at: 10_000, counters: { ...counters, energyUj: 61_000_000 } })
    expect(result.net[1]).toMatchObject({ rxRate: 2_000, txRate: 500 })
    expect(result.diskIo).toEqual([{ name: 'sda', readRate: 100, writeRate: 4_000 }])
    expect(result.powerWatts).toBeCloseTo(6)
  })

  it('gibt nach einem zurückgesetzten Zähler keine negative Rate aus', () => {
    const before = { ...counters, net: counters.net.map((n) => ({ ...n, rxBytes: n.rxBytes + 1 })), energyUj: 9 }
    const result = withRates(stats, { at: 0, counters: before }, { at: 10_000, counters: { ...counters, energyUj: 1 } })
    expect(result.net[1]?.rxRate).toBeNull()
    expect(result.powerWatts).toBeNull()
  })
})

describe('parseInfo', () => {
  const info = parseInfo(INFO, 7)

  it('liest Gerät, Betriebssystem und Wartungsstand', () => {
    expect(info).toMatchObject({
      vendor: 'GMKtec',
      model: 'NucBox_G3 Pro',
      bios: '1.01 · 01/14/2026',
      os: 'Debian GNU/Linux 13 (trixie)',
      kernel: '6.12.107+deb13-amd64',
      hostname: 'homeserver',
      cpuModel: 'Intel(R) Core(TM) i3-10110U CPU @ 2.10GHz',
      cpuMaxMhz: 4100,
      updates: 1,
      rebootRequired: false,
      failedUnits: [],
      users: 4,
      fetchedAt: 7
    })
    expect(info.drives).toEqual([{ name: 'sda', sizeBytes: 512110190592, model: 'TWSC TSC10N512-H6Q10S' }])
  })

  it('zeigt Adressen nur für echte Schnittstellen', () => {
    expect(info.addresses.map((a) => a.name)).toEqual(['enp1s0', 'wlp2s0'])
    expect(info.addresses[0]).toEqual({ name: 'enp1s0', state: 'DOWN', addresses: [] })
    expect(info.addresses[1]?.addresses[0]).toBe('192.168.1.20/24')
  })

  it('verbindet Docker-Container mit ihrem Verbrauch', () => {
    expect(info.docker).toHaveLength(7)
    expect(info.docker?.[0]).toEqual({
      name: 'musicrec-backend-1',
      image: 'musicrec-backend',
      state: 'running',
      status: 'Up 12 hours',
      cpuPercent: 39.74,
      memBytes: Math.round(4.641 * GIB),
      memLimitBytes: 6 * GIB
    })
    expect(info.docker?.[1]?.memBytes).toBe(Math.round(5.977 * MIB))
  })

  it('meldet fehlendes Docker als null und gestoppte Container ohne Verbrauch', () => {
    expect(parseInfo('@@KV@@\nhostname=x\n@@DOCKER@@\n@@DSTATS@@\n', 1).docker).toBeNull()
    const stopped = parseInfo('@@DOCKER@@\nalt|exited|Exited (0) 2 days ago|busybox\n@@DOCKEROK@@\n@@DSTATS@@\n', 1)
    expect(stopped.docker).toEqual([{ name: 'alt', image: 'busybox', state: 'exited', status: 'Exited (0) 2 days ago', cpuPercent: null, memBytes: null, memLimitBytes: null }])
  })
})

describe('MiniPcService (Raten und Geräteinfo)', () => {
  it('liefert Raten erst ab dem zweiten Abruf', async () => {
    const host = new FakeHost('mini-pc', '/home/alex')
    const outputs = [SYSTEM, SYSTEM.replace('wlp2s0: 19174602767', 'wlp2s0: 19174612767')]
    host.execHandler = () => ({ stdout: outputs.shift() ?? SYSTEM, stderr: '', code: 0 })
    const times = [0, 1_000, 10_000, 11_000]
    const service = new MiniPcService(() => host, () => times.shift() ?? 0)
    const first = await service.snapshot('mini-pc')
    const second = await service.snapshot('mini-pc')
    expect(first.system?.net[1]?.rxRate).toBeNull()
    expect(second.system?.net[1]?.rxRate).toBe(1_000)
    expect(second.system?.net[1]?.txRate).toBe(0)
  })

  it('fragt die Geräteinfo mit einem eigenen Skript ab', async () => {
    const host = new FakeHost('mini-pc', '/home/alex')
    let seen = ''
    host.execHandler = (command) => {
      seen = command
      return { stdout: INFO, stderr: '', code: 0 }
    }
    const info = await new MiniPcService(() => host, () => 5).info('mini-pc')
    expect(seen).toBe(infoScript())
    expect(seen).not.toBe(systemScript())
    expect(info.hostname).toBe('homeserver')
  })
})
