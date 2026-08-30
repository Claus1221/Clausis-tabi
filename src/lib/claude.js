// ─── Anthropic-API-Client (direkt aus dem Browser, BYOK) ─────────────────────
// Ruft die Claude-API mit dem in den Einstellungen hinterlegten, gerätelokalen
// Key auf (kein Server nötig – siehe apiKey.js). `anthropic-dangerous-direct-
// browser-access` macht bewusst, dass der Key im Browser sichtbar ist; das ist
// hier gewollt, weil jede Person ihren EIGENEN Key einträgt statt eines
// geteilten Secrets. Jeder Aufruf ist defensiv: fehlt der Key oder schlägt der
// Request fehl, liefert die Funktion `null` – aufrufender Code fällt dann auf
// sein bisheriges Standardverhalten zurück (kein Absturz, keine Fehlermeldung).
//
// Zwei Nutzungsarten:
//  • Einzelfrage (judgeAnswer) – eine Bewertung, ein Aufruf.
//  • Gespräch (chatTurn) – mehrzügig, die komplette Historie geht mit. Der
//    System-Prompt wird dabei per `cache_control` zwischengespeichert: er ist
//    über alle Züge einer Szene identisch (Wortschatz-Whitelist!) und kostet ab
//    dem zweiten Zug nur noch ein Zehntel.
import { getApiKey } from './apiKey.js'

const MODEL = 'claude-haiku-4-5'   // schnell – im Gespräch zählt die Antwortzeit
const API_URL = 'https://api.anthropic.com/v1/messages'
// Harte Obergrenzen fürs Warten: ein hängender Request (Netzprobleme, Firewall)
// darf die Mikro-UI nie unbegrenzt in „Wird geprüft …" stecken lassen. Gesprächs-
// züge dürfen etwas länger brauchen als eine Ja/Nein-Bewertung.
const TIMEOUT_MS = 12000
const TIMEOUT_CHAT_MS = 20000

async function callClaude({ key, system, messages, maxTokens, timeoutMs = TIMEOUT_MS }) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
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
        // Als Block mit cache_control: identische System-Prompts (z. B. alle Züge
        // eines Gesprächs) werden serverseitig zwischengespeichert.
        ...(system ? { system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }] } : {}),
        messages,
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

// ─── JSON aus einer Modellantwort lesen ──────────────────────────────────────
// Modelle verpacken JSON gern in ```json-Zäune oder stellen einen Satz voran.
// Darum: Zaun entfernen, sonst das erste {…}-Fragment nehmen. Alles, was sich
// nicht sicher parsen lässt, ergibt `null` – der Aufrufer behandelt das als
// „keine strukturierte Antwort" und weicht auf sein Standardverhalten aus.
export function parseJson(text) {
  if (typeof text !== 'string') return null
  let t = text.trim()
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fence) t = fence[1].trim()
  if (!t.startsWith('{')) {
    const start = t.indexOf('{')
    const end = t.lastIndexOf('}')
    if (start < 0 || end <= start) return null
    t = t.slice(start, end + 1)
  }
  try {
    const parsed = JSON.parse(t)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

// Schneller Erreichbarkeits-/Gültigkeits-Check für den „Testen"-Knopf in den
// Einstellungen (minimaler Request, praktisch kostenlos).
export async function pingApiKey(key) {
  try {
    const text = await callClaude({ key, messages: [{ role: 'user', content: 'Hallo' }], maxTokens: 1 })
    return text != null
  } catch {
    return false
  }
}

// ─── Ein Gesprächszug ────────────────────────────────────────────────────────
// `history` ist die komplette bisherige Unterhaltung als [{role, content}].
// Rückgabe: { json, raw } – `json` ist die geparste Modellantwort (oder null,
// wenn das Format nicht stimmte), `raw` der Rohtext als Notnagel. `null` heißt
// „kein Key, kein Netz, Fehlantwort" – dann darf der Aufrufer nicht weiterspielen.
export async function chatTurn({ system, history, maxTokens = 300 }) {
  const key = getApiKey()
  if (!key || !history?.length) return null
  try {
    const text = await callClaude({ key, system, messages: history, maxTokens, timeoutMs: TIMEOUT_CHAT_MS })
    if (text == null) return null
    return { json: parseJson(text), raw: text }
  } catch {
    return null
  }
}

// ─── Bewertung einer frei gesprochenen Antwort (geskriptete Szenen) ──────────
// Beurteilt, ob eine frei gesprochene Antwort in einer Gesprächs-Szene
// inhaltlich zur Situation passt – nicht nur, ob sie wortgleich mit der
// vorgegebenen Musterantwort ist. Ergänzt die feste Muster-Erkennung
// (matchSpoken in listen.js), ersetzt sie aber nicht: kommt kein Key, kein
// Netz oder eine Fehlantwort zurück, liefert diese Funktion `null`,
// und der Aufrufer bleibt beim bisherigen „nicht erkannt"-Verhalten.
//
// Rückgabe: { ok, better?, note? }
//   ok     – passt die Antwort situativ?
//   better – natürlichere Formulierung, falls die Antwort zwar passt, aber
//            unidiomatisch ist (leer, wenn sie schon natürlich klingt). Das ist
//            der eigentliche Lernwert: nicht nur „durchgekommen", sondern
//            „so sagt man es wirklich".
//   note   – ein kurzer deutscher Satz zur Begründung.
export async function judgeAnswer({ npcJp, npcDe, sampleJp, heard }) {
  const key = getApiKey()
  if (!key || !heard) return null
  const system = 'Du bewertest gesprochene Antworten in einem Japanisch-Lernspiel für Anfänger ' +
    '(Rollenspiel-Dialoge). Du bekommst die Zeile des Gesprächspartners (Japanisch + deutsche ' +
    'Übersetzung), eine vorgesehene Musterantwort und was die lernende Person tatsächlich gesagt ' +
    'hat (per Spracherkennung erkannt – kann leicht verrauscht oder in Kanji statt Kana geschrieben ' +
    'sein). Beurteile, ob die gesagte Antwort in dieser Situation eine sinnvolle, situativ ' +
    'angemessene japanische Antwort wäre – nicht ob sie wortgleich mit der Musterantwort ist.\n' +
    'Antworte AUSSCHLIESSLICH mit JSON in genau dieser Form:\n' +
    '{"ok": true/false, "better": "", "note": ""}\n' +
    '· ok: true, wenn die Antwort situativ funktioniert.\n' +
    '· better: nur füllen, wenn die Antwort zwar passt, aber unnatürlich klingt – dann die ' +
    'natürlichere japanische Formulierung in derselben Kana-Schreibweise wie die Musterantwort. ' +
    'Klingt die Antwort schon natürlich: leer lassen.\n' +
    '· note: ein kurzer deutscher Satz (max. 12 Wörter) zur Begründung.'
  const prompt = `Gesprächspartner: „${npcJp}" („${npcDe}")\nMusterantwort: „${sampleJp}"\nGesagt: „${heard}"`
  try {
    const text = await callClaude({ key, system, messages: [{ role: 'user', content: prompt }], maxTokens: 150 })
    if (text == null) return null
    const json = parseJson(text)
    if (json && typeof json.ok === 'boolean') {
      return {
        ok: json.ok,
        better: typeof json.better === 'string' ? json.better.trim() : '',
        note: typeof json.note === 'string' ? json.note.trim() : '',
      }
    }
    // Kein sauberes JSON: auf das alte JA/NEIN-Verhalten zurückfallen, statt
    // die Bewertung ganz zu verlieren.
    if (/^\s*(ja|\{?\s*"?ok"?\s*:\s*true)/i.test(text)) return { ok: true, better: '', note: '' }
    if (/^\s*(nein|\{?\s*"?ok"?\s*:\s*false)/i.test(text)) return { ok: false, better: '', note: '' }
    return null
  } catch {
    return null
  }
}
