import { useEffect, useRef, useState } from 'react'
import { getAudioContext } from '../audio/audioContext'
import { createReferencePlayer, playChime } from '../audio/referencePlayer'
import { createHoldEvaluator, type AttemptSummary, type HoldEvaluator } from '../exercise/holdEvaluator'
import { usePitch, type PitchFrameHandler } from '../hooks/usePitch'
import { randomNoteInRange } from '../music/noteGenerator'
import { centsFromTarget, noteName, type Notation, type OctaveMode } from '../music/notes'
import type { NoteRange } from '../music/voiceRanges'
import { TunerNeedle } from './TunerNeedle'

const player = createReferencePlayer(getAudioContext)

/** Espera tras la referencia antes de escuchar, para que no se capte la reverberación del cuarto. */
const LISTEN_DELAY_MS = 150

/**
 * idle: sin nota. playing: suena la referencia. listening: evaluando lo que se canta.
 * success: nota acertada. free: afinador libre, sin objetivo.
 */
type Phase = 'idle' | 'playing' | 'listening' | 'success' | 'free'

export interface ExercisePanelProps {
  range: NoteRange
  tolerance: number
  holdMs: number
  octaveMode: OctaveMode
  notation: Notation
  volume: number
  /** Se llama al terminar un intento: acierto, o se pidió otra nota sin acertar. */
  onAttemptEnd?: (targetMidi: number, summary: AttemptSummary) => void
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function ExercisePanel({ range, tolerance, holdMs, octaveMode, notation, volume, onAttemptEnd }: ExercisePanelProps) {
  const [phase, setPhaseState] = useState<Phase>('idle')
  const [target, setTargetState] = useState<number | null>(null)
  const [holdProgress, setHoldProgress] = useState(0)

  // El manejador de frames corre fuera del ciclo de render; lee el estado actual de refs.
  const phaseRef = useRef<Phase>('idle')
  const targetRef = useRef<number | null>(null)
  const evaluator = useRef<HoldEvaluator | null>(null)
  // Cada reproducción incrementa el id; una reproducción vieja que termina no toca el estado.
  const runId = useRef(0)

  const setPhase = (p: Phase) => {
    phaseRef.current = p
    setPhaseState(p)
  }
  const setTarget = (m: number) => {
    targetRef.current = m
    setTargetState(m)
  }

  const pitch = usePitch(handleFrame)

  function handleFrame(...[reading, valid, timeMs]: Parameters<PitchFrameHandler>) {
    const goal = targetRef.current
    if (phaseRef.current !== 'listening' || goal === null || !evaluator.current) return
    const cents = valid && reading ? centsFromTarget(reading.freq, goal, octaveMode) : null
    const state = evaluator.current.push(cents, timeMs)
    setHoldProgress(state.progress)
    if (state.success) {
      setPhase('success')
      pitch.pause()
      void playChime(getAudioContext(), volume * 0.6)
      onAttemptEnd?.(goal, evaluator.current.summary())
    }
  }

  useEffect(
    () => () => {
      runId.current++
      player.stop()
    },
    [],
  )

  async function playAndListen(midi: number, listen: boolean) {
    const id = ++runId.current
    // Abrir el micrófono primero: la petición de permiso no debe interrumpir la referencia.
    const micReady = listen && (pitch.status === 'listening' || (await pitch.start()))
    if (id !== runId.current) return
    pitch.pause()
    evaluator.current?.interrupt()
    setHoldProgress(0)
    if (listen) setPhase('playing')
    await player.play(midi, { volume }).done
    if (!listen || id !== runId.current) return
    if (!micReady) {
      setPhase('idle')
      return
    }
    await sleep(LISTEN_DELAY_MS)
    if (id !== runId.current) return
    pitch.resume()
    setPhase('listening')
  }

  function newNote() {
    const previous = targetRef.current
    if (previous !== null && evaluator.current && (phaseRef.current === 'listening' || phaseRef.current === 'playing')) {
      onAttemptEnd?.(previous, evaluator.current.summary())
    }
    const next = randomNoteInRange(range, previous)
    setTarget(next)
    evaluator.current = createHoldEvaluator({ tolerance, holdMs })
    void playAndListen(next, true)
  }

  function repeat() {
    const goal = targetRef.current
    if (goal === null) return
    // Tras un acierto solo se vuelve a escuchar la referencia, sin evaluar.
    void playAndListen(goal, phaseRef.current !== 'success')
  }

  async function toggleFree() {
    runId.current++
    player.stop()
    if (phaseRef.current === 'free') {
      pitch.pause()
      setPhase(targetRef.current === null ? 'idle' : 'success')
      return
    }
    if (pitch.status !== 'listening' && !(await pitch.start())) return
    pitch.resume()
    setPhase('free')
  }

  const showPitch = phase === 'listening' || phase === 'free'
  const evaluating = phase === 'listening' || phase === 'success' || phase === 'playing'

  return (
    <section className="flex w-full flex-col items-center gap-5">
      <div className="text-center" aria-live="polite">
        <p className="text-sm uppercase tracking-wide text-slate-500">
          {phase === 'free' ? 'Afinador libre' : 'Nota objetivo'}
        </p>
        <p className="text-4xl font-bold text-indigo-700">
          {phase === 'free' || target === null ? '—' : noteName(target, notation)}
        </p>
        <p className={`mt-1 h-6 ${phase === 'success' ? 'font-semibold text-emerald-600' : 'text-slate-600'}`}>
          {STATUS_TEXT[phase]}
        </p>
      </div>

      <TunerNeedle
        freq={showPitch ? (pitch.reading?.freq ?? null) : null}
        targetMidi={phase === 'free' ? null : target}
        octaveMode={octaveMode}
        tolerance={tolerance}
        notation={notation}
        holdProgress={evaluating ? holdProgress : undefined}
      />

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={newNote}
          disabled={pitch.status === 'starting'}
          className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white shadow hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50"
        >
          Nueva nota
        </button>
        <button
          type="button"
          onClick={repeat}
          disabled={target === null || pitch.status === 'starting'}
          className="rounded-lg border border-indigo-200 bg-white px-5 py-3 font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50 disabled:opacity-40"
        >
          Repetir
        </button>
        <button
          type="button"
          onClick={toggleFree}
          disabled={pitch.status === 'starting'}
          className="rounded-lg border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
        >
          {phase === 'free' ? 'Salir del afinador' : 'Afinador libre'}
        </button>
      </div>

      {pitch.error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">
          {pitch.error.message}
        </p>
      )}
      <p className="text-sm text-slate-500">Usa audífonos con cable para que el micrófono no capte la referencia.</p>
    </section>
  )
}

const STATUS_TEXT: Record<Phase, string> = {
  idle: 'Pulsa "Nueva nota" para empezar.',
  playing: 'Escucha…',
  listening: 'Ahora canta y sostén la nota.',
  success: '¡Bien! Nota acertada.',
  free: 'Canta cualquier nota.',
}
