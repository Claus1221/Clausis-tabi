import { shuffle } from './scriptQuiz.js'
import { nfc } from './deva.js'

// Reine Logik für das Quiz am Ende eines Wortblocks (kein React, kein window).
// Fragearten:
//   'meaning' – Nepali sehen → Bedeutung wählen
//   'word'    – Bedeutung sehen → Nepali wählen
//   'listen'  – hören → Wort wählen (nur mit Ton und nur ZUSÄTZLICH: das Quiz besteht nie
//               nur aus Hörfragen; der Screen bietet dort als Ausweg die Bedeutung an)
// Jede Antwortmöglichkeit ist ein ganzes Wort { dev, roman, de } – der Screen zeigt bei
// Nepali-Optionen immer Devanagari (Umschrift nur zusätzlich, je nach Schalter), so dass
// keine Frage NUR über die Umschrift lösbar ist.
export const QUIZ_KINDS = ['meaning', 'word', 'listen']

// Vergleichsschlüssel: zwei Optionen gelten als gleich, wenn Schreibung ODER Bedeutung
// gleich ist – sonst wären zwei Antworten richtig („kalt“ ≙ चिसो und जाडो).
const devKey = w => nfc(w.dev).replace(/\s+/g, ' ').trim()
const deKey = w => String(w.de).trim().toLowerCase()

// block:   { words }  – jedes Wort wird genau einmal gefragt, gemischt
// earlier: Wörter früherer Blöcke – nur zum Auffüllen der Ablenker, wenn der Block
//          selbst zu wenige hergibt (Ablenker aus demselben Thema sind die eigentliche
//          Verwechslungsgefahr und kommen zuerst)
// rand:    einsetzbar für Tests
// sound:   true → ein Teil der Fragen wird zur Hörfrage
// optionCount: Optionen je Frage (weniger, wenn nicht genug verschiedene Wörter da sind)
// → [{ kind, word, options: Wort[], correct: Index in options }]
export function buildWordQuiz(block, { earlier = [], rand = Math.random, sound = false, optionCount = 4 } = {}) {
  const words = block?.words || []
  const kinds = sound ? ['meaning', 'word', 'listen'] : ['meaning', 'word']
  return shuffle(words, rand).map((word, i) => {
    const picked = []
    const clashes = c => [word, ...picked].some(p => devKey(p) === devKey(c) || deKey(p) === deKey(c))
    for (const pool of [words, earlier]) {
      for (const c of shuffle(pool, rand)) {
        if (picked.length >= optionCount - 1) break
        if (!clashes(c)) picked.push(c)
      }
    }
    const options = shuffle([word, ...picked], rand)
    // Reihum statt zufällig: so kommen beide Lese-Richtungen sicher vor, und die erste
    // Frage ist nie eine Hörfrage.
    return { kind: kinds[i % kinds.length], word, options, correct: options.indexOf(word) }
  })
}
