import { describe, it, expect } from 'vitest'
import { collectNeTexts, RATE_WORD, RATE_SENTENCE } from './collect-ne.mjs'

const script = {
  क: { roman: 'ka', kind: 'consonant', tip: '', say: 'क', shown: 'क' },
  'ा': { roman: 'ā', kind: 'matra', tip: '', say: 'का', shown: 'का' },
}

describe('collectNeTexts', () => {
  it('Einzelzeichen kommen mit say und Wort-Tempo', () => {
    const t = collectNeTexts({ script })
    expect(t).toContainEqual(['क', RATE_WORD])
    expect(t).toContainEqual(['का', RATE_WORD]) // say, nicht der Schlüssel „ा“
    expect(t.some(([x]) => x === 'ा')).toBe(false)
  })

  it('Wort-Tempo gilt auch, wenn derselbe Text zusätzlich als Satz vorkommt', () => {
    const t = collectNeTexts({ script: { क: script.क, ख: { ...script.क, say: 'क' } } })
    expect(t.filter(([x]) => x === 'क')).toEqual([['क', RATE_WORD]])
    expect(RATE_WORD).toBeLessThan(RATE_SENTENCE)
  })

  it('Texte ohne Devanagari werden übergangen', () => {
    const t = collectNeTexts({ script: { a: { say: 'a' }, '1': { say: '1' }, क: script.क } })
    expect(t).toEqual([['क', RATE_WORD]])
  })

  it('kein Text doppelt, NFC-normalisiert', () => {
    const decomposed = 'क' + '़' // क + Nukta
    const composed = decomposed.normalize('NFC')
    const t = collectNeTexts({ script: { x: { say: decomposed }, y: { say: composed }, क: script.क } })
    const texts = t.map(([x]) => x)
    expect(new Set(texts).size).toBe(texts.length)
    expect(texts).toContain(composed)
  })

  // Wortblöcke im Format von src/ne/data/words.js (nur die gelesenen Felder).
  const words = [{
    id: 'nw1', words: [
      { dev: 'पानी', ex: { dev: 'पानी छ।', tokens: [{ t: 'पानी', r: 'pānī', de: 'Wasser' }, { t: 'छ', r: 'cha', de: 'ist' }, { t: '।' }] } },
      // Ein „Satz“, der zugleich als Einzelwort vorkommt: nur ein Wort lang.
      { dev: 'धन्यवाद', ex: { dev: 'धन्यवाद', tokens: [{ t: 'धन्यवाद', r: 'dhanyabād', de: 'danke' }] } },
    ],
  }]

  it('Wörter: Wort und Token mit Wort-Tempo, Beispielsatz mit Satz-Tempo', () => {
    const t = collectNeTexts({ words })
    expect(t).toContainEqual(['पानी', RATE_WORD])
    expect(t).toContainEqual(['छ', RATE_WORD]) // antippbares Token
    expect(t).toContainEqual(['पानी छ।', RATE_SENTENCE])
    expect(t.some(([x]) => x === '।')).toBe(false) // Satzzeichen-Token nicht
  })

  it('ein Text, der als Satz UND als Einzelwort vorkommt, bekommt das Wort-Tempo', () => {
    // धन्यवाद ist Wort und (einwortiger) Beispielsatz – in beiden Reihenfolgen.
    const t = collectNeTexts({ words })
    expect(t.filter(([x]) => x === 'धन्यवाद')).toEqual([['धन्यवाद', RATE_WORD]])
    const satzZuerst = [{ id: 'nw9', words: [
      { dev: 'नमस्ते छ', ex: { dev: 'नमस्ते', tokens: [] } },
      { dev: 'नमस्ते', ex: { dev: 'नमस्ते छ', tokens: [] } },
    ] }]
    const u = collectNeTexts({ words: satzZuerst })
    expect(u.filter(([x]) => x === 'नमस्ते')).toEqual([['नमस्ते', RATE_WORD]])
    expect(u.filter(([x]) => x === 'नमस्ते छ')).toEqual([['नमस्ते छ', RATE_WORD]])
  })

  // Grammatik im Format von src/ne/data/grammar.js (nur die gelesenen Felder).
  const grammar = [{
    id: 'ng1',
    examples: [{ dev: 'म सन्चै छु।', tokens: [{ t: 'म', r: 'ma', de: 'ich' }, { t: 'सन्चै', r: 'sancai', de: 'wohlauf' }, { t: 'छु', r: 'chu', de: 'bin' }, { t: '।' }] }],
    exercises: [
      { q: 'म सन्चै ＿＿।', a: 'छु', options: ['छु', 'म', 'यो'] },
      { q: 'म＿＿ पानी चाहिन्छ।', a: 'लाई', options: ['लाई', 'को', 'एक जना'] },
    ],
  }]
  const grammarNewWords = { ng1: [{ dev: 'जर्मन', roman: 'jarman', de: 'deutsch' }] }

  it('Grammatik: Beispielsatz und gelöste Lückensätze mit Satz-Tempo', () => {
    const t = collectNeTexts({ grammar })
    expect(t).toContainEqual(['म सन्चै छु।', RATE_SENTENCE])
    expect(t).toContainEqual(['मलाई पानी चाहिन्छ।', RATE_SENTENCE])
    expect(t.some(([x]) => x.includes('＿'))).toBe(false) // nie die Lücke sprechen
  })
  it('Grammatik: antippbare Tokens, Antwort-Optionen und neue Wörter mit Wort-Tempo', () => {
    const t = collectNeTexts({ grammar, grammarNewWords })
    for (const w of ['म', 'सन्चै', 'छु', 'यो', 'लाई', 'को', 'एक जना', 'जर्मन']) expect(t, w).toContainEqual([w, RATE_WORD])
    expect(t.some(([x]) => x === '।')).toBe(false)
  })
  it('neue Wörter eines Themas ohne GRAMMAR-Daten: trotzdem gesammelt', () => {
    expect(collectNeTexts({ grammarNewWords })).toEqual([['जर्मन', RATE_WORD]])
  })

  // Kapitel im Format von src/ne/data/chapters.js (nur die gelesenen Felder). Gesammelt wird,
  // was der Kapitel-Spieler anhören lässt.
  const chapters = [{
    id: 'nc1',
    steps: [
      { kind: 'story', de: 'Nur Deutsch.' },
      { kind: 'story', de: 'x', dev: 'यो थमेल हो।', tokens: [{ t: 'यो', r: 'yo', de: 'das' }, { t: 'थमेल', r: 'thamel', de: 'Thamel' }, { t: 'हो', r: 'ho', de: 'ist' }, { t: '।' }] },
      { kind: 'intro', dev: 'भिसा', roman: 'bhisā', de: 'Visum' },
      { kind: 'audio', say: 'एक हजार रुपैयाँ।', options: ['a', 'b', 'c'], answer: 'a' },
      { kind: 'dialog', line: 'कहाँ जाने?', options: ['थमेल।', 'म जर्मन हुँ।'], answer: 'थमेल।' },
      { kind: 'gap', before: 'अलि ', after: ' छ।', options: ['महँगो', 'सस्तो'], answer: 'महँगो' },
      { kind: 'tf', dev: 'त्यहाँ छ।' },
      { kind: 'build', dev: 'म पर्यटक हुँ।', tiles: ['म', 'पर्यटक', 'हुँ', 'हो'], answer: ['म', 'पर्यटक', 'हुँ'] },
    ],
  }]
  it('Kapitel: Sätze (Erzählung, Hören, Gespräch samt Antwort, gelöste Lücke, Stimmt-das, Satzbau) mit Satz-Tempo', () => {
    const t = collectNeTexts({ chapters })
    for (const x of ['यो थमेल हो।', 'एक हजार रुपैयाँ।', 'कहाँ जाने?', 'थमेल।', 'अलि महँगो छ।', 'त्यहाँ छ।', 'म पर्यटक हुँ।']) {
      expect(t, x).toContainEqual([x, RATE_SENTENCE])
    }
  })
  it('Kapitel: intro-Wörter und antippbare Tokens mit Wort-Tempo; Ablenker, Lücken-Optionen und Stücke nicht', () => {
    const t = collectNeTexts({ chapters })
    for (const w of ['भिसा', 'यो', 'थमेल', 'हो']) expect(t, w).toContainEqual([w, RATE_WORD])
    for (const x of ['म जर्मन हुँ।', 'सस्तो', 'महँगो', 'पर्यटक', '।']) expect(t.some(([y]) => y === x), x).toBe(false)
  })

  // Szenen im Format von src/ne/data/dialogs.js (nur die gelesenen Felder). Gesammelt wird,
  // was der Szenen-Spieler anhören lässt.
  const dialogs = [{
    id: 'nd1',
    newPhrases: [{ dev: 'कति भयो', roman: 'kati bhayo', de: 'x' }],
    turns: [
      { npc: 'नमस्ते, कहाँ जाने?', npcTokens: [{ t: 'नमस्ते', r: 'namaste', de: 'Hallo' }, { t: ',' }, { t: 'कहाँ', r: 'kahāṃ', de: 'wo' }, { t: 'जाने', r: 'jāne', de: 'gehen' }, { t: '?' }],
        options: ['थमेल जानुहोस्।', 'म जर्मन हुँ।'], answer: 'थमेल जानुहोस्।',
        answerTokens: [{ t: 'थमेल', r: 'thamel', de: 'Thamel' }, { t: 'जानुहोस्', r: 'jānuhos', de: 'fahren Sie' }, { t: '।' }] },
      { npc: '', npcTokens: [], options: ['दिदी, कति भयो?', 'यो मेरो होइन।'], answer: 'दिदी, कति भयो?',
        answerTokens: [{ t: 'दिदी', r: 'didī', de: 'Didi' }, { t: ',' }, { t: 'कति', r: 'kati', de: 'wie viel' }, { t: 'भयो', r: 'bhayo', de: 'ist geworden' }, { t: '?' }] },
    ],
  }]
  it('Szenen: NPC-Zeile und Antwortsatz mit Satz-Tempo; Tokens und neue Wendungen mit Wort-Tempo', () => {
    const t = collectNeTexts({ dialogs })
    for (const x of ['नमस्ते, कहाँ जाने?', 'थमेल जानुहोस्।', 'दिदी, कति भयो?']) expect(t, x).toContainEqual([x, RATE_SENTENCE])
    for (const w of ['नमस्ते', 'कहाँ', 'जाने', 'थमेल', 'जानुहोस्', 'दिदी', 'भयो', 'कति भयो']) expect(t, w).toContainEqual([w, RATE_WORD])
  })
  it('Szenen: falsche Optionen, Satzzeichen und die leere NPC-Zeile nie', () => {
    const t = collectNeTexts({ dialogs })
    for (const x of ['म जर्मन हुँ।', 'यो मेरो होइन।', ',', '?', '']) expect(t.some(([y]) => y === x), x).toBe(false)
  })

  it('fehlende Quellen sind erlaubt', () => {
    expect(collectNeTexts({})).toEqual([])
  })
})
