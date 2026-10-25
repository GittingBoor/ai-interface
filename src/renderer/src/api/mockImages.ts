/** Galerie-Bilder für den Browser-Modus als SVG-Data-URLs (synthetische Beispiele). */
import { SeededRandom } from './mockData'

const toDataUrl = (svg: string): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

const frame = (w: number, h: number, bg: string, body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${bg}"/>${body}</svg>`

function dashboard(w: number, h: number): string {
  const r = new SeededRandom(11)
  const bars = Array.from({ length: 30 }, (_, i) => {
    const bh = r.between(40, 300)
    const bh2 = r.between(20, 160)
    const x = 360 + i * 38
    return `<rect x="${x}" y="${720 - bh}" width="24" height="${bh}" rx="4" fill="#4682cc"/><rect x="${x}" y="${720 - bh - bh2 - 3}" width="24" height="${bh2}" rx="4" fill="#52ab69"/>`
  }).join('')
  return frame(w, h, '#151311', `<rect width="300" height="${h}" fill="#0f0e0c"/>
${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="36" y="${120 + i * 56}" width="${i === 0 ? 200 : 150}" height="14" rx="7" fill="${i === 0 ? '#fb9344' : '#3d3a36'}"/>`).join('')}
<rect x="360" y="80" width="420" height="40" rx="6" fill="#f2f0ec" opacity="0.9"/>
${[0, 1, 2, 3].map((i) => `<rect x="${360 + i * 290}" y="160" width="250" height="90" rx="8" fill="#1e1b19"/><rect x="${384 + i * 290}" y="190" width="${120 + i * 20}" height="26" rx="5" fill="#bab7b2"/>`).join('')}
${bars}<line x1="360" y1="722" x2="1500" y2="722" stroke="#3d3a36" stroke-width="2"/>
<rect x="360" y="790" width="1140" height="160" rx="8" fill="#1e1b19"/>`)
}

function lineChart(w: number, h: number): string {
  const pts = Array.from({ length: 15 }, (_, i) => {
    const x = 120 + i * 70
    const y = 640 - Math.log(i + 1.4) * 190 - Math.sin(i) * 12
    return `${x},${y.toFixed(1)}`
  })
  const ptsOld = Array.from({ length: 15 }, (_, i) => `${120 + i * 70},${(650 - Math.log(i + 1.2) * 160).toFixed(1)}`)
  const grid = [0, 1, 2, 3, 4].map((i) => `<line x1="120" x2="1100" y1="${160 + i * 120}" y2="${160 + i * 120}" stroke="#e6e2da" stroke-width="2"/>`).join('')
  return frame(w, h, '#faf8f4', `${grid}
<polyline points="${ptsOld.join(' ')}" fill="none" stroke="#a39e96" stroke-width="5" stroke-linejoin="round"/>
<polyline points="${pts.join(' ')}" fill="none" stroke="#d9673a" stroke-width="6" stroke-linejoin="round"/>
<circle cx="${pts[14]?.split(',')[0]}" cy="${pts[14]?.split(',')[1]}" r="12" fill="#d9673a" stroke="#faf8f4" stroke-width="5"/>
<rect x="120" y="60" width="360" height="34" rx="6" fill="#2b2824"/><rect x="120" y="712" width="980" height="10" rx="5" fill="#e6e2da"/>`)
}

function network(w: number, h: number): string {
  const r = new SeededRandom(7)
  const nodes = Array.from({ length: 22 }, () => ({ x: r.between(90, w - 90), y: r.between(110, h - 110) }))
  const links = nodes
    .map((n, i) => {
      const m = nodes[(i * 7 + 3) % nodes.length] ?? n
      const k = nodes[(i + 1) % nodes.length] ?? n
      return `<line x1="${n.x}" y1="${n.y}" x2="${m.x}" y2="${m.y}" stroke="#5fb3a8" stroke-opacity="0.45" stroke-width="3"/><line x1="${n.x}" y1="${n.y}" x2="${k.x}" y2="${k.y}" stroke="#5fb3a8" stroke-opacity="0.25" stroke-width="2"/>`
    })
    .join('')
  const dots = nodes.map((n, i) => `<circle cx="${n.x}" cy="${n.y}" r="${i === 0 ? 30 : 14}" fill="${i === 0 ? '#e4b750' : '#8ed09c'}" stroke="#101c1a" stroke-width="6"/>`).join('')
  return frame(w, h, '#101c1a', `<rect x="40" y="40" width="${w - 80}" height="${h - 80}" rx="18" fill="none" stroke="#24403b" stroke-width="3"/>${links}${dots}`)
}

function swatches(w: number, h: number): string {
  const colors = ['#0f0e0c', '#151311', '#1e1b19', '#262320', '#3d3a36', '#8c8983', '#bab7b2', '#f2f0ec', '#fb9344', '#ef6661', '#e4b750', '#4682cc', '#52ab69', '#90baf1', '#8ed09c', '#b48df4']
  const cells = colors.map((c, i) => `<rect x="${80 + (i % 4) * 265}" y="${80 + Math.floor(i / 4) * 190}" width="245" height="170" rx="10" fill="${c}" stroke="#3d3a36" stroke-width="2"/>`).join('')
  return frame(w, h, '#0f0e0c', cells)
}

function phone(w: number, h: number): string {
  const rows = [0, 1, 2, 3, 4].map((i) => `<rect x="120" y="${640 + i * 130}" width="660" height="104" rx="14" fill="#ffffff"/><rect x="146" y="${666 + i * 130}" width="52" height="52" rx="10" fill="${['#c8102e', '#1d4f91', '#e4b750', '#52ab69', '#9b8ad8'][i]}"/><rect x="222" y="${672 + i * 130}" width="${320 - i * 25}" height="18" rx="9" fill="#26231f"/><rect x="222" y="${702 + i * 130}" width="220" height="12" rx="6" fill="#a39e96"/>`).join('')
  return frame(w, h, '#eef0f3', `<rect x="0" y="0" width="${w}" height="560" fill="#c8102e"/>
<rect x="120" y="140" width="520" height="56" rx="8" fill="#ffffff"/><rect x="120" y="226" width="380" height="30" rx="8" fill="#ffd9de"/>
<rect x="120" y="380" width="660" height="80" rx="40" fill="#ffffff"/>${rows}`)
}

function barChart(w: number, h: number): string {
  const r = new SeededRandom(3)
  const bars = Array.from({ length: 30 }, (_, i) => {
    const bh = r.between(120, 520)
    return `<rect x="${110 + i * 40}" y="${680 - bh}" width="26" height="${bh}" rx="5" fill="${i === 17 ? '#e4b750' : '#5c7f75'}"/>`
  }).join('')
  return frame(w, h, '#141a19', `<line x1="100" x2="1320" y1="682" y2="682" stroke="#2c3a37" stroke-width="3"/>${bars}<rect x="110" y="70" width="420" height="36" rx="6" fill="#dfe8e5"/>`)
}

function whiteboard(w: number, h: number): string {
  const box = (x: number, y: number, bw: number, color: string): string =>
    `<rect x="${x}" y="${y}" width="${bw}" height="120" rx="14" fill="none" stroke="${color}" stroke-width="7"/><path d="M${x + 30} ${y + 48} h${bw - 110} M${x + 30} ${y + 78} h${bw - 170}" stroke="#34302b" stroke-width="7" stroke-linecap="round"/>`
  const arrow = (x1: number, y1: number, x2: number, y2: number): string =>
    `<path d="M${x1} ${y1} Q${(x1 + x2) / 2 + 30} ${(y1 + y2) / 2 - 40} ${x2} ${y2}" fill="none" stroke="#34302b" stroke-width="6" stroke-linecap="round"/>`
  return frame(w, h, '#f1efe9', `${box(90, 110, 330, '#1d4f91')}${box(820, 110, 360, '#c8102e')}${box(430, 470, 420, '#2d7a45')}${box(90, 760, 300, '#34302b')}${box(860, 740, 330, '#1d4f91')}
${arrow(420, 170, 820, 170)}${arrow(260, 230, 520, 470)}${arrow(990, 230, 760, 470)}${arrow(560, 590, 280, 760)}${arrow(720, 590, 980, 740)}`)
}

const RENDERERS: Readonly<Record<number, (w: number, h: number) => string>> = {
  1: dashboard,
  2: lineChart,
  3: network,
  4: swatches,
  5: phone,
  6: barChart,
  7: whiteboard
}

export function mockGalleryImage(id: number, width: number, height: number): string {
  const render = RENDERERS[id] ?? dashboard
  return toDataUrl(render(width, height))
}

export function mockVaultImage(fileName: string): string {
  return fileName.includes('recall') ? toDataUrl(lineChart(1200, 800)) : toDataUrl(dashboard(1600, 1000))
}
