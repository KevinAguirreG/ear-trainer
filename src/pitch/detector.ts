import { PitchDetector } from 'pitchy'

/** Tamaño del buffer de análisis; debe coincidir con `AnalyserNode.fftSize`. */
export const BUFFER_SIZE = 4096

export interface DetectorOptions {
  /** Compuerta de volumen: RMS mínimo para considerar el frame (silencio o ruido debajo). */
  minRms: number
  /** Claridad mínima de pitchy, 0–1. */
  minClarity: number
  minFreq: number
  maxFreq: number
}

export const DEFAULT_DETECTOR_OPTIONS: DetectorOptions = {
  minRms: 0.01,
  minClarity: 0.9,
  minFreq: 60,
  maxFreq: 1200,
}

export interface PitchFrame {
  freq: number
  clarity: number
  rms: number
}

/** Raíz del valor cuadrático medio de un buffer de audio. */
export function rms(buffer: ArrayLike<number>): number {
  let sum = 0
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i]
  return Math.sqrt(sum / buffer.length)
}

/**
 * Analiza un frame de audio en el dominio del tiempo. Devuelve null si el frame
 * no pasa la compuerta de volumen, la claridad o el rango de frecuencias.
 */
export type FrameDetector = (buffer: Float32Array, sampleRate: number) => PitchFrame | null

export function createDetector(
  bufferSize: number = BUFFER_SIZE,
  options: Partial<DetectorOptions> = {},
): FrameDetector {
  const { minRms, minClarity, minFreq, maxFreq } = { ...DEFAULT_DETECTOR_OPTIONS, ...options }
  const detector = PitchDetector.forFloat32Array(bufferSize)
  // La compuerta de volumen se aplica abajo con nuestro propio RMS. `clarityThreshold`
  // se deja en su valor por defecto: pitchy lo usa para elegir el pico (McLeod), no solo para filtrar.
  detector.minVolumeAbsolute = 0

  return (buffer, sampleRate) => {
    const level = rms(buffer)
    if (level < minRms) return null
    const [freq, clarity] = detector.findPitch(buffer, sampleRate)
    if (clarity < minClarity) return null
    if (freq < minFreq || freq > maxFreq) return null
    return { freq, clarity, rms: level }
  }
}
