import { describe, it, expect } from 'vitest'
import { WORD_BLOCKS, WORD_BY_DEV, learnedWords } from './words.js'
import { romanFits, nfc } from '../lib/deva.js'

// Paare aus Devanagari und Umschrift, die romanFits ablehnt, obwohl sie richtig sind.
// Je Eintrag eine Zeile Begründung. Die Umschrift wird NIE verbogen, damit der Test grün
// wird – ein Eintrag hier ist ein Hinweis, dass romanFits eine Lücke hat.
// Schlüssel: `${dev}|${roman}`.
const ROMAN_EXCEPTIONS = {}

const isNfc = s => s === nfc(s)
const fits = (dev, roman) => romanFits(dev, roman) || `${dev}|${roman}` in ROMAN_EXCEPTIONS
const words = WORD_BLOCKS.flatMap(b => b.words)
const tokens = words.flatMap(w => w.ex.tokens.map(t => ({ ...t, word: w.dev })))
const nonEmpty = s => typeof s === 'string' && s.trim() !== ''
// Buchstaben samt Diakritika (ā, ṭ, ṃ …), ohne Leer- und Satzzeichen, klein.
const letters = s => s.toLowerCase().normalize('NFC').replace(/[^\p{L}\p{M}]/gu, '')
const hasLetter = s => /[\p{L}\p{M}]/u.test(s)

describe('WORD_BLOCKS', () => {
  it('genau sechs Blöcke nw1…nw6 in Reihenfolge, je mit Thema und Titel', () => {
    expect(WORD_BLOCKS.map(b => b.id)).toEqual(['nw1', 'nw2', 'nw3', 'nw4', 'nw5', 'nw6'])
    for (const b of WORD_BLOCKS) {
      expect(nonEmpty(b.theme), b.id).toBe(true)
      expect(nonEmpty(b.title), b.id).toBe(true)
    }
  })
  it('je Block 8–10 Wörter', () => {
    for (const b of WORD_BLOCKS) {
      expect(b.words.length, b.id).toBeGreaterThanOrEqual(8)
      expect(b.words.length, b.id).toBeLessThanOrEqual(10)
    }
  })
  it('jedes Wort und jeder Beispielsatz hat dev, roman, de', () => {
    for (const w of words) {
      for (const f of ['dev', 'roman', 'de']) {
        expect(nonEmpty(w[f]), `${w.dev}.${f}`).toBe(true)
        expect(nonEmpty(w.ex?.[f]), `${w.dev}.ex.${f}`).toBe(true)
      }
      expect(Array.isArray(w.ex.tokens) && w.ex.tokens.length > 0, w.dev).toBe(true)
    }
  })
  it('dev ist über alle Blöcke eindeutig und NFC; Sätze sind NFC', () => {
    const devs = words.map(w => w.dev)
    expect(new Set(devs).size).toBe(devs.length)
    for (const w of words) {
      expect(isNfc(w.dev), w.dev).toBe(true)
      expect(isNfc(w.ex.dev), w.ex.dev).toBe(true)
      for (const t of w.ex.tokens) expect(isNfc(t.t), t.t).toBe(true)
    }
  })
  it('Umschrift passt zu Wort, Satz und jedem antippbaren Token (romanFits)', () => {
    for (const w of words) {
      expect(fits(w.dev, w.roman), `${w.dev} ≠ ${w.roman}`).toBe(true)
      expect(fits(w.ex.dev, w.ex.roman), `${w.ex.dev} ≠ ${w.ex.roman}`).toBe(true)
    }
    for (const t of tokens) if (t.r) expect(fits(t.t, t.r), `${t.word}: ${t.t} ≠ ${t.r}`).toBe(true)
  })
  it('jede Ausnahme wird noch gebraucht (sonst aus der Liste streichen)', () => {
    const pairs = new Set([
      ...words.flatMap(w => [`${w.dev}|${w.roman}`, `${w.ex.dev}|${w.ex.roman}`]),
      ...tokens.filter(t => t.r).map(t => `${t.t}|${t.r}`),
    ])
    for (const key of Object.keys(ROMAN_EXCEPTIONS)) {
      expect(pairs.has(key), key).toBe(true)
      const [dev, roman] = key.split('|')
      expect(romanFits(dev, roman), key).toBe(false)
    }
  })
})

describe('Beispielsätze und Tokens', () => {
  it('jedes Token mit de hat r; Tokens ohne de sind nur Satzzeichen', () => {
    for (const t of tokens) {
      expect(nonEmpty(t.t), t.word).toBe(true)
      if (t.de !== undefined) {
        expect(nonEmpty(t.de), `${t.word}: ${t.t}`).toBe(true)
        expect(nonEmpty(t.r), `${t.word}: ${t.t}`).toBe(true)
      } else {
        expect(hasLetter(t.t), `${t.word}: ${t.t} ist nicht antippbar, aber ein Wort`).toBe(false)
      }
    }
  })
  it('die Tokens ergeben den Satz ohne Leerzeichen', () => {
    for (const w of words) expect(w.ex.tokens.map(t => t.t).join(''), w.dev).toBe(w.ex.dev.replace(/\s/g, ''))
  })
  it('die Token-Umschriften ergeben die Satz-Umschrift (ohne Leer- und Satzzeichen)', () => {
    for (const w of words) expect(w.ex.tokens.map(t => t.r || '').join(''), w.dev).toBe(letters(w.ex.roman))
  })
  it('das Wort steht in seinem Beispielsatz', () => {
    for (const w of words) expect(w.ex.dev.replace(/\s/g, '').includes(w.dev.replace(/\s/g, '')), w.dev).toBe(true)
  })
  it('Aussagen enden mit ।, Fragen mit ? – in Satz, Umschrift und Übersetzung gleich', () => {
    for (const w of words) {
      const q = w.ex.dev.endsWith('?')
      expect(q || w.ex.dev.endsWith('।'), w.ex.dev).toBe(true)
      expect(w.ex.roman.endsWith(q ? '?' : '.'), w.ex.roman).toBe(true)
      // Eine angehängte Klammer („(wörtl. …)“, „(zum Fahrer)“) zählt nicht zum Satz.
      expect(w.ex.de.replace(/\s*\([^)]*\)\s*$/, '').endsWith('?'), w.ex.de).toBe(q)
    }
  })
  it('Sätze sind kurz: 3–6 Wörter', () => {
    for (const w of words) {
      const n = w.ex.dev.split(/\s+/).filter(hasLetter).length
      expect(n >= 3 && n <= 6, `${w.ex.dev}: ${n}`).toBe(true)
    }
  })
})

describe('WORD_BY_DEV und learnedWords', () => {
  it('WORD_BY_DEV findet jedes Wort', () => {
    for (const w of words) expect(WORD_BY_DEV[w.dev]).toBe(w)
    expect(Object.keys(WORD_BY_DEV)).toHaveLength(words.length)
  })
  it('nichts erledigt → keine Wörter', () => expect(learnedWords([])).toEqual([]))
  it('Wörter der erledigten Blöcke in Blockreihenfolge, NFC, unbekannte IDs ohne Wirkung', () => {
    const got = learnedWords(['nw3', 'nw1', 'nw99'])
    const want = [...WORD_BLOCKS[0].words, ...WORD_BLOCKS[2].words].map(w => nfc(w.dev))
    expect(got).toEqual(want)
    for (const k of got) expect(isNfc(k), k).toBe(true)
  })
  it('alle Blöcke → alle Wörter', () => expect(learnedWords(WORD_BLOCKS.map(b => b.id))).toHaveLength(words.length))
})
