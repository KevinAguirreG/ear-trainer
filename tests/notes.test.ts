import { describe, expect, it } from 'vitest'
import {
  centsBetween,
  centsFromTarget,
  freqToMidi,
  midiToFreq,
  nearestMidi,
  noteName,
  parseNoteName,
  tuningZone,
} from '../src/music/notes'

describe('midiToFreq / freqToMidi', () => {
  it('La4 = MIDI 69 = 440 Hz', () => {
    expect(midiToFreq(69)).toBe(440)
    expect(freqToMidi(440)).toBe(69)
  })

  it('son inversas', () => {
    for (const m of [40, 45, 57.5, 60, 84]) {
      expect(freqToMidi(midiToFreq(m))).toBeCloseTo(m, 10)
    }
  })

  it('Do4 ≈ 261.63 Hz', () => {
    expect(midiToFreq(60)).toBeCloseTo(261.626, 3)
  })
})

describe('noteName', () => {
  it('440 Hz → MIDI 69 → La4', () => {
    const midi = nearestMidi(440)
    expect(midi).toBe(69)
    expect(noteName(midi)).toBe('La4')
  })

  it('110 Hz → La2', () => {
    expect(noteName(nearestMidi(110))).toBe('La2')
  })

  it('nomenclatura anglosajona', () => {
    expect(noteName(69, 'english')).toBe('A4')
    expect(noteName(61, 'english')).toBe('C#4')
  })

  it('Do4 es MIDI 60 y Si3 es MIDI 59', () => {
    expect(noteName(60)).toBe('Do4')
    expect(noteName(59)).toBe('Si3')
  })
})

describe('parseNoteName', () => {
  it('es inverso de noteName en ambas nomenclaturas', () => {
    for (let m = 21; m <= 108; m++) {
      expect(parseNoteName(noteName(m, 'latin'))).toBe(m)
      expect(parseNoteName(noteName(m, 'english'))).toBe(m)
    }
  })

  it('rechaza nombres inválidos', () => {
    expect(parseNoteName('Xy4')).toBeNull()
    expect(parseNoteName('La')).toBeNull()
  })
})

describe('cents', () => {
  it('445 Hz está ~+19.6 cents sobre La4', () => {
    expect(centsBetween(445, 440)).toBeCloseTo(19.56, 1)
    expect(centsFromTarget(445, 69, 'strict')).toBeCloseTo(19.56, 1)
  })

  it('modo estricto: una octava arriba son +1200 cents', () => {
    expect(centsFromTarget(220, 45, 'strict')).toBeCloseTo(1200, 6)
  })

  it('modo por nota: cantar La3 contra objetivo La2 da ~0 cents', () => {
    expect(centsFromTarget(220, 45, 'pitchClass')).toBeCloseTo(0, 6)
  })

  it('modo por nota: usa la octava más cercana a lo cantado', () => {
    // 445 Hz contra La2 (110 Hz): dos octavas abajo, mismo desvío que contra La4
    expect(centsFromTarget(445, 45, 'pitchClass')).toBeCloseTo(19.56, 1)
    // Sol#3 cantado contra La2: un semitono abajo de La3
    expect(centsFromTarget(midiToFreq(56), 45, 'pitchClass')).toBeCloseTo(-100, 6)
  })
})

describe('tuningZone', () => {
  it('verde dentro de tolerancia, amarillo hasta el doble, rojo más allá', () => {
    expect(tuningZone(25, 25)).toBe('in')
    expect(tuningZone(-10, 25)).toBe('in')
    expect(tuningZone(-40, 25)).toBe('near')
    expect(tuningZone(50, 25)).toBe('near')
    expect(tuningZone(51, 25)).toBe('far')
  })
})
