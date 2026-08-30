import { completedKanaList } from './kanaStats.js'
import { learnedWordKanji } from '../data/words.js'
import { learnedChapterWords } from './chapters.js'
import { grammarKeys } from './grammarSrs.js'

// ─── Was gerade im Wiederholungs-Umlauf ist ──────────────────────────────────
// Alle SRS-Karten, die es zu diesem Fortschritt gibt: gelernte Kana, Wörter aus
// abgeschlossenen Blöcken, eingeführte Kapitel-Vokabeln und Wendungen, die aus
// einem freien Gespräch übernommen wurden (siehe useProgress: addPhrase) sowie
// je eine Karte pro gelerntem Grammatik-Thema (siehe grammarSrs.js).
//
// Eine Quelle für alle Stapel und Zähler: Üben, Reise-Banner und Fortschritts-
// Statistik müssen dieselbe Menge sehen, sonst zeigt die App unterschiedliche
// „fällig"-Zahlen an derselben Stelle.
// Ohne Doppelte: Fällt eine übernommene Wendung zufällig mit einem gelernten
// Wort zusammen, stünde dieselbe Karte sonst zweimal im Stapel.
export function learnedItems(progress) {
  const p = progress || {}
  return [...new Set([
    ...completedKanaList(p.completedLessons || []),
    ...learnedWordKanji(p.completedWordBlocks || []),
    ...learnedChapterWords(p),
    ...Object.keys(p.extraPhrases || {}),
    ...grammarKeys(p),
  ])]
}
