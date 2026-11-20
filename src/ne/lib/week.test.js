import { describe, it, expect } from 'vitest'
import { weekLearned } from './week.js'

const zero = { xp: 0, days: 0, kana: 0, words: 0, grammar: 0, chapters: 0, scenes: 0 }

describe('weekLearned', () => {
  it('nichts gelernt → leere Liste', () => {
    expect(weekLearned(zero)).toEqual([])
    expect(weekLearned({})).toEqual([])
  })
  it('nur Arten über 0, in fester Reihenfolge, mit Einzahl/Mehrzahl', () => {
    expect(weekLearned({ ...zero, kana: 12, words: 1, chapters: 2 })).toEqual([
      { n: 12, label: 'Zeichen' },
      { n: 1, label: 'Wort' },
      { n: 2, label: 'Kapitel' },
    ])
    expect(weekLearned({ ...zero, kana: 1, words: 7, grammar: 1, chapters: 1, scenes: 3 })).toEqual([
      { n: 1, label: 'Zeichen' },
      { n: 7, label: 'Wörter' },
      { n: 1, label: 'Grammatik-Thema' },
      { n: 1, label: 'Kapitel' },
      { n: 3, label: 'Szenen' },
    ])
    expect(weekLearned({ ...zero, grammar: 2, scenes: 1 })).toEqual([
      { n: 2, label: 'Grammatik-Themen' },
      { n: 1, label: 'Szene' },
    ])
  })
})
