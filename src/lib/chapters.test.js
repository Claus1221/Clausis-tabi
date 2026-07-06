import { describe, it, expect } from 'vitest'
import { weakChapterList, chapterSrsKeys, newChapterWords, learnedChapterWords, BRAKE_LIMIT } from './chapters.js'
import { CHAPTERS } from '../data/chapters.js'

const c1 = CHAPTERS[0], c2 = CHAPTERS[1]

// SRS-Einträge für alle Vokabeln der Kapitel mit gegebenem Intervall.
function srsFor(chapters, interval) {
  const srs = {}
  chapters.forEach(c => chapterSrsKeys(c).forEach(k => { srs[k] = { interval, reps: 3, ease: 2.5, due: '2099-01-01' } }))
  return srs
}

describe('weakChapterList (Kapitel-Bremse)', () => {
  it('ist leer ohne erlebte Kapitel', () => {
    expect(weakChapterList({})).toEqual([])
  })

  it('frisch erlebte Kapitel (1 Stern, keine Wiederholung) gelten als schwach', () => {
    const p = { completedChapters: [c1.id, c2.id], srs: {}, chapterStars: {} }
    expect(weakChapterList(p).map(c => c.id)).toEqual([c1.id, c2.id])
    expect(weakChapterList(p).length >= BRAKE_LIMIT).toBe(true)
  })

  it('nach der ersten fälligen Wiederholung (Intervall 1 → 2 Sterne) nicht mehr schwach', () => {
    const p = { completedChapters: [c1.id, c2.id], srs: srsFor([c1, c2], 1), chapterStars: {} }
    expect(weakChapterList(p)).toEqual([])
  })

  it('mischt korrekt: nur das ungeübte Kapitel bleibt schwach', () => {
    const p = { completedChapters: [c1.id, c2.id], srs: srsFor([c1], 8), chapterStars: {} }
    expect(weakChapterList(p).map(c => c.id)).toEqual([c2.id])
  })

  it('gespeicherter Sterne-Höchststand zählt ebenfalls (Sterne fallen nie)', () => {
    const p = { completedChapters: [c1.id], srs: {}, chapterStars: { [c1.id]: 3 } }
    expect(weakChapterList(p)).toEqual([])
  })
})

describe('newChapterWords (nachträglich ergänzte Kapitel-Vokabeln)', () => {
  it('meldet alle Kapitel-Wörter als neu, wenn noch nichts im SRS steht', () => {
    expect(newChapterWords(c1, {})).toEqual(chapterSrsKeys(c1))
  })

  it('meldet nur Wörter ohne SRS-Eintrag – z. B. nachträglich hinzugefügte', () => {
    const keys = chapterSrsKeys(c1)
    const srs = { [keys[0]]: { interval: 4, reps: 3, ease: 2.5, due: '2099-01-01' } }
    expect(newChapterWords(c1, { srs })).toEqual(keys.slice(1))
  })

  it('ist leer, sobald jedes Kapitel-Wort einen SRS-Eintrag hat', () => {
    const srs = {}
    chapterSrsKeys(c1).forEach(k => { srs[k] = { interval: 1, reps: 1, ease: 2.5, due: '2099-01-01' } })
    expect(newChapterWords(c1, { srs })).toEqual([])
  })
})

describe('learnedChapterWords (Kapitel-Vokabeln für die Wiederholungs-Stapel)', () => {
  it('ist leer ohne erlebte Kapitel – auch wenn SRS-Einträge existieren', () => {
    const srs = { [chapterSrsKeys(c1)[0]]: { interval: 1, reps: 1, ease: 2.5, due: '2099-01-01' } }
    expect(learnedChapterWords({ srs })).toEqual([])
  })

  it('liefert nur eingeführte Wörter erlebter Kapitel (mit SRS-Eintrag)', () => {
    const keys = chapterSrsKeys(c1)
    const srs = { [keys[0]]: { interval: 1, reps: 1, ease: 2.5, due: '2099-01-01' } }
    expect(learnedChapterWords({ completedChapters: [c1.id], srs })).toEqual([keys[0]])
  })

  it('vereinigt mehrere Kapitel ohne Duplikate', () => {
    const srs = {}
    ;[...chapterSrsKeys(c1), ...chapterSrsKeys(c2)].forEach(k => { srs[k] = { interval: 1, reps: 1, ease: 2.5, due: '2099-01-01' } })
    const out = learnedChapterWords({ completedChapters: [c1.id, c2.id], srs })
    expect(out.length).toBe(new Set([...chapterSrsKeys(c1), ...chapterSrsKeys(c2)]).size)
  })
})
