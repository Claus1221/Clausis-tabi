// ─── Übungsfolge einer Grammatik-Lektion (rein, unveränderlicher Zustand) ─────
// Jede Übung wird einmal gestellt. Falsch beim ERSTEN Versuch → sie wird hinten angehängt
// und kommt nach allen ersten Durchgängen genau EINMAL wieder; auch ein zweiter Fehler
// hält die Lektion nicht auf (kein dritter Versuch). `right` zählt nur erste Versuche.
//   state = { list: { i, retry }[], pos, right, total }
//   i = Index der Übung im Thema; pos + 1 / list.length = Anzeige „k / n“.

export function startDrill(n) {
  return { list: Array.from({ length: n }, (_, i) => ({ i, retry: false })), pos: 0, right: 0, total: n }
}

export const drillDone = s => s.pos >= s.list.length
export const currentDrill = s => (drillDone(s) ? null : s.list[s.pos])

export function answerDrill(s, correct) {
  const cur = currentDrill(s)
  if (!cur) return s
  return {
    ...s,
    pos: s.pos + 1,
    right: s.right + (correct && !cur.retry ? 1 : 0),
    list: !correct && !cur.retry ? [...s.list, { i: cur.i, retry: true }] : s.list,
  }
}
