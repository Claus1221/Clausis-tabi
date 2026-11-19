// Sammelt alle Texte des Nepali-Kurses, die vertont werden sollen – als reine
// Funktion auf Daten (kein Dateizugriff), damit sie ohne Dateisystem testbar ist.
// Gegenstück zu collectTexts() in scripts/generate-audio.mjs.
//
// sources = { script?, words?, grammar?, grammarNewWords?, chapters?, dialogs? }
// Bisher behandelt: `script` (SCRIPT_DATA), `words` (WORD_BLOCKS), `grammar` (GRAMMAR)
// und `grammarNewWords` (GRAMMAR_NEW_WORDS). Spätere Tasks ergänzen hier ihre
// Sprechstellen; nicht behandelte Schlüssel werden ignoriert.
import { nfc } from '../../src/ne/lib/deva.js'
import { solved } from '../../src/ne/data/grammar.js'

// Sprechraten wie im japanischen Skript: Zitierformen (Zeichen, Einzelwörter)
// verlangsamt, Sätze natürlich. Teil des Datei-Hashs.
export const RATE_WORD = 0.8
export const RATE_SENTENCE = 1

const HAS_DEVA = /[ऀ-ॿ]/

export function collectNeTexts(sources = {}) {
  const texts = new Map() // NFC-Text → Rate
  // Kommt ein Text als Satz UND als Zitierform vor, gewinnt die kleinere Rate
  // (dann ist es ohnehin ein Einzelwort).
  const addAt = (raw, rate) => {
    if (!raw) return
    const t = nfc(raw)
    if (!HAS_DEVA.test(t)) return
    const prev = texts.get(t)
    texts.set(t, prev === undefined ? rate : Math.min(prev, rate))
  }
  const addWord = (t) => addAt(t, RATE_WORD)
  const addSentence = (t) => addAt(t, RATE_SENTENCE)

  // Schriftzeichen: gesprochen wird `say` (Vokalzeichen hängen an क, sonst gäbe
  // es keine Silbe), nicht der Schlüssel.
  if (sources.script) for (const d of Object.values(sources.script)) addWord(d.say)

  // Wortblöcke: das Wort (Anhören in Lektion, Bibliothek, Karte), der Beispielsatz
  // (Satz-Anhören) und jedes antippbare Stück (Anhören im Nachschlage-Kasten).
  // Satzzeichen-Tokens (ohne de) werden nie gesprochen.
  for (const block of sources.words || []) {
    for (const w of block.words || []) {
      addWord(w.dev)
      addSentence(w.ex?.dev)
      for (const tok of w.ex?.tokens || []) if (tok.de) addWord(tok.t)
    }
  }

  // Grammatik: Beispielsätze (Satz-Anhören) und ihre antippbaren Stücke; je Lückensatz
  // der GELÖSTE Satz (nach dem Antippen anhörbar – die Lücke wird nie gesprochen) und
  // jede Antwort-Option (Zitierform). Dazu die neuen Wörter der Themen.
  for (const topic of sources.grammar || []) {
    for (const x of topic.examples || []) {
      addSentence(x.dev)
      for (const tok of x.tokens || []) if (tok.de) addWord(tok.t)
    }
    for (const e of topic.exercises || []) {
      addSentence(solved(e))
      for (const o of e.options || []) addWord(o)
    }
  }
  for (const list of Object.values(sources.grammarNewWords || {})) for (const w of list) addWord(w.dev)

  return [...texts.entries()]
}
