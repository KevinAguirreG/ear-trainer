/**
 * Singleton del AudioContext. Se crea una sola vez, en el primer gesto del usuario,
 * y se reutiliza en toda la app (reproducción y micrófono).
 */

type AudioContextCtor = typeof AudioContext

let context: AudioContext | null = null

function getCtor(): AudioContextCtor {
  // Safari < 14.1 solo expone el constructor con prefijo.
  const w = window as typeof window & { webkitAudioContext?: AudioContextCtor }
  const Ctor = window.AudioContext ?? w.webkitAudioContext
  if (!Ctor) throw new Error('Este navegador no soporta Web Audio API')
  return Ctor
}

/**
 * Devuelve el AudioContext compartido, creándolo si no existe.
 * Llamar por primera vez dentro de un manejador de clic o toque (requisito de iOS).
 */
export function getAudioContext(): AudioContext {
  if (!context) context = new (getCtor())()
  return context
}

/**
 * Obtiene el contexto y lo reanuda si el navegador lo dejó suspendido.
 * `resume()` se invoca de forma síncrona, antes de cualquier `await` del llamador,
 * para que iOS lo considere parte del gesto del usuario.
 */
export async function ensureAudioRunning(): Promise<AudioContext> {
  const ctx = getAudioContext()
  // iOS puede dejarlo en 'interrupted' tras una llamada o al bloquear la pantalla.
  if (ctx.state !== 'running') await ctx.resume()
  return ctx
}
