import { describe, it, expect } from 'vitest'
import { auditPath, FUNCTION_WORDS, functionWordSet, FUNCTION_WORD_LIMIT } from './audit-ne.mjs'
import { FUNCTION_WORDS as FW_SOURCE } from '../src/ne/lib/functionWords.js'

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

describe('auditPath – Grammatik-Stationen', () => {
  const x = (dev, ...tokens) => ({ dev, roman: 'x', de: 'x', tokens })
  const e = (q, a) => ({ q, a, options: [a, 'y', 'z'], hint: '', de: '', roman: '' })
  const grammar = {
    topics: [
      { id: 'ng1', examples: [x('पानी छ।', tok('पानी'), tok('छ'), { t: '।' })], exercises: [e('पानी ＿＿।', 'छ')] },
      // ng2 lehrt हुँ (Form) und जर्मन (neues Wort); benutzt चिया, das erst nw2 bringt.
      { id: 'ng2', examples: [x('म जर्मन हुँ।', tok('म'), tok('जर्मन'), tok('हुँ'), { t: '।' }), x('चिया छ।', tok('चिया'), tok('छ'))],
        exercises: [e('म जर्मन ＿＿।', 'हुँ'), e('पानी＿＿ छ।', 'मा'), e('दुई＿＿ चिया।', 'वटा')] },
      // ng3 kommt nach nw2: चिया ist jetzt bekannt; वटा lehrt es selbst.
      { id: 'ng3', examples: [x('चिया छ।', tok('चिया'), tok('छ'))], exercises: [e('दुई＿＿ पानी।', 'वटा')] },
    ],
    newWords: { ng2: [{ dev: 'जर्मन' }] },
    forms: { ng2: ['हुँ', 'म'], ng3: ['वटा', 'दुई'] },
  }
  const gpath = [{ type: 'word', id: 'nw1' }, { type: 'grammar', id: 'ng1' }, { type: 'grammar', id: 'ng2' }, { type: 'word', id: 'nw2' }, { type: 'grammar', id: 'ng3' }, { type: 'chapter', id: 'nc1' }]
  const known = new Set(['छ', 'मा'])
  const found = auditPath(gpath, blocks, known, grammar)

  it('Beispiele: jedes antippbare Token muss bis zu dieser Station eingeführt sein', () => {
    expect(found).toContainEqual({ block: 'ng2', word: 'चिया छ।', token: 'चिया' })
    expect(found.some(f => f.block === 'ng3' && f.token === 'चिया')).toBe(false)
  })
  it('Formen und neue Wörter eines Themas gelten ab diesem Thema (nicht davor)', () => {
    expect(found.some(f => ['जर्मन', 'हुँ', 'म'].includes(f.token))).toBe(false)
    expect(found.some(f => f.block === 'ng1')).toBe(false)
  })
  it('gelöste Übungen: Wörter (auch Stamm + angehängtes Wort) müssen eingeführt sein', () => {
    // पानीमा: पानी (nw1) + मा (bekannt) → ok. दुईवटा in ng2: वटा/दुई kommen erst mit ng3.
    expect(found.some(f => f.token === 'पानीमा')).toBe(false)
    expect(found).toContainEqual({ block: 'ng2', word: 'दुईवटा चिया।', token: 'दुईवटा' })
    expect(found).toContainEqual({ block: 'ng2', word: 'दुईवटा चिया।', token: 'चिया' })
    expect(found.some(f => f.block === 'ng3')).toBe(false)
  })
  it('ein Thema ohne Daten und Stationen anderer Typen werden übersprungen', () => {
    expect(() => auditPath([{ type: 'grammar', id: 'ng9' }, { type: 'goal', id: 'goal' }], blocks, known, grammar)).not.toThrow()
    expect(auditPath([{ type: 'grammar', id: 'ng1' }], blocks, known)).toEqual([])
  })
})

describe('FUNCTION_WORDS', () => {
  it('kommt aus src/ne/lib/functionWords.js (eine Quelle für Audit und Daten-Tests)', () => {
    expect(FUNCTION_WORDS).toBe(FW_SOURCE)
    expect(functionWordSet().size).toBeLessThanOrEqual(FUNCTION_WORD_LIMIT)
  })
})
