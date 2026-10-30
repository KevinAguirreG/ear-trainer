import { describe, expect, it } from 'vitest'
import { createHoldEvaluator } from '../src/exercise/holdEvaluator'

const FRAME = 16

/** Alimenta el evaluador con un valor constante durante `durationMs`, a ~60 fps. */
function feed(
  evaluator: ReturnType<typeof createHoldEvaluator>,
  cents: number | null,
  fromMs: number,
  durationMs: number,
): number {
  let t = fromMs
  for (; t < fromMs + durationMs; t += FRAME) evaluator.push(cents, t)
  return t
}

describe('createHoldEvaluator', () => {
  it('acierta al sostener 1 s dentro de tolerancia', () => {
    const e = createHoldEvaluator({ tolerance: 25, holdMs: 1000 })
    feed(e, 10, 0, 990)
    expect(e.state().success).toBe(false)
    feed(e, 10, 990, 40)
    expect(e.state().success).toBe(true)
    expect(e.state().progress).toBe(1)
  })

  it('el progreso avanza proporcionalmente', () => {
    const e = createHoldEvaluator({ holdMs: 1000 })
    feed(e, 0, 0, 512)
    expect(e.state().progress).toBeCloseTo(0.496, 2)
  })

  it('se reinicia al salir de tolerancia', () => {
    const e = createHoldEvaluator({ tolerance: 25, holdMs: 1000 })
    let t = feed(e, 5, 0, 800)
    e.push(40, t)
    expect(e.state().heldMs).toBe(0)
    t = feed(e, 5, t + FRAME, 800)
    expect(e.state().success).toBe(false)
    feed(e, 5, t, 250)
    expect(e.state().success).toBe(true)
  })

  it('tolera huecos de ≤150 ms sin reiniciar', () => {
    const e = createHoldEvaluator({ holdMs: 1000, maxGapMs: 150 })
    let t = feed(e, 0, 0, 600)
    const before = e.state().heldMs
    t = feed(e, null, t, 140)
    expect(e.state().heldMs).toBe(before)
    t = feed(e, 0, t, 500)
    expect(e.state().success).toBe(true)
  })

  it('el hueco tolerado no suma tiempo sostenido', () => {
    const e = createHoldEvaluator({ holdMs: 1000, maxGapMs: 150 })
    let t = feed(e, 0, 0, 500)
    const before = e.state().heldMs
    t = feed(e, null, t, 140)
    e.push(0, t)
    expect(e.state().heldMs).toBe(before)
  })

  it('se reinicia con un hueco de más de 150 ms', () => {
    const e = createHoldEvaluator({ holdMs: 1000, maxGapMs: 150 })
    const t = feed(e, 0, 0, 600)
    feed(e, null, t, 200)
    expect(e.state().heldMs).toBe(0)
  })

  it('una pausa larga entre frames afinados no cuenta como sostenido', () => {
    const e = createHoldEvaluator({ holdMs: 1000, maxGapMs: 150 })
    e.push(0, 0)
    e.push(0, 5000)
    expect(e.state().success).toBe(false)
    expect(e.state().heldMs).toBe(150)
  })

  it('después del acierto ignora los frames siguientes', () => {
    const e = createHoldEvaluator({ holdMs: 100 })
    const t = feed(e, 0, 0, 200)
    e.push(300, t)
    expect(e.state().success).toBe(true)
    // Acierta en el frame 8 (t = 112 ms ≥ 100 ms); los siguientes ya no cuentan.
    expect(e.summary().frames).toBe(8)
  })

  it('registra la desviación promedio del intento', () => {
    const e = createHoldEvaluator({ tolerance: 25 })
    e.push(-20, 0)
    e.push(10, 16)
    e.push(null, 32)
    e.push(-50, 48)
    const s = e.summary()
    expect(s.frames).toBe(3)
    expect(s.meanCents).toBeCloseTo(-20, 6)
    expect(s.meanAbsCents).toBeCloseTo(80 / 3, 6)
    expect(s.success).toBe(false)
  })

  it('sin frames válidos la desviación es null', () => {
    const e = createHoldEvaluator()
    e.push(null, 0)
    expect(e.summary()).toEqual({ success: false, frames: 0, meanCents: null, meanAbsCents: null })
  })

  it('interrupt reinicia el sostenido pero conserva las estadísticas', () => {
    const e = createHoldEvaluator({ holdMs: 1000, maxGapMs: 150 })
    let t = feed(e, 10, 0, 600)
    const frames = e.summary().frames
    e.interrupt()
    expect(e.state().heldMs).toBe(0)
    // El primer frame tras la interrupción no suma tiempo
    t += 2000
    e.push(10, t)
    expect(e.state().heldMs).toBe(0)
    expect(e.summary().frames).toBe(frames + 1)
  })
})
