import { centsFromTarget, nearestMidi, noteName, tuningZone, type Notation, type TuningZone } from '../music/notes'

interface TunerNeedleProps {
  /** Frecuencia detectada, o null en silencio. */
  freq: number | null
  /** Nota objetivo en MIDI. Sin objetivo, se mide contra la nota más cercana. */
  targetMidi?: number
  tolerance?: number
  notation?: Notation
}

const RANGE = 50

const ZONE_COLORS: Record<TuningZone, { bar: string; text: string }> = {
  in: { bar: 'bg-emerald-500', text: 'text-emerald-600' },
  near: { bar: 'bg-amber-400', text: 'text-amber-600' },
  far: { bar: 'bg-red-500', text: 'text-red-600' },
}

export function TunerNeedle({ freq, targetMidi, tolerance = 25, notation = 'latin' }: TunerNeedleProps) {
  const sungMidi = freq === null ? null : nearestMidi(freq)
  const reference = targetMidi ?? sungMidi
  const cents = freq === null || reference === null ? null : centsFromTarget(freq, reference, 'strict')
  const zone = cents === null ? null : tuningZone(cents, tolerance)
  const clamped = cents === null ? 0 : Math.max(-RANGE, Math.min(RANGE, cents))
  const position = ((clamped + RANGE) / (2 * RANGE)) * 100
  const tolerancePct = (tolerance / (2 * RANGE)) * 100

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-baseline justify-center gap-3" aria-live="polite">
        <span className={`text-6xl font-bold tabular-nums ${zone ? ZONE_COLORS[zone].text : 'text-slate-300'}`}>
          {sungMidi === null ? '—' : noteName(sungMidi, notation)}
        </span>
        <span className="text-lg text-slate-500 tabular-nums">{freq === null ? '' : `${freq.toFixed(1)} Hz`}</span>
      </div>

      <div className="relative mt-6 h-6 rounded-full bg-slate-100" role="meter" aria-label="Desviación en cents"
        aria-valuemin={-RANGE} aria-valuemax={RANGE} aria-valuenow={cents === null ? undefined : Math.round(cents)}>
        <div
          className="absolute inset-y-0 rounded-full bg-emerald-100"
          style={{ left: `${50 - tolerancePct}%`, width: `${2 * tolerancePct}%` }}
        />
        <div className="absolute inset-y-0 left-1/2 w-px bg-slate-400" />
        {zone && (
          <div
            className={`absolute -inset-y-1 w-2 -translate-x-1/2 rounded-full transition-[left] duration-75 ${ZONE_COLORS[zone].bar}`}
            style={{ left: `${position}%` }}
          />
        )}
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-400 tabular-nums">
        <span>-50</span>
        <span>0</span>
        <span>+50</span>
      </div>

      <p className={`mt-3 h-7 text-center text-lg font-semibold ${zone ? ZONE_COLORS[zone].text : ''}`}>
        {cents === null
          ? ''
          : zone === 'in'
            ? `✓ Afinado (${formatCents(cents)})`
            : cents < 0
              ? `↑ Sube (${formatCents(cents)})`
              : `↓ Baja (${formatCents(cents)})`}
      </p>
    </div>
  )
}

function formatCents(cents: number): string {
  const rounded = Math.round(cents)
  return `${rounded > 0 ? '+' : ''}${rounded} cents`
}
