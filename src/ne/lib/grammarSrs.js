import { GRAMMAR, GRAMMAR_BY_ID, GRAMMAR_NEW_WORDS } from '../data/grammar.js'
import { WORD_BLOCKS } from '../data/words.js'
import { nfc } from './deva.js'
import { ATTACHED_SUFFIXES } from './functionWords.js'

// ─── Grammatik im Wiederholungsplan (Yatra) ──────────────────────────────────
// Gegenstück zu src/lib/grammarSrs.js. EINE Karte je Thema (Schlüssel 'g:' + id, s.
// grammarKey in data/grammar.js); geprüft wird sie nicht als Karteikarte, sondern mit
// EINEM Lückensatz (components/GapDrill.jsx) – Grammatik zeigt sich im Anwenden.

const PREFIX = 'g:'

export const isGrammarKey = key => typeof key === 'string' && key.startsWith(PREFIX)

// Thema zu einem Karten-Schlüssel; unbekannt (neuere Version, Tippfehler) → null.
export function topicForKey(key) {
  if (!isGrammarKey(key)) return null
  return GRAMMAR_BY_ID[key.slice(PREFIX.length)] || null
}

// Bewertung ergibt sich aus der Antwort, kein Selbsteinschätzen: beim ersten Versuch
// richtig = „Gut“, falsch = „Nochmal“ (kommt über reviewQueue am Rundenende wieder).
export const GRAMMAR_QUALITY = { right: 4, wrong: 1 }

// Welche Übung eine Wiederholung zeigt. Regel:
//   Index = reps des srs-Eintrags modulo Anzahl Übungen. reps wächst mit jeder
//   bestandenen Wiederholung um 1 – aufeinanderfolgende Wiederholungen gehen also reihum
//   durch das Thema, statt eine Frage auswendig lernen zu lassen.
//   Ohne brauchbares reps (nie geplant, Altbestand) entscheidet `random` (injiziert, damit
//   testbar) – nur dann, als Notnagel, nicht als Regel.
//   avoid = Frage (q), die eben schon dran war (Nochmal in derselben Runde): dann die
//   nächste reihum. Nötig, weil reps nach einem Fehler gleich bleiben kann (sm2 hält es
//   bei mindestens 2) – sonst käme dieselbe Frage sofort wieder.
// → Übung oder null (Thema fehlt oder hat keine Übungen).
// Umschrift einer Antwort-Option. Optionen tragen keine eigene Umschrift (die Daten
// haben sie nur für den gelösten Satz) – sie wird aus dem Kurs nachgeschlagen: Wörter
// der Wortblöcke, neue Wörter der Themen, antippbare Stücke aller Beispielsätze. Erster
// Fund gewinnt (dasselbe Stück liest sich überall gleich). Mehrere Wörter („एक जना“)
// Teil für Teil; fehlt ein Teil, lieber nichts als eine halbe Lesung → ''.
let READINGS = null
function readings() {
  if (READINGS) return READINGS
  READINGS = new Map()
  const put = (dev, r) => { if (dev && r && !READINGS.has(nfc(dev))) READINGS.set(nfc(dev), r) }
  for (const b of WORD_BLOCKS) for (const w of b.words) {
    put(w.dev, w.roman)
    for (const t of w.ex?.tokens || []) put(t.t, t.r)
  }
  for (const list of Object.values(GRAMMAR_NEW_WORDS)) for (const w of list) put(w.dev, w.roman)
  for (const g of GRAMMAR) for (const x of g.examples) for (const t of x.tokens) put(t.t, t.r)
  return READINGS
}
// Angehängtes (मलाई = म + लाई, तपाईंको) liest sich als Stamm + Anhängsel zusammen.
const readPart = p => readings().get(p) || ATTACHED_SUFFIXES.map(s => {
  if (p.length <= s.length || !p.endsWith(s)) return ''
  const a = readings().get(p.slice(0, -s.length)), b = readings().get(s)
  return a && b ? a + b : ''
}).find(Boolean)
export function readingOf(option) {
  const parts = nfc(option || '').split(/\s+/).filter(Boolean)
  if (!parts.length) return ''
  const rs = parts.map(readPart)
  return rs.every(Boolean) ? rs.join(' ') : ''
}

export function pickDrill(topic, srsEntry, random = Math.random, avoid = null) {
  const pool = topic?.exercises || []
  if (!pool.length) return null
  const reps = srsEntry?.reps
  let i = Number.isInteger(reps) && reps >= 0
    ? reps % pool.length
    : Math.min(pool.length - 1, Math.floor(random() * pool.length))
  if (avoid !== null && pool.length > 1 && pool[i].q === avoid) i = (i + 1) % pool.length
  return pool[i]
}
