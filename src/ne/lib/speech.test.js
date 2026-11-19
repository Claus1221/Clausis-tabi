import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createSpeech } from './speechCore.js'

// Zustandsmaschine der Sprachausgabe mit Attrappen statt Browser-Objekten.
const NP = { lang: 'ne-NP', name: 'Nepali', localService: true }
const HI = { lang: 'hi-IN', name: 'Hindi', localService: true }
const EN = { lang: 'en-US', name: 'English', localService: true }

function setup({ manifest = {}, voices = [], synth = 'default', fetchManifest, playRejects = false } = {}) {
  const events = []
  const audios = []
  const utterances = []
  const fake = {
    fetchManifest: fetchManifest || (async () => manifest),
    getVoices: () => voices,
    onVoicesChanged: () => () => {},
    makeAudio: () => {
      const a = {
        src: '',
        play: vi.fn(() => (playRejects ? Promise.reject(new Error('NotAllowedError')) : Promise.resolve())),
        pause: vi.fn(),
      }
      audios.push(a)
      return a
    },
    makeUtterance: text => { const u = { text }; utterances.push(u); return u },
    synth: synth === 'default' ? { cancel: vi.fn(), resume: vi.fn(), speak: vi.fn() } : synth,
    audioBase: '/audio-ne/',
  }
  const sp = createSpeech(fake)
  sp.onSpeechState(s => events.push(s))
  // Beobachter: wie oft wurde das Versprechen aufgelöst?
  const watch = p => { const w = { n: 0 }; p.then(() => { w.n++ }); return w }
  return { sp, fake, events, audios, utterances, watch }
}
// Zeit und Mikrotasks vorspulen
const tick = ms => vi.advanceTimersByTimeAsync(ms)
// Jedes 'start' hat genau ein 'end', abwechselnd
function balanced(events) {
  let open = false
  for (const e of events) {
    if (e === 'start') { expect(open).toBe(false); open = true } else { expect(open).toBe(true); open = false }
  }
  expect(open).toBe(false)
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('speak: MP3', () => {
  const manifest = { 'नमस्ते': 'h.mp3' }
  it('Treffer im Manifest, keine Nepali-Stimme → MP3 wird abgespielt (Regression)', async () => {
    const t = setup({ manifest, voices: [EN] })
    const w = t.watch(t.sp.speak('नमस्ते'))
    await tick(100)
    expect(t.audios).toHaveLength(1)
    expect(t.audios[0].src).toBe('/audio-ne/h.mp3')
    expect(t.audios[0].play).toHaveBeenCalled()
    t.audios[0].onplaying(); t.audios[0].onended()
    await tick(10)
    expect(w.n).toBe(1)
    expect(t.events).toEqual(['start', 'end'])
    expect(t.utterances).toHaveLength(0)
  })
  it('Audio-Fehler → Gerätestimme als Ersatz', async () => {
    const t = setup({ manifest, voices: [NP] })
    const w = t.watch(t.sp.speak('नमस्ते'))
    await tick(100)
    t.audios[0].onerror()
    await tick(200)
    expect(t.utterances).toHaveLength(1)
    expect(t.utterances[0].voice).toBe(NP)
    t.utterances[0].onstart(); t.utterances[0].onend()
    await tick(10)
    expect(w.n).toBe(1)
    balanced(t.events)
  })
  it('Audio-Fehler ohne Gerätestimme → löst auf', async () => {
    const t = setup({ manifest, voices: [HI] })
    const w = t.watch(t.sp.speak('नमस्ते'))
    await tick(100)
    t.audios[0].onerror()
    await tick(100)
    expect(t.utterances).toHaveLength(0)
    expect(w.n).toBe(1)
    balanced(t.events)
  })
  it('play() abgelehnt (Autoplay blockiert) → löst auf', async () => {
    const t = setup({ manifest, voices: [EN], playRejects: true })
    const w = t.watch(t.sp.speak('नमस्ते'))
    await tick(100)
    expect(w.n).toBe(1)
    balanced(t.events)
  })
})

describe('speak: Gerätestimme', () => {
  it('Stimme da → Utterance mit Stimme, Ende über end', async () => {
    const t = setup({ voices: [NP] })
    const w = t.watch(t.sp.speak('धन्यवाद'))
    await tick(200)
    const u = t.utterances[0]
    expect(u.lang).toBe('ne-NP'); expect(u.voice).toBe(NP); expect(u.rate).toBe(0.85)
    expect(t.fake.synth.speak).toHaveBeenCalledWith(u)
    u.onstart(); u.onend()
    await tick(10)
    expect(w.n).toBe(1)
    expect(t.events).toEqual(['start', 'end'])
  })
  it('Stimme da → Ende über error', async () => {
    const t = setup({ voices: [NP] })
    const w = t.watch(t.sp.speak('धन्यवाद'))
    await tick(200)
    t.utterances[0].onstart(); t.utterances[0].onerror()
    await tick(10)
    expect(w.n).toBe(1)
    balanced(t.events)
  })
  it('leere Stimmenliste → lang-only: ne-NP ohne Stimme', async () => {
    const t = setup({ voices: [] })
    const w = t.watch(t.sp.speak('धन्यवाद'))
    await tick(2000)
    const u = t.utterances[0]
    expect(u).toBeDefined()
    expect(u.lang).toBe('ne-NP'); expect(u.voice).toBeUndefined()
    u.onstart(); u.onend()
    await tick(10)
    expect(w.n).toBe(1)
    balanced(t.events)
  })
  it('Liste ohne Nepali → keine Utterance, löst auf, ohne zu warten', async () => {
    const t = setup({ voices: [HI, EN] })
    const w = t.watch(t.sp.speak('धन्यवाद'))
    await tick(50)   // weit unter 1,5 s
    expect(t.utterances).toHaveLength(0)
    expect(w.n).toBe(1)
    expect(t.events).toEqual([])
  })
  it('Utterance feuert nie end → Watchdog löst auf', async () => {
    const t = setup({ voices: [NP] })
    const w = t.watch(t.sp.speak('धन्यवाद'))
    await tick(200)
    t.utterances[0].onstart()
    await tick(3000)
    expect(w.n).toBe(0)
    await tick(2000)   // max(4 s, 400 ms × 7 Zeichen) = 4 s
    expect(w.n).toBe(1)
    balanced(t.events)
  })
  it('synth fehlt → löst auf', async () => {
    const t = setup({ voices: [NP], synth: null })
    const w = t.watch(t.sp.speak('धन्यवाद'))
    await tick(2000)
    expect(w.n).toBe(1)
    expect(t.events).toEqual([])
  })
})

describe('Überlappung und Abbruch', () => {
  it('zweites speak() löst das erste auf, das zweite läuft', async () => {
    const t = setup({ voices: [NP] })
    const w1 = t.watch(t.sp.speak('एक'))
    await tick(200)
    t.utterances[0].onstart()
    const w2 = t.watch(t.sp.speak('दुई'))
    await tick(200)
    expect(w1.n).toBe(1); expect(w2.n).toBe(0)
    // spätes Ereignis der abgelösten Utterance darf nichts mehr bewirken
    t.utterances[0].onend()
    t.utterances[1].onstart(); t.utterances[1].onend()
    await tick(10)
    expect(w2.n).toBe(1)
    expect(t.events).toEqual(['start', 'end', 'start', 'end'])
  })
  it('stopSpeaking() mitten in der Utterance → löst auf, end genau einmal', async () => {
    const t = setup({ voices: [NP] })
    const w = t.watch(t.sp.speak('धन्यवाद'))
    await tick(200)
    t.utterances[0].onstart()
    t.sp.stopSpeaking()
    t.utterances[0].onerror()   // cancel() meldet error/interrupted
    await tick(10)
    expect(w.n).toBe(1)
    expect(t.events).toEqual(['start', 'end'])
  })
})

describe('Fehlerpfade des Manifests und der Verfügbarkeit', () => {
  it('fetch wirft synchron → speak und soundAvailable lehnen nie ab', async () => {
    const t = setup({ voices: [], fetchManifest: () => { throw new TypeError('fetch is not defined') } })
    const w = t.watch(t.sp.speak('धन्यवाद'))
    const sound = t.sp.soundAvailable()
    await tick(8000)
    expect(w.n).toBe(1)
    await expect(sound).resolves.toBe(false)
  })
  it('fetch lehnt ab → wie leeres Manifest, nur einmal geholt', async () => {
    const f = vi.fn(() => Promise.reject(new Error('offline')))
    const t = setup({ voices: [HI], fetchManifest: f })
    await t.sp.speak('धन्यवाद'); await t.sp.speak('नमस्ते')
    await expect(t.sp.soundAvailable()).resolves.toBe(false)
    expect(f).toHaveBeenCalledTimes(1)
  })
  it('soundAvailable: Manifest mit Einträgen → true; echte Stimme → true; leere Liste → false', async () => {
    const a = setup({ manifest: { x: 'x.mp3' } })
    await expect(a.sp.soundAvailable()).resolves.toBe(true)
    const b = setup({ voices: [NP] })
    await expect(b.sp.soundAvailable()).resolves.toBe(true)
    const c = setup({ voices: [] })
    const p = c.sp.soundAvailable()
    await tick(2000)
    await expect(p).resolves.toBe(false)
  })
  it('leere Liste: gewartet wird nur einmal pro Seite, danach nie mehr', async () => {
    const t = setup({ voices: [] })
    const w1 = t.watch(t.sp.speak('एक'))
    await tick(2000)
    t.utterances[0].onend()
    await tick(10)
    expect(w1.n).toBe(1)
    t.sp.speak('दुई')
    await tick(100)   // kein erneutes 1,5-s-Warten
    expect(t.utterances).toHaveLength(2)
  })
})
