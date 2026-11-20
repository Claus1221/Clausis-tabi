// „Diese Woche“ im Fortschritt (rein): was in den letzten 7 Tagen neu gelernt wurde, aus
// weekSummary (lib/progress.js), das die Tageszähler aus progress.history summiert. Die
// Zähler bucht der Reise-Screen beim ersten Abschluss: kana (Schrift-Lektion), words
// (Wortblock und Kapitel-Wörter), grammar, chapters, scenes. Nur Arten über 0.
const KINDS = [
  ['kana', 'Zeichen', 'Zeichen'],
  ['words', 'Wort', 'Wörter'],
  ['grammar', 'Grammatik-Thema', 'Grammatik-Themen'],
  ['chapters', 'Kapitel', 'Kapitel'],
  ['scenes', 'Szene', 'Szenen'],
]

export function weekLearned(week) {
  return KINDS.filter(([k]) => (week?.[k] || 0) > 0)
    .map(([k, one, many]) => ({ n: week[k], label: week[k] === 1 ? one : many }))
}
