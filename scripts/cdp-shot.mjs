// Screenshot der laufenden App über den Remote-Debugging-Port. Nur für Tests.
import { writeFileSync } from 'node:fs'
const [port, file, expression = '0'] = process.argv.slice(2)
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
let id = 0
const call = (method, params = {}) =>
  new Promise((resolve) => {
    const my = ++id
    const h = (m) => { const msg = JSON.parse(m.data); if (msg.id === my) { ws.removeEventListener('message', h); resolve(msg.result) } }
    ws.addEventListener('message', h)
    ws.send(JSON.stringify({ id: my, method, params }))
  })
await call('Runtime.evaluate', { expression, awaitPromise: true })
await new Promise((r) => setTimeout(r, 1200))
const shot = await call('Page.captureScreenshot', { format: 'png' })
writeFileSync(file, Buffer.from(shot.data, 'base64'))
process.exit(0)
