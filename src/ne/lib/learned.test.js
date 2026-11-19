import { describe, it, expect } from 'vitest'
import { SCRIPT_LESSONS, SCRIPT_DATA } from '../data/script.js'
import { WORD_BLOCKS } from '../data/words.js'
import { learnedItems, itemInfo, dueItems, srsEntry, KEY_COLLISIONS } from './learned.js'
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

describe('learnedItems – Wörter', () => {
  const ALL_WORD_BLOCKS = WORD_BLOCKS.map(b => b.id)
  it('Wörter abgeschlossener Blöcke kommen dazu (NFC, in Blockreihenfolge)', () => {
    const b = WORD_BLOCKS[0]
    const got = learnedItems({ completedWordBlocks: [b.id] })
    expect(got).toEqual(b.words.map(w => w.dev.normalize('NFC')))
  })
  it('Schrift und Wörter zusammen: kein Schlüssel doppelt', () => {
    const all = learnedItems({ completedLessons: SCRIPT_LESSONS.map(l => l.id), completedWordBlocks: ALL_WORD_BLOCKS })
    expect(new Set(all).size).toBe(all.length)
    for (const k of all) expect(isNfc(k), k).toBe(true)
  })
  it('ohne Schrift-Lektionen nur die Wörter; unbekannte Block-IDs wirken nicht', () => {
    const got = learnedItems({ completedWordBlocks: [WORD_BLOCKS[0].id, 'nw99'] })
    expect(got).toHaveLength(WORD_BLOCKS[0].words.length)
  })
})

// Ein Karten-Schlüssel ist der Devanagari-Text. Schreibt sich ein Wort genau wie ein
// Schriftzeichen, landen beide auf EINER Karte – das soll nicht still passieren. Jede
// solche Doppelung muss in KEY_COLLISIONS (learned.js) stehen, mit Entscheidung, welche
// Quelle die Karte zeigt. Eine neue Doppelung lässt diesen Test scheitern.
describe('Karten-Schlüssel aus zwei Quellen', () => {
  const scriptKeys = new Set(SCRIPT_LESSONS.flatMap(l => l.chars).map(k => k.normalize('NFC')))
  const wordKeys = WORD_BLOCKS.flatMap(b => b.words).map(w => w.dev.normalize('NFC'))
  const clashes = wordKeys.filter(k => scriptKeys.has(k))
  it('jede Doppelung Schrift/Wort ist ausdrücklich verzeichnet', () => {
    for (const k of clashes) expect(KEY_COLLISIONS, `${k} ist Zeichen UND Wort`).toHaveProperty(k)
  })
  it('verzeichnete Doppelungen zeigen die dort festgelegte Quelle', () => {
    for (const k of clashes) expect(itemInfo(k).kind).toBe(KEY_COLLISIONS[k])
  })
})

describe('itemInfo – Wörter', () => {
  const words = WORD_BLOCKS.flatMap(b => b.words)
  it('jedes Wort: kind word, Vorderseite = dev, Umschrift, Bedeutung, Beispielsatz', () => {
    for (const w of words) {
      const k = w.dev.normalize('NFC')
      if (KEY_COLLISIONS[k] && KEY_COLLISIONS[k] !== 'word') continue
      const i = itemInfo(k)
      expect(i).toMatchObject({ key: k, kind: 'word', front: w.dev, roman: w.roman, de: w.de, say: w.dev, kindLabel: 'Wort' })
      expect(i.ex).toBe(w.ex)
      expect(Object.values(i).includes(undefined), k).toBe(false)
    }
  })
  it('NFD-Form eines Worts findet dieselbe Karte', () => {
    for (const w of words) expect(itemInfo(w.dev.normalize('NFD'))).toEqual(itemInfo(w.dev))
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
