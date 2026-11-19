import { describe, it, expect } from 'vitest'
import { SCRIPT_DATA, SCRIPT_LESSONS, SCRIPT_NOTES } from './script.js'

const KINDS = ['vowel', 'consonant', 'matra', 'conjunct', 'sign', 'digit']
const DIGITS = [...'०१२३४५६७८९']
const CONSONANTS = [...'कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह']

describe('SCRIPT_LESSONS', () => {
  it('genau 14 Lektionen s1…s14 in Reihenfolge', () => {
    expect(SCRIPT_LESSONS.map(l => l.id)).toEqual(Array.from({ length: 14 }, (_, i) => `s${i + 1}`))
  })
  it('jede Lektion hat Titel, Untertitel und Zeichen', () => {
    for (const l of SCRIPT_LESSONS) {
      expect(l.title, l.id).toBeTruthy()
      expect(l.sub, l.id).toBeTruthy()
      expect(l.chars.length, l.id).toBeGreaterThan(0)
    }
  })
  it('jedes Zeichen einer Lektion steht in SCRIPT_DATA', () => {
    for (const l of SCRIPT_LESSONS) for (const ch of l.chars) expect(SCRIPT_DATA[ch], `${l.id}: ${ch}`).toBeDefined()
  })
  it('kein Zeichen in zwei Lektionen', () => {
    const all = SCRIPT_LESSONS.flatMap(l => l.chars)
    expect(new Set(all).size).toBe(all.length)
  })
  it('alle Ziffern ०–९ und die 33 Grundkonsonanten kommen vor', () => {
    const all = new Set(SCRIPT_LESSONS.flatMap(l => l.chars))
    expect(CONSONANTS).toHaveLength(33)
    for (const ch of [...DIGITS, ...CONSONANTS]) expect(all.has(ch), ch).toBe(true)
  })
})

describe('SCRIPT_DATA', () => {
  it('jedes Zeichen hat roman, tip, say, shown und eine gültige Art', () => {
    for (const [ch, d] of Object.entries(SCRIPT_DATA)) {
      for (const f of ['roman', 'tip', 'say', 'shown']) expect(typeof d[f] === 'string' && d[f].trim(), `${ch}.${f}`).toBeTruthy()
      expect(KINDS, ch).toContain(d.kind)
    }
  })
  it('jeder Schlüssel ist NFC', () => {
    for (const ch of Object.keys(SCRIPT_DATA)) expect(ch.normalize('NFC'), ch).toBe(ch)
  })
  it('Vokalzeichen und Zusatzzeichen werden am Konsonanten gezeigt', () => {
    for (const [ch, d] of Object.entries(SCRIPT_DATA)) {
      if (d.kind === 'matra' || d.kind === 'sign') expect(d.shown.includes(ch) && d.shown.length > 1, ch).toBe(true)
      else expect(d.shown, ch).toBe(ch)
    }
  })
  it('jedes Zeichen gehört zu einer Lektion', () => {
    const all = new Set(SCRIPT_LESSONS.flatMap(l => l.chars))
    for (const ch of Object.keys(SCRIPT_DATA)) expect(all.has(ch), ch).toBe(true)
  })
})

describe('SCRIPT_NOTES', () => {
  it('Hinweise behaucht/unbehaucht und dental/retroflex mit bekannten Zeichenpaaren', () => {
    expect(SCRIPT_NOTES.length).toBeGreaterThanOrEqual(2)
    for (const n of SCRIPT_NOTES) {
      expect(n.id && n.title && n.text, n.id).toBeTruthy()
      expect(n.pairs.length, n.id).toBeGreaterThan(0)
      for (const [a, b] of n.pairs) { expect(SCRIPT_DATA[a], a).toBeDefined(); expect(SCRIPT_DATA[b], b).toBeDefined() }
    }
  })
})
