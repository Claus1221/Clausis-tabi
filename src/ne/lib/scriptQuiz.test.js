import { describe, it, expect } from 'vitest'
import { SCRIPT_DATA, SCRIPT_LESSONS, SCRIPT_NOTES } from '../data/script.js'
import { buildScriptQuiz, isReadable, notesForLesson, shuffle } from './scriptQuiz.js'

const lesson = id => SCRIPT_LESSONS.find(l => l.id === id)
// Kleiner deterministischer Zufall, damit viele Läufe verschiedene Mischungen prüfen.
const seeded = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }

describe('buildScriptQuiz', () => {
  it('jede Lektion, viele Mischungen: genau drei Optionen, keine zwei mit gleicher Lesung, die richtige dabei', () => {
    for (const l of SCRIPT_LESSONS) {
      for (let s = 1; s <= 40; s++) {
        const quiz = buildScriptQuiz(l.chars, seeded(s))
        for (const q of quiz) {
          expect(q.options, `${l.id} ${q.char}`).toHaveLength(3)
          expect(new Set(q.options).size, `${l.id} ${q.char}: ${q.options}`).toBe(3)
          expect(q.options).toContain(q.correct)
          expect(q.correct).toBe(SCRIPT_DATA[q.char].roman)
          for (const o of q.options) expect(o.startsWith('('), o).toBe(false)
        }
      }
    }
  })
  it('fragt jedes lesbare Zeichen genau einmal ab; Halant und Danda nicht', () => {
    const chars = lesson('s12').chars
    const quiz = buildScriptQuiz(chars, seeded(7))
    const asked = quiz.map(q => q.char).sort()
    expect(asked).toEqual(chars.filter(isReadable).sort())
    expect(asked).not.toContain('्')
    expect(asked).not.toContain('।')
  })
  it('श und ष (beide „sha“) nie gemeinsam als Optionen', () => {
    for (let s = 1; s <= 60; s++) {
      for (const q of buildScriptQuiz(lesson('s9').chars, seeded(s))) {
        expect(q.options.filter(o => o === 'sha').length).toBeLessThanOrEqual(1)
      }
    }
  })
  it('Ablenker kommen bevorzugt aus der Lektion, Ziffern also aus Ziffern', () => {
    for (const q of buildScriptQuiz(lesson('s14').chars, seeded(3))) {
      for (const o of q.options) expect(o).toMatch(/^\d$/)
    }
  })
  it('Frage passt zur Zeichenart', () => {
    const quiz = buildScriptQuiz(['क', 'ा', '५'], seeded(2))
    const by = Object.fromEntries(quiz.map(q => [q.char, q]))
    expect(by['क'].prompt).toMatch(/Lesung/)
    expect(by['ा'].shown).toBe('का')
    expect(by['ा'].prompt).toMatch(/Laut/)
    expect(by['५'].prompt).toMatch(/Zahl/)
  })
  it('nur unlesbare Zeichen → leeres Quiz', () => {
    expect(buildScriptQuiz(['्', '।'], seeded(1))).toEqual([])
  })
  it('optionCount: so viele Optionen wie verlangt, weiter ohne gleiche Lesung', () => {
    for (const n of [4, 6, 8]) {
      for (let s = 1; s <= 20; s++) {
        for (const q of buildScriptQuiz(lesson('s9').chars, seeded(s), n)) {
          expect(q.options).toHaveLength(n)
          expect(new Set(q.options).size).toBe(n)
          expect(q.options).toContain(q.correct)
        }
      }
    }
  })
  it('optionChars: je Option ein Zeichen mit genau dieser Lesung (für „Lesung → Zeichen“)', () => {
    for (let s = 1; s <= 40; s++) {
      for (const q of buildScriptQuiz([...lesson('s9').chars, ...lesson('s12').chars], seeded(s), 6)) {
        expect(q.optionChars).toHaveLength(q.options.length)
        q.optionChars.forEach((c, i) => expect(SCRIPT_DATA[c].roman).toBe(q.options[i]))
        expect(q.optionChars[q.options.indexOf(q.correct)]).toBe(q.char)
        expect(new Set(q.optionChars).size).toBe(q.optionChars.length)
      }
    }
  })
})

describe('notesForLesson', () => {
  it('Lektion ohne passendes Paar → keine Hinweise', () => {
    expect(notesForLesson('s1')).toEqual([])
    expect(notesForLesson('s14')).toEqual([])
  })
  it('क-Reihe → Behauchung mit den Paaren dieser Lektion', () => {
    const notes = notesForLesson('s3')
    expect(notes.map(n => n.note.id)).toEqual(['aspiration'])
    expect(notes[0].pairs).toEqual([['क', 'ख'], ['ग', 'घ']])
  })
  it('त-Reihe → auch dental/retroflex, weil die ट-Reihe schon gelernt ist', () => {
    const notes = notesForLesson('s6')
    expect(notes.map(n => n.note.id)).toEqual(['aspiration', 'retroflex'])
    expect(notes[1].pairs).toEqual(SCRIPT_NOTES.find(n => n.id === 'retroflex').pairs)
  })
  it('ट-Reihe → kein dental/retroflex-Hinweis, weil die त-Reihe noch fehlt', () => {
    expect(notesForLesson('s5').map(n => n.note.id)).toEqual(['aspiration'])
  })
  it('unbekannte Lektion → leer', () => {
    expect(notesForLesson('s99')).toEqual([])
  })
})

describe('shuffle', () => {
  it('mischt eine Kopie und verliert nichts', () => {
    const a = [1, 2, 3, 4, 5]
    const b = shuffle(a, seeded(5))
    expect(a).toEqual([1, 2, 3, 4, 5])
    expect([...b].sort()).toEqual(a)
  })
})
