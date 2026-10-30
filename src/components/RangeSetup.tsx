import { useRef, useState } from 'react'
import { createCalibrationCollector, type CalibrationCollector } from '../exercise/calibration'
import { usePitch, type PitchFrameHandler } from '../hooks/usePitch'
import { nearestMidi, noteName, type Notation } from '../music/notes'
import {
  MIN_RANGE_SEMITONES,
  rangeFromCalibration,
  SELECTABLE_RANGE,
  VOICE_PRESETS,
  notesInRange,
  type NoteRange,
  type VoiceType,
} from '../music/voiceRanges'
import { useAppStore, type RangeSource } from '../store/useAppStore'

/** Pausa entre el extremo grave y el agudo, para que la nota grave sostenida no cuente como aguda. */
const BETWEEN_STEPS_MS = 1200

type Step = 'off' | 'low' | 'between' | 'high' | 'review'

const SOURCE_LABEL: Record<RangeSource, string> = {
  ...(Object.fromEntries(Object.entries(VOICE_PRESETS).map(([k, v]) => [k, `Preset: ${v.label}`])) as Record<
    VoiceType,
    string
  >),
  calibrated: 'Calibrado con tu voz',
  manual: 'Ajustado a mano',
}

export function RangeSetup({ notation }: { notation: Notation }) {
  const range = useAppStore((s) => s.range)
  const rangeSource = useAppStore((s) => s.rangeSource)
  const setPreset = useAppStore((s) => s.setPreset)
  const setRange = useAppStore((s) => s.setRange)

  const name = (m: number) => noteName(m, notation)

  return (
    <section className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm">
      <h2 className="text-xl font-bold">Rango vocal</h2>
      <p className="mt-1 text-slate-600">
        <span className="font-semibold text-slate-900">
          {name(range.low)} – {name(range.high)}
        </span>{' '}
        · {SOURCE_LABEL[rangeSource]}
      </p>

      <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-slate-500">Tipo de voz</h3>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {(Object.entries(VOICE_PRESETS) as [VoiceType, (typeof VOICE_PRESETS)[VoiceType]][]).map(([key, preset]) => (
          <button
            key={key}
            type="button"
            onClick={() => setPreset(key)}
            aria-pressed={rangeSource === key}
            className={`rounded-lg border px-3 py-2 text-left ${
              rangeSource === key
                ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="block font-semibold">{preset.label}</span>
            <span className="block text-sm text-slate-500">
              {name(preset.range.low)} – {name(preset.range.high)}
            </span>
          </button>
        ))}
      </div>

      <Calibration notation={notation} onSave={(r) => setRange(r, 'calibrated')} />

      <ManualRange range={range} notation={notation} onChange={(r) => setRange(r, 'manual')} />
    </section>
  )
}

function Calibration({ notation, onSave }: { notation: Notation; onSave: (range: NoteRange) => void }) {
  const [step, setStepState] = useState<Step>('off')
  const [progress, setProgress] = useState(0)
  const [lowest, setLowest] = useState<number | null>(null)
  const [highest, setHighest] = useState<number | null>(null)
  const stepRef = useRef<Step>('off')
  const collector = useRef<CalibrationCollector | null>(null)

  const setStep = (s: Step) => {
    stepRef.current = s
    setStepState(s)
  }

  const pitch = usePitch(handleFrame)

  function handleFrame(...[reading, valid, timeMs]: Parameters<PitchFrameHandler>) {
    const current = stepRef.current
    if ((current !== 'low' && current !== 'high') || !collector.current) return
    const state = collector.current.push(valid && reading ? reading.midi : null, timeMs)
    setProgress(state.progress)
    if (state.result === null) return

    if (current === 'low') {
      setLowest(state.result)
      setStep('between')
      pitch.pause()
      setTimeout(() => {
        if (stepRef.current !== 'between') return
        collector.current = createCalibrationCollector()
        setProgress(0)
        pitch.resume()
        setStep('high')
      }, BETWEEN_STEPS_MS)
    } else {
      setHighest(state.result)
      setStep('review')
      pitch.stop()
    }
  }

  async function begin() {
    setLowest(null)
    setHighest(null)
    setProgress(0)
    collector.current = createCalibrationCollector()
    if (!(await pitch.start())) return
    pitch.resume()
    setStep('low')
  }

  function cancel() {
    pitch.stop()
    setStep('off')
  }

  const proposed = lowest !== null && highest !== null ? rangeFromCalibration(lowest, highest) : null
  const name = (m: number) => noteName(m, notation)
  const live = pitch.reading ? name(nearestMidi(pitch.reading.freq)) : '—'

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Calibrar con tu voz</h3>

      {step === 'off' && (
        <>
          <p className="mt-2 text-slate-600">
            Canta tu nota más grave cómoda y luego la más aguda. Se guarda el rango dejando un semitono de margen
            por lado.
          </p>
          <button
            type="button"
            onClick={begin}
            disabled={pitch.status === 'starting'}
            className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-50"
          >
            Calibrar
          </button>
        </>
      )}

      {(step === 'low' || step === 'between' || step === 'high') && (
        <div className="mt-3 rounded-xl bg-slate-50 p-4" aria-live="polite">
          <p className="font-semibold">
            {step === 'low' && '1/2 · Canta tu nota más grave cómoda y sostenla.'}
            {step === 'between' && `Grave: ${name(lowest!)}. Respira…`}
            {step === 'high' && '2/2 · Ahora tu nota más aguda cómoda, sostenla.'}
          </p>
          <p className="mt-2 text-4xl font-bold tabular-nums text-slate-800">{step === 'between' ? '' : live}</p>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-label="Lectura estable"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress * 100}%` }} />
          </div>
          <button type="button" onClick={cancel} className="mt-3 text-sm font-semibold text-slate-600 underline">
            Cancelar
          </button>
        </div>
      )}

      {step === 'review' && lowest !== null && highest !== null && (
        <div className="mt-3 rounded-xl bg-slate-50 p-4" aria-live="polite">
          <p>
            Detectado: <strong>{name(Math.min(lowest, highest))}</strong> a{' '}
            <strong>{name(Math.max(lowest, highest))}</strong>
          </p>
          {proposed ? (
            <p className="mt-1">
              Rango cómodo:{' '}
              <strong>
                {name(proposed.low)} – {name(proposed.high)}
              </strong>
            </p>
          ) : (
            <p className="mt-1 text-red-700">
              El rango detectado es demasiado estrecho (mínimo {MIN_RANGE_SEMITONES} semitonos). Inténtalo otra vez.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            {proposed && (
              <button
                type="button"
                onClick={() => {
                  onSave(proposed)
                  setStep('off')
                }}
                className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white shadow hover:bg-indigo-500"
              >
                Guardar
              </button>
            )}
            <button
              type="button"
              onClick={begin}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Repetir
            </button>
            <button type="button" onClick={() => setStep('off')} className="px-2 font-semibold text-slate-600">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {pitch.error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-red-700">
          {pitch.error.message}
        </p>
      )}
    </div>
  )
}

function ManualRange({
  range,
  notation,
  onChange,
}: {
  range: NoteRange
  notation: Notation
  onChange: (range: NoteRange) => void
}) {
  const options = notesInRange(SELECTABLE_RANGE)
  const select = 'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2'

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Ajuste manual</h3>
      <p className="mt-1 text-sm text-slate-500">Para usar el rango exacto que te indique tu maestro.</p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <label className="text-sm font-medium text-slate-700">
          Más grave
          <select
            className={select}
            value={range.low}
            onChange={(e) => onChange({ low: Number(e.target.value), high: range.high })}
          >
            {options
              .filter((m) => m <= range.high - MIN_RANGE_SEMITONES)
              .map((m) => (
                <option key={m} value={m}>
                  {noteName(m, notation)}
                </option>
              ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Más aguda
          <select
            className={select}
            value={range.high}
            onChange={(e) => onChange({ low: range.low, high: Number(e.target.value) })}
          >
            {options
              .filter((m) => m >= range.low + MIN_RANGE_SEMITONES)
              .map((m) => (
                <option key={m} value={m}>
                  {noteName(m, notation)}
                </option>
              ))}
          </select>
        </label>
      </div>
    </div>
  )
}
