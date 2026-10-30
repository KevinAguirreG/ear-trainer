/** Mediana de un arreglo no vacío. */
export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export interface MedianFilter {
  /** Agrega una lectura y devuelve la mediana de las últimas `size`. */
  push: (value: number) => number
  reset: () => void
}

/**
 * Mediana móvil. Elimina saltos de octava aislados y suaviza el vibrato.
 * Conviene alimentarla con MIDI continuo (escala logarítmica) y no con Hz.
 */
export function createMedianFilter(size = 5): MedianFilter {
  let window: number[] = []
  return {
    push(value) {
      window.push(value)
      if (window.length > size) window.shift()
      return median(window)
    },
    reset() {
      window = []
    },
  }
}

export interface PitchSmoother {
  /**
   * Agrega una lectura (MIDI continuo, o null si el frame fue inválido) en el instante
   * `timeMs` y devuelve el pitch suavizado, o null si lleva demasiado tiempo en silencio.
   */
  push: (midi: number | null, timeMs: number) => number | null
  reset: () => void
}

export interface SmootherOptions {
  windowSize: number
  /** Tras este tiempo sin lecturas válidas se limpia la mediana y se reporta silencio. */
  silenceMs: number
}

export const DEFAULT_SMOOTHER_OPTIONS: SmootherOptions = { windowSize: 5, silenceMs: 250 }

/**
 * Mediana móvil con tolerancia a huecos: los frames inválidos aislados (consonantes,
 * ruido) mantienen la última lectura; un silencio largo la borra para que la siguiente
 * nota no se mezcle con la anterior.
 */
export function createPitchSmoother(options: Partial<SmootherOptions> = {}): PitchSmoother {
  const { windowSize, silenceMs } = { ...DEFAULT_SMOOTHER_OPTIONS, ...options }
  const filter = createMedianFilter(windowSize)
  let last: number | null = null
  let lastValidAt = -Infinity

  return {
    push(midi, timeMs) {
      if (midi !== null) {
        lastValidAt = timeMs
        last = filter.push(midi)
      } else if (last !== null && timeMs - lastValidAt > silenceMs) {
        filter.reset()
        last = null
      }
      return last
    },
    reset() {
      filter.reset()
      last = null
      lastValidAt = -Infinity
    },
  }
}
