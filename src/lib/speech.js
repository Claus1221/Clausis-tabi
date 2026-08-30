import { WORD_BY_KANJI } from '../data/words.js'
import { CHAPTER_WORD } from '../data/chapters.js'
import { hasTtsKey } from './apiKey.js'
import { cloudAudioUrl } from './ttsCloud.js'

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

// ─── Vorgenerierte Studio-Audios (Google Neural2, scripts/generate-audio.mjs) ─
// Manifest: Text → MP3-Dateiname unter public/audio/. Gibt es für einen Text
// eine Datei, wird sie abgespielt; sonst (und wenn das Manifest fehlt, z. B.
// solange noch nie generiert wurde) bleibt die System-TTS der Fallback.
const AUDIO_BASE = import.meta.env.BASE_URL + 'audio/'
let audioMap = null
fetch(AUDIO_BASE + 'manifest.json')
  .then(r => (r.ok ? r.json() : null))
  .then(m => { audioMap = m?.map || null })
  .catch(() => { /* kein Manifest → nur System-TTS */ })

// ─── Sprech-Ereignisse ───────────────────────────────────────────────────────
// Wer wissen muss, WANN gesprochen wird, meldet sich hier an: der Avatar bewegt
// den Mund, solange Ton läuft, und im freien Gespräch öffnet das Mikrofon erst,
// wenn der Gesprächspartner ausgeredet hat. Bewusst grob ('start'/'end') statt
// wortgenau – die `boundary`-Ereignisse der Sprachsynthese sind auf Android
// unzuverlässig, und für einen lebendigen Eindruck genügt der Takt.
const speechListeners = new Set()
export function onSpeechState(cb) {
  speechListeners.add(cb)
  return () => speechListeners.delete(cb)
}

let speaking = false

// Laufende Nummer je speak()-Aufruf: Ereignisse einer abgelösten Ausgabe
// (jedes speak() bricht die vorige ab) dürfen nicht mehr durchkommen.
let speakSeq = 0
// Offene Versprechen je Aufruf – `speak()` löst auf, sobald der Satz zu Ende
// ist ODER feststeht, dass er nicht gesprochen werden kann. Es bleibt nie eines
// hängen: sonst würde das Gespräch ewig auf „NPC redet noch" warten.
const finishers = new Map()

function fire(state) {
  speaking = state === 'start'
  for (const cb of speechListeners) {
    try { cb(state) } catch { /* ein Zuhörer darf die Ausgabe nie kippen */ }
  }
}
function emit(state, seq) {
  if (seq !== speakSeq) return                    // gehört zu einer abgelösten Ausgabe
  if ((state === 'start') === speaking) return    // nichts Neues
  fire(state)
}
function settle(seq) {
  const done = finishers.get(seq)
  if (!done) return
  finishers.delete(seq)
  done()
}
// Ende einer Ausgabe: Ereignis melden UND das Versprechen auflösen.
function finish(seq) {
  emit('end', seq)
  settle(seq)
}

// Laufende Ausgabe abbrechen (Szene verlassen, neuer Satz). Meldet 'end' und
// löst alle offenen Versprechen auf.
export function stopSpeaking() {
  speakSeq++
  clearTimeout(pendingSpeak)
  if ('speechSynthesis' in window) speechSynthesis.cancel()
  if (audioEl) audioEl.pause()
  releaseObjectUrl()
  if (speaking) fire('end')
  for (const seq of [...finishers.keys()]) settle(seq)
}

let audioEl = null
let objectUrl = null   // laufende Blob-URL (Cloud-Stimme) – muss freigegeben werden
function releaseObjectUrl() {
  if (!objectUrl) return
  URL.revokeObjectURL(objectUrl)
  objectUrl = null
}

// Eine Audio-Quelle abspielen und dabei die Sprech-Ereignisse melden.
// `onFail` springt ein, wenn die Datei fehlt oder kaputt ist.
function playAudio(src, seq, onFail) {
  if (!audioEl) audioEl = new Audio()
  audioEl.onplaying = () => emit('start', seq)
  audioEl.onended = () => { releaseObjectUrl(); finish(seq) }
  audioEl.onerror = () => { releaseObjectUrl(); emit('end', seq); onFail ? onFail() : settle(seq) }
  audioEl.src = src
  // Abgelehnt heißt: unterbrochen (neuer speak – dann ist seq ohnehin veraltet)
  // oder vom Browser blockiert. In beiden Fällen darf nichts hängen bleiben.
  audioEl.play().catch(() => finish(seq))
}

// Einen japanischen Text vorlesen. Gibt ein Versprechen zurück, das auflöst,
// wenn der Satz zu Ende gesprochen ist (oder feststeht, dass er nicht
// gesprochen werden kann) – Aufrufer, die das nicht brauchen, ignorieren es.
// Drei Stufen: Studio-MP3 → Studio-Stimme zur Laufzeit (nur mit eigenem
// Google-Key, für frei erzeugte Sätze) → System-TTS.
export function speak(text) {
  if (!text) return Promise.resolve()
  stopSpeaking()   // laufende Ausgabe beenden, bevor die neue beginnt
  const seq = ++speakSeq
  const promise = new Promise(resolve => finishers.set(seq, resolve))

  const file = audioMap?.[text]
  if (file) {
    playAudio(AUDIO_BASE + file, seq, () => ttsSpeak(text, seq))   // Datei kaputt → System-TTS
  } else if (hasTtsKey()) {
    cloudAudioUrl(text).then(url => {
      if (seq !== speakSeq) { if (url) URL.revokeObjectURL(url); return }
      if (!url) { ttsSpeak(text, seq); return }   // kein Netz/Fehler → System-TTS
      objectUrl = url
      playAudio(url, seq, () => ttsSpeak(text, seq))
    })
  } else {
    ttsSpeak(text, seq)
  }
  return promise
}

let pendingSpeak = 0
function ttsSpeak(text, seq = speakSeq) {
  if (!('speechSynthesis' in window) || !text) { finish(seq); return }
  if (!jaVoice) pickJaVoice() // Stimmenliste lädt evtl. erst nach dem ersten Klick
  // Desktop ohne ja-Stimme: NICHT sprechen (die Standardstimme liest Kauderwelsch).
  // Android dagegen meldet die Stimmenliste oft leer/unvollständig, obwohl das
  // System-TTS Japanisch kann – dort immer sprechen und über `lang` routen lassen.
  if (!jaVoice && !IS_ANDROID) { showVoiceHint(); finish(seq); return }
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ja-JP'
  if (jaVoice) u.voice = jaVoice
  u.onstart = () => emit('start', seq)
  u.onend = () => finish(seq)
  // Scheitert die Ausgabe an fehlenden Sprachdaten, den Installations-Hinweis
  // zeigen. „interrupted/canceled" (normale Folge von cancel()) zählt nicht.
  u.onerror = (e) => {
    if (e.error === 'language-unavailable' || e.error === 'voice-unavailable' || e.error === 'synthesis-failed' || e.error === 'synthesis-unavailable') showVoiceHint()
    finish(seq)
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
