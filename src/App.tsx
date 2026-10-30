import { useState } from 'react'
import { ExercisePanel } from './components/ExercisePanel'
import { RangeSetup } from './components/RangeSetup'
import { SettingsPanel } from './components/SettingsPanel'
import { StatsPanel } from './components/StatsPanel'
import { noteName } from './music/notes'
import { useAppStore } from './store/useAppStore'

type View = 'exercise' | 'settings'

function App() {
  // Solo una vista a la vez: al salir del ejercicio se desmonta y suelta el micrófono,
  // así la calibración no compite con él.
  const [view, setView] = useState<View>('exercise')
  const range = useAppStore((s) => s.range)
  const settings = useAppStore((s) => s.settings)
  const recordAttempt = useAppStore((s) => s.recordAttempt)

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center gap-5 p-4 text-center sm:p-6">
      <header className="flex w-full items-center justify-between gap-3 pt-2">
        <div className="text-left">
          <h1 className="text-2xl font-bold sm:text-3xl">Entrenador de oído</h1>
          <p className="text-sm text-slate-600">
            Rango: {noteName(range.low, settings.notation)} – {noteName(range.high, settings.notation)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setView(view === 'exercise' ? 'settings' : 'exercise')}
          className="shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          {view === 'exercise' ? 'Ajustes' : 'Listo'}
        </button>
      </header>

      {view === 'exercise' ? (
        <>
          <ExercisePanel
            range={range}
            tolerance={settings.tolerance}
            holdMs={settings.holdMs}
            octaveMode={settings.octaveMode}
            notation={settings.notation}
            volume={settings.volume}
            onAttemptEnd={recordAttempt}
          />
          <StatsPanel notation={settings.notation} />
        </>
      ) : (
        <>
          <RangeSetup notation={settings.notation} />
          <SettingsPanel />
        </>
      )}
    </main>
  )
}

export default App
