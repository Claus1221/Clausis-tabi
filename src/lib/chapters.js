import { CHAPTERS, CHAPTER_WORD } from '../data/chapters.js'
import { WORD_BY_KANJI } from '../data/words.js'
import { srsStageIndex } from './srs.js'

// Vokabel-Schlüssel für die Satz-Tipp-Schwelle: Wort-Kanji + Kapitel-Wörter
// (Partikeln/Kana zählen nicht – nur „echte" Vokabeln entscheiden über Tippen).
const SENTENCE_VOCAB = [...Object.keys(WORD_BY_KANJI), ...Object.keys(CHAPTER_WORD)]

// Soll ein Satz getippt werden (statt aus Bausteinen gebaut)? Ja, sobald ALLE im
// Satz erkannten Vokabeln Stufe „Gefestigt" (≥ 4 Sterne, srsStageIndex ≥ 3)
// erreicht haben – dann wird Wiedererkennen zur aktiven Produktion (Tippen).
export function shouldTypeSentence(answerStr, progress) {
  const srs = (progress && progress.srs) || {}
  const present = SENTENCE_VOCAB.filter(k => answerStr.includes(k))
  if (!present.length) return false
  return present.every(k => srsStageIndex(srs[k]) >= 3)
}

// SRS-fähige Schlüssel eines Kapitels = seine eingeführten Vokabeln (eindeutig).
export function chapterSrsKeys(chapter) {
  return [...new Set(chapter.steps.filter(s => s.kind === 'intro').map(s => s.jp))]
}
// Aktueller (Live-)Sterne-Stand aus dem SRS, 0 = noch nicht abgeschlossen.
// Schnitt über ALLE Kapitel-Vokabeln (fehlende Karte zählt als Stufe „Neu").
export function chapterStarsLive(chapter, progress) {
  if (!(progress.completedChapters || []).includes(chapter.id)) return 0
  const keys = chapterSrsKeys(chapter)
  if (!keys.length) return 1
  const srs = progress.srs || {}
  const avg = keys.reduce((a, k) => a + srsStageIndex(srs[k]), 0) / keys.length
  return Math.min(5, Math.max(1, 1 + Math.round(avg)))
}
// Höchststand fürs Anzeigen: nie unter den gespeicherten Bestwert fallen.
export function chapterStarsShown(chapter, progress) {
  return Math.max((progress.chapterStars || {})[chapter.id] || 0, chapterStarsLive(chapter, progress))
}
// Live-Sterne aller Kapitel (für die Höchststand-Synchronisation).
export function computeAllChapterStars(progress) {
  const out = {}
  CHAPTERS.forEach(c => { const s = chapterStarsLive(c, progress); if (s > 0) out[c.id] = s })
  return out
}
