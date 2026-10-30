import { describe, expect, it } from 'vitest'
import { createReferencePlayer, DEFAULT_ENVELOPE, envelopePoints } from '../src/audio/referencePlayer'

describe('envelopePoints', () => {
  it('ataque de 20 ms, release de 150 ms, 1.2 s en total', () => {
    const t = envelopePoints(10)
    expect(t.start).toBe(10)
    expect(t.peakAt).toBeCloseTo(10.02, 10)
    expect(t.releaseAt).toBeCloseTo(11.05, 10)
    expect(t.end).toBeCloseTo(11.2, 10)
  })

  it('rechaza una envolvente más larga que la nota', () => {
    expect(() => envelopePoints(0, { attack: 0.5, release: 0.5, duration: 0.8 })).toThrow(RangeError)
  })
})

// Doble mínimo de BaseAudioContext: registra la automatización de parámetros.
type Event = [string, ...number[]]

class FakeParam {
  value = 0
  events: Event[] = []
  setValueAtTime(v: number, t: number) {
    this.events.push(['set', v, t])
  }
  linearRampToValueAtTime(v: number, t: number) {
    this.events.push(['ramp', v, t])
  }
  cancelScheduledValues(t: number) {
    this.events.push(['cancel', t])
  }
}

class FakeNode {
  connect() {}
  disconnect() {}
}

class FakeOscillator extends FakeNode {
  type = 'sine'
  frequency = new FakeParam()
  onended: (() => void) | null = null
  startedAt: number | null = null
  stops: number[] = []
  start(t: number) {
    this.startedAt = t
  }
  stop(t: number) {
    this.stops.push(t)
  }
}

class FakeGain extends FakeNode {
  gain = new FakeParam()
}

function fakeContext() {
  const oscillators: FakeOscillator[] = []
  const gains: FakeGain[] = []
  const ctx = {
    currentTime: 0,
    destination: new FakeNode(),
    createOscillator() {
      const o = new FakeOscillator()
      oscillators.push(o)
      return o
    },
    createGain() {
      const g = new FakeGain()
      gains.push(g)
      return g
    },
  }
  return { ctx, oscillators, gains }
}

function setup() {
  const fake = fakeContext()
  const player = createReferencePlayer(() => fake.ctx as unknown as BaseAudioContext)
  return { ...fake, player }
}

describe('createReferencePlayer', () => {
  it('toca un triángulo a la frecuencia de la nota (La3 = 220 Hz)', () => {
    const { player, oscillators } = setup()
    player.play(57)
    expect(oscillators[0].type).toBe('triangle')
    expect(oscillators[0].frequency.value).toBeCloseTo(220, 6)
  })

  it('la envolvente empieza y termina en 0 (sin clics)', () => {
    const { player, gains, oscillators } = setup()
    player.play(57, { volume: 0.8 })
    const events = gains[0].gain.events
    expect(events[0]).toEqual(['set', 0, expect.any(Number)])
    expect(events).toContainEqual(['ramp', 0.8, expect.any(Number)])
    expect(events.at(-1)).toEqual(['ramp', 0, expect.any(Number)])
    const start = oscillators[0].startedAt!
    expect(oscillators[0].stops).toEqual([start + DEFAULT_ENVELOPE.duration])
  })

  it('limita el volumen a 0–1', () => {
    const { player, gains } = setup()
    player.play(57, { volume: 3 })
    expect(gains[0].gain.events).toContainEqual(['ramp', 1, expect.any(Number)])
  })

  it('done se resuelve cuando termina la nota', async () => {
    const { player, oscillators } = setup()
    let finished = false
    const note = player.play(57)
    note.done.then(() => (finished = true))
    await Promise.resolve()
    expect(finished).toBe(false)
    oscillators[0].onended!()
    await note.done
    expect(finished).toBe(true)
  })

  it('una nota nueva corta la anterior con un fade', () => {
    const { ctx, player, gains, oscillators } = setup()
    player.play(57)
    ctx.currentTime = 0.5
    gains[0].gain.value = 0.5
    player.play(60)
    expect(gains[0].gain.events.slice(-3)).toEqual([
      ['cancel', 0.5],
      ['set', 0.5, 0.5],
      ['ramp', 0, 0.53],
    ])
    expect(oscillators[0].stops.at(-1)).toBeCloseTo(0.53, 10)
    expect(oscillators).toHaveLength(2)
  })

  it('stop() después de que terminó no reprograma nada', () => {
    const { ctx, player, gains } = setup()
    const note = player.play(57)
    const count = gains[0].gain.events.length
    ctx.currentTime = 5
    note.stop()
    expect(gains[0].gain.events).toHaveLength(count)
  })
})
