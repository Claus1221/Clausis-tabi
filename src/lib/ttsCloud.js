// ─── Laufzeit-Sprachausgabe mit der Studio-Stimme (Google Cloud TTS, BYOK) ───
// Die vorgenerierten MP3s (scripts/generate-audio.mjs) decken nur FESTE Texte
// ab. Im freien KI-Gespräch entstehen die Sätze aber erst zur Laufzeit – die
// fielen bisher zwangsläufig auf die Geräte-Stimme zurück, was mitten in der
// App wie ein Stimmenbruch klingt. Mit einem eigenen Google-Key spricht die App
// auch diese Sätze mit derselben Stimme (ja-JP-Neural2-B) wie die Studio-MP3s.
//
// Ohne Key passiert hier gar nichts – `cloudAudioUrl` gibt dann `null` zurück
// und speech.js nimmt wie bisher die System-TTS.
//
// Stimme und Rate müssen mit scripts/generate-audio.mjs übereinstimmen, sonst
// klänge derselbe Satz je nach Quelle anders. Freie Sätze sind immer Sätze
// (nie Zitierformen), darum die Satz-Rate 1.
import { getTtsKey } from './apiKey.js'

const VOICE = 'ja-JP-Neural2-B'
const RATE = 1
const API_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize'
const CACHE_NAME = 'tabi-audio-dyn'
const TIMEOUT_MS = 8000

// Einmal geholte Sätze nie zweimal bezahlen: erst der Prozess-Speicher (schnell),
// dahinter die Cache-API (überlebt Neuladen, funktioniert offline weiter).
const memCache = new Map()

// Ein Cache-Schlüssel muss eine http(s)-URL sein – daher diese Pseudo-URL.
// Stimme und Rate stehen mit drin, damit ein Wechsel den Bestand entwertet.
const cacheKeyFor = (text) => `https://tts.tabi.local/${VOICE}/${RATE}/${encodeURIComponent(text)}`

function base64ToBlob(b64) {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: 'audio/mpeg' })
}

async function fromCache(text) {
  if (typeof caches === 'undefined') return null   // kein sicherer Kontext
  try {
    const hit = await (await caches.open(CACHE_NAME)).match(cacheKeyFor(text))
    return hit ? await hit.blob() : null
  } catch { return null }
}

async function toCache(text, blob) {
  if (typeof caches === 'undefined') return
  try {
    await (await caches.open(CACHE_NAME)).put(
      cacheKeyFor(text),
      new Response(blob, { headers: { 'content-type': 'audio/mpeg' } }),
    )
  } catch { /* Speicher voll o. ä. – dann eben jedes Mal neu holen */ }
}

// Abspielbare URL für einen Satz – oder `null`, wenn kein Key, kein Netz oder
// ein Fehler. Der Aufrufer gibt die URL nach dem Abspielen per
// URL.revokeObjectURL wieder frei.
export async function cloudAudioUrl(text) {
  const key = getTtsKey()
  if (!key || !text) return null

  const cached = memCache.get(text) || await fromCache(text)
  if (cached) {
    memCache.set(text, cached)
    return URL.createObjectURL(cached)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${API_URL}?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'ja-JP', name: VOICE },
        audioConfig: { audioEncoding: 'MP3', speakingRate: RATE },
      }),
    })
    if (!res.ok) return null
    const b64 = (await res.json()).audioContent
    if (!b64) return null
    const blob = base64ToBlob(b64)
    memCache.set(text, blob)
    toCache(text, blob)   // absichtlich nicht abgewartet
    return URL.createObjectURL(blob)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// Erreichbarkeits-/Gültigkeits-Check für den „Testen"-Knopf in den Einstellungen.
// Gibt die Meldung von Google DURCH: „Key ungültig" ist selten die Wahrheit –
// meist ist die Text-to-Speech-API im Projekt nicht aktiviert oder der Key auf
// andere HTTP-Referrer beschränkt. Ohne diesen Text sucht man im Dunkeln.
export async function pingTtsKey(key) {
  try {
    const res = await fetch(`${API_URL}?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: 'テスト' },
        voice: { languageCode: 'ja-JP', name: VOICE },
        audioConfig: { audioEncoding: 'MP3', speakingRate: RATE },
      }),
    })
    if (res.ok) return { ok: true }
    let detail = ''
    try { detail = (await res.json())?.error?.message || '' } catch { /* keine JSON-Antwort */ }
    return { ok: false, message: detail || `HTTP ${res.status}` }
  } catch {
    // Hier landet auch ein CORS-Abbruch – der Browser verrät den Grund nicht.
    return { ok: false, message: 'Keine Antwort von Google (Internet, Browser-Blocker oder Referrer-Sperre des Keys).' }
  }
}
