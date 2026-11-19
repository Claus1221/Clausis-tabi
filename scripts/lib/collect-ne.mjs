// Sammelt alle Texte des Nepali-Kurses, die vertont werden sollen – als reine
// Funktion auf Daten (kein Dateizugriff), damit sie ohne Dateisystem testbar ist.
// Gegenstück zu collectTexts() in scripts/generate-audio.mjs.
//
// sources = { script?, words?, grammar?, chapters?, dialogs? }
// Bisher behandelt: nur `script` (SCRIPT_DATA). Spätere Tasks ergänzen hier ihre
// Sprechstellen; nicht behandelte Schlüssel werden ignoriert.
import { nfc } from '../../src/ne/lib/deva.js'

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

  // Schriftzeichen: gesprochen wird `say` (Vokalzeichen hängen an क, sonst gäbe
  // es keine Silbe), nicht der Schlüssel.
  if (sources.script) for (const d of Object.values(sources.script)) addWord(d.say)

  return [...texts.entries()]
}
