import { GRAMMAR_BY_ID } from '../data/grammar.js'

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
