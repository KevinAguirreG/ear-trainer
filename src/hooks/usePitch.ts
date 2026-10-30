import { useCallback, useEffect, useRef, useState } from 'react'
import { ensureAudioRunning } from '../audio/audioContext'
import { MicError, startMicListener, type MicListener } from '../audio/micListener'
import { midiToFreq, freqToMidi } from '../music/notes'
import { createDetector } from '../pitch/detector'
import { createPitchSmoother } from '../pitch/smoothing'

export type MicStatus = 'idle' | 'starting' | 'listening' | 'error'

export interface PitchReading {
  /** MIDI continuo suavizado (ej. 57.12 = La3 + 12 cents). */
  midi: number
  freq: number
}

export interface UsePitch {
  status: MicStatus
  reading: PitchReading | null
  error: MicError | null
  /** Llamar desde un gesto del usuario (requisito de iOS para el AudioContext). */
  start: () => Promise<void>
  stop: () => void
}

/** Expone a la UI el pitch suavizado del micrófono. */
export function usePitch(): UsePitch {
  const [status, setStatus] = useState<MicStatus>('idle')
  const [reading, setReading] = useState<PitchReading | null>(null)
  const [error, setError] = useState<MicError | null>(null)
  const listener = useRef<MicListener | null>(null)

  const stop = useCallback(() => {
    listener.current?.stop()
    listener.current = null
    setStatus('idle')
    setReading(null)
  }, [])

  const start = useCallback(async () => {
    if (listener.current) return
    setError(null)
    setStatus('starting')
    try {
      const ctx = await ensureAudioRunning()
      const detect = createDetector()
      const smoother = createPitchSmoother()
      let lastMidi: number | null = null
      listener.current = await startMicListener(ctx, (buffer, sampleRate, timeMs) => {
        const frame = detect(buffer, sampleRate)
        const midi = smoother.push(frame ? freqToMidi(frame.freq) : null, timeMs)
        // Evitar renders cuando no cambia nada (silencio sostenido o lectura idéntica).
        if (midi === lastMidi) return
        lastMidi = midi
        setReading(midi === null ? null : { midi, freq: midiToFreq(midi) })
      })
      setStatus('listening')
    } catch (e) {
      setError(e instanceof MicError ? e : new MicError('unknown', String(e)))
      setStatus('error')
    }
  }, [])

  useEffect(() => stop, [stop])

  return { status, reading, error, start, stop }
}
