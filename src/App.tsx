import { ExercisePanel } from './components/ExercisePanel'
import { DEFAULT_HOLD_OPTIONS } from './exercise/holdEvaluator'
import { noteName } from './music/notes'
import { DEFAULT_VOICE, VOICE_PRESETS } from './music/voiceRanges'

// Valores por defecto hasta que la Fase 5 agregue ajustes y rango vocal configurables.
const voice = VOICE_PRESETS[DEFAULT_VOICE]

function App() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-5 p-4 text-center sm:p-6">
      <h1 className="text-3xl font-bold">Entrenador de oído</h1>
      <p className="text-slate-600">
        Rango: {voice.label} ({noteName(voice.range.low)} – {noteName(voice.range.high)})
      </p>
      <ExercisePanel
        range={voice.range}
        tolerance={DEFAULT_HOLD_OPTIONS.tolerance}
        holdMs={DEFAULT_HOLD_OPTIONS.holdMs}
        octaveMode="pitchClass"
        notation="latin"
        volume={0.5}
      />
    </main>
  )
}

export default App
