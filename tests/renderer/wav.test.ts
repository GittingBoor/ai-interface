import { describe, expect, it } from 'vitest'
import { encodeWav, isSilent, rms } from '../../src/renderer/src/lib/wav'

const text = (bytes: Uint8Array, from: number, to: number): string => String.fromCharCode(...bytes.slice(from, to))

describe('encodeWav', () => {
  it('schreibt einen 16-Bit-PCM-Mono-Header', () => {
    const wav = encodeWav(new Float32Array([0, 0.5, -0.5, 1]), 16_000)
    const view = new DataView(wav.buffer)
    expect(text(wav, 0, 4)).toBe('RIFF')
    expect(text(wav, 8, 12)).toBe('WAVE')
    expect(view.getUint32(4, true)).toBe(36 + 8)
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint32(24, true)).toBe(16_000)
    expect(view.getUint16(34, true)).toBe(16)
    expect(view.getUint32(40, true)).toBe(8)
    expect(wav.length).toBe(44 + 8)
  })

  it('begrenzt Werte außerhalb von -1…1', () => {
    const wav = encodeWav(new Float32Array([2, -2]), 16_000)
    const view = new DataView(wav.buffer)
    expect(view.getInt16(44, true)).toBe(32767)
    expect(view.getInt16(46, true)).toBe(-32768)
  })
})

describe('Stille', () => {
  it('erkennt Stille und leises Rauschen', () => {
    expect(isSilent(new Float32Array(16_000))).toBe(true)
    expect(isSilent(Float32Array.from({ length: 16_000 }, (_, i) => (i % 2 ? 0.002 : -0.002)))).toBe(true)
  })

  it('erkennt kurze leise Sprache in einer langen Aufnahme', () => {
    const samples = new Float32Array(60 * 16_000)
    for (let i = 0; i < 5 * 16_000; i++) samples[20 * 16_000 + i] = 0.042 * Math.sin(i / 10)
    expect(rms(samples)).toBeLessThan(0.01)
    expect(isSilent(samples)).toBe(false)
  })

  it('ein einzelner Knackser gilt nicht als Sprache', () => {
    const samples = new Float32Array(16_000)
    samples[8_000] = 0.9
    expect(isSilent(samples)).toBe(true)
  })

  it('erkennt Sprache', () => {
    const voice = Float32Array.from({ length: 16_000 }, (_, i) => 0.2 * Math.sin(i / 10))
    expect(rms(voice)).toBeGreaterThan(0.1)
    expect(isSilent(voice)).toBe(false)
  })
})
