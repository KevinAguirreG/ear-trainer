/**
 * Lógica de acierto sostenido: el usuario debe mantener la nota dentro de la tolerancia
 * durante `holdMs` continuos. El tiempo se inyecta para poder probarlo sin navegador.
 */

export interface HoldOptions {
  /** Tolerancia en cents (|cents| ≤ tolerance cuenta como afinado). */
  tolerance: number
  /** Tiempo sostenido requerido para el acierto. */
  holdMs: number
  /** Huecos (frames inválidos) de hasta este tiempo no reinician el acumulador. */
  maxGapMs: number
}

export const DEFAULT_HOLD_OPTIONS: HoldOptions = { tolerance: 25, holdMs: 1000, maxGapMs: 150 }

export interface HoldState {
  heldMs: number
  /** 0–1, para la barra de progreso. */
  progress: number
  success: boolean
}

export interface AttemptSummary {
  success: boolean
  /** Frames válidos analizados durante el intento. */
  frames: number
  /** Desviación promedio con signo (negativo = tiende a cantar bajo). Null si no hubo frames. */
  meanCents: number | null
  /** Desviación promedio absoluta. Null si no hubo frames. */
  meanAbsCents: number | null
}

export interface HoldEvaluator {
  /**
   * Agrega un frame: desviación en cents respecto al objetivo, o null si el frame fue
   * inválido (silencio, ruido, claridad baja). Después del acierto ya no cambia nada.
   */
  push: (cents: number | null, timeMs: number) => HoldState
  state: () => HoldState
  /** Reinicia el sostenido sin borrar las estadísticas (ej. al repetir la referencia). */
  interrupt: () => void
  summary: () => AttemptSummary
}

export function createHoldEvaluator(options: Partial<HoldOptions> = {}): HoldEvaluator {
  const { tolerance, holdMs, maxGapMs } = { ...DEFAULT_HOLD_OPTIONS, ...options }

  let heldMs = 0
  let success = false
  // Último frame dentro de tolerancia; null si el acumulador está en cero.
  let lastInAt: number | null = null
  // El frame anterior también estaba dentro de tolerancia (sin hueco de por medio).
  let previousWasIn = false
  let frames = 0
  let sumCents = 0
  let sumAbsCents = 0

  const state = (): HoldState => ({ heldMs, progress: Math.min(heldMs / holdMs, 1), success })

  function reset() {
    heldMs = 0
    lastInAt = null
    previousWasIn = false
  }

  function push(cents: number | null, timeMs: number): HoldState {
    if (success) return state()

    if (cents === null) {
      previousWasIn = false
      if (lastInAt !== null && timeMs - lastInAt > maxGapMs) reset()
      return state()
    }

    frames++
    sumCents += cents
    sumAbsCents += Math.abs(cents)

    if (Math.abs(cents) > tolerance) {
      reset()
      return state()
    }

    // Solo cuenta el tiempo entre frames afinados consecutivos; el hueco tolerado no suma.
    // El tope evita que una pausa larga del rAF (pestaña en segundo plano) cuente como sostenido.
    if (previousWasIn && lastInAt !== null) heldMs += Math.min(timeMs - lastInAt, maxGapMs)
    lastInAt = timeMs
    previousWasIn = true
    if (heldMs >= holdMs) success = true
    return state()
  }

  return {
    push,
    state,
    interrupt: () => {
      if (!success) reset()
    },
    summary: () => ({
      success,
      frames,
      meanCents: frames ? sumCents / frames : null,
      meanAbsCents: frames ? sumAbsCents / frames : null,
    }),
  }
}
