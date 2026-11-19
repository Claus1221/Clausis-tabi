import { describe, it, expect } from 'vitest'
import { NE_PATH } from '../data/path.js'
import { SCRIPT_LESSONS } from '../data/script.js'
import { WORD_BLOCKS } from '../data/words.js'
import { isNodeDone, nodeMeta, nextOpenIndex, stationStates } from './path.js'

const stations = NE_PATH.filter(n => !n.world)
const EMPTY = { completedLessons: [] }
const ALL_DONE = { completedLessons: SCRIPT_LESSONS.map(l => l.id), completedWordBlocks: WORD_BLOCKS.map(b => b.id) }
const wordIds = new Set(WORD_BLOCKS.map(b => b.id))

describe('NE_PATH', () => {
  it('beginnt mit einer Welt-Überschrift', () => {
    expect(NE_PATH[0].world).toBeTruthy()
  })
  // Ausnahme: Wort-Stationen, deren Block es in words.js (noch) nicht gibt – die Karte
  // lässt sie still aus, bis die Daten da sind.
  it('jede Station mit Daten hat nodeMeta ≠ null (Titel + Zeichen)', () => {
    for (const n of stations.filter(x => x.type !== 'word' || wordIds.has(x.id))) {
      const m = nodeMeta(n)
      expect(m, `${n.type}:${n.id}`).not.toBeNull()
      expect(m.title).toBeTruthy()
      expect(m.glyph).toBeTruthy()
    }
  })
  it('jede Schrift-Lektion genau einmal, in Reihenfolge', () => {
    expect(stations.filter(n => n.type === 'script').map(n => n.id)).toEqual(SCRIPT_LESSONS.map(l => l.id))
  })
  it('jeder Wortblock hat genau eine Station; jede Wort-Station heißt nw + Zahl', () => {
    const words = stations.filter(n => n.type === 'word')
    for (const b of WORD_BLOCKS) expect(words.filter(n => n.id === b.id), b.id).toHaveLength(1)
    for (const n of words) expect(n.id).toMatch(/^nw\d+$/)
  })
  it('Wortblöcke erst nach der letzten Schrift-Lektion (Wörter setzen alle Zeichen voraus)', () => {
    const lastScript = NE_PATH.findLastIndex(n => n.type === 'script')
    NE_PATH.forEach((n, i) => { if (n.type === 'word') expect(i, n.id).toBeGreaterThan(lastScript) })
  })
})

describe('isNodeDone / nodeMeta', () => {
  it('Schrift-Station ist erledigt, wenn ihre ID in completedLessons steht', () => {
    expect(isNodeDone({ type: 'script', id: 's2' }, { completedLessons: ['s2'] })).toBe(true)
    expect(isNodeDone({ type: 'script', id: 's2' }, { completedLessons: ['s1'] })).toBe(false)
    expect(isNodeDone({ type: 'script', id: 's2' }, {})).toBe(false)
  })
  it('unbekannter Typ → nicht erledigt, nodeMeta null, kein Wurf', () => {
    const odd = { type: 'raetsel', id: 'x1' }
    expect(() => isNodeDone(odd, EMPTY)).not.toThrow()
    expect(isNodeDone(odd, EMPTY)).toBe(false)
    expect(nodeMeta(odd)).toBeNull()
  })
  it('spätere Typen mit unbekannter ID → nodeMeta null', () => {
    for (const type of ['word', 'grammar', 'chapter', 'dialog', 'goal']) {
      expect(nodeMeta({ type, id: 'gibtsnicht' }), type).toBeNull()
    }
    expect(nodeMeta({ type: 'script', id: 's99' })).toBeNull()
    expect(nodeMeta({ world: 'Welt', sub: '' })).toBeNull()
  })
  it('Wort-Station: Titel und Thema-Zeichen aus dem Block', () => {
    const b = WORD_BLOCKS[0]
    expect(nodeMeta({ type: 'word', id: b.id })).toEqual({ title: b.title, glyph: b.theme })
  })
  it('spätere Typen zählen über ihre eigenen Fortschritts-Felder', () => {
    expect(isNodeDone({ type: 'word', id: 'nw1' }, { completedWordBlocks: ['nw1'] })).toBe(true)
    expect(isNodeDone({ type: 'chapter', id: 'nc1' }, { completedChapters: ['nc1'] })).toBe(true)
  })
})

describe('nextOpenIndex', () => {
  it('leerer Lernstand → erste Station nach der ersten Welt-Überschrift', () => {
    expect(nextOpenIndex(NE_PATH, EMPTY)).toBe(1)
    expect(nextOpenIndex(NE_PATH, {})).toBe(1)
  })
  it('vollständig erledigter Pfad → path.length', () => {
    expect(nextOpenIndex(NE_PATH, ALL_DONE)).toBe(NE_PATH.length)
  })
  it('springt über Überschriften und erledigte Stationen', () => {
    const path = [{ world: 'A' }, { type: 'script', id: 's1' }, { world: 'B' }, { type: 'script', id: 's2' }]
    expect(nextOpenIndex(path, { completedLessons: ['s1'] })).toBe(3)
  })
  it('überspringt Stationen ohne Daten (nodeMeta null), statt an ihnen hängen zu bleiben', () => {
    const path = [{ world: 'A' }, { type: 'word', id: 'gibtsnicht' }, { type: 'script', id: 's1' }]
    expect(nextOpenIndex(path, EMPTY)).toBe(2)
  })
})

describe('stationStates', () => {
  const path = [{ world: 'A' }, { type: 'script', id: 's1' }, { type: 'script', id: 's2' }, { type: 'raetsel', id: 'x' }, { type: 'script', id: 's3' }]
  it('erledigt / offen / gesperrt wie auf der japanischen Karte; Überschriften und Unbekanntes null', () => {
    expect(stationStates(path, EMPTY)).toEqual([null, 'current', 'locked', null, 'locked'])
    expect(stationStates(path, { completedLessons: ['s1'] })).toEqual([null, 'done', 'current', null, 'locked'])
  })
  it('eine erledigte Station hinter der offenen bleibt erledigt', () => {
    expect(stationStates(path, { completedLessons: ['s3'] })).toEqual([null, 'current', 'locked', null, 'done'])
  })
  it('alles erledigt → keine offene Station', () => {
    expect(stationStates(path, { completedLessons: ['s1', 's2', 's3'] })).toEqual([null, 'done', 'done', null, 'done'])
  })
})
