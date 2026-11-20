import { describe, it, expect } from 'vitest'
import { NE_PATH } from '../data/path.js'
import { SCRIPT_LESSONS } from '../data/script.js'
import { WORD_BLOCKS } from '../data/words.js'
import { GRAMMAR, GRAMMAR_ORDER } from '../data/grammar.js'
import { isNodeDone, nodeMeta, nextOpenIndex, stationStates, wordsBefore } from './path.js'

const stations = NE_PATH.filter(n => !n.world)
const EMPTY = { completedLessons: [] }
const ALL_DONE = { completedLessons: SCRIPT_LESSONS.map(l => l.id), completedWordBlocks: WORD_BLOCKS.map(b => b.id), completedGrammar: GRAMMAR.map(g => g.id) }
const wordIds = new Set(WORD_BLOCKS.map(b => b.id))

describe('NE_PATH', () => {
  it('beginnt mit einer Welt-Überschrift', () => {
    expect(NE_PATH[0].world).toBeTruthy()
  })
  // Kapitel, Szenen und Ziel haben heute noch keine Daten – die Karte lässt sie still aus.
  it('jede Station mit Daten hat nodeMeta ≠ null (Titel + Zeichen)', () => {
    const grammarIds = new Set(GRAMMAR.map(g => g.id))
    const withData = n => n.type === 'script' || (n.type === 'word' && wordIds.has(n.id)) || (n.type === 'grammar' && grammarIds.has(n.id))
    for (const n of stations.filter(withData)) {
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
  it('jede Schrift-Lektion, jeder Wortblock und jedes Grammatik-Thema hat genau eine Station', () => {
    const ids = [...SCRIPT_LESSONS.map(l => ['script', l.id]), ...WORD_BLOCKS.map(b => ['word', b.id]), ...GRAMMAR.map(g => ['grammar', g.id])]
    for (const [type, id] of ids) expect(stations.filter(n => n.type === type && n.id === id), `${type}:${id}`).toHaveLength(1)
  })
  // Die verbindliche Reihenfolge aus path-order.md, als Ganzes festgenagelt: jede
  // Umsortierung (auch zweier Kapitel) muss hier bewusst nachgezogen werden.
  it('der ganze Kurs in verbindlicher Reihenfolge', () => {
    const S = n => Array.from({ length: n }, (_, i) => `script:s${i + 1}`)
    expect(stations.map(n => `${n.type}:${n.id}`)).toEqual([
      ...S(14),
      'word:nw1', 'grammar:ng1', 'grammar:ng2', 'word:nw2', 'grammar:ng3', 'chapter:nc1',
      'word:nw3', 'grammar:ng4', 'grammar:ng5', 'chapter:nc2', 'dialog:nd1',
      'word:nw4', 'grammar:ng8', 'grammar:ng9', 'grammar:ng10', 'chapter:nc3', 'dialog:nd3', 'dialog:nd4',
      'word:nw5', 'grammar:ng6', 'grammar:ng7', 'grammar:ng11', 'chapter:nc4', 'dialog:nd5',
      'word:nw6', 'grammar:ng12', 'chapter:nc5', 'chapter:nc6', 'dialog:nd2',
      'word:nw7', 'chapter:nc7', 'chapter:nc8', 'dialog:nd6', 'chapter:nc9', 'chapter:nc10', 'goal:goal',
    ])
    expect(NE_PATH.filter(n => n.world).map(n => n.theme)).toEqual(['tal', 'tal', 'tal', 'tal', 'tal', 'tal', 'huegel', 'see', 'berge'])
  })
  it('Grammatik-Stationen in der Reihenfolge von GRAMMAR_ORDER', () => {
    expect(stations.filter(n => n.type === 'grammar').map(n => n.id)).toEqual(GRAMMAR_ORDER)
  })
  it('jede Grammatik-Station hat nodeMeta mit Titel und Zeichen des Themas', () => {
    for (const g of GRAMMAR) expect(nodeMeta({ type: 'grammar', id: g.id })).toEqual({ title: g.title, glyph: g.glyph })
  })
  it('keine Station doppelt; IDs nach Schema', () => {
    const keys = stations.map(n => `${n.type}:${n.id}`)
    expect(new Set(keys).size).toBe(keys.length)
    const PATTERN = { script: /^s\d+$/, word: /^nw\d+$/, grammar: /^ng\d+$/, chapter: /^nc\d+$/, dialog: /^nd\d+$/, goal: /^goal$/ }
    for (const n of stations) expect(n.id, n.type).toMatch(PATTERN[n.type])
  })
  it('Kapitel, Szenen und Ziel stehen schon im Pfad (Daten folgen) und werden heute übersprungen', () => {
    expect(stations.filter(n => n.type === 'chapter')).toHaveLength(10)
    expect(stations.filter(n => n.type === 'dialog')).toHaveLength(6)
    expect(stations.at(-1)).toEqual({ type: 'goal', id: 'goal' })
    // Ziel und alles ohne Daten sind kein Hindernis: alles mit Daten erledigt → nichts offen.
    expect(stationStates(NE_PATH, ALL_DONE).includes('current')).toBe(false)
  })
  it('jede Welt-Überschrift hat Titel, Untertitel und eine bekannte Kulisse', () => {
    for (const w of NE_PATH.filter(n => n.world)) {
      expect(w.sub, w.world).toBeTruthy()
      expect(['tal', 'huegel', 'see', 'berge'], w.world).toContain(w.theme)
    }
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
  it('überspringt Kapitel/Szenen/Ziel ohne Daten auch mitten im Pfad', () => {
    const path = [{ world: 'A' }, { type: 'script', id: 's1' }, { type: 'chapter', id: 'nc1' }, { type: 'dialog', id: 'nd1' }, { type: 'goal', id: 'goal' }, { type: 'script', id: 's2' }]
    expect(nextOpenIndex(path, { completedLessons: ['s1'] })).toBe(5)
    expect(nextOpenIndex(path, { completedLessons: ['s1', 's2'] })).toBe(path.length)
  })
  it('Grammatik-Station zählt über completedGrammar', () => {
    const path = [{ world: 'A' }, { type: 'grammar', id: GRAMMAR_ORDER[0] }, { type: 'script', id: 's1' }]
    expect(nextOpenIndex(path, EMPTY)).toBe(1)
    expect(nextOpenIndex(path, { completedGrammar: [GRAMMAR_ORDER[0]] })).toBe(2)
  })
})

describe('stationStates', () => {
  const path = [{ world: 'A' }, { type: 'script', id: 's1' }, { type: 'script', id: 's2' }, { type: 'raetsel', id: 'x' }, { type: 'script', id: 's3' }]
  it('erledigt / offen / gesperrt wie auf der japanischen Karte; Überschriften und Unbekanntes null', () => {
    expect(stationStates(path, EMPTY)).toEqual([null, 'current', 'locked', null, 'locked'])
    expect(stationStates(path, { completedLessons: ['s1'] })).toEqual([null, 'done', 'current', null, 'locked'])
  })
  it('eine Station ohne Daten blockiert die folgende nicht (weder erledigt noch offen)', () => {
    const p = [{ world: 'A' }, { type: 'script', id: 's1' }, { type: 'chapter', id: 'nc1' }, { type: 'script', id: 's2' }]
    expect(stationStates(p, { completedLessons: ['s1'] })).toEqual([null, 'done', null, 'current'])
  })
  it('eine erledigte Station hinter der offenen bleibt erledigt', () => {
    expect(stationStates(path, { completedLessons: ['s3'] })).toEqual([null, 'current', 'locked', null, 'done'])
  })
  it('alles erledigt → keine offene Station', () => {
    expect(stationStates(path, { completedLessons: ['s1', 's2', 's3'] })).toEqual([null, 'done', 'done', null, 'done'])
  })
})

describe('wordsBefore', () => {
  const w = d => ({ dev: d })
  const blocks = [{ id: 'nw1', words: [w('क')] }, { id: 'nw2', words: [w('ख')] }, { id: 'nw3', words: [w('ग')] }]
  it('Wörter der Wort-Stationen VOR dem Block, in Pfad-Reihenfolge (nicht Array-Reihenfolge)', () => {
    const path = [{ world: 'A' }, { type: 'word', id: 'nw3' }, { type: 'script', id: 's1' }, { type: 'word', id: 'nw1' }, { type: 'word', id: 'nw2' }]
    expect(wordsBefore(path, blocks, 'nw1').map(x => x.dev)).toEqual(['ग'])
    expect(wordsBefore(path, blocks, 'nw2').map(x => x.dev)).toEqual(['ग', 'क'])
    expect(wordsBefore(path, blocks, 'nw3')).toEqual([])
  })
  it('Block nicht im Pfad → leer; Station ohne Daten wird übersprungen', () => {
    expect(wordsBefore([{ type: 'word', id: 'nw1' }], blocks, 'nw9')).toEqual([])
    expect(wordsBefore([{ type: 'word', id: 'nw8' }, { type: 'word', id: 'nw2' }], blocks, 'nw2')).toEqual([])
  })
})
