/** Beispieldaten für den Mini-PC-Bereich im Browser-Modus (`npm run dev:web`). */
import type { MiniPcInfo, SystemStats } from '@shared/types'

const GIB = 1024 ** 3
const MIB = 1024 ** 2
const KIB = 1024
const WAVE_MS = 60_000
const FAN_IDLE_BELOW_CELSIUS = 58

type SystemDetails = Omit<SystemStats, 'cpuPercent' | 'memTotal' | 'memUsed' | 'disks' | 'uptimeSec' | 'load' | 'cores'>

/** Wert, der gleichmäßig um `base` schwankt, damit der Verlauf im Browser-Modus sichtbar wird. */
function wave(base: number, spread: number, phase: number = 0): number {
  return base + Math.sin(Date.now() / WAVE_MS + phase) * spread + (Math.random() - 0.5) * spread * 0.4
}

let rxTotal = 19_174_602_767
let txTotal = 2_829_147_956

export function mockSystemDetails(): SystemDetails {
  const packageTemp = wave(58, 9)
  const rxRate = Math.max(0, wave(180 * KIB, 150 * KIB))
  const txRate = Math.max(0, wave(40 * KIB, 30 * KIB, 1))
  rxTotal += rxRate * 10
  txTotal += txRate * 10
  const fanOn = packageTemp >= FAN_IDLE_BELOW_CELSIUS ? 1 : 0
  return {
    corePercents: [wave(9, 6), wave(14, 9, 1), wave(5, 4, 2), wave(7, 5, 3)].map((v) => Math.max(0, v)),
    coreMhz: [wave(1800, 700), wave(2100, 800, 1), wave(1200, 300, 2), wave(1400, 400, 3)],
    governor: 'powersave',
    throttleCount: 0,
    memCached: 5.7 * GIB,
    swapTotal: 15.9 * GIB,
    swapUsed: 24 * MIB,
    temps: [
      { chip: 'coretemp', label: 'Package id 0', celsius: packageTemp, critCelsius: 100 },
      { chip: 'coretemp', label: 'Core 0', celsius: packageTemp - 3, critCelsius: 100 },
      { chip: 'coretemp', label: 'Core 1', celsius: packageTemp - 1, critCelsius: 100 },
      { chip: 'pch_cannonlake', label: '', celsius: wave(52, 2), critCelsius: null },
      { chip: 'acpitz', label: '', celsius: 27.8, critCelsius: null }
    ],
    fans: [],
    cooling: [
      ...[0, 1, 2, 3].map(() => ({ type: 'Processor', state: 0, maxState: 3 })),
      ...[0, 1, 2, 3, 4].map((i) => ({ type: 'Fan', state: i < 2 ? fanOn : 0, maxState: 1 })),
      { type: 'intel_powerclamp', state: 0, maxState: 100 }
    ],
    wifiPercent: 89,
    net: [
      { name: 'enp1s0', rxBytes: 0, txBytes: 0, rxRate: 0, txRate: 0 },
      { name: 'wlp2s0', rxBytes: rxTotal, txBytes: txTotal, rxRate, txRate }
    ],
    diskIo: [{ name: 'sda', readRate: Math.max(0, wave(20 * KIB, 20 * KIB)), writeRate: Math.max(0, wave(260 * KIB, 200 * KIB, 2)) }],
    processes: [
      { pid: 3299850, cpuPercent: 152, memBytes: 5.03 * GIB, command: 'uvicorn' },
      { pid: 1810099, cpuPercent: 0.8, memBytes: 169 * MIB, command: 'claude' },
      { pid: 3211565, cpuPercent: 0.7, memBytes: 258 * MIB, command: 'claude' },
      { pid: 779, cpuPercent: 0.5, memBytes: 0, command: 'irq/138-rtw89_pci' },
      { pid: 69741, cpuPercent: 0.3, memBytes: 52 * MIB, command: 'cloudflared' }
    ],
    processCount: 199,
    powerWatts: wave(6.5, 2.5)
  }
}

export const mockMiniPcInfo: Omit<MiniPcInfo, 'fetchedAt'> = {
  vendor: 'GMKtec',
  model: 'NucBox_G3 Pro',
  bios: '1.01 · 01/14/2026',
  os: 'Debian GNU/Linux 13 (trixie)',
  kernel: '6.12.107+deb13-amd64',
  hostname: 'homeserver',
  cpuModel: 'Intel(R) Core(TM) i3-10110U CPU @ 2.10GHz',
  cpuMaxMhz: 4100,
  drives: [{ name: 'sda', sizeBytes: 512_110_190_592, model: 'TWSC TSC10N512-H6Q10S' }],
  addresses: [
    { name: 'enp1s0', state: 'DOWN', addresses: [] },
    { name: 'wlp2s0', state: 'UP', addresses: ['192.168.1.20/24', '2001:db8::1/64', 'fe80::1/64'] }
  ],
  updates: 1,
  rebootRequired: false,
  failedUnits: [],
  users: 2,
  docker: [
    { name: 'musicrec-backend-1', image: 'musicrec-backend', state: 'running', status: 'Up 12 hours', cpuPercent: 39.74, memBytes: 4.64 * GIB, memLimitBytes: 6 * GIB },
    { name: 'musicrec-frontend-1', image: 'musicrec-frontend', state: 'running', status: 'Up 13 hours', cpuPercent: 0.09, memBytes: 6 * MIB, memLimitBytes: 256 * MIB },
    { name: 'musicrec-db-1', image: 'postgres:16', state: 'running', status: 'Up 7 days (healthy)', cpuPercent: 0.27, memBytes: 62 * MIB, memLimitBytes: 2 * GIB },
    { name: 'zigbee2mqtt', image: 'ghcr.io/koenkk/zigbee2mqtt:latest', state: 'running', status: 'Up 12 hours', cpuPercent: 0.03, memBytes: 76 * MIB, memLimitBytes: 15.51 * GIB },
    { name: 'mosquitto', image: 'eclipse-mosquitto:2', state: 'running', status: 'Up 5 days', cpuPercent: 0.06, memBytes: 3.7 * MIB, memLimitBytes: 15.51 * GIB },
    { name: 'homeassistant', image: 'ghcr.io/home-assistant/home-assistant:stable', state: 'running', status: 'Up 5 days', cpuPercent: 0.06, memBytes: 416 * MIB, memLimitBytes: 15.51 * GIB },
    { name: 'alter-test', image: 'busybox', state: 'exited', status: 'Exited (0) 2 days ago', cpuPercent: null, memBytes: null, memLimitBytes: null }
  ]
}
