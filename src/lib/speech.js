import { WORD_BY_KANJI } from '../data/words.js'
import { CHAPTER_WORD } from '../data/chapters.js'

// ─── Sprachausgabe (TTS, ja-JP) & Zwischenablage ────────────────────────────
export function speak(text) {
  if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ja-JP'
    speechSynthesis.cancel()
    speechSynthesis.speak(u)
  }
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
export function speakTokens(tokens) {
  speak(tokens.map(t => t.r || t.t).join(''))
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
