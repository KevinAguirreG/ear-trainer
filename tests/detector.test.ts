import { describe, expect, it } from 'vitest'
import { BUFFER_SIZE, createDetector, rms } from '../src/pitch/detector'
import { centsBetween } from '../src/music/notes'

const SAMPLE_RATE = 44100

/** Tono tipo voz: fundamental más armónicos decrecientes. */
function voiceLike(freq: number, amplitude = 0.3, size = BUFFER_SIZE): Float32Array {
  const buf = new Float32Array(size)
  const harmonics = [1, 0.5, 0.3, 0.15]
  for (let i = 0; i < size; i++) {
    const t = i / SAMPLE_RATE
    let v = 0
    harmonics.forEach((a, h) => (v += a * Math.sin(2 * Math.PI * freq * (h + 1) * t)))
    buf[i] = (amplitude * v) / 1.95
  }
  return buf
}

/** Ruido pseudoaleatorio determinista. */
function noise(amplitude: number, size = BUFFER_SIZE): Float32Array {
  let seed = 12345
  const buf = new Float32Array(size)
  for (let i = 0; i < size; i++) {
    seed = (seed * 1103515245 + 12345) % 2 ** 31
    buf[i] = amplitude * ((seed / 2 ** 31) * 2 - 1)
  }
  return buf
}

describe('rms', () => {
  it('de una senoide de amplitud A es A/√2', () => {
    const buf = new Float32Array(SAMPLE_RATE)
    for (let i = 0; i < buf.length; i++) buf[i] = 0.5 * Math.sin((2 * Math.PI * 100 * i) / SAMPLE_RATE)
    expect(rms(buf)).toBeCloseTo(0.5 / Math.SQRT2, 3)
  })

  it('del silencio es 0', () => {
    expect(rms(new Float32Array(BUFFER_SIZE))).toBe(0)
  })
})

describe('createDetector', () => {
  const detect = createDetector()

  it.each([
    ['Mi2', 82.41],
    ['La2', 110],
    ['Re3', 146.83],
    ['La3', 220],
    ['La4', 440],
    ['Do6', 1046.5],
  ])('detecta %s (%f Hz) con error < 2 cents', (_, freq) => {
    const frame = detect(voiceLike(freq), SAMPLE_RATE)
    expect(frame).not.toBeNull()
    expect(Math.abs(centsBetween(frame!.freq, freq))).toBeLessThan(2)
    expect(frame!.clarity).toBeGreaterThan(0.9)
  })

  it('ignora el silencio', () => {
    expect(detect(new Float32Array(BUFFER_SIZE), SAMPLE_RATE)).toBeNull()
  })

  it('ignora un tono por debajo de la compuerta de volumen', () => {
    expect(detect(voiceLike(220, 0.005), SAMPLE_RATE)).toBeNull()
  })

  it('ignora ruido sin tono (claridad baja)', () => {
    expect(detect(noise(0.3), SAMPLE_RATE)).toBeNull()
  })

  it('ignora frecuencias fuera de 60–1200 Hz', () => {
    expect(detect(voiceLike(50), SAMPLE_RATE)).toBeNull()
    expect(detect(voiceLike(1500), SAMPLE_RATE)).toBeNull()
  })
})
