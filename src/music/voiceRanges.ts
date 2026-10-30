/** Presets de rango vocal en números MIDI. La calibración personal tiene prioridad sobre estos valores. */

export interface NoteRange {
  low: number
  high: number
}

export type VoiceType = 'bass' | 'baritone' | 'tenor' | 'contralto' | 'mezzo' | 'soprano'

export interface VoicePreset {
  label: string
  range: NoteRange
}

export const VOICE_PRESETS: Record<VoiceType, VoicePreset> = {
  bass: { label: 'Bajo', range: { low: 40, high: 64 } }, // Mi2 – Mi4
  baritone: { label: 'Barítono', range: { low: 45, high: 69 } }, // La2 – La4
  tenor: { label: 'Tenor', range: { low: 48, high: 72 } }, // Do3 – Do5
  contralto: { label: 'Contralto', range: { low: 53, high: 77 } }, // Fa3 – Fa5
  mezzo: { label: 'Mezzosoprano', range: { low: 57, high: 81 } }, // La3 – La5
  soprano: { label: 'Soprano', range: { low: 60, high: 84 } }, // Do4 – Do6
}

export const DEFAULT_VOICE: VoiceType = 'baritone'

export function isInRange(midi: number, range: NoteRange): boolean {
  return midi >= range.low && midi <= range.high
}

/** Todas las notas MIDI del rango, inclusive. */
export function notesInRange(range: NoteRange): number[] {
  const notes: number[] = []
  for (let m = range.low; m <= range.high; m++) notes.push(m)
  return notes
}
