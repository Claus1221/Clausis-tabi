import { describe, it, expect } from 'vitest'
import { PROPER_NAMES, baseKnown, wordParts, introWords, makeCourse, taughtWords, knownAfter } from './known.js'
import { functionWordSet } from './functionWords.js'
import { nfc } from './deva.js'
import { NE_PATH } from '../data/path.js'
import { DIALOGS } from '../data/dialogs.js'
import { CHAPTERS } from '../data/chapters.js'

const course = makeCourse({
  blocks: [{ id: 'nw1', words: [{ dev: 'पानी' }, { dev: 'दाल भात' }] }],
  grammar: { topics: [{ id: 'ng1' }], forms: { ng1: ['हुँ'], ng9: ['x'] }, newWords: { ng1: [{ dev: 'जर्मन' }] } },
  chapters: [{ id: 'nc1', steps: [{ kind: 'story', dev: 'चिया छ।' }, { kind: 'intro', dev: 'भिसा' }, { kind: 'intro', dev: 'पहिलो पटक' }] }],
  dialogs: [{ id: 'nd1', newPhrases: [{ dev: 'कति भयो' }], turns: [] }],
})

describe('known – eine Regel für „schon gelernt“', () => {
  it('Eigennamen und Funktionswörter gelten immer', () => {
    expect(PROPER_NAMES).toEqual(['आशा', 'माछापुच्छ्रे'])
    const base = baseKnown()
    for (const n of PROPER_NAMES) expect(base.has(nfc(n))).toBe(true)
    for (const w of functionWordSet()) expect(base.has(w)).toBe(true)
  })
  it('wordParts trennt an Leerzeichen, NFC, ohne Leeres', () => {
    expect(wordParts(' दाल  भात ')).toEqual(['दाल', 'भात'].map(nfc))
    expect(wordParts('')).toEqual([])
  })
  it('introWords: nur intro-Schritte lehren', () => {
    expect(introWords({ kind: 'intro', dev: 'पहिलो पटक' })).toEqual(['पहिलो', 'पटक'].map(nfc))
    expect(introWords({ kind: 'story', dev: 'चिया छ।' })).toEqual([])
  })
  it('taughtWords je Stationstyp (Wortblock, Grammatik, Kapitel, Szene)', () => {
    expect(taughtWords({ type: 'word', id: 'nw1' }, course)).toEqual(['पानी', 'दाल', 'भात'].map(nfc))
    expect(taughtWords({ type: 'grammar', id: 'ng1' }, course)).toEqual(['हुँ', 'जर्मन'].map(nfc))
    expect(taughtWords({ type: 'chapter', id: 'nc1' }, course)).toEqual(['भिसा', 'पहिलो', 'पटक'].map(nfc))
    expect(taughtWords({ type: 'dialog', id: 'nd1' }, course)).toEqual(['कति', 'भयो'].map(nfc))
  })
  it('Stationen ohne Daten, Überschriften und andere Typen lehren nichts', () => {
    expect(taughtWords({ type: 'grammar', id: 'ng9' }, course)).toEqual([])
    expect(taughtWords({ type: 'word', id: 'nw99' }, course)).toEqual([])
    expect(taughtWords({ world: 'A' }, course)).toEqual([])
    expect(taughtWords({ type: 'script', id: 's1' }, course)).toEqual([])
    expect(taughtWords(null, course)).toEqual([])
  })
  it('knownAfter: Grundbestand plus alles, was erledigte Stationen lehren', () => {
    const path = [{ type: 'word', id: 'nw1' }, { type: 'dialog', id: 'nd1' }, { type: 'chapter', id: 'nc1' }]
    const k = knownAfter(path, n => n.type !== 'chapter', course)
    expect(k.has(nfc('भात'))).toBe(true)
    expect(k.has(nfc('भयो'))).toBe(true)
    expect(k.has(nfc('भिसा'))).toBe(false)
    expect(k.has(nfc('आशा'))).toBe(true)
  })
  it('echter Kurs: Szenen und Kapitel im Pfad lehren ihre newPhrases bzw. intro-Wörter', () => {
    for (const d of DIALOGS) {
      if (!NE_PATH.some(n => n.type === 'dialog' && n.id === d.id)) continue
      const got = taughtWords({ type: 'dialog', id: d.id })
      for (const p of d.newPhrases || []) for (const w of wordParts(p.dev)) expect(got).toContain(w)
    }
    for (const c of CHAPTERS) {
      const got = taughtWords({ type: 'chapter', id: c.id })
      expect(got).toEqual(c.steps.flatMap(introWords))
    }
  })
})
