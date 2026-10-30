/**
 * Conversiones entre números MIDI, frecuencias y nombres de nota.
 * Todo el cálculo se hace en MIDI (La4 = 69 = 440 Hz); los nombres son solo presentación.
 */

export const A4_MIDI = 69
export const A4_FREQ = 440

export type Notation = 'latin' | 'english'

/** strict: misma nota y octava. pitchClass: basta la misma clase de nota. */
export type OctaveMode = 'strict' | 'pitchClass'

const LATIN_NAMES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si']
const ENGLISH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/** f = 440 · 2^((m − 69) / 12) */
export function midiToFreq(midi: number): number {
  return A4_FREQ * 2 ** ((midi - A4_MIDI) / 12)
}

/** Nota MIDI continua: m = 69 + 12 · log2(f / 440) */
export function freqToMidi(freq: number): number {
  return A4_MIDI + 12 * Math.log2(freq / A4_FREQ)
}

/** Nota MIDI entera más cercana a una frecuencia. */
export function nearestMidi(freq: number): number {
  return Math.round(freqToMidi(freq))
}

/** cents = 1200 · log2(f_cantada / f_objetivo) */
export function centsBetween(freq: number, targetFreq: number): number {
  return 1200 * Math.log2(freq / targetFreq)
}

/**
 * Desviación en cents de una frecuencia cantada respecto a una nota objetivo.
 * En modo `pitchClass` se compara contra la octava del objetivo más cercana a lo cantado,
 * así que el resultado queda en [-600, 600].
 */
export function centsFromTarget(freq: number, targetMidi: number, mode: OctaveMode): number {
  const diff = freqToMidi(freq) - targetMidi
  if (mode === 'strict') return diff * 100
  const octaves = Math.round(diff / 12)
  return (diff - 12 * octaves) * 100
}

/** Clase de nota 0–11 (0 = Do). */
export function pitchClass(midi: number): number {
  return ((Math.round(midi) % 12) + 12) % 12
}

/** Octava en notación científica (La4 = 440 Hz, Do4 = MIDI 60). */
export function octaveOf(midi: number): number {
  return Math.floor(Math.round(midi) / 12) - 1
}

/** Nombre de nota con octava, ej. `La4` o `A4`. */
export function noteName(midi: number, notation: Notation = 'latin'): string {
  const names = notation === 'latin' ? LATIN_NAMES : ENGLISH_NAMES
  return `${names[pitchClass(midi)]}${octaveOf(midi)}`
}

/** Inverso de `noteName`: acepta `La4`, `Sol#2`, `A4`, `C#3`. Devuelve null si no es válido. */
export function parseNoteName(name: string): number | null {
  const match = /^([A-Za-z]+#?)(-?\d+)$/.exec(name.trim())
  if (!match) return null
  const [, note, octave] = match
  const normalized = note.charAt(0).toUpperCase() + note.slice(1).toLowerCase()
  let index = LATIN_NAMES.indexOf(normalized)
  if (index === -1) index = ENGLISH_NAMES.indexOf(normalized)
  if (index === -1) return null
  return (Number(octave) + 1) * 12 + index
}

/** Qué tan afinada está una lectura: dentro de tolerancia, cerca (hasta el doble) o lejos. */
export type TuningZone = 'in' | 'near' | 'far'

export function tuningZone(cents: number, tolerance: number): TuningZone {
  const abs = Math.abs(cents)
  if (abs <= tolerance) return 'in'
  if (abs <= tolerance * 2) return 'near'
  return 'far'
}
