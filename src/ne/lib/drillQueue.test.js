import { describe, it, expect } from 'vitest'
import { startDrill, answerDrill, currentDrill, drillDone } from './drillQueue.js'

// Spielt eine Lektion durch: answers[k] = Antwort (richtig?) auf die k-te gestellte Frage.
// → Reihenfolge der gestellten Übungs-Indizes und Endzustand.
function play(n, answers) {
  let s = startDrill(n)
  const asked = []
  for (const ok of answers) {
    if (drillDone(s)) break
    asked.push(currentDrill(s).i)
    s = answerDrill(s, ok)
  }
  return { asked, s }
}

describe('drillQueue – falsche Übungen kommen einmal am Ende wieder', () => {
  it('alles richtig → jede Übung genau einmal, in Reihenfolge; fertig', () => {
    const { asked, s } = play(3, [true, true, true])
    expect(asked).toEqual([0, 1, 2])
    expect(drillDone(s)).toBe(true)
    expect(s.right).toBe(3)
  })
  it('eine falsche kommt genau einmal wieder – erst nach allen ersten Durchgängen', () => {
    const { asked, s } = play(3, [true, false, true, true])
    expect(asked).toEqual([0, 1, 2, 1])
    expect(drillDone(s)).toBe(true)
    expect(currentDrill(s)).toBeNull()
  })
  it('zweimal falsch → kein dritter Versuch', () => {
    const { asked, s } = play(2, [false, true, false, true, true])
    expect(asked).toEqual([0, 1, 0])
    expect(drillDone(s)).toBe(true)
  })
  it('mehrere falsche: Wiederholungen in der Reihenfolge der Fehler', () => {
    const { asked } = play(3, [false, true, false, true, true])
    expect(asked).toEqual([0, 1, 2, 0, 2])
  })
  it('Zähler: Position und Länge für „k / n“, retry-Kennzeichen, richtig beim ersten Versuch', () => {
    let s = startDrill(2)
    expect(s.total).toBe(2)
    expect([s.pos + 1, s.list.length]).toEqual([1, 2])
    s = answerDrill(s, false)          // Übung 0 falsch → hinten angehängt
    expect([s.pos + 1, s.list.length]).toEqual([2, 3])
    s = answerDrill(s, true)           // Übung 1 richtig
    expect(currentDrill(s)).toEqual({ i: 0, retry: true })
    s = answerDrill(s, true)           // Wiederholung richtig zählt NICHT als „erster Versuch“
    expect(s.right).toBe(1)
    expect(drillDone(s)).toBe(true)
  })
  it('Antwort nach dem Ende ändert nichts; leere Lektion ist sofort fertig', () => {
    const { s } = play(1, [true])
    expect(answerDrill(s, false)).toBe(s)
    expect(drillDone(startDrill(0))).toBe(true)
  })
})
