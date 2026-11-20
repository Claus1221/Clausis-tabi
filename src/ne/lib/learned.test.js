import { describe, it, expect } from 'vitest'
import { SCRIPT_LESSONS, SCRIPT_DATA } from '../data/script.js'
import { WORD_BLOCKS } from '../data/words.js'
import { GRAMMAR, GRAMMAR_ORDER, grammarKey } from '../data/grammar.js'
import { CHAPTERS, CHAPTER_BY_ID, CHAPTER_WORD, chapterWords } from '../data/chapters.js'
import { learnedItems, itemInfo, dueItems, srsEntry, wordKey } from './learned.js'
import { NE_SETTINGS_DEFAULTS, neSettings } from './settings.js'
import { SETTINGS_DEFAULTS, addDays } from '../../useProgress.js'

const lesson = id => SCRIPT_LESSONS.find(l => l.id === id)
const isNfc = s => s === s.normalize('NFC')

// Zwei Byte-Folgen derselben Silbe, als Escapes, damit der Unterschied sichtbar bleibt:
// U+0958 (क़ als ein Zeichen) und क + Nukta (U+0915 U+093C). NFC macht aus beiden die
// zerlegte Folge (U+0958 ist von der Zusammensetzung ausgenommen) – entscheidend ist nur,
// dass beide Schreibweisen bei derselben Karte landen.
const QA_ONE = 'क़'
const QA_TWO = 'क़'

describe('learnedItems', () => {
  it('nach s1 genau die Zeichen von s1', () => {
    expect(learnedItems({ completedLessons: ['s1'] }).sort()).toEqual([...lesson('s1').chars].sort())
  })
  it('ohne Fortschritt leer, auch bei fehlenden Feldern', () => {
    expect(learnedItems({})).toEqual([])
    expect(learnedItems(undefined)).toEqual([])
  })
  it('unbekannte Lektions-IDs werden ignoriert', () => {
    expect(learnedItems({ completedLessons: ['s1', 'x9'] }).sort()).toEqual([...lesson('s1').chars].sort())
  })
  it('alle Lektionen: kein Schlüssel doppelt, alle NFC, alle Zeichen dabei', () => {
    const all = learnedItems({ completedLessons: SCRIPT_LESSONS.map(l => l.id) })
    expect(new Set(all).size).toBe(all.length)
    for (const k of all) expect(isNfc(k), k).toBe(true)
    expect(all.length).toBe(Object.keys(SCRIPT_DATA).length)
  })
  it('doppelt abgeschlossene Lektion erzeugt keine Doppel', () => {
    const k = learnedItems({ completedLessons: ['s3', 's3'] })
    expect(new Set(k).size).toBe(k.length)
  })
})

describe('learnedItems – Wörter (Schlüssel w: + Text)', () => {
  const ALL_WORD_BLOCKS = WORD_BLOCKS.map(b => b.id)
  it('wordKey: Präfix w: vor dem NFC-Text', () => {
    expect(wordKey('पानी')).toBe('w:पानी')
    expect(wordKey('क़'.normalize('NFD'))).toBe('w:' + 'क़'.normalize('NFC'))
  })
  it('Wörter abgeschlossener Blöcke kommen dazu (w:-Schlüssel, NFC, in Blockreihenfolge)', () => {
    const b = WORD_BLOCKS[0]
    const got = learnedItems({ completedWordBlocks: [b.id] })
    expect(got).toEqual(b.words.map(w => 'w:' + w.dev.normalize('NFC')))
  })
  it('ohne Schrift-Lektionen nur die Wörter; unbekannte Block-IDs wirken nicht', () => {
    const got = learnedItems({ completedWordBlocks: [WORD_BLOCKS[0].id, 'nw99'] })
    expect(got).toHaveLength(WORD_BLOCKS[0].words.length)
  })
  // Keine Ausnahmeliste: jede Quelle hat ihren eigenen Namensraum, ein Schlüssel kommt
  // also nie aus zwei Quellen (Zeichen: der Text; Wörter: w: + Text).
  it('alle Schlüssel aus allen Quellen sind eindeutig und NFC', () => {
    const all = learnedItems({ completedLessons: SCRIPT_LESSONS.map(l => l.id), completedWordBlocks: ALL_WORD_BLOCKS })
    expect(new Set(all).size).toBe(all.length)
    const words = WORD_BLOCKS.flatMap(b => b.words)
    expect(all.length).toBe(Object.keys(SCRIPT_DATA).length + words.length)
    for (const k of all) expect(isNfc(k), k).toBe(true)
  })
})

describe('learnedItems / itemInfo – Grammatik (Schlüssel g: + id)', () => {
  const ALL = {
    completedLessons: SCRIPT_LESSONS.map(l => l.id),
    completedWordBlocks: WORD_BLOCKS.map(b => b.id),
    completedGrammar: GRAMMAR.map(g => g.id),
  }
  it('abgeschlossene Themen kommen als g:-Schlüssel dazu, in GRAMMAR_ORDER', () => {
    const done = [GRAMMAR_ORDER[2], GRAMMAR_ORDER[0]]
    expect(learnedItems({ completedGrammar: done })).toEqual([grammarKey(GRAMMAR_ORDER[0]), grammarKey(GRAMMAR_ORDER[2])])
  })
  it('unbekannte Themen-IDs wirken nicht', () => {
    expect(learnedItems({ completedGrammar: ['ng99'] })).toEqual([])
  })
  // Keine Ausnahmeliste: jede Quelle hat ihren Namensraum (Zeichen: Text, Wörter: w:, Grammatik: g:).
  it('alle Schlüssel aller Quellen eindeutig und NFC; Anzahl = Summe der Quellen', () => {
    const all = learnedItems(ALL)
    expect(new Set(all).size).toBe(all.length)
    const words = WORD_BLOCKS.flatMap(b => b.words)
    expect(all.length).toBe(Object.keys(SCRIPT_DATA).length + words.length + GRAMMAR.length)
    for (const k of all) expect(isNfc(k), k).toBe(true)
  })
  it('itemInfo: kind grammar, Vorderseite = Zeichen des Themas, de = Titel, nichts undefined', () => {
    for (const g of GRAMMAR) {
      const i = itemInfo(grammarKey(g.id))
      expect(i).toMatchObject({ key: grammarKey(g.id), kind: 'grammar', front: g.glyph, de: g.title, kindLabel: 'Grammatik' })
      for (const v of Object.values(i)) expect(v, g.id).not.toBeUndefined()
      for (const f of ['key', 'front', 'roman', 'de', 'kind', 'say']) expect(typeof i[f], `${g.id}.${f}`).toBe('string')
    }
  })
  it('unbekannter g:-Schlüssel stürzt nicht ab und zeigt das Präfix nicht', () => {
    const i = itemInfo('g:ng99')
    expect(i.kind).toBe('grammar')
    expect(i.front.startsWith('g:')).toBe(false)
    expect(Object.values(i).includes(undefined)).toBe(false)
  })
})

describe('learnedItems / itemInfo – Kapitelwörter (w: + Text)', () => {
  it('abgeschlossene Kapitel bringen ihre intro-Wörter als w:-Schlüssel, nach den Wortblöcken', () => {
    const got = learnedItems({ completedWordBlocks: ['nw1'], completedChapters: ['nc2', 'nc1'] })
    const nw1 = WORD_BLOCKS.find(b => b.id === 'nw1').words.map(w => wordKey(w.dev))
    expect(got).toEqual([...nw1, ...chapterWords(CHAPTER_BY_ID.nc1).map(wordKey), ...chapterWords(CHAPTER_BY_ID.nc2).map(wordKey)])
  })
  it('das Ziel (goal) und unbekannte Kapitel bringen nichts', () => {
    expect(learnedItems({ completedChapters: ['goal', 'nc99'] })).toEqual([])
  })
  it('alles erledigt: eindeutig, NFC, Anzahl = Summe aller Quellen', () => {
    const all = learnedItems({
      completedLessons: SCRIPT_LESSONS.map(l => l.id), completedWordBlocks: WORD_BLOCKS.map(b => b.id),
      completedGrammar: GRAMMAR.map(g => g.id), completedChapters: [...CHAPTERS.map(c => c.id), 'goal'],
    })
    expect(new Set(all).size).toBe(all.length)
    const words = WORD_BLOCKS.flatMap(b => b.words).length
    expect(all.length).toBe(Object.keys(SCRIPT_DATA).length + words + Object.keys(CHAPTER_WORD).length + GRAMMAR.length)
  })
  it('itemInfo eines Kapitelworts: Umschrift und Bedeutung, kein Beispielsatz, nichts undefined', () => {
    for (const [dev, w] of Object.entries(CHAPTER_WORD)) {
      const i = itemInfo(wordKey(dev))
      expect(i).toMatchObject({ key: wordKey(dev), kind: 'word', front: dev, roman: w.roman, de: w.de, say: dev, kindLabel: 'Wort', ex: null })
      expect(Object.values(i).includes(undefined), dev).toBe(false)
    }
  })
})

describe('itemInfo – Wörter', () => {
  const words = WORD_BLOCKS.flatMap(b => b.words)
  it('jedes Wort: kind word, Vorderseite = dev, Umschrift, Bedeutung, Beispielsatz', () => {
    for (const w of words) {
      const k = wordKey(w.dev)
      const i = itemInfo(k)
      expect(i).toMatchObject({ key: k, kind: 'word', front: w.dev, roman: w.roman, de: w.de, say: w.dev, kindLabel: 'Wort' })
      expect(i.ex).toBe(w.ex)
      expect(Object.values(i).includes(undefined), k).toBe(false)
    }
  })
  it('छ ergibt zwei Karten: Konsonant (छ) und Zahlwort (w:छ)', () => {
    const s = itemInfo('छ')
    const w = itemInfo(wordKey('छ'))
    expect(s.kind).toBe('script')
    expect(s.roman).toBe(SCRIPT_DATA['छ'].roman)
    expect(w.kind).toBe('word')
    expect(w.de).toMatch(/sechs/)
    expect(w.key).not.toBe(s.key)
    const all = learnedItems({ completedLessons: SCRIPT_LESSONS.map(l => l.id), completedWordBlocks: WORD_BLOCKS.map(b => b.id) })
    expect(all).toContain('छ')
    expect(all).toContain('w:छ')
  })
  it('NFD-Form eines Wort-Schlüssels findet dieselbe Karte', () => {
    for (const w of words) expect(itemInfo('w:' + w.dev.normalize('NFD'))).toEqual(itemInfo(wordKey(w.dev)))
  })
  it('unbekannter w:-Schlüssel zeigt nirgends das Präfix', () => {
    const i = itemInfo('w:xyz')
    expect(i.front).toBe('xyz')
    expect(i.say).toBe('xyz')
    expect(i.kind).toBe('word')
    for (const v of Object.values(i)) if (typeof v === 'string' && v !== i.key) expect(v.startsWith('w:')).toBe(false)
    expect(Object.values(i).includes(undefined)).toBe(false)
  })
})

describe('itemInfo', () => {
  it('jeder gelernte Schlüssel: alle Felder gesetzt, nichts undefined', () => {
    const all = learnedItems({ completedLessons: SCRIPT_LESSONS.map(l => l.id) })
    for (const k of all) {
      const info = itemInfo(k)
      for (const f of ['key', 'front', 'roman', 'de', 'kind', 'say']) {
        expect(info[f], `${k}.${f}`).not.toBeUndefined()
        expect(typeof info[f], `${k}.${f}`).toBe('string')
      }
      expect(info.key).toBe(k)
      expect(info.kind).toBe('script')
      expect(Object.values(info).includes(undefined), k).toBe(false)
    }
  })
  it('Vokalzeichen zeigen ihre Form am क, gelesen wird ihr Laut', () => {
    const i = itemInfo('ा')
    expect(i.front).toBe('का')
    expect(i.roman).toBe('ā')
    expect(i.kindLabel).toBe('Vokalzeichen')
  })
  it('unbekannter Schlüssel stürzt nicht ab und hat kein undefined-Feld', () => {
    const i = itemInfo('xyz')
    expect(i.front).toBe('xyz')
    expect(Object.values(i).includes(undefined)).toBe(false)
  })
  it('Schlüssel in anderer Unicode-Form findet dieselben Daten', () => {
    // Für jeden echten Schlüssel: NFD-Form → dieselbe Karte.
    for (const k of Object.keys(SCRIPT_DATA)) {
      expect(itemInfo(k.normalize('NFD'))).toEqual(itemInfo(k))
    }
  })
})

describe('srsEntry / dueItems – Schlüssel laufen durch nfc', () => {
  const entry = { ease: 2.5, interval: 3, reps: 2, due: addDays(5) }
  it('zerlegte Form findet denselben srs-Eintrag wie die zusammengesetzte', () => {
    const stored = { srs: { [QA_ONE.normalize('NFC')]: entry } }
    expect(srsEntry(stored, QA_ONE)).toBe(entry)
    expect(srsEntry(stored, QA_TWO)).toBe(entry)
  })
  it('auch wenn ein Eintrag (Altbestand) nicht unter NFC gespeichert wurde', () => {
    expect(srsEntry({ srs: { [QA_ONE]: entry } }, QA_TWO)).toBe(entry)
    expect(srsEntry({ srs: { [QA_TWO]: entry } }, QA_ONE)).toBe(entry)
  })
  it('kein Eintrag → undefined, kein Wurf', () => {
    expect(srsEntry({}, 'क')).toBeUndefined()
  })
  it('dueItems: ungeplant oder fällig zählt, in der Zukunft nicht', () => {
    const p = {
      completedLessons: ['s3'],
      srs: { क: { ...entry, due: addDays(-1) }, ख: { ...entry, due: addDays(3) } },
    }
    const due = dueItems(p)
    expect(due).toContain('क')
    expect(due).not.toContain('ख')
    expect(due).toContain('ग') // gelernt, aber noch nie geplant
    expect(due.length).toBe(lesson('s3').chars.length - 1)
  })
})

describe('neSettings', () => {
  it('Umschrift standardmäßig an, japanische Standards bleiben', () => {
    const s = neSettings({})
    expect(s.showRoman).toBe(true)
    expect(s.roundSize).toBe(SETTINGS_DEFAULTS.roundSize)
    expect(NE_SETTINGS_DEFAULTS.showRoman).toBe(true)
    expect('showRoman' in SETTINGS_DEFAULTS).toBe(false)
  })
  it('gespeicherte Werte gewinnen', () => {
    expect(neSettings({ settings: { showRoman: false, roundSize: 7 } })).toMatchObject({ showRoman: false, roundSize: 7 })
  })
})
