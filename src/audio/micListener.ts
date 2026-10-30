import { BUFFER_SIZE } from '../pitch/detector'

/** Se llama en cada frame de animación con el audio más reciente del micrófono. */
export type FrameCallback = (buffer: Float32Array, sampleRate: number, timeMs: number) => void

export interface MicListener {
  stop: () => void
}

export type MicErrorKind = 'unsupported' | 'insecure' | 'denied' | 'no-device' | 'busy' | 'unknown'

export class MicError extends Error {
  readonly kind: MicErrorKind

  constructor(kind: MicErrorKind, message: string) {
    super(message)
    this.name = 'MicError'
    this.kind = kind
  }
}

function toMicError(e: unknown): MicError {
  const name = e instanceof DOMException ? e.name : ''
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return new MicError(
        'denied',
        'No hay permiso para usar el micrófono. Habilítalo desde el ícono junto a la barra de direcciones (o en Ajustes › Safari › Micrófono en iPhone) y vuelve a intentarlo.',
      )
    case 'NotFoundError':
    case 'OverconstrainedError':
      return new MicError('no-device', 'No se encontró ningún micrófono. Conecta uno y vuelve a intentarlo.')
    case 'NotSupportedError':
      return new MicError('unsupported', 'Este navegador no permite usar el micrófono. Prueba con Chrome o Safari actualizados.')
    case 'NotReadableError':
    case 'AbortError':
      return new MicError('busy', 'El micrófono está en uso por otra aplicación. Ciérrala y vuelve a intentarlo.')
    default:
      return new MicError('unknown', e instanceof Error ? e.message : 'No se pudo abrir el micrófono.')
  }
}

/**
 * Abre el micrófono y llama `onFrame` en cada `requestAnimationFrame` con el buffer
 * en el dominio del tiempo. El analizador no se conecta a la salida, así que no hay
 * retroalimentación. Lanza `MicError` con un mensaje listo para mostrar.
 */
export async function startMicListener(ctx: AudioContext, onFrame: FrameCallback): Promise<MicListener> {
  if (!window.isSecureContext) {
    throw new MicError('insecure', 'El micrófono solo funciona en HTTPS o en localhost.')
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new MicError('unsupported', 'Este navegador no permite usar el micrófono.')
  }

  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      // Los filtros del navegador distorsionan el pitch.
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    })
  } catch (e) {
    throw toMicError(e)
  }

  const source = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = BUFFER_SIZE
  source.connect(analyser)

  const buffer = new Float32Array(analyser.fftSize)
  let frameId = requestAnimationFrame(function tick(timeMs) {
    analyser.getFloatTimeDomainData(buffer)
    onFrame(buffer, ctx.sampleRate, timeMs)
    frameId = requestAnimationFrame(tick)
  })

  return {
    stop() {
      cancelAnimationFrame(frameId)
      source.disconnect()
      analyser.disconnect()
      for (const track of stream.getTracks()) track.stop()
    },
  }
}
