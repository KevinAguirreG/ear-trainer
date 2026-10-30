import { useStore } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'
import { DEFAULT_HOLD_OPTIONS } from '../exercise/holdEvaluator'
import type { Notation, OctaveMode } from '../music/notes'
import { DEFAULT_VOICE, isValidRange, VOICE_PRESETS, type NoteRange, type VoiceType } from '../music/voiceRanges'

export const TOLERANCE_OPTIONS = [15, 25, 35] as const
export const HOLD_OPTIONS_MS = [500, 1000, 1500] as const

export interface Settings {
  tolerance: number
  holdMs: number
  octaveMode: OctaveMode
  notation: Notation
  /** Volumen de la referencia, 0–1. */
  volume: number
}

/** De dónde salió el rango actual: un preset, la calibración con la voz o el ajuste manual. */
export type RangeSource = VoiceType | 'calibrated' | 'manual'

export interface PersistedState {
  range: NoteRange
  rangeSource: RangeSource
  settings: Settings
}

export interface AppState extends PersistedState {
  setPreset: (voice: VoiceType) => void
  setRange: (range: NoteRange, source: 'calibrated' | 'manual') => void
  updateSettings: (patch: Partial<Settings>) => void
}

export const DEFAULT_SETTINGS: Settings = {
  tolerance: DEFAULT_HOLD_OPTIONS.tolerance,
  holdMs: DEFAULT_HOLD_OPTIONS.holdMs,
  // Por nota es el modo por defecto para principiantes.
  octaveMode: 'pitchClass',
  notation: 'latin',
  volume: 0.5,
}

export const DEFAULT_STATE: PersistedState = {
  range: VOICE_PRESETS[DEFAULT_VOICE].range,
  rangeSource: DEFAULT_VOICE,
  settings: DEFAULT_SETTINGS,
}

function pick<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

/**
 * Valida lo leído de localStorage campo por campo: un valor corrupto o de una versión
 * vieja cae a su valor por defecto sin perder el resto.
 */
export function sanitizePersisted(raw: unknown): PersistedState {
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Record<keyof PersistedState, unknown>>
  const s = (typeof data.settings === 'object' && data.settings !== null ? data.settings : {}) as Record<string, unknown>
  const range = data.range as NoteRange | undefined
  const validRange = !!range && typeof range === 'object' && isValidRange(range)
  const sources: RangeSource[] = [...(Object.keys(VOICE_PRESETS) as VoiceType[]), 'calibrated', 'manual']

  return {
    range: validRange ? { low: range.low, high: range.high } : DEFAULT_STATE.range,
    rangeSource: validRange ? pick(data.rangeSource, sources, 'manual') : DEFAULT_STATE.rangeSource,
    settings: {
      tolerance: pick(s.tolerance, TOLERANCE_OPTIONS, DEFAULT_SETTINGS.tolerance),
      holdMs: pick(s.holdMs, HOLD_OPTIONS_MS, DEFAULT_SETTINGS.holdMs),
      octaveMode: pick(s.octaveMode, ['strict', 'pitchClass'] as const, DEFAULT_SETTINGS.octaveMode),
      notation: pick(s.notation, ['latin', 'english'] as const, DEFAULT_SETTINGS.notation),
      volume:
        typeof s.volume === 'number' && s.volume >= 0 && s.volume <= 1 ? s.volume : DEFAULT_SETTINGS.volume,
    },
  }
}

export const STORAGE_KEY = 'ear-trainer'

/** La fábrica recibe el storage para poder probar la persistencia con uno en memoria. */
export function createAppStore(getStorage: () => StateStorage = () => window.localStorage) {
  return createStore<AppState>()(
    persist(
      (set) => ({
        ...DEFAULT_STATE,
        setPreset: (voice) => set({ range: VOICE_PRESETS[voice].range, rangeSource: voice }),
        setRange: (range, source) => {
          if (isValidRange(range)) set({ range, rangeSource: source })
        },
        updateSettings: (patch) =>
          set((state) => ({ settings: sanitizePersisted({ ...state, settings: { ...state.settings, ...patch } }).settings })),
      }),
      {
        name: STORAGE_KEY,
        version: 1,
        storage: createJSONStorage(getStorage),
        partialize: ({ range, rangeSource, settings }): PersistedState => ({ range, rangeSource, settings }),
        merge: (persisted, current) => ({ ...current, ...sanitizePersisted(persisted) }),
      },
    ),
  )
}

export const appStore = createAppStore()

export function useAppStore<T>(selector: (state: AppState) => T): T {
  return useStore(appStore, selector)
}
