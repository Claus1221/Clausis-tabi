import { describe, it, expect } from 'vitest'
import { GRAMMAR, GRAMMAR_BY_ID, grammarKey } from '../data/grammar.js'
import { pickDrill, isGrammarKey, topicForKey, GRAMMAR_QUALITY } from './grammarSrs.js'

// Kleines Thema mit drei Übungen – die echten Daten ändern sich, die Regel nicht.
const ex = q => ({ q, a: 'x', options: ['x', 'y', 'z'] })
const topic = { id: 'ngT', exercises: [ex('A'), ex('B'), ex('C')] }
const never = () => { throw new Error('random darf hier nicht gefragt werden') }

describe('isGrammarKey / topicForKey', () => {
  it('nur g:-Schlüssel sind Grammatik', () => {
    expect(isGrammarKey('g:ng1')).toBe(true)
    expect(isGrammarKey(grammarKey('ng12'))).toBe(true)
    expect(isGrammarKey('w:छ')).toBe(false)
    expect(isGrammarKey('छ')).toBe(false)
    expect(isGrammarKey(undefined)).toBe(false)
    expect(isGrammarKey(42)).toBe(false)
  })
  it('jedes Thema wird über seinen Schlüssel gefunden', () => {
    for (const g of GRAMMAR) expect(topicForKey(grammarKey(g.id))).toBe(GRAMMAR_BY_ID[g.id])
  })
  it('unbekannte oder fremde Schlüssel → null, kein Wurf', () => {
    expect(topicForKey('g:ng99')).toBeNull()
    expect(topicForKey('w:पानी')).toBeNull()
    expect(topicForKey('क')).toBeNull()
    expect(topicForKey(null)).toBeNull()
  })
})

describe('pickDrill – Übungen reihum statt immer dieselbe', () => {
  it('Index = reps modulo Anzahl Übungen', () => {
    expect(pickDrill(topic, { reps: 0 }, never).q).toBe('A')
    expect(pickDrill(topic, { reps: 1 }, never).q).toBe('B')
    expect(pickDrill(topic, { reps: 2 }, never).q).toBe('C')
    expect(pickDrill(topic, { reps: 3 }, never).q).toBe('A')
    expect(pickDrill(topic, { reps: 7 }, never).q).toBe('B')
  })
  it('aufeinanderfolgende Wiederholungen (reps steigt) zeigen nie zweimal dieselbe Übung', () => {
    for (const g of GRAMMAR) {
      const seen = []
      for (let reps = 0; reps < g.exercises.length; reps++) seen.push(pickDrill(g, { reps }, never))
      expect(new Set(seen).size, g.id).toBe(g.exercises.length)
    }
  })
  it('ohne reps (nie geplant, Altbestand) entscheidet der Zufall', () => {
    expect(pickDrill(topic, undefined, () => 0).q).toBe('A')
    expect(pickDrill(topic, {}, () => 0.5).q).toBe('B')
    expect(pickDrill(topic, { reps: 'x' }, () => 0.99).q).toBe('C')
  })
  it('avoid: dieselbe Übung nicht gleich nochmal (Nochmal in derselben Runde) – dann die nächste', () => {
    expect(pickDrill(topic, { reps: 1 }, never, 'B').q).toBe('C')
    expect(pickDrill(topic, { reps: 2 }, never, 'C').q).toBe('A')
    expect(pickDrill(topic, { reps: 2 }, never, 'A').q).toBe('C')
  })
  it('eine einzige Übung kommt auch mit avoid', () => {
    const one = { exercises: [ex('A')] }
    expect(pickDrill(one, { reps: 4 }, never, 'A').q).toBe('A')
  })
  it('Thema ohne Übungen oder ohne Thema → null', () => {
    expect(pickDrill({ exercises: [] }, { reps: 1 }, never)).toBeNull()
    expect(pickDrill(null, { reps: 1 }, never)).toBeNull()
  })
})

describe('GRAMMAR_QUALITY', () => {
  it('richtig beim ersten Versuch = Gut (4), falsch = Nochmal (1)', () => {
    expect(GRAMMAR_QUALITY.right).toBe(4)
    expect(GRAMMAR_QUALITY.wrong).toBe(1)
  })
})
