import { describe, expect, it } from 'vitest'
import type { Favorite, GitState, SystemStats, TempReading } from '@shared/types'
import { appendHistory, changeParts, fanStages, fanStagesText, favoriteForRepo, formatUptime, historyPoint, hottestTemp, meterTone, replaceRepo, tempLabel, tempTone, throttleText, usagePercent } from '../../src/renderer/src/lib/miniPc'

const repo = (path: string, over: Partial<GitState> = {}): GitState => ({
  path,
  name: path.split('/').pop() ?? path,
  branch: 'main',
  upstream: 'origin/main',
  ahead: 0,
  behind: 0,
  staged: 0,
  unstaged: 0,
  untracked: 0,
  error: null,
  ...over
})

describe('formatUptime', () => {
  it('zeigt Tage und Stunden', () => {
    expect(formatUptime(456_968)).toBe('5 T 6 Std.')
    expect(formatUptime(2 * 86_400)).toBe('2 T')
  })
  it('zeigt Stunden und Minuten unter einem Tag', () => {
    expect(formatUptime(3 * 3_600 + 12 * 60)).toBe('3 Std. 12 Min.')
    expect(formatUptime(3_600)).toBe('1 Std.')
    expect(formatUptime(59)).toBe('0 Min.')
  })
})

describe('usagePercent und meterTone', () => {
  it('rechnet Prozent und fängt 0 ab', () => {
    expect(usagePercent(1, 4)).toBe(25)
    expect(usagePercent(5, 0)).toBe(0)
    expect(usagePercent(9, 4)).toBe(100)
  })
  it('stuft hohe Auslastung ein', () => {
    expect(meterTone(40)).toBe('normal')
    expect(meterTone(85)).toBe('warn')
    expect(meterTone(95)).toBe('critical')
  })
})

describe('changeParts', () => {
  it('nennt nur vorhandene Änderungen', () => {
    expect(changeParts({ staged: 1, unstaged: 42, untracked: 3 })).toEqual(['1 vorgemerkt', '42 geändert', '3 neu'])
    expect(changeParts({ staged: 0, unstaged: 0, untracked: 0 })).toEqual([])
  })
})

describe('replaceRepo', () => {
  it('ersetzt den passenden Eintrag an gleicher Stelle', () => {
    const list = [repo('/a'), repo('/b'), repo('/c')]
    const next = replaceRepo(list, repo('/b', { behind: 3 }))
    expect(next.map((r) => r.path)).toEqual(['/a', '/b', '/c'])
    expect(next[1]?.behind).toBe(3)
  })
})

describe('favoriteForRepo', () => {
  const fav = (id: number, path: string): Favorite => ({
    id,
    host: 'mini-pc',
    path,
    name: `F${id}`,
    color: '#8fb573',
    sortOrder: id,
    createdAt: 0,
    categoryId: null,
    starred: false,
    icon: null
  })
  it('nimmt nur den Favoriten mit genau diesem Ordner', () => {
    const favorites = [fav(1, '/home/alex/projects'), fav(2, '/home/alex/projects/app/')]
    expect(favoriteForRepo(favorites, 'mini-pc', '/home/alex/projects/app')?.id).toBe(2)
    expect(favoriteForRepo(favorites, 'mini-pc', '/home/alex/projects/other')).toBeUndefined()
  })
})

describe('Verlauf und Temperaturen', () => {
  const temps: TempReading[] = [
    { chip: 'acpitz', label: '', celsius: 27.8, critCelsius: null },
    { chip: 'coretemp', label: 'Package id 0', celsius: 78, critCelsius: 100 }
  ]
  const system = {
    cpuPercent: 40,
    memUsed: 4,
    memTotal: 16,
    temps,
    powerWatts: 7,
    net: [
      { name: 'enp1s0', rxBytes: 0, txBytes: 0, rxRate: null, txRate: null },
      { name: 'wlp2s0', rxBytes: 1, txBytes: 1, rxRate: 300, txRate: 20 }
    ]
  } as unknown as SystemStats

  it('findet den wärmsten Fühler und stuft ihn am Grenzwert ein', () => {
    expect(hottestTemp(temps)?.label).toBe('Package id 0')
    expect(hottestTemp([])).toBeNull()
    expect(tempTone({ celsius: 78, critCelsius: 100 })).toBe('normal')
    expect(tempTone({ celsius: 85, critCelsius: 100 })).toBe('warn')
    expect(tempTone({ celsius: 95, critCelsius: null })).toBe('critical')
  })

  it('bildet aus einem Snapshot einen Messpunkt', () => {
    expect(historyPoint(system, 5)).toEqual({ at: 5, cpuPercent: 40, memPercent: 25, tempCelsius: 78, rxRate: 300, txRate: 20, powerWatts: 7 })
    expect(historyPoint({ ...system, net: [], temps: [] }, 5)).toMatchObject({ tempCelsius: null, rxRate: null, txRate: null })
  })

  it('begrenzt den Verlauf auf die neuesten Punkte', () => {
    const points = [1, 2, 3].map((at) => historyPoint(system, at))
    const next = appendHistory(points, historyPoint(system, 4), 3)
    expect(next.map((p) => p.at)).toEqual([2, 3, 4])
  })
})

describe('tempLabel', () => {
  it('übersetzt die Rohnamen der Fühler', () => {
    expect(tempLabel({ chip: 'coretemp', label: 'Package id 0' })).toBe('CPU gesamt')
    expect(tempLabel({ chip: 'coretemp', label: 'Core 0' })).toBe('Kern 1')
    expect(tempLabel({ chip: 'coretemp', label: 'Core 3' })).toBe('Kern 4')
    expect(tempLabel({ chip: 'pch_cannonlake', label: '' })).toBe('Chipsatz')
    expect(tempLabel({ chip: 'acpitz', label: '' })).toBe('Gehäuse')
    expect(tempLabel({ chip: 'drivetemp', label: '' })).toBe('SSD')
    expect(tempLabel({ chip: 'nvme', label: 'Composite' })).toBe('SSD')
  })
  it('zeigt unbekannte Fühler mit Chipnamen', () => {
    expect(tempLabel({ chip: 'iwlwifi_1', label: '' })).toBe('iwlwifi_1')
    expect(tempLabel({ chip: 'it8728', label: 'temp2' })).toBe('it8728 · temp2')
    expect(tempLabel({ chip: 'coretemp', label: 'Sonstiges' })).toBe('coretemp · Sonstiges')
  })
})

describe('Lüfterstufen und Drosselung', () => {
  const fan = (state: number): { type: string; state: number; maxState: number } => ({ type: 'Fan', state, maxState: 1 })
  it('fasst nur die ACPI-Lüfter zusammen', () => {
    const cooling = [{ type: 'Processor', state: 2, maxState: 3 }, fan(1), fan(1), fan(0), fan(0), fan(0)]
    expect(fanStages(cooling)).toEqual({ total: 5, active: 2 })
    expect(fanStages([{ type: 'Processor', state: 0, maxState: 3 }])).toBeNull()
  })
  it('beschreibt den Lüfter in Worten', () => {
    expect(fanStagesText({ total: 5, active: 0 })).toBe('Lüfter aus')
    expect(fanStagesText({ total: 5, active: 2 })).toBe('Lüfter läuft (2 von 5 Stufen)')
    expect(fanStagesText({ total: 1, active: 1 })).toBe('Lüfter läuft (1 von 1 Stufe)')
  })
  it('nennt die Hitzedrosselung', () => {
    expect(throttleText(0)).toBe('nie')
    expect(throttleText(3)).toBe('3-mal seit dem Start')
    expect(throttleText(null)).toBe('nicht gemeldet')
  })
})
