import { describe, expect, it } from 'vitest'
import type { AttemptSummary } from '../src/exercise/holdEvaluator'
import { EMPTY_STATS, noteAccuracies, recordAttempt, sanitizeStats, type Stats } from '../src/exercise/stats'

const hit = (meanCents = 5, meanAbsCents = 8): AttemptSummary => ({ success: true, frames: 60, meanCents, meanAbsCents })
const miss = (meanCents = -40, meanAbsCents = 45): AttemptSummary => ({ success: false, frames: 90, meanCents, meanAbsCents })
const silent: AttemptSummary = { success: false, frames: 0, meanCents: null, meanAbsCents: null }

function run(...attempts: [number, AttemptSummary][]): Stats {
  return attempts.reduce((s, [midi, summary]) => recordAttempt(s, midi, summary), EMPTY_STATS)
}

describe('recordAttempt', () => {
  it('cuenta aciertos e intentos', () => {
    const s = run([45, hit()], [47, miss()], [45, hit()])
    expect(s.attempts).toBe(3)
    expect(s.hits).toBe(2)
  })

  it('lleva la racha actual y la máxima', () => {
    const s = run([45, hit()], [46, hit()], [47, hit()], [48, miss()], [49, hit()])
    expect(s.streak).toBe(1)
    expect(s.bestStreak).toBe(3)
  })

  it('no muta el objeto original', () => {
    const before = run([45, hit()])
    const copy = structuredClone(before)
    recordAttempt(before, 45, miss())
    expect(before).toEqual(copy)
  })
})

describe('noteAccuracies', () => {
  it('porcentaje de acierto y desviación promedio por nota, de grave a agudo', () => {
    const s = run([57, hit(10, 12)], [45, miss(-30, 35)], [57, miss(-20, 30)], [45, hit(-10, 15)])
    expect(noteAccuracies(s)).toEqual([
      { midi: 45, attempts: 2, hits: 1, hitRate: 0.5, meanCents: -20, meanAbsCents: 25 },
      { midi: 57, attempts: 2, hits: 1, hitRate: 0.5, meanCents: -5, meanAbsCents: 21 },
    ])
  })

  it('un intento sin frames cuenta como intento pero no como desviación', () => {
    const [a] = noteAccuracies(run([45, hit(10, 10)], [45, silent]))
    expect(a.attempts).toBe(2)
    expect(a.meanCents).toBe(10)
  })

  it('sin mediciones la desviación es null', () => {
    expect(noteAccuracies(run([45, silent]))[0].meanCents).toBeNull()
  })
})

describe('sanitizeStats', () => {
  it('conserva estadísticas válidas (ida y vuelta por JSON)', () => {
    const s = run([45, hit()], [57, miss()])
    expect(sanitizeStats(JSON.parse(JSON.stringify(s)))).toEqual(s)
  })

  it('descarta notas inconsistentes y totales inválidos', () => {
    const s = sanitizeStats({
      attempts: -1,
      hits: 0,
      streak: 0,
      bestStreak: 0,
      perNote: {
        45: { attempts: 1, hits: 2, measured: 1, sumCents: 0, sumAbsCents: 0 },
        57: { attempts: 2, hits: 1, measured: 2, sumCents: -10, sumAbsCents: 20 },
        abc: { attempts: 1, hits: 1, measured: 1, sumCents: 0, sumAbsCents: 0 },
      },
    })
    expect(Object.keys(s.perNote)).toEqual(['57'])
    expect(s.attempts).toBe(0)
  })

  it('tolera basura', () => {
    expect(sanitizeStats(null)).toEqual(EMPTY_STATS)
    expect(sanitizeStats('x')).toEqual(EMPTY_STATS)
  })
})
