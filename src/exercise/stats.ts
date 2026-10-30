import type { AttemptSummary } from './holdEvaluator'

/** Acumulados de una nota objetivo. Se guardan sumas para poder promediar sin perder precisión. */
export interface NoteStats {
  attempts: number
  hits: number
  /** Intentos que tuvieron al menos un frame válido (los únicos que aportan desviación). */
  measured: number
  sumCents: number
  sumAbsCents: number
}

export interface Stats {
  attempts: number
  hits: number
  streak: number
  bestStreak: number
  /** Por nota objetivo en MIDI. */
  perNote: Record<number, NoteStats>
}

export const EMPTY_STATS: Stats = { attempts: 0, hits: 0, streak: 0, bestStreak: 0, perNote: {} }

const EMPTY_NOTE: NoteStats = { attempts: 0, hits: 0, measured: 0, sumCents: 0, sumAbsCents: 0 }

/** Registra un intento terminado. Inmutable: devuelve un objeto nuevo. */
export function recordAttempt(stats: Stats, targetMidi: number, summary: AttemptSummary): Stats {
  const note = stats.perNote[targetMidi] ?? EMPTY_NOTE
  const measured = summary.meanCents !== null && summary.meanAbsCents !== null
  const streak = summary.success ? stats.streak + 1 : 0
  return {
    attempts: stats.attempts + 1,
    hits: stats.hits + (summary.success ? 1 : 0),
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    perNote: {
      ...stats.perNote,
      [targetMidi]: {
        attempts: note.attempts + 1,
        hits: note.hits + (summary.success ? 1 : 0),
        measured: note.measured + (measured ? 1 : 0),
        sumCents: note.sumCents + (measured ? summary.meanCents! : 0),
        sumAbsCents: note.sumAbsCents + (measured ? summary.meanAbsCents! : 0),
      },
    },
  }
}

export interface NoteAccuracy {
  midi: number
  attempts: number
  hits: number
  /** 0–1. */
  hitRate: number
  /** Desviación promedio con signo (negativo = tiende a cantar bajo); null sin mediciones. */
  meanCents: number | null
  meanAbsCents: number | null
}

/** Precisión por nota, ordenada de grave a agudo. */
export function noteAccuracies(stats: Stats): NoteAccuracy[] {
  return Object.entries(stats.perNote)
    .map(([key, n]) => ({
      midi: Number(key),
      attempts: n.attempts,
      hits: n.hits,
      hitRate: n.attempts ? n.hits / n.attempts : 0,
      meanCents: n.measured ? n.sumCents / n.measured : null,
      meanAbsCents: n.measured ? n.sumAbsCents / n.measured : null,
    }))
    .sort((a, b) => a.midi - b.midi)
}

const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Valida estadísticas leídas de localStorage; descarta notas con datos inconsistentes. */
export function sanitizeStats(raw: unknown): Stats {
  if (typeof raw !== 'object' || raw === null) return EMPTY_STATS
  const r = raw as Record<string, unknown>
  const perNote: Record<number, NoteStats> = {}
  const notes = typeof r.perNote === 'object' && r.perNote !== null ? (r.perNote as Record<string, unknown>) : {}
  for (const [key, value] of Object.entries(notes)) {
    const midi = Number(key)
    const n = value as Record<string, unknown> | null
    if (!Number.isInteger(midi) || midi < 0 || midi > 127 || typeof n !== 'object' || n === null) continue
    if (![n.attempts, n.hits, n.measured].every(isCount) || ![n.sumCents, n.sumAbsCents].every(isNum)) continue
    const note = n as unknown as NoteStats
    if (note.hits > note.attempts || note.measured > note.attempts) continue
    perNote[midi] = { attempts: note.attempts, hits: note.hits, measured: note.measured, sumCents: note.sumCents, sumAbsCents: note.sumAbsCents }
  }
  const { attempts, hits, streak, bestStreak } = r
  if (![attempts, hits, streak, bestStreak].every(isCount)) return { ...EMPTY_STATS, perNote }
  return { attempts: attempts as number, hits: hits as number, streak: streak as number, bestStreak: bestStreak as number, perNote }
}
