import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ensureAudioRunning } from '../audio/audioContext'
import { MicError, startMicListener, type MicListener } from '../audio/micListener'
import { midiToFreq, freqToMidi } from '../music/notes'
import { createDetector } from '../pitch/detector'
import { createPitchSmoother, type PitchSmoother } from '../pitch/smoothing'

export type MicStatus = 'idle' | 'starting' | 'listening' | 'error'

export interface PitchReading {
  /** MIDI continuo suavizado (ej. 57.12 = La3 + 12 cents). */
  midi: number
  freq: number
}

/**
 * Se llama en cada frame mientras se escucha. `reading` es la lectura suavizada
 * (se mantiene en huecos cortos); `valid` dice si este frame en particular tuvo pitch.
 */
export type PitchFrameHandler = (reading: PitchReading | null, valid: boolean, timeMs: number) => void

export interface UsePitch {
  status: MicStatus
  reading: PitchReading | null
  error: MicError | null
  /** Abre el micrófono. Llamar desde un gesto del usuario (requisito de iOS). Devuelve si quedó escuchando. */
  start: () => Promise<boolean>
  stop: () => void
  /** Deja el micrófono abierto pero ignora lo que entra (ej. mientras suena la referencia). */
  pause: () => void
  /** Vuelve a escuchar desde cero, sin mezclar lecturas de antes de la pausa. */
  resume: () => void
  paused: boolean
}

/** Expone a la UI el pitch suavizado del micrófono. */
export function usePitch(onFrame?: PitchFrameHandler): UsePitch {
  const [status, setStatus] = useState<MicStatus>('idle')
  const [reading, setReading] = useState<PitchReading | null>(null)
  const [error, setError] = useState<MicError | null>(null)
  const [paused, setPaused] = useState(false)
  const listener = useRef<MicListener | null>(null)
  const smoother = useRef<PitchSmoother | null>(null)
  const pausedRef = useRef(false)
  const onFrameRef = useRef(onFrame)
  useLayoutEffect(() => {
    onFrameRef.current = onFrame
  })

  const pause = useCallback(() => {
    pausedRef.current = true
    setPaused(true)
    setReading(null)
  }, [])

  const resume = useCallback(() => {
    smoother.current?.reset()
    pausedRef.current = false
    setPaused(false)
  }, [])

  const stop = useCallback(() => {
    listener.current?.stop()
    listener.current = null
    setStatus('idle')
    setReading(null)
  }, [])

  const start = useCallback(async () => {
    if (listener.current) return true
    setError(null)
    setStatus('starting')
    try {
      const ctx = await ensureAudioRunning()
      const detect = createDetector()
      smoother.current = createPitchSmoother()
      let lastMidi: number | null = null
      listener.current = await startMicListener(ctx, (buffer, sampleRate, timeMs) => {
        if (pausedRef.current) return
        const frame = detect(buffer, sampleRate)
        const midi = smoother.current!.push(frame ? freqToMidi(frame.freq) : null, timeMs)
        const next = midi === null ? null : { midi, freq: midiToFreq(midi) }
        onFrameRef.current?.(next, frame !== null, timeMs)
        // Evitar renders cuando no cambia nada (silencio sostenido o lectura idéntica).
        if (midi === lastMidi) return
        lastMidi = midi
        setReading(next)
      })
      setStatus('listening')
      return true
    } catch (e) {
      setError(e instanceof MicError ? e : new MicError('unknown', String(e)))
      setStatus('error')
      return false
    }
  }, [])

  useEffect(() => stop, [stop])

  return { status, reading, error, start, stop, pause, resume, paused }
}
