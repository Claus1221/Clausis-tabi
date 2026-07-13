// ─── Anthropic-API-Client (direkt aus dem Browser, BYOK) ─────────────────────
// Ruft die Claude-API mit dem in den Einstellungen hinterlegten, gerätelokalen
// Key auf (kein Server nötig – siehe apiKey.js). `anthropic-dangerous-direct-
// browser-access` macht bewusst, dass der Key im Browser sichtbar ist; das ist
// hier gewollt, weil jede Person ihren EIGENEN Key einträgt statt eines
// geteilten Secrets. Jeder Aufruf ist defensiv: fehlt der Key oder schlägt der
// Request fehl, liefert die Funktion `null` – aufrufender Code fällt dann auf
// sein bisheriges Standardverhalten zurück (kein Absturz, keine Fehlermeldung).
import { getApiKey } from './apiKey.js'

const MODEL = 'claude-haiku-4-5'
const API_URL = 'https://api.anthropic.com/v1/messages'
// Harte Obergrenze fürs Warten: ein hängender Request (Netzprobleme, Firewall)
// darf die Mikro-UI nie unbegrenzt in „Wird geprüft …" stecken lassen.
const TIMEOUT_MS = 12000

async function callClaude({ key, system, prompt, maxTokens }) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.content?.[0]?.text?.trim() || ''
  } finally {
    clearTimeout(timer)
  }
}

export function hasApiKey() {
  return !!getApiKey()
}

// Schneller Erreichbarkeits-/Gültigkeits-Check für den „Testen"-Knopf in den
// Einstellungen (minimaler Request, praktisch kostenlos).
export async function pingApiKey(key) {
  try {
    const text = await callClaude({ key, system: undefined, prompt: 'Hallo', maxTokens: 1 })
    return text != null
  } catch {
    return false
  }
}

// Beurteilt, ob eine frei gesprochene Antwort in einer Gesprächs-Szene
// inhaltlich zur Situation passt – nicht nur, ob sie wortgleich mit der
// vorgegebenen Musterantwort ist. Ergänzt die feste Muster-Erkennung
// (matchSpoken in listen.js), ersetzt sie aber nicht: kommt kein Key, kein
// Netz oder eine Fehlantwort zurück, liefert diese Funktion `null`/`false`,
// und der Aufrufer bleibt beim bisherigen „nicht erkannt"-Verhalten.
export async function judgeAnswer({ npcJp, npcDe, sampleJp, heard }) {
  const key = getApiKey()
  if (!key || !heard) return null
  const system = 'Du bewertest gesprochene Antworten in einem Japanisch-Lernspiel für Anfänger ' +
    '(Rollenspiel-Dialoge). Du bekommst die Zeile des Gesprächspartners (Japanisch + deutsche ' +
    'Übersetzung), eine vorgesehene Musterantwort und was die lernende Person tatsächlich gesagt ' +
    'hat (per Spracherkennung erkannt – kann leicht verrauscht oder in Kanji statt Kana geschrieben ' +
    'sein). Beurteile NUR, ob die gesagte Antwort in dieser Situation ebenfalls eine sinnvolle, ' +
    'situativ angemessene japanische Antwort wäre – nicht ob sie wortgleich mit der Musterantwort ist. ' +
    'Antworte in der ersten Zeile NUR mit JA oder NEIN, danach optional in einem kurzen deutschen Satz die Begründung.'
  const prompt = `Gesprächspartner: „${npcJp}" („${npcDe}")\nMusterantwort: „${sampleJp}"\nGesagt: „${heard}"`
  try {
    const text = await callClaude({ key, system, prompt, maxTokens: 60 })
    if (text == null) return null
    return /^ja\b/i.test(text)
  } catch {
    return null
  }
}
