import { isInRange, notesInRange, type NoteRange } from './voiceRanges'

/**
 * Elige una nota MIDI aleatoria dentro del rango, sin repetir `previous`.
 * Si el rango tiene una sola nota, la devuelve aunque sea la anterior.
 * `random` se inyecta para poder probarlo de forma determinista.
 */
export function randomNoteInRange(
  range: NoteRange,
  previous?: number | null,
  random: () => number = Math.random,
): number {
  if (range.low > range.high) throw new RangeError('Rango inválido: low > high')
  let candidates = notesInRange(range)
  if (previous != null && candidates.length > 1 && isInRange(previous, range)) {
    candidates = candidates.filter((m) => m !== previous)
  }
  const index = Math.min(Math.floor(random() * candidates.length), candidates.length - 1)
  return candidates[index]
}
