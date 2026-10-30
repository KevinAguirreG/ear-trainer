import { useRef, useState } from 'react'
import { ensureAudioRunning, getAudioContext } from './audio/audioContext'
import { createReferencePlayer } from './audio/referencePlayer'
import { TunerNeedle } from './components/TunerNeedle'
import { usePitch } from './hooks/usePitch'
import { noteName } from './music/notes'
import { DEFAULT_VOICE, VOICE_PRESETS } from './music/voiceRanges'

const player = createReferencePlayer(getAudioContext)

// Botón de prueba que toca La3 (Fase 2).
const TEST_NOTE = 57

function App() {
  const { label, range } = VOICE_PRESETS[DEFAULT_VOICE]
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Si se pulsa de nuevo, la nota anterior se corta; solo la última apaga el estado.
  const playId = useRef(0)
  const pitch = usePitch()
  const listening = pitch.status === 'listening'

  async function playTestNote() {
    setError(null)
    const id = ++playId.current
    try {
      await ensureAudioRunning()
      setPlaying(true)
      await player.play(TEST_NOTE).done
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo reproducir el audio')
    } finally {
      if (playId.current === id) setPlaying(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-5 p-4 text-center sm:p-6">
      <h1 className="text-3xl font-bold">Entrenador de oído</h1>
      <p className="text-slate-600">
        Rango por defecto: {label} ({noteName(range.low)} – {noteName(range.high)})
      </p>

      <TunerNeedle freq={listening ? (pitch.reading?.freq ?? null) : null} />

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={listening ? pitch.stop : pitch.start}
          disabled={pitch.status === 'starting'}
          className={`rounded-lg px-5 py-3 font-semibold text-white shadow disabled:opacity-50 ${
            listening ? 'bg-slate-600 hover:bg-slate-500' : 'bg-emerald-600 hover:bg-emerald-500'
          }`}
        >
          {listening ? 'Detener micrófono' : pitch.status === 'starting' ? 'Abriendo micrófono…' : 'Activar micrófono'}
        </button>
        <button
          type="button"
          onClick={playTestNote}
          className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white shadow hover:bg-indigo-500 active:bg-indigo-700"
        >
          {playing ? 'Sonando…' : `Tocar ${noteName(TEST_NOTE)}`}
        </button>
      </div>

      {listening && !pitch.reading && <p className="text-slate-500">Canta una nota…</p>}
      {pitch.error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">
          {pitch.error.message}
        </p>
      )}
      {error && <p className="text-red-600">{error}</p>}
    </main>
  )
}

export default App
