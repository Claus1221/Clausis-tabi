import { CHAPTERS, CHAPTER_WORD, chapterWords } from '../data/chapters.js'
import { nfc } from './deva.js'
import { wordKey, learnedItems, itemInfo } from './learned.js'
import { readingOf } from './readings.js'
import { ATTACHED_SUFFIXES } from './functionWords.js'

// ─── Reine Kapitel-Logik (kein React) ─────────────────────────────────────────
// Gegenstück zu src/lib/chapters.js, aber bewusst einfacher: Sterne messen hier, wie
// sauber man das Kapitel gespielt hat (nicht den Wiederholungsstand wie im Japanischen).

// Das Ziel ('goal') bucht sich in completedChapters ein (kein eigenes Fortschritts-Feld);
// es ist kein Kapitel – jede Stelle, die Kapitel zählt, geht über CHAPTERS. Definiert in
// data/path.js, hier nur weitergereicht.
export { GOAL_ID } from '../data/path.js'

// Schritt-Arten, die eine Antwort verlangen (und Sterne kosten können).
export const TASK_KINDS = new Set(['audio', 'dialog', 'gap', 'tf', 'build'])
export const isTask = step => TASK_KINDS.has(step?.kind)

// SRS-Karten eines Kapitels: seine intro-Wörter als Wort-Karten (w: + NFC-Text), in
// Kapitel-Reihenfolge, ohne Doppel – derselbe Namensraum wie Wortblock-Wörter.
export const chapterSrsKeys = chapter => [...new Set(chapterWords(chapter).map(wordKey))]

// Sterne (1–3) für EINEN Durchgang. results = { [Schritt-Index]: richtig? } der Aufgaben.
// Regel: kein Fehler → 3, höchstens zwei → 2, sonst 1 (wer das Kapitel beendet, hat
// mindestens einen Stern). Eine Aufgabe ohne Ergebnis zählt als Fehler; Einträge zu
// Erzähl-/Wort-Schritten zählen nicht. Gespeichert wird der beste Stand (bumpChapterStars).
export function chapterStars(chapter, results) {
  const r = results || {}
  const mistakes = chapter.steps.filter((s, i) => isTask(s) && r[i] !== true).length
  return mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1
}

// Satzbau: richtig, wenn die gelegten Stücke genau answer oder eine der alsoAccept-
// Reihenfolgen ergeben (Nepali stellt um: Anrede am Ende, betontes Wort vorn). Verglichen
// wird der verbundene Text in NFC – eine anders eingetippte Silbe ist kein Fehler.
export function isBuildCorrect(step, tiles) {
  const join = list => nfc((list || []).join(' '))
  const got = join(tiles)
  return got !== '' && [step.answer, ...(step.alsoAccept || [])].some(a => join(a) === got)
}

// „Prüfen“ erst, wenn genau so viele Stücke liegen, wie die Antwort hat. Mit Ablenkern unter
// den Stücken sieht man sonst nicht, wann der Satz vollständig ist – ein halber Satz wäre ein
// verschenkter Versuch. alsoAccept sind Umstellungen DERSELBEN Stücke (gleiche Länge).
export const canCheckBuild = (step, placedCount) => !!step?.answer?.length && placedCount === step.answer.length

// Umschrift einer Antwort-Option (Satzbau-Stück, Lücken-Option). Die Kapitel tragen
// Lesungen nur an ihren Sätzen – nachgeschlagen wird daher in den intro-Wörtern und den
// Tokens aller Erzähl-Zeilen, sonst im übrigen Kurs (readingOf). Mehrere Wörter Teil für
// Teil; fehlt ein Teil → '' (lieber keine als eine halbe Lesung).
let TABLE = null
function table() {
  if (TABLE) return TABLE
  TABLE = new Map()
  const put = (dev, r) => { if (dev && r && !TABLE.has(nfc(dev))) TABLE.set(nfc(dev), r) }
  for (const [dev, w] of Object.entries(CHAPTER_WORD)) put(dev, w.roman)
  for (const c of CHAPTERS) for (const s of c.steps) for (const t of s.tokens || []) put(t.t, t.r)
  return TABLE
}
// Ein Wort: Kapitel-Tafel, sonst Kurs; Angehängtes (बौद्धबाट) als Stamm + Anhängsel.
const look = p => table().get(p) || readingOf(p) || ATTACHED_SUFFIXES.map(s => {
  if (p.length <= s.length || !p.endsWith(s)) return ''
  const a = table().get(p.slice(0, -s.length)) || readingOf(p.slice(0, -s.length))
  const b = readingOf(s) || table().get(s)
  return a && b ? a + b : ''
}).find(Boolean) || ''
export function chapterReading(text) {
  const t = nfc(text || '').trim()
  if (!t) return ''
  if (table().has(t)) return table().get(t)
  const parts = t.split(/\s+/).map(look)
  return parts.every(Boolean) ? parts.join(' ') : ''
}

// Bilanz für die Ziel-Station: was auf der Reise gelernt wurde – gezählt über dieselbe
// Quelle wie Üben und Fortschritt (learnedItems), Kapitel über CHAPTERS (ohne Ziel).
export function journeySummary(progress) {
  const count = { chars: 0, words: 0, grammar: 0 }
  const KIND = { script: 'chars', word: 'words', grammar: 'grammar' }
  for (const k of learnedItems(progress)) count[KIND[itemInfo(k).kind]]++
  const done = progress?.completedChapters || []
  return { ...count, chapters: CHAPTERS.filter(c => done.includes(c.id)).length }
}
