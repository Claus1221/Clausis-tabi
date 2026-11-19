import { describe, it, expect } from 'vitest'
import { FUNCTION_WORDS, FUNCTION_WORD_LIMIT, functionWordSet, ATTACHED_SUFFIXES, isKnownWord } from './functionWords.js'

describe('FUNCTION_WORDS', () => {
  it('kurz, ohne Doppel, NFC', () => {
    const all = Object.values(FUNCTION_WORDS).flat()
    expect(all.length).toBeLessThanOrEqual(FUNCTION_WORD_LIMIT)
    expect(new Set(all).size).toBe(all.length)
    for (const w of all) expect(w).toBe(w.normalize('NFC'))
    expect(functionWordSet().size).toBe(all.length)
  })
  it('functionWordSet liefert jedes Mal eine frische Menge (Aufrufer dürfen sie erweitern)', () => {
    const a = functionWordSet()
    a.add('xyz')
    expect(functionWordSet().has('xyz')).toBe(false)
  })
})

describe('isKnownWord – angehängte Nachstellungen', () => {
  const known = new Set(['म', 'झोला', 'मा', 'लाई', 'दुई'])
  it('bekanntes Wort direkt', () => {
    expect(isKnownWord('झोला', known)).toBe(true)
  })
  it('Stamm + angehängtes Wort, beide bekannt', () => {
    expect(isKnownWord('झोलामा', known)).toBe(true)
    expect(isKnownWord('मलाई', known)).toBe(true)
  })
  it('Anhängsel selbst noch nicht eingeführt (वटा vor ng10) → unbekannt', () => {
    expect(ATTACHED_SUFFIXES).toContain('वटा')
    expect(isKnownWord('दुईवटा', known)).toBe(false)
    expect(isKnownWord('दुईवटा', new Set([...known, 'वटा']))).toBe(true)
  })
  it('unbekannter Stamm → unbekannt; NFD-Eingabe zählt wie NFC', () => {
    expect(isKnownWord('पानीमा', known)).toBe(false)
    expect(isKnownWord('झोलामा'.normalize('NFD'), known)).toBe(true)
  })
})
