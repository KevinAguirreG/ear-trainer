import { describe, expect, it } from 'vitest'
import { createMedianFilter, createPitchSmoother, median } from '../src/pitch/smoothing'

describe('median', () => {
  it('impar y par', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
  })
})

describe('createMedianFilter', () => {
  it('un salto de octava aislado entre lecturas estables no cambia la mediana', () => {
    const filter = createMedianFilter(5)
    const outputs = [45, 45.1, 44.9, 45, 57 /* salto de octava */, 45.05, 45].map(filter.push)
    // A partir de tener la ventana estable, la salida nunca se aleja de La2.
    for (const out of outputs.slice(2)) expect(Math.abs(out - 45)).toBeLessThan(0.15)
  })

  it('usa solo las últimas N lecturas', () => {
    const filter = createMedianFilter(3)
    ;[1, 1, 1, 10, 10].forEach(filter.push)
    expect(filter.push(10)).toBe(10)
  })

  it('reset vacía la ventana', () => {
    const filter = createMedianFilter(5)
    ;[1, 1, 1].forEach(filter.push)
    filter.reset()
    expect(filter.push(7)).toBe(7)
  })
})

describe('createPitchSmoother', () => {
  it('mantiene la lectura durante huecos cortos', () => {
    const s = createPitchSmoother({ silenceMs: 250 })
    s.push(45, 0)
    s.push(45, 16)
    expect(s.push(null, 100)).toBe(45)
    expect(s.push(null, 266)).toBe(45)
  })

  it('reporta silencio tras un hueco largo y no mezcla la nota siguiente', () => {
    const s = createPitchSmoother({ silenceMs: 250 })
    for (let t = 0; t < 100; t += 16) s.push(45, t)
    expect(s.push(null, 400)).toBeNull()
    expect(s.push(57, 416)).toBe(57)
  })

  it('en silencio desde el inicio devuelve null', () => {
    const s = createPitchSmoother()
    expect(s.push(null, 0)).toBeNull()
    expect(s.push(null, 1000)).toBeNull()
  })
})
