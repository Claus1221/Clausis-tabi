import { describe, it, expect } from 'vitest'
import { sentenceGroups } from './sentence.js'
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
  it('jeder echte Beispielsatz: Gruppen ergeben den Satz mit seinen Leerzeichen', () => {
    for (const w of WORD_BLOCKS.flatMap(b => b.words)) {
      expect(texts(sentenceGroups(w.ex.dev, w.ex.tokens)).join(' '), w.dev).toBe(w.ex.dev.trim().replace(/\s+/g, ' '))
    }
  })
})
