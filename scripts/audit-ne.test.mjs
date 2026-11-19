import { describe, it, expect } from 'vitest'
import { auditPath, FUNCTION_WORDS, functionWordSet, FUNCTION_WORD_LIMIT } from './audit-ne.mjs'

const tok = (t, de = 'x') => ({ t, r: 'x', de })
const word = (dev, ...tokens) => ({ dev, roman: 'x', de: 'x', ex: { dev: tokens.map(t => t.t).join(' '), roman: 'x', de: 'x', tokens } })
const blocks = [
  { id: 'nw1', words: [word('पानी', tok('पानी'), tok('छ'), { t: '।' }), word('दाल भात', tok('दाल'), tok('भात'))] },
  { id: 'nw2', words: [word('चिया', tok('चिया'), tok('तातो'), tok('पानी'))] },
  { id: 'nw3', words: [word('तातो', tok('तातो'), tok('बस'))] },
]
const path = [{ world: 'A' }, { type: 'script', id: 's1' }, { type: 'word', id: 'nw1' }, { type: 'word', id: 'nw2' }, { type: 'word', id: 'nw3' }]
const fw = new Set(['छ'])

describe('auditPath', () => {
  it('meldet Tokens, die an dieser Stelle noch nicht eingeführt sind', () => {
    expect(auditPath(path, blocks, fw)).toEqual([
      { block: 'nw2', word: 'चिया', token: 'तातो' }, // kommt erst mit nw3
      { block: 'nw3', word: 'तातो', token: 'बस' },   // kommt nie
    ])
  })
  it('Wort-Einträge mit Leerzeichen führen jeden Teil ein; Funktionswörter und Satzzeichen gelten immer', () => {
    const f = auditPath(path, blocks, fw)
    expect(f.some(x => x.token === 'दाल' || x.token === 'भात' || x.token === 'छ' || x.token === '।')).toBe(false)
  })
  it('die Pfad-Reihenfolge zählt, nicht die Reihenfolge in WORD_BLOCKS', () => {
    const swapped = [{ type: 'word', id: 'nw3' }, { type: 'word', id: 'nw2' }, { type: 'word', id: 'nw1' }]
    // nw3 zuerst: तातो eingeführt; बस fehlt; nw2 vor nw1: पानी noch unbekannt.
    expect(auditPath(swapped, blocks, fw)).toEqual([
      { block: 'nw3', word: 'तातो', token: 'बस' },
      { block: 'nw2', word: 'चिया', token: 'पानी' },
    ])
  })
  it('Stationen ohne Daten werden übersprungen', () => {
    expect(() => auditPath([{ type: 'word', id: 'nw99' }], blocks, fw)).not.toThrow()
  })
})

describe('FUNCTION_WORDS', () => {
  it('kurz, ohne Doppel, NFC', () => {
    const all = Object.values(FUNCTION_WORDS).flat()
    expect(all.length).toBeLessThanOrEqual(FUNCTION_WORD_LIMIT)
    expect(new Set(all).size).toBe(all.length)
    for (const w of all) expect(w).toBe(w.normalize('NFC'))
    expect(functionWordSet().size).toBe(all.length)
  })
})
