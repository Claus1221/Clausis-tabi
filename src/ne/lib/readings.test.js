import { describe, it, expect } from 'vitest'
import { GRAMMAR } from '../data/grammar.js'
import { readingOf } from './readings.js'
import { romanFits } from './deva.js'

describe('readingOf – Umschrift einer Antwort-Option', () => {
  it('aus den Kursdaten: Tokens und Wörter', () => {
    expect(readingOf('लाई')).toBe('lāī')
    expect(readingOf('म')).toBe('ma')
    expect(readingOf('लाई'.normalize('NFD'))).toBe('lāī')
  })
  it('Stamm + angehängtes Wort', () => {
    expect(readingOf('मलाई')).toBe('malāī')
  })
  it('Optionen, die sonst nirgends stehen: aus OPTION_READINGS', () => {
    expect(readingOf('छैनँ')).toBe('chainaṃ')
    expect(readingOf('जानुभयो')).toBe('jānubhayo')
  })
  it('mehrere Wörter: Teile mit Leerzeichen; ein unbekannter Teil → leer', () => {
    expect(readingOf('म म')).toBe('ma ma')
    expect(readingOf('म xyz')).toBe('')
    expect(readingOf('')).toBe('')
  })
  it('JEDE Option jeder Übung hat eine Umschrift, und sie passt zur Schrift (romanFits)', () => {
    const missing = []
    for (const g of GRAMMAR) for (const e of g.exercises) for (const o of e.options) {
      const r = readingOf(o)
      if (!r) { missing.push(`${g.id}: ${o}`); continue }
      expect(romanFits(o, r), `${o} ≠ ${r}`).toBe(true)
    }
    expect(missing).toEqual([])
  })
})
