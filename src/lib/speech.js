import { WORD_BY_KANJI } from '../data/words.js'
import { CHAPTER_WORD } from '../data/chapters.js'

// ─── Sprachausgabe (TTS, ja-JP) & Zwischenablage ────────────────────────────
// Zielgerät ist ein Android-Handy (Chrome/PWA); Desktop dient nur zum Testen.
const IS_ANDROID = /android/i.test(navigator.userAgent)

// Explizit eine japanische Stimme wählen, wo die Liste verlässlich ist (Desktop):
// nur `lang` zu setzen reicht dort nicht – fehlt eine ja-Stimme, liest sonst die
// deutsche Standardstimme den Text (aus „ひと" wird Kauderwelsch). Lokale
// Stimmen zuerst (starten zuverlässiger, funktionieren offline).
let jaVoice = null
function pickJaVoice() {
  const ja = speechSynthesis.getVoices().filter(v => (v.lang || '').toLowerCase().startsWith('ja'))
  jaVoice = ja.find(v => v.localService) || ja[0] || null
}
if ('speechSynthesis' in window) {
  pickJaVoice()
  // Stimmenliste lädt oft asynchron (leer beim ersten Aufruf).
  speechSynthesis.addEventListener?.('voiceschanged', pickJaVoice)
}

// Wenn keine japanische Ausgabe möglich ist: einmalig erklären, wie man die
// Sprachdaten installiert (Pfad je Plattform).
let hintShown = false
function showVoiceHint() {
  if (hintShown) return
  hintShown = true
  const el = document.createElement('div')
  el.textContent = IS_ANDROID
    ? '🔇 Japanische Sprachdaten fehlen. Android: Einstellungen → Bedienungshilfen → Text-in-Sprache-Ausgabe → Google Speech-Dienste → ⚙ Einstellungen → Sprachen installieren → 日本語 (Japanisch). Danach die App neu starten.'
    : '🔇 Keine japanische Stimme installiert. Windows: Einstellungen → Zeit und Sprache → Sprache und Region → Sprache hinzufügen → „日本語 (Japanisch)" mit Sprachausgabe installieren. Danach die App neu laden.'
  el.style.cssText = 'position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:9999;' +
    'max-width:340px;background:#211F1B;color:#EFEBE0;font-size:13px;line-height:1.5;' +
    'padding:12px 16px;border-radius:12px;box-shadow:0 6px 24px rgba(33,31,27,0.35);'
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 12000)
}

let pendingSpeak = 0
export function speak(text) {
  if (!('speechSynthesis' in window) || !text) return
  if (!jaVoice) pickJaVoice() // Stimmenliste lädt evtl. erst nach dem ersten Klick
  // Desktop ohne ja-Stimme: NICHT sprechen (die Standardstimme liest Kauderwelsch).
  // Android dagegen meldet die Stimmenliste oft leer/unvollständig, obwohl das
  // System-TTS Japanisch kann – dort immer sprechen und über `lang` routen lassen.
  if (!jaVoice && !IS_ANDROID) { showVoiceHint(); return }
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ja-JP'
  if (jaVoice) u.voice = jaVoice
  // Scheitert die Ausgabe an fehlenden Sprachdaten, den Installations-Hinweis
  // zeigen. „interrupted/canceled" (normale Folge von cancel()) zählt nicht.
  u.onerror = (e) => {
    if (e.error === 'language-unavailable' || e.error === 'voice-unavailable' || e.error === 'synthesis-failed' || e.error === 'synthesis-unavailable') showVoiceHint()
  }
  clearTimeout(pendingSpeak)
  speechSynthesis.cancel()
  // Kurz warten statt sofort sprechen: cancel() + speak() im selben Tick
  // schneidet in Chrome den Wortanfang ab („hito" → „to"). resume() löst den
  // bekannten Chrome/Android-Hänger, wenn die Synthese pausiert stecken bleibt
  // (z. B. nach Tab-Wechsel oder Bildschirm-Aus).
  pendingSpeak = setTimeout(() => { speechSynthesis.resume(); speechSynthesis.speak(u) }, 60)
}

// Lesung eines bekannten Wort-/Kapitel-Items auflösen (sonst der Text selbst –
// z. B. Partikel oder konjugierte Verbformen, die TTS schon richtig liest).
// Verhindert Fehllesungen bei mehrdeutigen Kanji (z. B. 上 als „kami" statt „ue",
// 月 als „getsu" statt „tsuki").
export function itemReading(item) {
  const w = WORD_BY_KANJI[item]
  if (w) return w.kana
  const cw = CHAPTER_WORD[item]   // Kapitel-Vokabel (nicht im Wort-Lexikon)
  return cw ? cw.reading : item
}

// Ein SRS-Item vorlesen: bei Wörtern die Kana-Lesung, bei Kana das Zeichen selbst.
export function speakItem(item) {
  speak(itemReading(item))
}

// Einen Beispielsatz aus seinen Tokens vorlesen (Lesung je Token, wo hinterlegt,
// sonst der Text selbst – z. B. Partikel). Robuster als die Sprachausgabe direkt
// am Kanji-Satz: mehrdeutige Kanji (上, 月, 東 …) bekommen die geprüfte Lesung
// statt einer TTS-Vermutung, auch im vollen Satzkontext.
// Nur Kana-Lesungen einsetzen: manche Tokens tragen ANZEIGE-Lesungen in Romaji
// (は → „wa", を → „o") – eingebettetes Latein liest die ja-Stimme unberechenbar
// vor; den Partikeln selbst gibt der Satzkontext die richtige Aussprache.
const KANA_ONLY = /^[぀-ヿー]+$/
export function speakTokens(tokens) {
  speak(tokens.map(t => (t.r && KANA_ONLY.test(t.r)) ? t.r : t.t).join(''))
}

// Text in die Zwischenablage kopieren (mit Fallback für ältere Browser).
export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch (e) { /* Fallback unten */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    return true
  } catch (e) {
    return false
  }
}
