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

// Ein SRS-Item vorlesen: bei Wörtern die Kana-Lesung (nicht das Kanji – sonst
// liest die TTS z. B. 月 als „getsu" statt „tsuki"), bei Kana das Zeichen selbst.
export function speakItem(item) {
  const w = WORD_BY_KANJI[item]
  if (w) { speak(w.kana); return }
  const cw = CHAPTER_WORD[item]   // Kapitel-Vokabel (nicht im Wort-Lexikon)
  speak(cw ? cw.reading : item)
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
