import { CHAPTERS, CHAPTER_BY_ID, CHAPTER_WORD } from '../data/chapters.js'
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
// Kapitel-Wörter, die dieser Spieler noch NIE gesehen hat (kein SRS-Eintrag) –
// z. B. weil dem Kapitel nachträglich Vokabeln hinzugefügt wurden, nachdem es
// schon abgeschlossen war. Für diese Wörter fehlt die Bild+Audio-Einführung.
export function newChapterWords(chapter, progress) {
  const srs = progress.srs || {}
  return chapterSrsKeys(chapter).filter(k => !srs[k])
}
// Das Gegenstück für die Wiederholungs-Stapel (Üben-Tab, fällig-Zähler,
// Kenntnisstand): Vokabeln erlebter Kapitel, die WIRKLICH eingeführt wurden
// (SRS-Eintrag vorhanden). Nachträglich ergänzte Wörter ohne Einführung bleiben
// draußen, bis Kapitel-Übung oder Replay sie eingeführt und eingeplant hat –
// sonst stünden nie gezeigte Wörter unvermittelt im Quiz.
export function learnedChapterWords(progress) {
  const srs = progress.srs || {}
  return [...new Set(
    (progress.completedChapters || [])
      .flatMap(id => { const c = CHAPTER_BY_ID[id]; return c ? chapterSrsKeys(c) : [] }),
  )].filter(k => srs[k])
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

// ─── Kapitel-Bremse ──────────────────────────────────────────────────────────
// Erlebte Kapitel, deren Wörter noch nicht „halbwegs sitzen" (unter 2 Sternen),
// schwächste zuerst. Ab ZWEI solchen Kapiteln startet die Reise kein neues
// Kapitel, sondern zeigt das Festigen-Sheet – Sterne wachsen nur über fällige
// Wiederholungen, die Bremse verteilt neue Kapitel also automatisch über Tage.
export function weakChapterList(progress) {
  return (progress.completedChapters || [])
    .map(id => CHAPTER_BY_ID[id])
    .filter(c => c && chapterStarsShown(c, progress) < 2)
    .sort((a, b) => chapterStarsShown(a, progress) - chapterStarsShown(b, progress))
}
export const BRAKE_LIMIT = 2
