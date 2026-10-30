import { describe, expect, it } from 'vitest'
import { randomNoteInRange } from '../src/music/noteGenerator'
import { VOICE_PRESETS } from '../src/music/voiceRanges'

describe('randomNoteInRange', () => {
  const range = VOICE_PRESETS.baritone.range

  it('nunca sale del rango y nunca repite la nota anterior', () => {
    let previous: number | null = null
    for (let i = 0; i < 2000; i++) {
      const note = randomNoteInRange(range, previous)
      expect(note).toBeGreaterThanOrEqual(range.low)
      expect(note).toBeLessThanOrEqual(range.high)
      expect(note).not.toBe(previous)
      previous = note
    }
  })

  it('alcanza ambos extremos del rango', () => {
    expect(randomNoteInRange(range, null, () => 0)).toBe(range.low)
    expect(randomNoteInRange(range, null, () => 0.999999)).toBe(range.high)
  })

  it('salta la nota anterior aunque el random caiga en ella', () => {
    expect(randomNoteInRange(range, range.low, () => 0)).toBe(range.low + 1)
    expect(randomNoteInRange(range, range.high, () => 0.999999)).toBe(range.high - 1)
  })

  it('con una sola nota en el rango la devuelve', () => {
    expect(randomNoteInRange({ low: 57, high: 57 }, 57)).toBe(57)
  })

  it('rechaza un rango invertido', () => {
    expect(() => randomNoteInRange({ low: 60, high: 50 })).toThrow(RangeError)
  })
})
