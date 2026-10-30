import { midiToFreq } from '../music/notes'

/** Envolvente de la nota de referencia, en segundos. */
export interface EnvelopeOptions {
  attack: number
  release: number
  /** Duración total, incluyendo ataque y release. */
  duration: number
}

export const DEFAULT_ENVELOPE: EnvelopeOptions = { attack: 0.02, release: 0.15, duration: 1.2 }

/** Fade corto al cortar una nota antes de tiempo, para no producir clic. */
const STOP_FADE = 0.03
/** Margen para programar el inicio un poco en el futuro y no perder el ataque. */
const START_OFFSET = 0.01

export interface EnvelopePoints {
  start: number
  peakAt: number
  releaseAt: number
  end: number
}

/** Instantes clave de la envolvente (tiempo del AudioContext). Puro, para pruebas. */
export function envelopePoints(start: number, env: EnvelopeOptions = DEFAULT_ENVELOPE): EnvelopePoints {
  if (env.attack + env.release > env.duration) {
    throw new RangeError('attack + release no puede exceder la duración')
  }
  return {
    start,
    peakAt: start + env.attack,
    releaseAt: start + env.duration - env.release,
    end: start + env.duration,
  }
}

export interface PlayOptions {
  /** Ganancia pico, 0–1. */
  volume?: number
  envelope?: EnvelopeOptions
}

export interface PlayingNote {
  /** Se resuelve cuando la nota termina de sonar (completa o cortada). */
  done: Promise<void>
  stop: () => void
}

export interface ReferencePlayer {
  /** Toca una nota MIDI. Si ya hay otra sonando, la corta. */
  play: (midi: number, options?: PlayOptions) => PlayingNote
  /** Corta la nota actual, si hay. */
  stop: () => void
}

/**
 * Crea un reproductor sobre un contexto de audio. El contexto se inyecta para poder
 * usar el singleton en la app y un `OfflineAudioContext` o un doble en pruebas.
 */
export function createReferencePlayer(getContext: () => BaseAudioContext): ReferencePlayer {
  let current: PlayingNote | null = null

  function play(midi: number, { volume = 0.5, envelope = DEFAULT_ENVELOPE }: PlayOptions = {}): PlayingNote {
    current?.stop()

    const ctx = getContext()
    const peak = Math.min(Math.max(volume, 0), 1)
    const t = envelopePoints(ctx.currentTime + START_OFFSET, envelope)

    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = midiToFreq(midi)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, t.start)
    gain.gain.linearRampToValueAtTime(peak, t.peakAt)
    gain.gain.setValueAtTime(peak, t.releaseAt)
    gain.gain.linearRampToValueAtTime(0, t.end)

    osc.connect(gain)
    gain.connect(ctx.destination)

    let stopped = false
    const done = new Promise<void>((resolve) => {
      osc.onended = () => {
        osc.disconnect()
        gain.disconnect()
        if (current === note) current = null
        resolve()
      }
    })

    const stop = () => {
      if (stopped) return
      stopped = true
      const now = ctx.currentTime
      if (now >= t.end) return
      // Mantener el valor actual y bajar a 0 rápido: cortar en seco produce clic.
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(gain.gain.value, now)
      gain.gain.linearRampToValueAtTime(0, now + STOP_FADE)
      osc.stop(Math.max(now + STOP_FADE, t.start))
    }

    osc.start(t.start)
    osc.stop(t.end)

    const note: PlayingNote = { done, stop }
    current = note
    return note
  }

  return {
    play,
    stop: () => current?.stop(),
  }
}
