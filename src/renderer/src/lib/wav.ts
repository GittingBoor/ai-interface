const WAV_HEADER_BYTES = 44
const BYTES_PER_SAMPLE = 2
const PCM_FORMAT = 1
const MONO = 1
const INT16_MAX = 32767
const INT16_MIN = -32768
/** Effektivwert, unter dem eine Aufnahme als Stille gilt (Rauschen eines Headsets liegt bei ~0,003). */
export const SILENCE_RMS = 0.01

/** 16-Bit-PCM-WAV (Mono) aus Float-Samples im Bereich -1…1. */
export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const dataBytes = samples.length * BYTES_PER_SAMPLE
  const buffer = new ArrayBuffer(WAV_HEADER_BYTES + dataBytes)
  const view = new DataView(buffer)
  const ascii = (offset: number, value: string): void => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)))
  ascii(0, 'RIFF')
  view.setUint32(4, 36 + dataBytes, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, PCM_FORMAT, true)
  view.setUint16(22, MONO, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * BYTES_PER_SAMPLE * MONO, true)
  view.setUint16(32, BYTES_PER_SAMPLE * MONO, true)
  view.setUint16(34, BYTES_PER_SAMPLE * 8, true)
  ascii(36, 'data')
  view.setUint32(40, dataBytes, true)
  samples.forEach((sample, i) => {
    const clamped = Math.max(-1, Math.min(1, sample))
    view.setInt16(WAV_HEADER_BYTES + i * BYTES_PER_SAMPLE, clamped < 0 ? clamped * -INT16_MIN : clamped * INT16_MAX, true)
  })
  return new Uint8Array(buffer)
}

export function rms(samples: Float32Array): number {
  if (samples.length === 0) return 0
  let sum = 0
  for (const s of samples) sum += s * s
  return Math.sqrt(sum / samples.length)
}

/** 100 ms bei 16 kHz: kurze Sprache in langer Stille darf im Mittel nicht untergehen. */
const SILENCE_WINDOW_SAMPLES = 1_600
/** Mindestens 300 ms über der Schwelle, damit ein einzelner Knackser nicht als Sprache zählt. */
const MIN_VOICED_WINDOWS = 3

export function isSilent(samples: Float32Array): boolean {
  let voiced = 0
  for (let start = 0; start < samples.length; start += SILENCE_WINDOW_SAMPLES) {
    if (rms(samples.subarray(start, start + SILENCE_WINDOW_SAMPLES)) >= SILENCE_RMS) voiced++
    if (voiced >= MIN_VOICED_WINDOWS) return false
  }
  return true
}
