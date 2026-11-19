// Antippbare Sätze in Schreibgruppen zerlegen (rein, kein React).
// Die Tokens eines Beispielsatzes tragen keine Leerzeichen-Information: zusammen ergeben
// sie den Satz OHNE Leerzeichen (तपाईं + लाई + ठीक + छ + ? = तपाईंलाईठीकछ?). Wo das Nepali
// zusammenschreibt (nachgestellte Wörter, Satzzeichen), steht im Satz kein Leerzeichen –
// also wird die Gruppierung aus dem Satz selbst (`dev`) zurückgewonnen, statt eine
// zusätzliche Markierung in den Daten zu pflegen, die mit dem Satz auseinanderlaufen könnte.
//
// → Gruppen (Arrays der Original-Tokens); zwischen zwei Gruppen steht ein Leerzeichen.
// Passt der Satz nicht zu den Tokens (Datenfehler), wird jedes Token eine eigene Gruppe –
// der Satz bleibt lesbar, statt zu stürzen; words.test.js fängt so etwas ohnehin.
export function sentenceGroups(dev, tokens) {
  const list = tokens || []
  const text = typeof dev === 'string' ? dev.trim() : ''
  const groups = []
  let pos = 0
  for (const tok of list) {
    let spaced = false
    while (pos < text.length && /\s/.test(text[pos])) { pos++; spaced = true }
    if (!text.startsWith(tok.t, pos)) return list.map(t => [t])
    pos += tok.t.length
    if (spaced || groups.length === 0) groups.push([tok])
    else groups[groups.length - 1].push(tok)
  }
  if (text.slice(pos).trim() !== '') return list.map(t => [t])
  return groups
}
