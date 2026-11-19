import { describe, it, expect } from 'vitest'
import { buildWordQuiz, QUIZ_KINDS } from './wordQuiz.js'
import { WORD_BLOCKS } from '../data/words.js'

// Fester Zufall (LCG), damit Mischungen wiederholbar sind.
const seeded = seed => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const w = (dev, de, roman = 'x') => ({ dev, roman, de })
// Block mit 8 Wörtern, alle verschieden.
const EIGHT = { id: 'tb1', words: ['क', 'ख', 'ग', 'घ', 'च', 'छ', 'ज', 'झ'].map((d, i) => w(d, `Bedeutung ${i}`)) }

function checkQuestion(q) {
  // Richtige Antwort genau einmal dabei, Index stimmt.
  expect(q.options[q.correct]).toBe(q.word)
  expect(q.options.filter(o => o === q.word)).toHaveLength(1)
  // Nie zwei Optionen mit gleichem dev oder gleicher Bedeutung.
  expect(new Set(q.options.map(o => o.dev)).size).toBe(q.options.length)
  expect(new Set(q.options.map(o => o.de)).size).toBe(q.options.length)
  // Jede Antwortmöglichkeit trägt Devanagari – nie nur Umschrift.
  for (const o of q.options) expect(typeof o.dev === 'string' && o.dev.length > 0).toBe(true)
  expect(QUIZ_KINDS).toContain(q.kind)
}

describe('buildWordQuiz', () => {
  it('Block mit 8 Wörtern: jedes Wort genau einmal gefragt, je 4 Optionen', () => {
    const quiz = buildWordQuiz(EIGHT, { rand: seeded(1) })
    expect(quiz).toHaveLength(8)
    expect(new Set(quiz.map(q => q.word.dev))).toEqual(new Set(EIGHT.words.map(x => x.dev)))
    for (const q of quiz) {
      checkQuestion(q)
      expect(q.options).toHaveLength(4)
    }
  })

  it('ist mit eingesetztem Zufall deterministisch', () => {
    const a = buildWordQuiz(EIGHT, { rand: seeded(7) })
    const b = buildWordQuiz(EIGHT, { rand: seeded(7) })
    expect(a).toEqual(b)
    // … und ein anderer Zufall mischt anders.
    const c = buildWordQuiz(EIGHT, { rand: seeded(8) })
    expect(c.map(q => q.word.dev)).not.toEqual(a.map(q => q.word.dev))
  })

  it('ein Wort mit gleicher Bedeutung ist nie Ablenker (sonst wären zwei Antworten richtig)', () => {
    const block = { id: 'tb2', words: [w('क', 'kalt'), w('ख', 'kalt'), w('ग', 'warm'), w('घ', 'heiß'), w('च', 'nass')] }
    for (let s = 1; s < 60; s++) {
      for (const q of buildWordQuiz(block, { rand: seeded(s) })) {
        checkQuestion(q)
        if (q.word.de === 'kalt') expect(q.options.filter(o => o.de === 'kalt')).toHaveLength(1)
      }
    }
  })

  it('Ablenker zuerst aus dem Block, aufgefüllt aus früheren Blöcken', () => {
    const small = { id: 'tb3', words: [w('क', 'eins'), w('ख', 'zwei')] }
    const earlier = [w('ग', 'drei'), w('घ', 'vier'), w('च', 'fünf'), w('क', 'eins')]
    for (let s = 1; s < 30; s++) {
      for (const q of buildWordQuiz(small, { rand: seeded(s), earlier })) {
        checkQuestion(q)
        expect(q.options).toHaveLength(4)
        // Das andere Wort des Blocks ist immer dabei (Block-Ablenker zuerst).
        const other = small.words.find(x => x !== q.word)
        expect(q.options.some(o => o.dev === other.dev)).toBe(true)
      }
    }
  })

  it('zu wenig Wörter → weniger Optionen, aber nie ein Doppel', () => {
    const tiny = { id: 'tb4', words: [w('क', 'eins'), w('ख', 'zwei')] }
    for (const q of buildWordQuiz(tiny, { rand: seeded(3) })) {
      checkQuestion(q)
      expect(q.options).toHaveLength(2)
    }
  })

  it('ohne Ton keine Hör-Frage; mit Ton Hör-Fragen nur zusätzlich, nie ausschließlich', () => {
    for (let s = 1; s < 30; s++) {
      const silent = buildWordQuiz(EIGHT, { rand: seeded(s), sound: false })
      expect(silent.some(q => q.kind === 'listen')).toBe(false)
      expect(silent.some(q => q.kind === 'meaning')).toBe(true)
      expect(silent.some(q => q.kind === 'word')).toBe(true)
      const loud = buildWordQuiz(EIGHT, { rand: seeded(s), sound: true })
      expect(loud.some(q => q.kind === 'listen')).toBe(true)
      expect(loud.some(q => q.kind !== 'listen')).toBe(true)
      for (const q of loud) checkQuestion(q)
    }
  })

  it('alle echten Blöcke (mit früheren Blöcken als Vorrat): jede Frage sauber', () => {
    WORD_BLOCKS.forEach((block, i) => {
      const earlier = WORD_BLOCKS.slice(0, i).flatMap(b => b.words)
      for (let s = 1; s < 8; s++) {
        for (const sound of [false, true]) {
          const quiz = buildWordQuiz(block, { rand: seeded(s), earlier, sound })
          expect(quiz).toHaveLength(block.words.length)
          for (const q of quiz) checkQuestion(q)
        }
      }
    })
  })
})
