import { describe, it, expect } from 'vitest'
import { collectNeTexts, RATE_WORD, RATE_SENTENCE } from './collect-ne.mjs'

const script = {
  क: { roman: 'ka', kind: 'consonant', tip: '', say: 'क', shown: 'क' },
  'ा': { roman: 'ā', kind: 'matra', tip: '', say: 'का', shown: 'का' },
}

describe('collectNeTexts', () => {
  it('Einzelzeichen kommen mit say und Wort-Tempo', () => {
    const t = collectNeTexts({ script })
    expect(t).toContainEqual(['क', RATE_WORD])
    expect(t).toContainEqual(['का', RATE_WORD]) // say, nicht der Schlüssel „ा“
    expect(t.some(([x]) => x === 'ा')).toBe(false)
  })

  it('Wort-Tempo gilt auch, wenn derselbe Text zusätzlich als Satz vorkommt', () => {
    const t = collectNeTexts({ script: { क: script.क, ख: { ...script.क, say: 'क' } } })
    expect(t.filter(([x]) => x === 'क')).toEqual([['क', RATE_WORD]])
    expect(RATE_WORD).toBeLessThan(RATE_SENTENCE)
  })

  it('Texte ohne Devanagari werden übergangen', () => {
    const t = collectNeTexts({ script: { a: { say: 'a' }, '1': { say: '1' }, क: script.क } })
    expect(t).toEqual([['क', RATE_WORD]])
  })

  it('kein Text doppelt, NFC-normalisiert', () => {
    const decomposed = 'क' + '़' // क + Nukta
    const composed = decomposed.normalize('NFC')
    const t = collectNeTexts({ script: { x: { say: decomposed }, y: { say: composed }, क: script.क } })
    const texts = t.map(([x]) => x)
    expect(new Set(texts).size).toBe(texts.length)
    expect(texts).toContain(composed)
  })

  // Wortblöcke im Format von src/ne/data/words.js (nur die gelesenen Felder).
  const words = [{
    id: 'nw1', words: [
      { dev: 'पानी', ex: { dev: 'पानी छ।', tokens: [{ t: 'पानी', r: 'pānī', de: 'Wasser' }, { t: 'छ', r: 'cha', de: 'ist' }, { t: '।' }] } },
      // Ein „Satz“, der zugleich als Einzelwort vorkommt: nur ein Wort lang.
      { dev: 'धन्यवाद', ex: { dev: 'धन्यवाद', tokens: [{ t: 'धन्यवाद', r: 'dhanyabād', de: 'danke' }] } },
    ],
  }]

  it('Wörter: Wort und Token mit Wort-Tempo, Beispielsatz mit Satz-Tempo', () => {
    const t = collectNeTexts({ words })
    expect(t).toContainEqual(['पानी', RATE_WORD])
    expect(t).toContainEqual(['छ', RATE_WORD]) // antippbares Token
    expect(t).toContainEqual(['पानी छ।', RATE_SENTENCE])
    expect(t.some(([x]) => x === '।')).toBe(false) // Satzzeichen-Token nicht
  })

  it('ein Text, der als Satz UND als Einzelwort vorkommt, bekommt das Wort-Tempo', () => {
    // धन्यवाद ist Wort und (einwortiger) Beispielsatz – in beiden Reihenfolgen.
    const t = collectNeTexts({ words })
    expect(t.filter(([x]) => x === 'धन्यवाद')).toEqual([['धन्यवाद', RATE_WORD]])
    const satzZuerst = [{ id: 'nw9', words: [
      { dev: 'नमस्ते छ', ex: { dev: 'नमस्ते', tokens: [] } },
      { dev: 'नमस्ते', ex: { dev: 'नमस्ते छ', tokens: [] } },
    ] }]
    const u = collectNeTexts({ words: satzZuerst })
    expect(u.filter(([x]) => x === 'नमस्ते')).toEqual([['नमस्ते', RATE_WORD]])
    expect(u.filter(([x]) => x === 'नमस्ते छ')).toEqual([['नमस्ते छ', RATE_WORD]])
  })

  it('fehlende Quellen sind erlaubt', () => {
    expect(collectNeTexts({})).toEqual([])
  })
})
