// ─── Anthropic-API-Key (BYOK – Bring your own key) ───────────────────────────
// Bewusst NICHT Teil von progress.settings: bleibt rein gerätelokal
// (localStorage) und wird nie über Firestore synchronisiert – der Key
// verlässt so nie dieses Gerät. Ohne Key (oder bei ungültigem Key) fallen
// die KI-gestützten Funktionen automatisch auf ihr bisheriges
// Standardverhalten zurück (siehe judgeAnswer in claude.js).
const STORAGE_KEY = 'tabi_anthropic_api_key'
// Zweiter, unabhängiger Key: Google Cloud TTS. Nur nötig, damit auch FREI
// erzeugte Sätze (KI-Gespräch) mit der Studio-Stimme klingen statt mit der
// Geräte-Stimme – siehe lib/ttsCloud.js. Ohne diesen Key bleibt alles beim
// bisherigen Weg (Studio-MP3s, sonst System-TTS).
const TTS_STORAGE_KEY = 'tabi_google_tts_api_key'

function read(name) {
  try { return localStorage.getItem(name) || '' } catch { return '' }
}
function write(name, key) {
  try {
    if (key) localStorage.setItem(name, key)
    else localStorage.removeItem(name)
  } catch { /* localStorage evtl. blockiert (z. B. privater Modus) */ }
}

export function getApiKey() { return read(STORAGE_KEY) }
export function setApiKey(key) { write(STORAGE_KEY, key) }

export function getTtsKey() { return read(TTS_STORAGE_KEY) }
export function setTtsKey(key) { write(TTS_STORAGE_KEY, key) }
export function hasTtsKey() { return !!read(TTS_STORAGE_KEY) }
