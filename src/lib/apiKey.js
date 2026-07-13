// ─── Anthropic-API-Key (BYOK – Bring your own key) ───────────────────────────
// Bewusst NICHT Teil von progress.settings: bleibt rein gerätelokal
// (localStorage) und wird nie über Firestore synchronisiert – der Key
// verlässt so nie dieses Gerät. Ohne Key (oder bei ungültigem Key) fallen
// die KI-gestützten Funktionen automatisch auf ihr bisheriges
// Standardverhalten zurück (siehe judgeAnswer in claude.js).
const STORAGE_KEY = 'tabi_anthropic_api_key'

export function getApiKey() {
  try { return localStorage.getItem(STORAGE_KEY) || '' } catch { return '' }
}

export function setApiKey(key) {
  try {
    if (key) localStorage.setItem(STORAGE_KEY, key)
    else localStorage.removeItem(STORAGE_KEY)
  } catch { /* localStorage evtl. blockiert (z. B. privater Modus) */ }
}
