import { noteName } from './music/notes'
import { DEFAULT_VOICE, VOICE_PRESETS } from './music/voiceRanges'

function App() {
  const { label, range } = VOICE_PRESETS[DEFAULT_VOICE]

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-bold">Entrenador de oído</h1>
      <p className="text-slate-600">
        Rango por defecto: {label} ({noteName(range.low)} – {noteName(range.high)})
      </p>
    </main>
  )
}

export default App
