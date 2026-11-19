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

  it('fehlende Quellen sind erlaubt', () => {
    expect(collectNeTexts({})).toEqual([])
  })
})
