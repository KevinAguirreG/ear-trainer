import { median } from '../pitch/smoothing'

/**
 * Detecta un extremo del rango vocal durante la calibración: espera ~1.5 s de lectura
 * estable y devuelve la nota MIDI de su mediana. El tiempo se inyecta para las pruebas.
 */

export interface CalibrationOptions {
  /** Duración de lectura estable necesaria. */
  durationMs: number
  /** Desviación máxima respecto a la mediana del tramo, en semitonos, para seguir siendo estable. */
  maxDeviation: number
  /** Huecos de hasta este tiempo no reinician el tramo. */
  maxGapMs: number
}

export const DEFAULT_CALIBRATION_OPTIONS: CalibrationOptions = { durationMs: 1500, maxDeviation: 0.5, maxGapMs: 150 }

export interface CalibrationState {
  /** 0–1 del tramo estable actual. */
  progress: number
  /** Nota MIDI detectada, una vez completo. */
  result: number | null
}

export interface CalibrationCollector {
  /** MIDI continuo del frame, o null si el frame fue inválido. */
  push: (midi: number | null, timeMs: number) => CalibrationState
}

export function createCalibrationCollector(options: Partial<CalibrationOptions> = {}): CalibrationCollector {
  const { durationMs, maxDeviation, maxGapMs } = { ...DEFAULT_CALIBRATION_OPTIONS, ...options }
  let segment: number[] = []
  let startedAt = 0
  let lastValidAt = 0
  let result: number | null = null
  let progress = 0

  const state = (): CalibrationState => ({ progress, result })

  function restart() {
    segment = []
    progress = 0
  }

  return {
    push(midi, timeMs) {
      if (result !== null) return state()

      if (midi === null) {
        if (segment.length && timeMs - lastValidAt > maxGapMs) restart()
        return state()
      }

      // Un cambio de nota (o un salto de octava sostenido) empieza un tramo nuevo.
      if (segment.length && Math.abs(midi - median(segment)) > maxDeviation) restart()
      if (!segment.length) startedAt = timeMs
      segment.push(midi)
      lastValidAt = timeMs

      progress = Math.min((timeMs - startedAt) / durationMs, 1)
      if (progress >= 1) result = Math.round(median(segment))
      return state()
    },
  }
}
