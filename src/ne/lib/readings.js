import { GRAMMAR, GRAMMAR_NEW_WORDS, OPTION_READINGS } from '../data/grammar.js'
import { WORD_BLOCKS } from '../data/words.js'
import { nfc } from './deva.js'
import { ATTACHED_SUFFIXES } from './functionWords.js'

// ─── Umschrift von Antwort-Optionen (Lückensätze) ─────────────────────────────
// Optionen tragen keine eigene Umschrift (die Daten haben sie nur für den gelösten Satz) –
// sie wird aus dem Kurs nachgeschlagen: Wörter der Wortblöcke und ihre Satz-Tokens, neue
// Wörter der Themen, Tokens aller Grammatik-Beispiele, dazu OPTION_READINGS für die paar
// Optionen, die sonst nirgends stehen. Erster Fund gewinnt (dasselbe Stück liest sich
// überall gleich). Mehrere Wörter („एक जना“) Teil für Teil; fehlt ein Teil, lieber nichts
// als eine halbe Lesung → ''.

// Nachschlage-Tafel, beim ersten Aufruf gebaut (NFC-Schlüssel).
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
  for (const [dev, r] of Object.entries(OPTION_READINGS)) put(dev, r)
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
