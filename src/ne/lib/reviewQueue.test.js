import { describe, it, expect } from 'vitest'
import { startSession, rateCard, currentCard, isFinished } from './reviewQueue.js'

// Spielt eine Folge von Bewertungen durch und sammelt, was in den Plan geschrieben würde.
function play(deck, due, qualities) {
  let s = startSession(deck, due)
  const writes = []
  for (const q of qualities) {
    const r = rateCard(s, q)
    if (r.review) writes.push(r.review)
    s = r.state
  }
  return { s, writes }
}

describe('reviewQueue', () => {
  it('Start: Warteschlange = Stapel, erste Karte vorn', () => {
    const s = startSession(['a', 'b'], ['a', 'b'])
    expect(currentCard(s)).toBe('a')
    expect(isFinished(s)).toBe(false)
  })
  it('„Nochmal“ legt die Karte ans Ende der Warteschlange', () => {
    const { s } = play(['a', 'b', 'c'], ['a', 'b', 'c'], [1])
    expect(s.queue).toEqual(['b', 'c', 'a'])
    expect(s.lapses).toBe(1)
    expect(s.repeats).toContain('a')
  })
  it('„Gekonnt“ nimmt die Karte heraus und zählt sie', () => {
    const { s } = play(['a', 'b'], ['a', 'b'], [4])
    expect(s.queue).toEqual(['b'])
    expect(s.passed).toBe(1)
  })
  it('jede Karte wird höchstens einmal je Runde bewertet – bei ihrer ersten Bewertung', () => {
    // a: Nochmal (1), b: Gut, a: Gut → a nur mit Qualität 1 im Plan
    const { s, writes } = play(['a', 'b'], ['a', 'b'], [1, 4, 4])
    expect(writes).toEqual([{ key: 'a', quality: 1 }, { key: 'b', quality: 4 }])
    expect(isFinished(s)).toBe(true)
  })
  it('mehrfaches Nochmal schreibt trotzdem nur einmal', () => {
    const { writes } = play(['a'], ['a'], [1, 1, 1, 5])
    expect(writes).toEqual([{ key: 'a', quality: 1 }])
  })
  it('nur Karten, die beim Start fällig waren, werden bewertet (Fleiß verschiebt den Plan nicht)', () => {
    const { writes, s } = play(['a', 'b', 'c'], ['b'], [4, 3, 5])
    expect(writes).toEqual([{ key: 'b', quality: 3 }])
    expect(s.passed).toBe(3)
  })
  it('Runde endet, wenn die Warteschlange leer ist; danach passiert nichts mehr', () => {
    const { s } = play(['a'], ['a'], [4])
    expect(isFinished(s)).toBe(true)
    expect(currentCard(s)).toBeUndefined()
    const r = rateCard(s, 4)
    expect(r.review).toBeNull()
    expect(r.state).toBe(s)
  })
  it('leerer Stapel ist sofort fertig', () => {
    expect(isFinished(startSession([], []))).toBe(true)
  })
  it('verändert den alten Zustand nicht', () => {
    const s0 = startSession(['a', 'b'], ['a'])
    rateCard(s0, 1)
    expect(s0.queue).toEqual(['a', 'b'])
    expect(s0.lapses).toBe(0)
  })
})
