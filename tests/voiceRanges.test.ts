import { describe, expect, it } from 'vitest'
import { midiToFreq, noteName } from '../src/music/notes'
import {
  DEFAULT_VOICE,
  isValidRange,
  notesInRange,
  rangeFromCalibration,
  SELECTABLE_RANGE,
  VOICE_PRESETS,
} from '../src/music/voiceRanges'

describe('VOICE_PRESETS', () => {
  it('el preset por defecto es barítono, La2–La4 (110–440 Hz)', () => {
    const { range } = VOICE_PRESETS[DEFAULT_VOICE]
    expect(DEFAULT_VOICE).toBe('baritone')
    expect(noteName(range.low)).toBe('La2')
    expect(noteName(range.high)).toBe('La4')
    expect(midiToFreq(range.low)).toBeCloseTo(110, 6)
    expect(midiToFreq(range.high)).toBeCloseTo(440, 6)
  })

  it('coincide con la tabla de la especificación', () => {
    const expected = {
      bass: ['Mi2', 'Mi4'],
      baritone: ['La2', 'La4'],
      tenor: ['Do3', 'Do5'],
      contralto: ['Fa3', 'Fa5'],
      mezzo: ['La3', 'La5'],
      soprano: ['Do4', 'Do6'],
    }
    for (const [voice, [low, high]] of Object.entries(expected)) {
      const { range } = VOICE_PRESETS[voice as keyof typeof VOICE_PRESETS]
      expect([noteName(range.low), noteName(range.high)]).toEqual([low, high])
    }
  })

  it('cada preset abarca dos octavas', () => {
    for (const { range } of Object.values(VOICE_PRESETS)) {
      expect(notesInRange(range)).toHaveLength(25)
    }
  })
})

describe('rangeFromCalibration', () => {
  it('recorta un semitono por lado', () => {
    // Detectado Sol2 – Si4 → Sol#2 – La#4
    expect(rangeFromCalibration(43, 71)).toEqual({ low: 44, high: 70 })
  })

  it('acepta los extremos en orden inverso', () => {
    expect(rangeFromCalibration(71, 43)).toEqual({ low: 44, high: 70 })
  })

  it('limita a lo seleccionable en lugar de rechazar', () => {
    expect(rangeFromCalibration(30, 60)).toEqual({ low: SELECTABLE_RANGE.low, high: 59 })
    expect(rangeFromCalibration(60, 100)).toEqual({ low: 61, high: SELECTABLE_RANGE.high })
  })

  it('rechaza un rango demasiado estrecho', () => {
    // Misma nota dos veces, o apenas una tercera
    expect(rangeFromCalibration(57, 57)).toBeNull()
    expect(rangeFromCalibration(57, 61)).toBeNull()
    expect(rangeFromCalibration(57, 64)).toEqual({ low: 58, high: 63 })
  })
})

describe('isValidRange', () => {
  it('exige enteros, dentro de lo seleccionable y al menos una cuarta', () => {
    expect(isValidRange({ low: 45, high: 69 })).toBe(true)
    expect(isValidRange({ low: 45.5, high: 69 })).toBe(false)
    expect(isValidRange({ low: 30, high: 69 })).toBe(false)
    expect(isValidRange({ low: 60, high: 64 })).toBe(false)
    expect(isValidRange({ low: 69, high: 45 })).toBe(false)
  })
})
