import { describe, expect, it } from 'vitest'
import { WhisperServer, type ServerProcess } from '../../src/main/speech/WhisperServer'
import { WhisperStartError } from '../../src/main/errors'

class FakeProcess implements ServerProcess {
  exited = false
  killed = false
  private listeners: ((code: number | null) => void)[] = []
  constructor(readonly args: readonly string[]) {}
  kill(): void {
    this.killed = true
    this.exit(null)
  }
  onExit(listener: (code: number | null) => void): void {
    this.listeners.push(listener)
  }
  exit(code: number | null): void {
    if (this.exited) return
    this.exited = true
    this.listeners.forEach((l) => l(code))
  }
}

/** `ready(args)` entscheidet je Start, ob der Server antwortet. */
function setup(ready: (args: readonly string[]) => boolean = () => true) {
  const spawned: FakeProcess[] = []
  let port = 50_000
  const server = new WhisperServer('C:/w/whisper-server.exe', {
    spawn: (_cmd, args) => {
      const p = new FakeProcess(args)
      spawned.push(p)
      if (!ready(args)) queueMicrotask(() => p.exit(1))
      return p
    },
    fetch: async () => {
      const current = spawned.at(-1)
      if (!current || current.exited || !ready(current.args)) throw new Error('ECONNREFUSED')
      return new Response('ok')
    },
    freePort: async () => ++port,
    sleep: async () => undefined,
    log: () => undefined,
    readyTimeoutMs: 1_000
  })
  return { server, spawned }
}

describe('WhisperServer', () => {
  it('startet einmal und gibt die URL zurück', async () => {
    const { server, spawned } = setup()
    expect(await server.url('m1.bin')).toBe('http://127.0.0.1:50001')
    expect(await server.url('m1.bin')).toBe('http://127.0.0.1:50001')
    expect(spawned).toHaveLength(1)
    expect(spawned[0]?.args).toEqual(['-m', 'm1.bin', '--host', '127.0.0.1', '--port', '50001', '-l', 'de'])
  })

  it('startet bei gleichzeitigen Aufrufen nur einen Prozess', async () => {
    const { server, spawned } = setup()
    await Promise.all([server.url('m1.bin'), server.url('m1.bin')])
    expect(spawned).toHaveLength(1)
  })

  it('startet bei Modellwechsel neu', async () => {
    const { server, spawned } = setup()
    await server.url('m1.bin')
    await server.url('m2.bin')
    expect(spawned).toHaveLength(2)
    expect(spawned[0]?.killed).toBe(true)
    expect(server.runningModel).toBe('m2.bin')
  })

  it('startet nach Absturz neu', async () => {
    const { server, spawned } = setup()
    await server.url('m1.bin')
    spawned[0]?.exit(3)
    await server.url('m1.bin')
    expect(spawned).toHaveLength(2)
  })

  it('fällt auf CPU zurück, wenn der GPU-Start scheitert', async () => {
    const { server, spawned } = setup((args) => args.includes('-ng'))
    await server.url('m1.bin')
    expect(spawned).toHaveLength(2)
    expect(spawned[1]?.args).toContain('-ng')
  })

  it('wirft WhisperStartError, wenn auch die CPU scheitert', async () => {
    const { server } = setup(() => false)
    await expect(server.url('m1.bin')).rejects.toBeInstanceOf(WhisperStartError)
  })

  it('stop beendet den Prozess', async () => {
    const { server, spawned } = setup()
    await server.url('m1.bin')
    server.stop()
    expect(spawned[0]?.killed).toBe(true)
    expect(server.runningModel).toBeNull()
  })
})

describe('WhisperServer – während des Starts', () => {
  /** Server wird erst bereit, wenn `ready.value` gesetzt ist. */
  function slow() {
    const ready = { value: false }
    const spawned: FakeProcess[] = []
    let port = 60_000
    const server = new WhisperServer('C:/w/whisper-server.exe', {
      spawn: (_cmd, args) => {
        const p = new FakeProcess(args)
        spawned.push(p)
        return p
      },
      fetch: async () => {
        const current = spawned.at(-1)
        if (!current || current.exited || !ready.value) throw new Error('ECONNREFUSED')
        return new Response('ok')
      },
      freePort: async () => ++port,
      sleep: () => new Promise((r) => setTimeout(r, 1)),
      log: () => undefined,
      readyTimeoutMs: 5_000
    })
    return { server, spawned, ready }
  }

  it('stop() beendet einen laufenden Start ohne CPU-Neuversuch', async () => {
    const s = slow()
    const pending = s.server.url('m1.bin')
    await new Promise((r) => setTimeout(r, 5))
    expect(s.server.runningModel).toBe('m1.bin')
    s.server.stop()
    await expect(pending).rejects.toBeInstanceOf(WhisperStartError)
    expect(s.spawned).toHaveLength(1)
    expect(s.spawned[0]?.killed).toBe(true)
    expect(s.server.runningModel).toBeNull()
  })

  it('Modellwechsel mit mehreren Wartenden startet genau einen neuen Prozess', async () => {
    const s = slow()
    const a = s.server.url('m1.bin')
    await new Promise((r) => setTimeout(r, 5))
    const b = s.server.url('m2.bin')
    const c = s.server.url('m2.bin')
    s.ready.value = true
    const [, urlB, urlC] = await Promise.all([a, b, c])
    expect(urlB).toBe(urlC)
    expect(s.spawned.map((p) => p.args[1])).toEqual(['m1.bin', 'm2.bin'])
    expect(s.spawned.filter((p) => !p.killed)).toHaveLength(1)
    expect(s.server.runningModel).toBe('m2.bin')
  })
})
