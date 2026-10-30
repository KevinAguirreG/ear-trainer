import { describe, expect, it } from 'vitest'
import { createCalibrationCollector } from '../src/exercise/calibration'

const FRAME = 16

function feed(
  c: ReturnType<typeof createCalibrationCollector>,
  value: (t: number) => number | null,
  fromMs: number,
  durationMs: number,
) {
  let t = fromMs
  let state = c.push(null, t)
  for (; t < fromMs + durationMs; t += FRAME) state = c.push(value(t), t)
  return { t, state }
}

describe('createCalibrationCollector', () => {
  it('devuelve la nota de la mediana tras 1.5 s estables', () => {
    const c = createCalibrationCollector({ durationMs: 1500 })
    // Fa2 (41) con vibrato de ±30 cents
    const { state } = feed(c, (t) => 41 + 0.3 * Math.sin(t / 30), 0, 1520)
    expect(state.result).toBe(41)
    expect(state.progress).toBe(1)
  })

  it('no termina antes de 1.5 s', () => {
    const c = createCalibrationCollector({ durationMs: 1500 })
    const { state } = feed(c, () => 41, 0, 1400)
    expect(state.result).toBeNull()
    expect(state.progress).toBeGreaterThan(0.9)
  })

  it('un cambio de nota reinicia el tramo y se queda con la nota sostenida', () => {
    const c = createCalibrationCollector({ durationMs: 1500 })
    let { t } = feed(c, () => 45, 0, 1000)
    const after = feed(c, () => 43, t, 1000)
    t = after.t
    expect(after.state.result).toBeNull()
    expect(after.state.progress).toBeLessThan(0.7)
    const done = feed(c, () => 43, t, 600)
    expect(done.state.result).toBe(43)
  })

  it('tolera huecos cortos pero reinicia con uno largo', () => {
    const c = createCalibrationCollector({ durationMs: 1500, maxGapMs: 150 })
    let { t } = feed(c, () => 50, 0, 800)
    t = feed(c, () => null, t, 100).t
    expect(c.push(50, t).progress).toBeGreaterThan(0.5)
    t = feed(c, () => null, t + FRAME, 300).t
    expect(c.push(50, t).progress).toBe(0)
  })

  it('una lectura aislada fuera de la nota reinicia (la mediana del colector no la oculta)', () => {
    const c = createCalibrationCollector({ durationMs: 1500 })
    const { t } = feed(c, () => 50, 0, 800)
    expect(c.push(62, t).progress).toBe(0)
  })

  it('después del resultado ignora lo que sigue', () => {
    const c = createCalibrationCollector({ durationMs: 200 })
    const { t } = feed(c, () => 50, 0, 250)
    expect(c.push(70, t).result).toBe(50)
  })
})
