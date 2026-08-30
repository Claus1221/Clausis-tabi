import { completedKanaList } from './kanaStats.js'
import { learnedWordKanji } from '../data/words.js'
import { learnedChapterWords } from './chapters.js'

// ─── Was gerade im Wiederholungs-Umlauf ist ──────────────────────────────────
// Alle SRS-Karten, die es zu diesem Fortschritt gibt: gelernte Kana, Wörter aus
// abgeschlossenen Blöcken, eingeführte Kapitel-Vokabeln und Wendungen, die aus
// einem freien Gespräch übernommen wurden (siehe useProgress: addPhrase).
//
// Eine Quelle für alle Stapel und Zähler: Üben, Reise-Banner und Fortschritts-
// Statistik müssen dieselbe Menge sehen, sonst zeigt die App unterschiedliche
// „fällig"-Zahlen an derselben Stelle.
export function learnedItems(progress) {
  const p = progress || {}
  return [
    ...completedKanaList(p.completedLessons || []),
    ...learnedWordKanji(p.completedWordBlocks || []),
    ...learnedChapterWords(p),
    ...Object.keys(p.extraPhrases || {}),
  ]
}
