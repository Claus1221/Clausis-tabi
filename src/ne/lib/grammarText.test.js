import { describe, it, expect } from 'vitest'
import { GRAMMAR, GRAMMAR_NEW_WORDS } from '../data/grammar.js'
import { explainParts } from './grammarText.js'

const words = [{ dev: 'झोला', roman: 'jholā', de: 'Tasche' }]
const sec = (h, text) => (h ? { h, text } : { text })

describe('explainParts – Erklärung eines Themas', () => {
  it('body hat einen Abschnitt „Neue Wörter“ → keine zusätzliche Liste', () => {
    const body = [sec(null, 'A'), sec('Neue Wörter', 'झोला „Tasche“ · und noch ein Satz dazu.')]
    expect(explainParts(body, words)).toEqual({ sections: body, list: [] })
  })
  it('auch „Neues Wort“ zählt als solcher Abschnitt', () => {
    const body = [sec('Neues Wort', 'झोला „Tasche“.')]
    expect(explainParts(body, words).list).toEqual([])
  })
  it('kein solcher Abschnitt → die Liste der neuen Wörter kommt dazu', () => {
    const body = [sec(null, 'A'), sec('Fragen', 'B')]
    expect(explainParts(body, words)).toEqual({ sections: body, list: words })
  })
  it('keine neuen Wörter → keine Liste', () => {
    expect(explainParts([sec(null, 'A')], []).list).toEqual([])
    expect(explainParts([sec(null, 'A')], undefined).list).toEqual([])
  })
  it('kein Text geht je verloren: alle Abschnitte bleiben, wie sie sind (echte Daten)', () => {
    for (const g of GRAMMAR) {
      const { sections } = explainParts(g.body, GRAMMAR_NEW_WORDS[g.id])
      expect(sections, g.id).toBe(g.body)
    }
  })
})
