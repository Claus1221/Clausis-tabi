import { describe, it, expect } from 'vitest'
import { GRAMMAR } from '../data/grammar.js'
import { grammarKey, isGrammarKey, topicForKey, grammarKeys, pickDrill } from './grammarSrs.js'
import { learnedItems } from './learned.js'
import { srsItemInfo } from './srs.js'

describe('Grammatik-Karten-Schlüssel', () => {
  it('lässt sich sicher von japanischen Karten unterscheiden', () => {
    expect(isGrammarKey(grammarKey('g4'))).toBe(true)
    // Karten-Schlüssel des Bestands sind Kana/Kanji/Wendungen – nie mit „g:".
    expect(isGrammarKey('あ')).toBe(false)
    expect(isGrammarKey('山')).toBe(false)
    expect(isGrammarKey('また あとで。')).toBe(false)
    expect(isGrammarKey(undefined)).toBe(false)
  })

  it('findet das Thema zum Schlüssel zurück', () => {
    expect(topicForKey(grammarKey('g4'))?.title).toBe('を – das Objekt')
    expect(topicForKey('g:gibtsnicht')).toBeUndefined()
    expect(topicForKey('あ')).toBeUndefined()
  })

  it('führt nur gelernte und wirklich existierende Themen', () => {
    expect(grammarKeys({ completedGrammar: ['g4', 'g99'] })).toEqual([grammarKey('g4')])
    expect(grammarKeys({})).toEqual([])
    expect(grammarKeys(undefined)).toEqual([])
  })
})

describe('Grammatik im Wiederholungs-Stapel', () => {
  it('landet in derselben Kartenmenge wie Kana und Wörter', () => {
    expect(learnedItems({ completedGrammar: ['g4'] })).toContain('g:g4')
  })

  it('wird als Aufgabe erkannt, nicht als Vokabel', () => {
    const info = srsItemInfo(grammarKey('g4'))
    expect(info.isGrammar).toBe(true)
    expect(info.isWord).toBe(false)
    expect(info.topic.id).toBe('g4')
  })
})

describe('pickDrill', () => {
  const topic = GRAMMAR.find(g => g.id === 'g4')

  it('zieht eine Übung aus dem Thema', () => {
    expect(topic.exercises).toContainEqual(pickDrill(topic))
  })

  it('vermeidet die zuletzt gezeigte Frage', () => {
    // Geübt werden soll die Regel – nicht das Auswendiglernen einer Frage.
    const zuletzt = topic.exercises[0].q
    for (let i = 0; i < 25; i++) expect(pickDrill(topic, zuletzt).q).not.toBe(zuletzt)
  })

  it('verträgt Themen ohne Übungen', () => {
    expect(pickDrill({ exercises: [] })).toBeNull()
    expect(pickDrill(undefined)).toBeNull()
  })
})

describe('Übungs-Bestand je Thema', () => {
  it('gibt jedem Thema genug Übungen, dass die Karte variieren kann', () => {
    // Mit nur einer Übung wäre die Grammatik-Karte reines Auswendiglernen.
    for (const g of GRAMMAR) {
      expect((g.exercises || []).length, `${g.id} ${g.title}`).toBeGreaterThanOrEqual(4)
    }
  })

  it('hat in jeder Übung die Lösung unter den Optionen', () => {
    for (const g of GRAMMAR) {
      for (const ex of g.exercises || []) {
        expect(ex.options, `${g.id}: ${ex.q}`).toContain(ex.a)
        // Zwei Optionen sind bei einem echten Gegensatz (は vs. が) richtig so.
        expect(ex.options.length, `${g.id}: ${ex.q}`).toBeGreaterThanOrEqual(2)
      }
    }
  })
})
