import { describe, expect, it } from 'vitest'
import { midiToFreq, noteName } from '../src/music/notes'
import { DEFAULT_VOICE, VOICE_PRESETS, notesInRange } from '../src/music/voiceRanges'

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
