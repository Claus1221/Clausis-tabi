import { describe, it, expect } from 'vitest'
import { CHAPTERS, CHAPTER_BY_ID } from '../data/chapters.js'
import { SCRIPT_LESSONS } from '../data/script.js'
import { WORD_BLOCKS } from '../data/words.js'
import { GRAMMAR } from '../data/grammar.js'
import { nfc, romanFits } from './deva.js'
import { wordKey } from './learned.js'
import {
  TASK_KINDS, isTask, chapterSrsKeys, chapterStars, isBuildCorrect, canCheckBuild, chapterReading, journeySummary, GOAL_ID,
} from './chapters.js'
import { GOAL_ID as PATH_GOAL_ID } from '../data/path.js'

const nc1 = CHAPTER_BY_ID.nc1
const allSteps = CHAPTERS.flatMap(c => c.steps)

describe('isTask', () => {
  it('genau audio, dialog, gap, tf, build sind Aufgaben', () => {
    expect([...TASK_KINDS].sort()).toEqual(['audio', 'build', 'dialog', 'gap', 'tf'])
    expect(isTask({ kind: 'story' })).toBe(false)
    expect(isTask({ kind: 'intro' })).toBe(false)
    expect(isTask({ kind: 'tf' })).toBe(true)
  })
})

describe('chapterSrsKeys', () => {
  it('die intro-Wörter als w:-Schlüssel, NFC, in Kapitel-Reihenfolge', () => {
    expect(chapterSrsKeys(nc1)).toEqual(['भिसा', 'पर्यटक', 'नेपाल', 'पहिलो पटक', 'त्यहाँ'].map(wordKey))
  })
  it('ohne Doppel, auch wenn ein Wort zweimal oder in anderer Unicode-Form vorgestellt wird', () => {
    const c = { steps: [
      { kind: 'intro', dev: 'नदी' }, { kind: 'story', de: 'x' },
      { kind: 'intro', dev: 'नदी'.normalize('NFD') }, { kind: 'intro', dev: 'ताल' },
    ] }
    expect(chapterSrsKeys(c)).toEqual([wordKey('नदी'), wordKey('ताल')])
  })
  it('Kapitel ohne intro → leer', () => {
    expect(chapterSrsKeys({ steps: [{ kind: 'story', de: 'x' }] })).toEqual([])
  })
  it('jedes Kapitel: Schlüssel sind NFC und beginnen mit w:', () => {
    for (const c of CHAPTERS) for (const k of chapterSrsKeys(c)) {
      expect(k.startsWith('w:'), k).toBe(true)
      expect(k, k).toBe(nfc(k))
    }
  })
})

describe('chapterStars – Regel: 3 = kein Fehler, 2 = höchstens 2 Fehler, 1 = geschafft', () => {
  const tasks = nc1.steps.map((s, i) => [s, i]).filter(([s]) => isTask(s)).map(([, i]) => i)
  const results = wrong => Object.fromEntries(tasks.map((i, n) => [i, n >= wrong]))
  it('alle Aufgaben richtig → 3', () => expect(chapterStars(nc1, results(0))).toBe(3))
  it('1 oder 2 Fehler → 2', () => {
    expect(chapterStars(nc1, results(1))).toBe(2)
    expect(chapterStars(nc1, results(2))).toBe(2)
  })
  it('3 und mehr Fehler → 1 (geschafft ist geschafft)', () => {
    expect(chapterStars(nc1, results(3))).toBe(1)
    expect(chapterStars(nc1, results(tasks.length))).toBe(1)
  })
  it('eine nicht beantwortete Aufgabe zählt als Fehler; Ergebnisse zu Nicht-Aufgaben zählen nicht', () => {
    const r = results(0)
    delete r[tasks[0]]
    expect(chapterStars(nc1, r)).toBe(2)
    expect(chapterStars(nc1, { ...results(0), 0: false })).toBe(3) // Schritt 0 ist eine Erzählung
  })
  it('ohne Ergebnisse (undefined) stürzt nichts ab', () => {
    expect(chapterStars(nc1, undefined)).toBe(1)
    expect(chapterStars({ steps: [] }, {})).toBe(3)
  })
})

describe('isBuildCorrect', () => {
  const step = { kind: 'build', answer: ['सात', 'सय', 'रुपैयाँ', 'भाडा', 'हो'], alsoAccept: [['भाडा', 'सात', 'सय', 'रुपैयाँ', 'हो']] }
  it('answer und jede alsoAccept-Reihenfolge sind richtig', () => {
    expect(isBuildCorrect(step, step.answer)).toBe(true)
    expect(isBuildCorrect(step, step.alsoAccept[0])).toBe(true)
  })
  it('andere Reihenfolge, fehlendes oder überzähliges Stück → falsch', () => {
    expect(isBuildCorrect(step, ['हो', 'सात', 'सय', 'रुपैयाँ', 'भाडा'])).toBe(false)
    expect(isBuildCorrect(step, ['सात', 'सय', 'रुपैयाँ', 'भाडा'])).toBe(false)
    expect(isBuildCorrect(step, [...step.answer, 'हजार'])).toBe(false)
    expect(isBuildCorrect(step, [])).toBe(false)
  })
  it('vergleicht in NFC', () => {
    expect(isBuildCorrect(step, step.answer.map(t => t.normalize('NFD')))).toBe(true)
  })
  it('ohne alsoAccept nur answer', () => {
    expect(isBuildCorrect({ answer: ['म', 'हुँ'] }, ['म', 'हुँ'])).toBe(true)
    expect(isBuildCorrect({ answer: ['म', 'हुँ'] }, ['हुँ', 'म'])).toBe(false)
  })
  it('alle echten Satzbau-Aufgaben: answer und alsoAccept richtig, umgedrehte Antwort falsch', () => {
    for (const s of allSteps.filter(x => x.kind === 'build')) {
      expect(isBuildCorrect(s, s.answer), s.dev).toBe(true)
      for (const a of s.alsoAccept || []) expect(isBuildCorrect(s, a), a.join(' ')).toBe(true)
      const rev = [...s.answer].reverse()
      const accepted = [s.answer, ...(s.alsoAccept || [])].some(a => a.join(' ') === rev.join(' '))
      if (!accepted) expect(isBuildCorrect(s, rev), s.dev).toBe(false)
    }
  })
})

describe('canCheckBuild – „Prüfen“ erst, wenn so viele Stücke liegen wie die Antwort hat', () => {
  const step = { answer: ['म', 'पर्यटक', 'हुँ'], alsoAccept: [['पर्यटक', 'म', 'हुँ']] }
  it('zu wenige oder zu viele Stücke → gesperrt; genau so viele → frei', () => {
    expect(canCheckBuild(step, 0)).toBe(false)
    expect(canCheckBuild(step, 2)).toBe(false)
    expect(canCheckBuild(step, 3)).toBe(true)
    expect(canCheckBuild(step, 4)).toBe(false)
  })
  it('jede echte Satzbau-Aufgabe: alsoAccept hat dieselbe Länge (Umstellungen derselben Stücke)', () => {
    for (const s of allSteps.filter(x => x.kind === 'build')) {
      for (const a of s.alsoAccept || []) expect(a.length, s.dev).toBe(s.answer.length)
      expect(canCheckBuild(s, s.answer.length)).toBe(true)
    }
  })
  it('kaputte Eingabe stürzt nicht', () => {
    expect(canCheckBuild({}, 0)).toBe(false)
  })
})

describe('GOAL_ID', () => {
  it('kommt aus data/path.js (lib/path.js braucht dafür nicht die Kapitel-Logik)', () => {
    expect(GOAL_ID).toBe(PATH_GOAL_ID)
    expect(GOAL_ID).toBe('goal')
  })
})

describe('chapterReading – Umschrift von Bausteinen und Lücken-Optionen', () => {
  it('jedes Satzbau-Stück und jede Lücken-Option jedes Kapitels hat eine passende Umschrift', () => {
    for (const s of allSteps) {
      const texts = s.kind === 'build' ? s.tiles : s.kind === 'gap' ? s.options : []
      for (const t of texts) {
        const r = chapterReading(t)
        expect(r, `${t} ohne Umschrift`).toBeTruthy()
        expect(romanFits(t, r), `${t} ≠ ${r}`).toBe(true)
      }
    }
  })
  it('kennt Kapitelwörter und Wörter aus Erzähl-Zeilen; unbekannt → leer', () => {
    expect(chapterReading('भिसा')).toBe('bhisā')
    expect(chapterReading('आशा')).toBe('āshā')
    expect(chapterReading('zzz')).toBe('')
    expect(chapterReading('')).toBe('')
  })
})

describe('journeySummary', () => {
  it('zählt Zeichen, Wörter (Wortblöcke + Kapitel), Grammatik-Themen und Kapitel', () => {
    const p = {
      completedLessons: ['s1', 's2'],
      completedWordBlocks: ['nw1'],
      completedGrammar: ['ng1', 'ng2'],
      completedChapters: ['nc1', GOAL_ID],
    }
    const chars = SCRIPT_LESSONS.filter(l => ['s1', 's2'].includes(l.id)).reduce((n, l) => n + l.chars.length, 0)
    const words = WORD_BLOCKS.find(b => b.id === 'nw1').words.length + chapterSrsKeys(nc1).length
    expect(journeySummary(p)).toEqual({ chars, words, grammar: 2, chapters: 1 })
  })
  it('leerer Lernstand → alles 0; unbekannte IDs zählen nicht', () => {
    expect(journeySummary({})).toEqual({ chars: 0, words: 0, grammar: 0, chapters: 0 })
    expect(journeySummary({ completedChapters: ['nc99'], completedGrammar: ['ng99'] })).toEqual({ chars: 0, words: 0, grammar: 0, chapters: 0 })
  })
  it('alles erledigt → alle Kapitel und Themen', () => {
    const p = {
      completedLessons: SCRIPT_LESSONS.map(l => l.id), completedWordBlocks: WORD_BLOCKS.map(b => b.id),
      completedGrammar: GRAMMAR.map(g => g.id), completedChapters: CHAPTERS.map(c => c.id),
    }
    const s = journeySummary(p)
    expect(s.chapters).toBe(CHAPTERS.length)
    expect(s.grammar).toBe(GRAMMAR.length)
  })
})
