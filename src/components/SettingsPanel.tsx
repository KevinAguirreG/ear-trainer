import type { ReactNode } from 'react'
import { ensureAudioRunning, getAudioContext } from '../audio/audioContext'
import { createReferencePlayer } from '../audio/referencePlayer'
import { noteName } from '../music/notes'
import { HOLD_OPTIONS_MS, TOLERANCE_OPTIONS, useAppStore, type Settings } from '../store/useAppStore'

const player = createReferencePlayer(getAudioContext)

interface Option<T> {
  value: T
  label: string
}

function Segmented<T extends string | number>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string
  hint?: ReactNode
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
}) {
  return (
    <fieldset className="mt-5">
      <legend className="text-sm font-semibold uppercase tracking-wide text-slate-500">{label}</legend>
      <div className="mt-2 inline-flex flex-wrap rounded-lg border border-slate-200 bg-slate-50 p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={o.value === value}
            onClick={() => onChange(o.value)}
            className={`rounded-md px-3 py-1.5 font-medium ${
              o.value === value ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </fieldset>
  )
}

export function SettingsPanel() {
  const settings = useAppStore((s) => s.settings)
  const range = useAppStore((s) => s.range)
  const update = useAppStore((s) => s.updateSettings)
  const set = <K extends keyof Settings>(key: K) => (value: Settings[K]) => update({ [key]: value })

  // Para probar el volumen, una nota en medio del rango del usuario.
  const testNote = Math.round((range.low + range.high) / 2)

  async function testVolume() {
    await ensureAudioRunning()
    player.play(testNote, { volume: settings.volume })
  }

  return (
    <section className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm">
      <h2 className="text-xl font-bold">Ajustes</h2>

      <Segmented
        label="Tolerancia"
        value={settings.tolerance}
        options={TOLERANCE_OPTIONS.map((v) => ({ value: v, label: `±${v} cents` }))}
        onChange={set('tolerance')}
        hint="Menos cents es más exigente."
      />

      <Segmented
        label="Tiempo sostenido"
        value={settings.holdMs}
        options={HOLD_OPTIONS_MS.map((v) => ({ value: v, label: `${v / 1000} s` }))}
        onChange={set('holdMs')}
      />

      <Segmented
        label="Modo de octava"
        value={settings.octaveMode}
        options={[
          { value: 'pitchClass', label: 'Por nota' },
          { value: 'strict', label: 'Estricto' },
        ]}
        onChange={set('octaveMode')}
        hint={
          settings.octaveMode === 'pitchClass'
            ? 'Basta con cantar la misma nota en cualquier octava. Recomendado para empezar.'
            : 'Debes cantar la nota en la misma octava que la referencia.'
        }
      />

      <Segmented
        label="Nomenclatura"
        value={settings.notation}
        options={[
          { value: 'latin', label: 'Do, Re, Mi' },
          { value: 'english', label: 'C, D, E' },
        ]}
        onChange={set('notation')}
      />

      <fieldset className="mt-5">
        <legend className="text-sm font-semibold uppercase tracking-wide text-slate-500">Volumen de la referencia</legend>
        <div className="mt-2 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(settings.volume * 100)}
            onChange={(e) => update({ volume: Number(e.target.value) / 100 })}
            aria-label="Volumen de la referencia"
            className="w-full accent-indigo-600"
          />
          <span className="w-12 text-right tabular-nums text-slate-600">{Math.round(settings.volume * 100)}%</span>
          <button
            type="button"
            onClick={testVolume}
            className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            Probar {noteName(testNote, settings.notation)}
          </button>
        </div>
      </fieldset>

      <p className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        Usa audífonos con cable: evitan que el micrófono capte la referencia. Los audífonos Bluetooth agregan
        retraso al sonido y al micrófono.
      </p>
    </section>
  )
}
