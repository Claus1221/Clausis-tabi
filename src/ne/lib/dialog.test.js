import { describe, it, expect } from 'vitest'
import { DIALOGS, DIALOG_BY_ID } from '../data/dialogs.js'
import { WORD_BLOCKS } from '../data/words.js'
import { GRAMMAR } from '../data/grammar.js'
import { CHAPTERS } from '../data/chapters.js'
import { nfc } from './deva.js'
import {
  dialogGate, answerWords, knownWords, phrasesFromTurns, warmupPhrases,
  warmupOptions, startWarmup, answerWarmup, warmupDone, firstTryScore,
} from './dialog.js'

// Lernstand „alles bis vor die Szene“ nach path-order.md (Wortblöcke, Themen, Kapitel).
const W5 = { completedWordBlocks: ['nw1', 'nw2', 'nw3'], completedGrammar: ['ng1', 'ng2', 'ng3', 'ng4', 'ng5'], completedChapters: ['nc1', 'nc2'] }
const ALL = {
  completedWordBlocks: WORD_BLOCKS.map(b => b.id), completedGrammar: GRAMMAR.map(g => g.id), completedChapters: CHAPTERS.map(c => c.id),
}
const nd1 = DIALOG_BY_ID.nd1

describe('answerWords', () => {
  it('antippbare Wörter der Antwortsätze, NFC, ohne Doppelte, ohne Satzzeichen', () => {
    const w = answerWords(nd1)
    expect(new Set(w).size).toBe(w.length)
    for (const x of w) expect(x).toBe(nfc(x))
    expect(w).toContain(nfc('थमेल'))
    expect(w).not.toContain('।')
    expect(w).not.toContain(',')
  })
  it('NPC-Wörter zählen nicht (nur was du selbst sagen musst)', () => {
    // nd5: अनि kommt in der NPC-Zeile UND in einer Antwort; यहाँबाट nur beim NPC und in falschen Optionen.
    const d = DIALOG_BY_ID.nd5
    const npcOnly = d.turns.flatMap(t => t.npcTokens).filter(k => k.de).map(k => nfc(k.t))
      .filter(t => !d.turns.some(u => u.answerTokens.some(k => nfc(k.t) === t)))
    for (const t of npcOnly) expect(answerWords(d)).not.toContain(t)
  })
})

describe('knownWords', () => {
  it('Funktionswörter sind immer bekannt', () => {
    expect(knownWords({}).has(nfc('हो'))).toBe(true)
  })
  it('Wörter erledigter Blöcke (auch Teile mehrteiliger Einträge), Themen-Formen und -Wörter, Kapitel-Wörter', () => {
    const k = knownWords(ALL)
    for (const b of WORD_BLOCKS) for (const w of b.words) for (const p of w.dev.split(' ')) expect(k.has(nfc(p)), p).toBe(true)
    expect(knownWords({}).has(nfc('थमेल'))).toBe(false)
  })
})

describe('dialogGate', () => {
  it('leerer Lernstand → zu, missing nennt die fehlenden Wörter (ohne Funktionswörter)', () => {
    const g = dialogGate(nd1, {})
    expect(g.open).toBe(false)
    expect(g.missing.length).toBeGreaterThan(0)
    expect(g.missing).not.toContain(nfc('हो'))
    expect(new Set(g.missing).size).toBe(g.missing.length)
  })
  it('jede Szene ist offen, wenn alles davor im Pfad gelernt ist (Lernstand nach path-order.md)', () => {
    expect(dialogGate(nd1, W5)).toEqual({ open: true, missing: [] })
    for (const d of DIALOGS) expect(dialogGate(d, ALL), d.id).toEqual({ open: true, missing: [] })
  })
  it('die eigenen newPhrases der Szene sperren nicht (das Aufwärmen lehrt sie)', () => {
    // पुग्यो lehrt kein Block und kein Thema – nur das Aufwärmen von nd3.
    expect(knownWords(ALL).has(nfc('पुग्यो'))).toBe(false)
    expect(answerWords(DIALOG_BY_ID.nd3)).toContain(nfc('पुग्यो'))
    expect(dialogGate(DIALOG_BY_ID.nd3, ALL).open).toBe(true)
  })
  it('schon gespielte Szene bleibt offen, auch wenn der Lernstand (z. B. nach Umbau) Lücken hat', () => {
    expect(dialogGate(nd1, { completedDialogs: ['nd1'] })).toEqual({ open: true, missing: [] })
  })
  it('kaputte Eingaben stürzen nicht', () => {
    expect(() => dialogGate(nd1, undefined)).not.toThrow()
    expect(dialogGate(undefined, {})).toEqual({ open: false, missing: [] })
  })
})

describe('phrasesFromTurns', () => {
  it('Antwortsätze mit Umschrift, Bedeutung und Tokens, NFC, in Spielreihenfolge, ohne Doppelte', () => {
    const p = phrasesFromTurns(nd1.turns)
    expect(p.map(x => x.dev)).toEqual(nd1.turns.map(t => t.answer))
    expect(p[0]).toEqual({ dev: nd1.turns[0].answer, roman: nd1.turns[0].answerRoman, de: nd1.turns[0].answerDe, tokens: nd1.turns[0].answerTokens })
    const twice = phrasesFromTurns([...nd1.turns, nd1.turns[0]])
    expect(twice).toHaveLength(nd1.turns.length)
    for (const x of p) expect(x.dev).toBe(nfc(x.dev))
  })
  it('leer/fehlend → []', () => {
    expect(phrasesFromTurns(undefined)).toEqual([])
    expect(phrasesFromTurns([{ answer: '' }])).toEqual([])
  })
})

describe('warmupPhrases', () => {
  it('erst die newPhrases (ohne Tokens), dann die Antwortsätze', () => {
    const d = DIALOG_BY_ID.nd3
    const w = warmupPhrases(d)
    expect(w.slice(0, d.newPhrases.length).map(x => x.dev)).toEqual(d.newPhrases.map(p => nfc(p.dev)))
    expect(w.slice(0, d.newPhrases.length).every(x => !x.tokens)).toBe(true)
    expect(w.slice(d.newPhrases.length).map(x => x.dev)).toEqual(phrasesFromTurns(d.turns).map(x => x.dev))
  })
  it('Szene ohne newPhrases → nur die Antwortsätze', () => {
    expect(warmupPhrases(nd1)).toEqual(phrasesFromTurns(nd1.turns))
  })
})

describe('warmupOptions', () => {
  const list = warmupPhrases(DIALOG_BY_ID.nd3)
  it('die richtige plus zwei andere Wendungen derselben Szene, alle verschieden', () => {
    for (let i = 0; i < list.length; i++) {
      const o = warmupOptions(list, i, () => 0.5)
      expect(o).toHaveLength(3)
      expect(o).toContain(list[i].dev)
      expect(new Set(o).size).toBe(3)
      for (const x of o) expect(list.some(p => p.dev === x)).toBe(true)
    }
  })
  it('nie zwei Optionen mit gleicher Bedeutung', () => {
    for (let i = 0; i < list.length; i++) {
      const des = warmupOptions(list, i, Math.random).map(x => list.find(p => p.dev === x).de)
      expect(new Set(des).size).toBe(des.length)
    }
  })
  it('weniger Wendungen als Optionen → so viele wie da sind', () => {
    expect(warmupOptions(list.slice(0, 2), 0, () => 0.1)).toHaveLength(2)
  })
})

describe('Aufwärm-Runde', () => {
  it('jede Wendung einmal; falsch → derselbe Satz kommt am Ende noch einmal', () => {
    let s = startWarmup(3)
    expect(s.queue).toEqual([0, 1, 2])
    s = answerWarmup(s, false)
    expect(s.queue).toEqual([1, 2, 0])
    s = answerWarmup(s, true)
    s = answerWarmup(s, true)
    expect(warmupDone(s)).toBe(false)
    s = answerWarmup(s, true)
    expect(warmupDone(s)).toBe(true)
    expect(s.misses).toBe(1)
  })
  it('leere Runde ist sofort fertig; Antworten danach ändern nichts', () => {
    const s = startWarmup(0)
    expect(warmupDone(s)).toBe(true)
    expect(answerWarmup(s, true)).toBe(s)
  })
})

describe('firstTryScore', () => {
  it('zählt Züge, die beim ersten Antippen richtig waren', () => {
    expect(firstTryScore({ 0: true, 1: false, 2: true }, 4)).toBe(2)
    expect(firstTryScore({}, 3)).toBe(0)
  })
})
