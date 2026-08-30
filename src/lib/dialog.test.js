import { describe, it, expect } from 'vitest'
import { DIALOGS } from '../data/dialogs.js'
import { phrasesFromTurns, dialogPhrases, dialogShakyWords } from './dialog.js'

const d2 = DIALOGS.find(d => d.id === 'd2')

describe('Antwortsätze der Szenen', () => {
  it('hat zu jedem Zug eine deutsche Übersetzung', () => {
    // Ohne sie kann das Aufwärmen nicht abfragen („Wie sagst du das?").
    for (const scene of DIALOGS.filter(d => d.turns)) {
      for (const t of scene.turns) {
        expect(typeof t.answerDe, `${scene.id}: ${t.answer}`).toBe('string')
        expect(t.answerDe.length, `${scene.id}: ${t.answer}`).toBeGreaterThan(0)
      }
    }
  })
})

describe('phrasesFromTurns', () => {
  it('liefert die Sätze einer Szene mit Übersetzung', () => {
    const p = dialogPhrases(d2)
    expect(p[0]).toEqual({ jp: 'ホテルまで おねがいします。', de: 'Zum Hotel, bitte.' })
    expect(p.length).toBe(3)
  })

  it('wirft Doppelte raus (dieselbe Antwort in zwei Zügen)', () => {
    const p = phrasesFromTurns([
      { answer: 'はい。', answerDe: 'Ja.' },
      { answer: 'はい。', answerDe: 'Ja.' },
      { answer: 'いいえ。', answerDe: 'Nein.' },
    ])
    expect(p.map(x => x.jp)).toEqual(['はい。', 'いいえ。'])
  })

  it('folgt den WIRKLICH gespielten Zügen (Wiederholungs-Szenen mischen)', () => {
    // Ein Wiederholungs-Knoten würfelt seine Züge aus mehreren Szenen zusammen –
    // aufgewärmt werden muss genau diese Auswahl.
    const gespielt = [DIALOGS.find(d => d.id === 'd1').turns[1], d2.turns[0]]
    expect(phrasesFromTurns(gespielt).map(x => x.jp))
      .toEqual(['クラウスです。', 'ホテルまで おねがいします。'])
  })

  it('verträgt fehlende Züge', () => {
    expect(phrasesFromTurns(undefined)).toEqual([])
    expect(phrasesFromTurns([{ npc: 'あ' }])).toEqual([])
  })
})

describe('dialogShakyWords', () => {
  it('meldet nur Wörter, die wirklich als Karte geführt werden', () => {
    // Ohne SRS-Eintrag gibt es keinen belastbaren Kenntnisstand – dann lieber
    // gar keine Warnung als eine falsche.
    expect(dialogShakyWords(d2, { srs: {} })).toEqual([])
    expect(dialogShakyWords(d2, {})).toEqual([])
  })

  it('meldet frische Karten, aber keine gefestigten', () => {
    const wort = 'ホテル'
    expect(dialogShakyWords(d2, { srs: { [wort]: { interval: 0 } } })).toContain(wort)
    expect(dialogShakyWords(d2, { srs: { [wort]: { interval: 30 } } })).not.toContain(wort)
  })
})
