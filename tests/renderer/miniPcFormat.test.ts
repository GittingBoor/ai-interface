import { describe, expect, it } from 'vitest'
import { dockerStateText, dockerStatusText, formatClock, formatRate, linkStateText, shortAddress, sortAddresses } from '../../src/renderer/src/lib/miniPcFormat'
import { nearestIndex, trendDomain, trendSegments, trendStats } from '../../src/renderer/src/lib/trend'

describe('Formate', () => {
  it('schreibt Raten und Takt deutsch', () => {
    expect(formatRate(null)).toBe('–')
    expect(formatRate(1536)).toBe('1,5 KB/s')
    expect(formatClock(800)).toBe('800 MHz')
    expect(formatClock(2100)).toBe('2,1 GHz')
  })
})

describe('Adressen', () => {
  it('stellt IPv4 nach vorn', () => {
    expect(sortAddresses(['fe80::1/64', '192.168.1.20/24', '2001:db8::1/64'])).toEqual(['192.168.1.20/24', 'fe80::1/64', '2001:db8::1/64'])
  })
  it('kürzt nur lange IPv6-Adressen', () => {
    expect(shortAddress('192.168.1.20/24')).toBe('192.168.1.20/24')
    expect(shortAddress('fe80::1/64')).toBe('fe80::1/64')
    expect(shortAddress('2a02:8109:b6c0:1d00:7a3e:51ff:fe2b:9f3c/64')).toBe('2a02:8109:…:9f3c/64')
  })
  it('übersetzt den Zustand der Schnittstelle', () => {
    expect(linkStateText('UP')).toBe('verbunden')
    expect(linkStateText('DOWN')).toBe('getrennt')
    expect(linkStateText('TESTING')).toBe('TESTING')
  })
})

describe('Docker-Meldungen', () => {
  it('übersetzt Zustand und Statuszeile', () => {
    expect(dockerStateText('running')).toBe('läuft')
    expect(dockerStateText('exited')).toBe('gestoppt')
    expect(dockerStatusText('Up 12 hours')).toBe('seit 12 Std.')
    expect(dockerStatusText('Up 7 days (healthy)')).toBe('seit 7 Tg. · gesund')
    expect(dockerStatusText('Up About an hour')).toBe('seit etwa 1 Std.')
    expect(dockerStatusText('Exited (0) 2 days ago')).toBe('vor 2 Tg. beendet (Code 0)')
  })
  it('lässt Unbekanntes stehen', () => {
    expect(dockerStatusText('Restarting (1) 5 seconds ago')).toBe('Restarting (1) 5 seconds ago')
    expect(dockerStateText('seltsam')).toBe('seltsam')
  })
})

describe('Verlaufslinien', () => {
  it('ermittelt Kennwerte ohne Lücken', () => {
    expect(trendStats([null, 4, 9, null, 2])).toEqual({ min: 2, max: 9, count: 3 })
    expect(trendStats([null, null])).toBeNull()
    expect(trendStats([])).toBeNull()
  })
  it('teilt an Lücken in Abschnitte', () => {
    expect(trendSegments([1, 2, null, 3, null, null, 4, 5])).toEqual([[0, 1], [3], [6, 7]])
    expect(trendSegments([null])).toEqual([])
  })
  it('wählt einen ruhigen Wertebereich', () => {
    expect(trendDomain({ min: 4, max: 7, count: 2 }, { zeroBased: true, minSpan: 10 })).toEqual([0, 10])
    expect(trendDomain({ min: 20, max: 62, count: 2 }, { zeroBased: true, minSpan: 10 })).toEqual([0, 100])
    expect(trendDomain({ min: 51, max: 66, count: 2 }, { zeroBased: false, minSpan: 10 })).toEqual([45, 70])
    expect(trendDomain({ min: 58, max: 58, count: 2 }, { zeroBased: false, minSpan: 10 })).toEqual([55, 65])
    expect(trendDomain({ min: 0, max: 300 * 1024, count: 2 }, { zeroBased: true, minSpan: 1024, unitBase: 1024 })).toEqual([0, 400 * 1024])
  })
  it('findet den nächsten Messpunkt', () => {
    expect(nearestIndex([0, 10, 20], 14)).toBe(1)
    expect(nearestIndex([0, 10, 20], 99)).toBe(2)
    expect(nearestIndex([], 5)).toBeNull()
  })
})
