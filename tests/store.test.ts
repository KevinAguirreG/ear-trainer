import { describe, expect, it } from 'vitest'
import type { StateStorage } from 'zustand/middleware'
import {
  createAppStore,
  DEFAULT_SETTINGS,
  DEFAULT_STATE,
  sanitizePersisted,
  STORAGE_KEY,
} from '../src/store/useAppStore'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial }
  const storage: StateStorage = {
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v
    },
    removeItem: (k) => {
      delete data[k]
    },
  }
  return { data, storage }
}

describe('createAppStore', () => {
  it('arranca con barítono y los ajustes por defecto', () => {
    const store = createAppStore(() => memoryStorage().storage)
    const s = store.getState()
    expect(s.range).toEqual({ low: 45, high: 69 })
    expect(s.rangeSource).toBe('baritone')
    expect(s.settings).toEqual(DEFAULT_SETTINGS)
    expect(s.settings.octaveMode).toBe('pitchClass')
  })

  it('setPreset cambia rango y origen', () => {
    const store = createAppStore(() => memoryStorage().storage)
    store.getState().setPreset('tenor')
    expect(store.getState().range).toEqual({ low: 48, high: 72 })
    expect(store.getState().rangeSource).toBe('tenor')
  })

  it('setRange guarda un rango calibrado o manual e ignora uno inválido', () => {
    const store = createAppStore(() => memoryStorage().storage)
    store.getState().setRange({ low: 44, high: 70 }, 'calibrated')
    expect(store.getState().rangeSource).toBe('calibrated')
    store.getState().setRange({ low: 60, high: 62 }, 'manual')
    expect(store.getState().range).toEqual({ low: 44, high: 70 })
  })

  it('updateSettings aplica cambios válidos y descarta los inválidos', () => {
    const store = createAppStore(() => memoryStorage().storage)
    store.getState().updateSettings({ tolerance: 15, notation: 'english' })
    store.getState().updateSettings({ holdMs: 1234 })
    expect(store.getState().settings).toMatchObject({ tolerance: 15, notation: 'english', holdMs: 1000 })
  })

  it('ajustes y rango sobreviven a recargar', () => {
    const { storage, data } = memoryStorage()
    const first = createAppStore(() => storage)
    first.getState().setRange({ low: 44, high: 70 }, 'manual')
    first.getState().updateSettings({ tolerance: 35, holdMs: 1500, octaveMode: 'strict', volume: 0.8 })
    expect(JSON.parse(data[STORAGE_KEY]).state).not.toHaveProperty('setPreset')

    const reloaded = createAppStore(() => storage).getState()
    expect(reloaded.range).toEqual({ low: 44, high: 70 })
    expect(reloaded.rangeSource).toBe('manual')
    expect(reloaded.settings).toEqual({ ...DEFAULT_SETTINGS, tolerance: 35, holdMs: 1500, octaveMode: 'strict', volume: 0.8 })
  })

  it('datos corruptos en localStorage no rompen la app', () => {
    const { storage } = memoryStorage({ [STORAGE_KEY]: '{no es json' })
    expect(createAppStore(() => storage).getState().range).toEqual(DEFAULT_STATE.range)
  })
})

describe('estadísticas en el store', () => {
  const hit = { success: true, frames: 60, meanCents: 5, meanAbsCents: 8 }

  it('registra intentos, sobreviven a recargar y se pueden reiniciar', () => {
    const { storage } = memoryStorage()
    const first = createAppStore(() => storage)
    first.getState().recordAttempt(45, hit)
    first.getState().recordAttempt(45, { ...hit, success: false })
    const reloaded = createAppStore(() => storage)
    expect(reloaded.getState().stats).toMatchObject({ attempts: 2, hits: 1, streak: 0, bestStreak: 1 })
    expect(reloaded.getState().stats.perNote[45].attempts).toBe(2)
    reloaded.getState().resetStats()
    expect(createAppStore(() => storage).getState().stats.attempts).toBe(0)
  })

  it('una versión guardada sin estadísticas carga las demás cosas', () => {
    const { storage } = memoryStorage({
      [STORAGE_KEY]: JSON.stringify({ state: { range: { low: 44, high: 70 }, rangeSource: 'manual' }, version: 1 }),
    })
    const s = createAppStore(() => storage).getState()
    expect(s.range).toEqual({ low: 44, high: 70 })
    expect(s.stats.attempts).toBe(0)
  })
})

describe('sanitizePersisted', () => {
  it('cae a valores por defecto campo por campo', () => {
    const s = sanitizePersisted({
      range: { low: 50, high: 51 },
      rangeSource: 'calibrated',
      settings: { tolerance: 99, holdMs: 500, octaveMode: 'raro', notation: 'english', volume: 7 },
    })
    expect(s.range).toEqual(DEFAULT_STATE.range)
    expect(s.rangeSource).toBe(DEFAULT_STATE.rangeSource)
    expect(s.settings).toEqual({ ...DEFAULT_SETTINGS, holdMs: 500, notation: 'english' })
  })

  it('tolera null, arreglos y tipos incorrectos', () => {
    expect(sanitizePersisted(null)).toEqual(DEFAULT_STATE)
    expect(sanitizePersisted([1, 2])).toEqual(DEFAULT_STATE)
    expect(sanitizePersisted({ settings: 'x', range: 'y' })).toEqual(DEFAULT_STATE)
  })
})
