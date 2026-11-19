// Regeln einer Wiederholungsrunde als reine Funktionen (kein React) – damit sie
// getestet sind und SRSQuiz nur noch anzeigt. Zustand ist unveränderlich (Arrays):
//   queue   – Arbeits-Warteschlange, vorn die aktuelle Karte
//   pending – beim Start fällige Karten, die noch NICHT bewertet wurden
//   passed / lapses / repeats – Zähler für Anzeige und Abschluss
//
// Regeln (wie im japanischen SRSQuiz):
//   • „Nochmal“ (Qualität < 3) legt die Karte ans Ende – sie kommt in dieser Runde wieder.
//   • In den Plan (reviewCard) geht jede Karte höchstens EINMAL je Runde, und zwar mit
//     ihrer ERSTEN Bewertung: ein vergessenes Zeichen ist dann in ein paar Stunden
//     wieder dran; das spätere Bestehen in derselben Runde schiebt es nicht weit weg.
//   • Nur Karten, die beim Start fällig waren, werden bewertet – Fleiß-Üben bringt den
//     Plan nicht durcheinander.
//   • Die Runde endet, wenn die Warteschlange leer ist.

export function startSession(deck, dueKeys) {
  const queue = [...deck]
  const due = new Set(dueKeys)
  return { queue, pending: queue.filter(k => due.has(k)), passed: 0, lapses: 0, repeats: [] }
}

export const currentCard = s => s.queue[0]
export const isFinished = s => s.queue.length === 0

// → { state, review }; review = { key, quality } für reviewCard oder null.
export function rateCard(s, quality) {
  if (isFinished(s)) return { state: s, review: null }
  const key = s.queue[0]
  const first = s.pending.includes(key)
  const review = first ? { key, quality } : null
  const pending = first ? s.pending.filter(k => k !== key) : s.pending
  if (quality < 3) {
    return {
      review,
      state: {
        ...s, pending,
        queue: [...s.queue.slice(1), key],
        lapses: s.lapses + 1,
        repeats: s.repeats.includes(key) ? s.repeats : [...s.repeats, key],
      },
    }
  }
  return { review, state: { ...s, pending, queue: s.queue.slice(1), passed: s.passed + 1 } }
}
