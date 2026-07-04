import { describe, it, expect } from 'vitest'
import { weakChapterList, chapterSrsKeys, BRAKE_LIMIT } from './chapters.js'
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
