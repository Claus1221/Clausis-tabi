import { describe, it, expect } from 'vitest'
import { DIALOGS, DIALOG_BY_ID } from './dialogs.js'
import { WORD_BLOCKS } from './words.js'
import { GRAMMAR_NEW_WORDS, GRAMMAR_FORMS } from './grammar.js'
import { functionWordSet } from '../lib/functionWords.js'
import { romanFits, nfc } from '../lib/deva.js'

// Alle antippbaren Wörter einer Szene (NPC-Zeilen und Antwortsätze), NFC, ohne Doppelte, in
// Spielreihenfolge – nur die Tests hier brauchen sie (die App nimmt answerWords, lib/dialog.js).
function dialogVocab(dialog) {
  const seen = new Set()
  for (const t of dialog.turns) for (const k of [...t.npcTokens, ...t.answerTokens]) if (k.de) seen.add(nfc(k.t))
  return [...seen]
}

// Paare aus Devanagari und Umschrift, die romanFits ablehnt, obwohl sie richtig sind.
// Je Eintrag eine Zeile Begründung; die Umschrift wird NIE verbogen. Schlüssel `${dev}|${roman}`.
const ROMAN_EXCEPTIONS = {}

const IDS = ['nd1', 'nd2', 'nd3', 'nd4', 'nd5', 'nd6']
// Was VOR einer Szene im Lernpfad liegt (path-order.md) – bewusst fest verdrahtet: Wortblöcke
// und Grammatik-Themen, keine Kapitel (deren Wörter gelten für Szenen nicht als gelehrt).
const W4 = ['nw1', 'ng1', 'ng2', 'nw2', 'ng3']
const W5 = [...W4, 'nw3', 'ng4', 'ng5']
const W6 = [...W5, 'nw4', 'ng8', 'ng9', 'ng10']
const W7 = [...W6, 'nw5', 'ng6', 'ng7', 'ng11']
const W8 = [...W7, 'nw6', 'ng12']
const W9 = [...W8, 'nw7']
const BEFORE = { nd1: W5, nd3: W6, nd4: W6, nd5: W7, nd2: W8, nd6: W9 }
// Angehängte Wörter (म+लाई, यहाँ+बाट, दुई+वटा …) – in Antwort-Optionen ohne Tokens.
const SUFFIXES = ['लाई', 'बाट', 'वटा', 'सँग', 'मा', 'को', 'ले']

const fits = (dev, roman) => romanFits(dev, roman) || `${dev}|${roman}` in ROMAN_EXCEPTIONS
const nonEmpty = s => typeof s === 'string' && s.trim() !== ''
const isNfc = s => s === nfc(s)
const letters = s => s.toLowerCase().normalize('NFC').replace(/[^\p{L}\p{M}]/gu, '')
const hasLetter = s => /[\p{L}\p{M}]/u.test(s)
const words = dev => dev.split(/[\s,।?]+/).filter(hasLetter)
const deCore = de => de.replace(/\s*\([^)]*\)\s*$/, '')
const turns = DIALOGS.flatMap(d => d.turns.map(t => ({ ...t, scene: d.id })))

// Was vor einer Szene bekannt ist: Funktionswörter + Wörter der Blöcke (auch die Teile
// mehrteiliger Einträge wie „माफ गर्नुहोस्“) + neue Wörter und Formen der Themen + die
// eigenen newPhrases der Szene.
function knownBefore(d) {
  const known = functionWordSet()
  const blocks = Object.fromEntries(WORD_BLOCKS.map(b => [b.id, b]))
  for (const id of BEFORE[d.id]) {
    if (id.startsWith('nw')) {
      for (const w of blocks[id].words) for (const p of [w.dev, ...w.dev.split(' ')]) known.add(nfc(p))
    } else {
      for (const f of GRAMMAR_FORMS[id] || []) known.add(nfc(f))
      for (const w of GRAMMAR_NEW_WORDS[id] || []) known.add(nfc(w.dev))
    }
  }
  for (const p of d.newPhrases || []) for (const part of [p.dev, ...p.dev.split(' ')]) known.add(nfc(part))
  return known
}
const isKnown = (w, known) => known.has(w) || SUFFIXES.some(s => w.length > s.length && w.endsWith(s) && known.has(s) && known.has(w.slice(0, -s.length)))

describe('DIALOGS – Gerüst', () => {
  it('sechs Szenen nd1…nd6, DIALOG_BY_ID', () => {
    expect([...DIALOGS.map(d => d.id)].sort()).toEqual(IDS)
    for (const d of DIALOGS) expect(DIALOG_BY_ID[d.id]).toBe(d)
  })
  it('Titel, Emoji, Ort, Szene (zwei Sätze), Rolle – Deutsch, nicht leer', () => {
    for (const d of DIALOGS) {
      for (const f of ['title', 'emoji', 'place', 'sceneDe', 'role']) expect(nonEmpty(d[f]), `${d.id}.${f}`).toBe(true)
      expect(d.sceneDe.split(/[.!?]\s+/).length, `${d.id}: sceneDe zwei Sätze`).toBe(2)
    }
  })
  it('je 5–8 Züge', () => {
    for (const d of DIALOGS) expect(d.turns.length >= 5 && d.turns.length <= 8, `${d.id}: ${d.turns.length}`).toBe(true)
  })
  it('höchstens drei newPhrases je Szene, vollständig, Umschrift passt', () => {
    for (const d of DIALOGS) {
      const list = d.newPhrases || []
      expect(list.length, d.id).toBeLessThanOrEqual(3)
      for (const p of list) {
        for (const f of ['dev', 'roman', 'de']) expect(nonEmpty(p[f]), `${d.id}.${f}`).toBe(true)
        expect(fits(p.dev, p.roman), `${p.dev} ≠ ${p.roman}`).toBe(true)
      }
    }
  })
  it('ein Zug ohne NPC-Zeile nur am Anfang des Gesprächs oder mit Regieanweisung in de', () => {
    for (const t of turns) if (t.npc === '') {
      expect(t.npcRoman, t.scene).toBe('')
      expect(t.npcTokens, t.scene).toEqual([])
      expect(nonEmpty(t.de), t.scene).toBe(true)
    }
  })
})

describe('Züge', () => {
  it('genau drei verschiedene Optionen, answer darunter, NFC', () => {
    for (const t of turns) {
      expect(t.options, `${t.scene}: ${t.answer}`).toHaveLength(3)
      expect(new Set(t.options).size, t.scene).toBe(3)
      expect(t.options, t.scene).toContain(t.answer)
      for (const o of t.options) expect(isNfc(o), o).toBe(true)
      expect(isNfc(t.npc), t.npc).toBe(true)
    }
  })
  it('optionsMeta deckt jede Option ab; answerRoman/answerDe = Meta der Antwort', () => {
    for (const t of turns) {
      expect(Object.keys(t.optionsMeta).sort(), t.scene).toEqual([...t.options].sort())
      for (const o of t.options) {
        expect(nonEmpty(t.optionsMeta[o].roman) && nonEmpty(t.optionsMeta[o].de), o).toBe(true)
      }
      expect(t.answerRoman, t.answer).toBe(t.optionsMeta[t.answer].roman)
      expect(t.answerDe, t.answer).toBe(t.optionsMeta[t.answer].de)
    }
  })
  it('de und answerDe überall gesetzt', () => {
    for (const t of turns) expect(nonEmpty(t.de) && nonEmpty(t.answerDe), `${t.scene}: ${t.answer}`).toBe(true)
  })
  it('romanFits für NPC-Zeile, jede Option', () => {
    for (const t of turns) {
      if (t.npc) expect(fits(t.npc, t.npcRoman), `${t.npc} ≠ ${t.npcRoman}`).toBe(true)
      for (const o of t.options) expect(fits(o, t.optionsMeta[o].roman), `${o} ≠ ${t.optionsMeta[o].roman}`).toBe(true)
    }
  })
  it('Aussagen enden mit ।, Fragen mit ? – in Satz, Umschrift und Übersetzung gleich', () => {
    const check = (dev, roman, de) => {
      const q = dev.endsWith('?')
      expect(q || dev.endsWith('।'), dev).toBe(true)
      expect(roman.endsWith(q ? '?' : '.'), roman).toBe(true)
      expect(deCore(de).endsWith('?'), `${dev} → ${de}`).toBe(q)
    }
    for (const t of turns) {
      if (t.npc) check(t.npc, t.npcRoman, t.de)
      for (const o of t.options) check(o, t.optionsMeta[o].roman, t.optionsMeta[o].de)
    }
  })
  it('Antworten sind kurz: 2–6 Wörter', () => {
    for (const t of turns) {
      const n = words(t.answer).length
      expect(n >= 2 && n <= 6, `${t.answer}: ${n}`).toBe(true)
    }
  })
  it('keine Antwort einer Szene steht in derselben Szene als Option eines anderen Zugs', () => {
    for (const d of DIALOGS) {
      for (const [i, t] of d.turns.entries()) {
        for (const [j, u] of d.turns.entries()) if (i !== j) expect(u.options, `${d.id}: ${t.answer}`).not.toContain(t.answer)
      }
    }
  })
  it('die richtige Antwort steht nicht in jeder Szene an derselben Stelle', () => {
    for (const d of DIALOGS) expect(new Set(d.turns.map(t => t.options.indexOf(t.answer))).size, d.id).toBeGreaterThan(1)
  })
})

describe('Tokens', () => {
  const lines = turns.flatMap(t => [
    ...(t.npc ? [{ dev: t.npc, roman: t.npcRoman, tokens: t.npcTokens }] : []),
    { dev: t.answer, roman: t.answerRoman, tokens: t.answerTokens },
  ])
  it('ergeben Satz (ohne Leerzeichen) und Umschrift (ohne Leer- und Satzzeichen)', () => {
    for (const x of lines) {
      expect(x.tokens.map(k => k.t).join(''), x.dev).toBe(x.dev.replace(/\s/g, ''))
      expect(x.tokens.map(k => k.r || '').join(''), x.dev).toBe(letters(x.roman))
    }
  })
  it('Tokens mit de haben r und passende Umschrift; ohne de nur Satzzeichen', () => {
    for (const x of lines) for (const k of x.tokens) {
      if (k.de !== undefined) {
        expect(nonEmpty(k.de) && nonEmpty(k.r), `${x.dev}: ${k.t}`).toBe(true)
        expect(fits(k.t, k.r), `${x.dev}: ${k.t} ≠ ${k.r}`).toBe(true)
      } else expect(hasLetter(k.t), `${x.dev}: ${k.t}`).toBe(false)
    }
  })
  it('dialogVocab: alle antippbaren Tokens der Szene, NFC, ohne Doppelte', () => {
    for (const d of DIALOGS) {
      const v = dialogVocab(d)
      expect(new Set(v).size, d.id).toBe(v.length)
      const expected = new Set(d.turns.flatMap(t => [...t.npcTokens, ...t.answerTokens]).filter(k => k.de).map(k => nfc(k.t)))
      expect(new Set(v), d.id).toEqual(expected)
      for (const w of v) expect(isNfc(w), w).toBe(true)
    }
  })
})

describe('Wortschatz-Disziplin', () => {
  it('jedes antippbare Wort ist vor der Szene eingeführt (Block, Thema, Funktionswort, newPhrases)', () => {
    for (const d of DIALOGS) {
      const known = knownBefore(d)
      for (const w of dialogVocab(d)) expect(known.has(w), `${d.id}: ${w} ist hier noch nicht eingeführt`).toBe(true)
    }
  })
  it('auch die falschen Optionen benutzen nur Eingeführtes', () => {
    for (const d of DIALOGS) {
      const known = knownBefore(d)
      for (const t of d.turns) for (const o of t.options) for (const w of words(o)) {
        expect(isKnown(nfc(w), known), `${d.id} „${o}“: ${w} ist hier noch nicht eingeführt`).toBe(true)
      }
    }
  })
  it('newPhrases werden in der Szene wirklich benutzt und sind nicht schon bekannt', () => {
    for (const d of DIALOGS) {
      const all = d.turns.flatMap(t => [t.npc, ...t.options]).join(' ')
      const withoutOwn = knownBefore({ ...d, newPhrases: [] })
      for (const p of d.newPhrases || []) {
        expect(all.includes(p.dev), `${d.id}: ${p.dev} wird nicht benutzt`).toBe(true)
        expect(p.dev.split(' ').every(part => withoutOwn.has(nfc(part))), `${d.id}: ${p.dev} ist schon bekannt`).toBe(false)
      }
    }
  })
})

describe('ROMAN_EXCEPTIONS', () => {
  it('jede Ausnahme wird noch gebraucht', () => {
    const pairs = new Set(turns.flatMap(t => [
      `${t.npc}|${t.npcRoman}`,
      ...t.options.map(o => `${o}|${t.optionsMeta[o].roman}`),
      ...[...t.npcTokens, ...t.answerTokens].filter(k => k.r).map(k => `${k.t}|${k.r}`),
    ]).concat(DIALOGS.flatMap(d => (d.newPhrases || []).map(p => `${p.dev}|${p.roman}`))))
    for (const key of Object.keys(ROMAN_EXCEPTIONS)) {
      expect(pairs.has(key), key).toBe(true)
      const [dev, roman] = key.split('|')
      expect(romanFits(dev, roman), key).toBe(false)
    }
  })
})
