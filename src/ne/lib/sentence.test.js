import { describe, it, expect } from 'vitest'
import { sentenceGroups, hitSegments } from './sentence.js'
import { WORD_BLOCKS } from '../data/words.js'

const T = (t, de) => (de ? { t, r: 'x', de } : { t })
const texts = groups => groups.map(g => g.map(x => x.t).join(''))

describe('sentenceGroups', () => {
  it('Leerzeichen im Satz trennen Gruppen; nachgestellte Wörter kleben am Nomen', () => {
    const tokens = [T('तपाईं', 'Sie'), T('लाई', 'für'), T('ठीक', 'ok'), T('छ', 'ist'), T('?')]
    const g = sentenceGroups('तपाईंलाई ठीक छ?', tokens)
    expect(texts(g)).toEqual(['तपाईंलाई', 'ठीक', 'छ?'])
    // Die Tokens selbst bleiben unverändert (eigenes de je Stück – छ hier „ist“).
    expect(g[2][0]).toBe(tokens[3])
  })
  it('Komma und Danda hängen am Wort davor', () => {
    const g = sentenceGroups('नमस्ते, धन्यवाद।', [T('नमस्ते', 'Hallo'), T(','), T('धन्यवाद', 'danke'), T('।')])
    expect(texts(g)).toEqual(['नमस्ते,', 'धन्यवाद।'])
  })
  it('passen Tokens nicht zum Satz, wird jedes Token eine eigene Gruppe (kein Absturz)', () => {
    const tokens = [T('क', 'a'), T('ख', 'b')]
    expect(texts(sentenceGroups('गघ', tokens))).toEqual(['क', 'ख'])

    expect(texts(sentenceGroups(undefined, tokens))).toEqual(['क', 'ख'])
  })
  it('Satz und Tokens werden über NFC verglichen (zerlegte Form im Satz passt trotzdem)', () => {
    const qa = 'क़'.normalize('NFC') // zerlegt: क + Nukta
    const composed = 'क़' // क़ als ein Zeichen – NFC zerlegt es
    const g = sentenceGroups(composed + ' छ।', [T(qa, 'x'), T('छ', 'ist'), T('।')])
    expect(g.map(x => x.length)).toEqual([1, 2])
  })
  it('im Notfall-Layout kleben Satzzeichen weiter am Token davor', () => {
    const g = sentenceGroups('passt nicht', [T('क', 'a'), T(','), T('ख', 'b'), T('?')])
    expect(texts(g)).toEqual(['क,', 'ख?'])
  })
  it('jeder echte Beispielsatz: Gruppen ergeben den Satz mit seinen Leerzeichen', () => {
    for (const w of WORD_BLOCKS.flatMap(b => b.words)) {
      expect(texts(sentenceGroups(w.ex.dev, w.ex.tokens)).join(' '), w.dev).toBe(w.ex.dev.trim().replace(/\s+/g, ' '))
    }
  })
})

describe('hitSegments', () => {
  const S = (l, r) => ({ left: l, right: r })
  const widths = segs => segs.map(s => Math.round(s.right - s.left))
  const contiguous = segs => segs.every((s, i) => i === 0 || Math.abs(s.left - segs[i - 1].right) < 1e-6)
  it('breite Tokens behalten ihre natürlichen Grenzen (Mitte der Lücke)', () => {
    const segs = hitSegments([S(0, 60), S(70, 130)], 44)
    expect(segs).toEqual([S(0, 65), S(65, 130)])
  })
  it('aneinanderklebende kurze Tokens (तपाईं|लाई): jedes ≥ 44, keine Überlappung', () => {
    const segs = hitSegments([S(100, 140), S(140, 160)], 44) // 40 + 20 px, ohne Lücke
    expect(widths(segs).every(w => w >= 44)).toBe(true)
    expect(contiguous(segs)).toBe(true)
  })
  it('viele kurze Tokens in einer Zeile: alle ≥ 44, aneinander, nicht überlappend', () => {
    const spans = [S(0, 18), S(26, 50), S(50, 64), S(72, 90), S(98, 120)]
    const segs = hitSegments(spans, 44, 0, 400)
    expect(widths(segs).every(w => w >= 44 - 1e-6)).toBe(true)
    expect(contiguous(segs)).toBe(true)
    expect(segs[0].left).toBeGreaterThanOrEqual(0)
  })
  it('bleibt im Rahmen [min, max], wenn genug Platz ist', () => {
    const segs = hitSegments([S(0, 10), S(10, 20)], 44, 0, 300)
    expect(segs[0].left).toBeGreaterThanOrEqual(0)
    expect(segs[1].right).toBeLessThanOrEqual(300)
    expect(widths(segs).every(w => w >= 44)).toBe(true)
  })
  it('leere Eingabe → leer', () => expect(hitSegments([], 44)).toEqual([]))
})
