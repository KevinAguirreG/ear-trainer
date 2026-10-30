import { noteAccuracies } from '../exercise/stats'
import { noteName, type Notation } from '../music/notes'
import { useAppStore } from '../store/useAppStore'

/** Desviaciones promedio menores a esto se consideran centradas. */
const CENTERED_CENTS = 5

function Tile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      {detail && <p className="text-xs text-slate-500 tabular-nums">{detail}</p>}
    </div>
  )
}

function describeDeviation(meanCents: number | null): string {
  if (meanCents === null) return 'sin datos'
  const rounded = Math.round(meanCents)
  if (Math.abs(meanCents) < CENTERED_CENTS) return `${rounded > 0 ? '+' : ''}${rounded} c · centrado`
  return `${rounded > 0 ? '+' : ''}${rounded} c · tiende ${meanCents < 0 ? 'bajo' : 'alto'}`
}

export function StatsPanel({ notation }: { notation: Notation }) {
  const stats = useAppStore((s) => s.stats)
  const resetStats = useAppStore((s) => s.resetStats)
  const notes = noteAccuracies(stats)
  const rate = stats.attempts ? Math.round((stats.hits / stats.attempts) * 100) : 0

  function reset() {
    if (window.confirm('¿Borrar todas las estadísticas? No se puede deshacer.')) resetStats()
  }

  return (
    <section className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Estadísticas</h2>
        {stats.attempts > 0 && (
          <button type="button" onClick={reset} className="text-sm font-semibold text-slate-500 hover:text-red-600">
            Reiniciar
          </button>
        )}
      </div>

      {stats.attempts === 0 ? (
        <p className="mt-2 text-slate-600">
          Aún no hay intentos. Pulsa <strong>Nueva nota</strong>, escucha y canta: aquí verás tus aciertos, tu racha y
          qué notas te cuestan más.
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Tile label="Aciertos" value={`${rate}%`} detail={`${stats.hits} de ${stats.attempts}`} />
            <Tile label="Racha" value={String(stats.streak)} />
            <Tile label="Mejor racha" value={String(stats.bestStreak)} />
          </div>

          <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-slate-500">Precisión por nota</h3>
          <ul className="mt-2 divide-y divide-slate-100">
            {notes.map((n) => (
              <li key={n.midi} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 py-2">
                <span className="font-semibold tabular-nums">{noteName(n.midi, notation)}</span>
                <div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-slate-100"
                    role="meter"
                    aria-label={`Acierto en ${noteName(n.midi, notation)}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(n.hitRate * 100)}
                  >
                    <div
                      className={`h-full rounded-full ${n.hitRate >= 0.7 ? 'bg-emerald-500' : n.hitRate >= 0.4 ? 'bg-amber-400' : 'bg-red-500'}`}
                      style={{ width: `${Math.max(n.hitRate * 100, 2)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500 tabular-nums">{describeDeviation(n.meanCents)}</p>
                </div>
                <span className="text-right text-sm tabular-nums text-slate-600">
                  {n.hits}/{n.attempts} · {Math.round(n.hitRate * 100)}%
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            La desviación es el promedio de lo cantado frente a la nota objetivo, en cents.
          </p>
        </>
      )}
    </section>
  )
}
