import { describe, it, expect } from 'vitest'
import { GRAMMAR, GRAMMAR_ORDER, GRAMMAR_BY_ID, GRAMMAR_NEW_WORDS, GRAMMAR_FORMS, grammarKey, solved } from './grammar.js'
import { WORD_BLOCKS, WORD_BY_DEV } from './words.js'
import { romanFits, aksharas, nfc } from '../lib/deva.js'

// Paare aus Devanagari und Umschrift, die romanFits ablehnt, obwohl sie richtig sind.
// Je Eintrag eine Zeile Begründung; die Umschrift wird NIE verbogen. Schlüssel `${dev}|${roman}`.
const ROMAN_EXCEPTIONS = {}

const IDS = ['ng1', 'ng2', 'ng3', 'ng4', 'ng5', 'ng6', 'ng7', 'ng8', 'ng9', 'ng10', 'ng11', 'ng12']
// Verbindliche Reihenfolge aus dem Lernpfad (path-order.md): was VOR einem Thema liegt,
// darf es benutzen. Bewusst hier fest verdrahtet – NE_PATH bekommt die Grammatik-Stationen
// erst in der anderen Hälfte der Aufgabe.
const COURSE = ['nw1', 'ng1', 'ng2', 'nw2', 'ng3', 'nw3', 'ng4', 'ng5', 'nw4', 'ng8', 'ng9', 'ng10',
  'nw5', 'ng6', 'ng7', 'ng11', 'nw6', 'ng12', 'nw7']
// Angehängte Wörter: झोला+मा, तपाईं+को, दुई+वटा … – im Lückensatz ein Wort ohne Leerzeichen.
const SUFFIXES = ['लाई', 'बाट', 'वटा', 'मा', 'को', 'ले']
// Funktionswörter des Wort-Audits (FUNCTION_WORDS in scripts/audit-ne.mjs) – hier abgeschrieben,
// weil src/ne/ nicht aus scripts/ importieren darf (Importgrenze, s. src/ne/imports.test.js).
// Beide gleich halten.
const FUNCTION_WORDS = ['मा', 'को', 'लाई', 'बाट', 'हो', 'छ', 'छैन', 'होइन', 'छु', 'म', 'तपाईं', 'यो', 'त्यो',
  'मेरो', 'के', 'कति', 'कहाँ', 'र', 'चाहिन्छ', 'दिनुहोस्', 'जानुहोस्', 'जान्छ', 'हुन्छ']

const GAP = '＿＿'
const isNfc = s => s === nfc(s)
const fits = (dev, roman) => romanFits(dev, roman) || `${dev}|${roman}` in ROMAN_EXCEPTIONS
const nonEmpty = s => typeof s === 'string' && s.trim() !== ''
const letters = s => s.toLowerCase().normalize('NFC').replace(/[^\p{L}\p{M}]/gu, '')
const hasLetter = s => /[\p{L}\p{M}]/u.test(s)
const isDeva = s => /[ऀ-ॿ]/.test(s) && !/[A-Za-z]/.test(s)
// Eine angehängte Klammer („(wörtl. …)“, „(zum Fahrer)“) zählt nicht zum Satz.
const deCore = de => de.replace(/\s*\([^)]*\)\s*$/, '')
const examples = GRAMMAR.flatMap(g => g.examples.map(x => ({ ...x, topic: g.id })))
const exercises = GRAMMAR.flatMap(g => g.exercises.map(x => ({ ...x, topic: g.id })))
const tokens = examples.flatMap(x => x.tokens.map(t => ({ ...t, sentence: x.dev })))

describe('GRAMMAR – Gerüst', () => {
  it('zwölf Themen ng1…ng12', () => expect(GRAMMAR.map(g => g.id)).toEqual(IDS))
  it('GRAMMAR_ORDER folgt dem Lernpfad und enthält jede ID genau einmal', () => {
    expect(GRAMMAR_ORDER).toEqual(['ng1', 'ng2', 'ng3', 'ng4', 'ng5', 'ng8', 'ng9', 'ng10', 'ng6', 'ng7', 'ng11', 'ng12'])
    expect(new Set(GRAMMAR_ORDER).size).toBe(IDS.length)
    expect([...GRAMMAR_ORDER].sort()).toEqual([...IDS].sort())
    expect(COURSE.filter(id => id.startsWith('ng'))).toEqual(GRAMMAR_ORDER)
  })
  it('GRAMMAR_BY_ID und grammarKey', () => {
    for (const g of GRAMMAR) expect(GRAMMAR_BY_ID[g.id]).toBe(g)
    expect(Object.keys(GRAMMAR_BY_ID)).toHaveLength(12)
    expect(grammarKey('ng3')).toBe('g:ng3')
  })
  it('jedes Thema: Glyphe aus 1–2 Devanagari-Silben, Titel, Kurzbeschreibung, 2–4 Abschnitte', () => {
    for (const g of GRAMMAR) {
      const n = aksharas(g.glyph).length
      expect(n >= 1 && n <= 2, `${g.id}: ${g.glyph}`).toBe(true)
      expect(nonEmpty(g.title) && nonEmpty(g.summary), g.id).toBe(true)
      expect(g.body.length >= 2 && g.body.length <= 4, `${g.id}: ${g.body.length} Abschnitte`).toBe(true)
      for (const s of g.body) expect(nonEmpty(s.text), g.id).toBe(true)
    }
  })
  it('jedes Thema hat ≥ 3 Beispiele und ≥ 4 Übungen', () => {
    for (const g of GRAMMAR) {
      expect(g.examples.length, g.id).toBeGreaterThanOrEqual(3)
      expect(g.exercises.length, g.id).toBeGreaterThanOrEqual(4)
    }
  })
})

describe('Beispiele', () => {
  it('dev, roman, de, tokens vorhanden; alles NFC', () => {
    for (const x of examples) {
      for (const f of ['dev', 'roman', 'de']) expect(nonEmpty(x[f]), `${x.topic}.${f}`).toBe(true)
      expect(x.tokens.length > 0, x.dev).toBe(true)
      expect(isNfc(x.dev), x.dev).toBe(true)
      for (const t of x.tokens) expect(isNfc(t.t), t.t).toBe(true)
    }
  })
  it('romanFits für jeden Satz und jedes antippbare Token', () => {
    for (const x of examples) expect(fits(x.dev, x.roman), `${x.dev} ≠ ${x.roman}`).toBe(true)
    for (const t of tokens) if (t.r) expect(fits(t.t, t.r), `${t.sentence}: ${t.t} ≠ ${t.r}`).toBe(true)
  })
  it('Tokens mit de haben r; Tokens ohne de sind nur Satzzeichen', () => {
    for (const t of tokens) {
      if (t.de !== undefined) expect(nonEmpty(t.de) && nonEmpty(t.r), `${t.sentence}: ${t.t}`).toBe(true)
      else expect(hasLetter(t.t), `${t.sentence}: ${t.t}`).toBe(false)
    }
  })
  it('Tokens ergeben Satz (ohne Leerzeichen) und Umschrift (ohne Leer- und Satzzeichen)', () => {
    for (const x of examples) {
      expect(x.tokens.map(t => t.t).join(''), x.dev).toBe(x.dev.replace(/\s/g, ''))
      expect(x.tokens.map(t => t.r || '').join(''), x.dev).toBe(letters(x.roman))
    }
  })
  it('Aussagen enden mit ।, Fragen mit ? – in Satz, Umschrift und Übersetzung gleich', () => {
    for (const x of examples) {
      const q = x.dev.endsWith('?')
      expect(q || x.dev.endsWith('।'), x.dev).toBe(true)
      expect(x.roman.endsWith(q ? '?' : '.'), x.roman).toBe(true)
      expect(deCore(x.de).endsWith('?'), x.de).toBe(q)
    }
  })
})

describe('Übungen (Lückensätze)', () => {
  it('genau eine Lücke ＿＿, sonst kein ＿', () => {
    for (const e of exercises) {
      expect(e.q.split(GAP).length, e.q).toBe(2)
      expect(e.q.replace(GAP, '').includes('＿'), e.q).toBe(false)
    }
  })
  it('a steht in options; options eindeutig, ≥ 3, alle Devanagari und NFC', () => {
    for (const e of exercises) {
      expect(e.options, e.q).toContain(e.a)
      expect(e.options.length, e.q).toBeGreaterThanOrEqual(3)
      expect(new Set(e.options).size, e.q).toBe(e.options.length)
      for (const o of e.options) {
        expect(isDeva(o), `${e.q}: ${o}`).toBe(true)
        expect(isNfc(o), o).toBe(true)
      }
      expect(isNfc(e.q), e.q).toBe(true)
    }
  })
  it('hint, de und roman vorhanden', () => {
    for (const e of exercises) for (const f of ['hint', 'de', 'roman']) expect(nonEmpty(e[f]), `${e.q}.${f}`).toBe(true)
  })
  it('solved setzt die Lösung ein', () => {
    expect(solved({ q: 'म सन्चै ＿＿।', a: 'छु' })).toBe('म सन्चै छु।')
    expect(solved({ q: 'म＿＿ पानी चाहिन्छ।', a: 'लाई' })).toBe('मलाई पानी चाहिन्छ।')
    for (const e of exercises) expect(solved(e).includes('＿'), e.q).toBe(false)
  })
  it('romanFits für den gelösten Satz', () => {
    for (const e of exercises) expect(fits(solved(e), e.roman), `${solved(e)} ≠ ${e.roman}`).toBe(true)
  })
  it('Aussagen enden mit ।, Fragen mit ? – in Satz, Umschrift und Übersetzung gleich', () => {
    for (const e of exercises) {
      const s = solved(e)
      const q = s.endsWith('?')
      expect(q || s.endsWith('।'), s).toBe(true)
      expect(e.roman.endsWith(q ? '?' : '.'), e.roman).toBe(true)
      expect(deCore(e.de).endsWith('?'), e.de).toBe(q)
    }
  })
})

describe('Wortschatz-Disziplin', () => {
  it('GRAMMAR_NEW_WORDS: höchstens 3 je Thema, neu, Umschrift passt, im Text vorgestellt und benutzt', () => {
    for (const [id, list] of Object.entries(GRAMMAR_NEW_WORDS)) {
      const g = GRAMMAR_BY_ID[id]
      expect(g, id).toBeTruthy()
      expect(list.length, id).toBeLessThanOrEqual(3)
      const body = g.body.map(s => s.text).join(' ')
      const used = [...g.examples.map(x => x.dev), ...g.exercises.map(solved)].join(' ')
      for (const w of list) {
        for (const f of ['dev', 'roman', 'de']) expect(nonEmpty(w[f]), `${id}.${f}`).toBe(true)
        expect(WORD_BY_DEV[w.dev], `${w.dev} ist schon ein Wort in WORD_BLOCKS`).toBeUndefined()
        expect(fits(w.dev, w.roman), `${w.dev} ≠ ${w.roman}`).toBe(true)
        expect(body.includes(w.dev), `${id}: ${w.dev} fehlt im Erklärtext`).toBe(true)
        expect(used.includes(w.dev), `${id}: ${w.dev} wird nicht benutzt`).toBe(true)
      }
    }
  })
  it('GRAMMAR_FORMS kennt nur echte Themen', () => {
    for (const id of Object.keys(GRAMMAR_FORMS)) expect(IDS, id).toContain(id)
  })
  it('Beispiele und gelöste Übungen benutzen nur, was im Pfad vorher eingeführt ist', () => {
    const blocks = Object.fromEntries(WORD_BLOCKS.map(b => [b.id, b]))
    const known = new Set(FUNCTION_WORDS.map(nfc))
    const isKnown = w => known.has(w) || SUFFIXES.some(s => w.endsWith(s) && known.has(w.slice(0, -s.length)))
    for (const id of COURSE) {
      if (id.startsWith('nw')) {
        for (const w of blocks[id].words) for (const p of [w.dev, ...w.dev.split(' ')]) known.add(nfc(p))
        continue
      }
      // Das Thema selbst führt seine Formen und neuen Wörter ein.
      for (const f of GRAMMAR_FORMS[id] || []) known.add(nfc(f))
      for (const w of GRAMMAR_NEW_WORDS[id] || []) known.add(nfc(w.dev))
      const g = GRAMMAR_BY_ID[id]
      for (const x of g.examples) for (const t of x.tokens) {
        if (t.de) expect(known.has(nfc(t.t)), `${id} „${x.dev}“: ${t.t} ist hier noch nicht eingeführt`).toBe(true)
      }
      for (const e of g.exercises) {
        for (const w of solved(e).split(/[\s,।?–]+/).filter(hasLetter)) {
          expect(isKnown(nfc(w)), `${id} „${solved(e)}“: ${w} ist hier noch nicht eingeführt`).toBe(true)
        }
      }
    }
  })
})

describe('ROMAN_EXCEPTIONS', () => {
  it('jede Ausnahme wird noch gebraucht', () => {
    const pairs = new Set([
      ...examples.map(x => `${x.dev}|${x.roman}`),
      ...tokens.filter(t => t.r).map(t => `${t.t}|${t.r}`),
      ...exercises.map(e => `${solved(e)}|${e.roman}`),
      ...Object.values(GRAMMAR_NEW_WORDS).flat().map(w => `${w.dev}|${w.roman}`),
    ])
    for (const key of Object.keys(ROMAN_EXCEPTIONS)) {
      expect(pairs.has(key), key).toBe(true)
      const [dev, roman] = key.split('|')
      expect(romanFits(dev, roman), key).toBe(false)
    }
  })
})
