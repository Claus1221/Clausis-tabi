import { createSpeech } from './speechCore.js'

// ─── Sprachausgabe Nepali (ne-NP) ───────────────────────────────────────────
// Verdrahtet die Zustandsmaschine aus speechCore.js mit den echten Browser-Objekten:
// Studio-MP3 (public/audio-ne, Manifest) → Nepali-Gerätestimme → still.
// Solange es keine MP3s gibt (kein Azure-Key), spricht in der Praxis die Gerätestimme
// oder es bleibt still; der Kurs ist auch ohne Ton benutzbar. Beim Import passiert
// nichts: Manifest, Audio-Element und Stimmen werden erst beim ersten Gebrauch angefasst.

const AUDIO_BASE = (import.meta.env?.BASE_URL ?? '/') + 'audio-ne/'
const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : undefined

// 404, Netzfehler, kaputtes JSON oder Zeitüberschreitung = leeres Manifest (das fängt der
// Kern ab). Der Zeitgeber wird in jedem Fall freigegeben.
async function fetchManifest() {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = setTimeout(() => ctrl?.abort(), 5000)
  try {
    const r = await fetch(AUDIO_BASE + 'manifest.json', { signal: ctrl?.signal })
    return r.ok ? await r.json() : {}
  } finally {
    clearTimeout(timer)
  }
}

const core = createSpeech({
  fetchManifest,
  getVoices: () => synth.getVoices(),
  onVoicesChanged: cb => {
    synth.addEventListener?.('voiceschanged', cb)
    return () => synth.removeEventListener?.('voiceschanged', cb)
  },
  makeAudio: () => new Audio(),
  makeUtterance: text => new SpeechSynthesisUtterance(text),
  synth,
  audioBase: AUDIO_BASE,
})

export const { speak, stopSpeaking, onSpeechState, canSpeak, soundAvailable } = core
