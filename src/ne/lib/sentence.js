// Antippbare Sätze in Schreibgruppen zerlegen (rein, kein React).
// Die Tokens eines Beispielsatzes tragen keine Leerzeichen-Information: zusammen ergeben
// sie den Satz OHNE Leerzeichen (तपाईं + लाई + ठीक + छ + ? = तपाईंलाईठीकछ?). Wo das Nepali
// zusammenschreibt (nachgestellte Wörter, Satzzeichen), steht im Satz kein Leerzeichen –
// also wird die Gruppierung aus dem Satz selbst (`dev`) zurückgewonnen, statt eine
// zusätzliche Markierung in den Daten zu pflegen, die mit dem Satz auseinanderlaufen könnte.
//
// → Gruppen (Arrays der Original-Tokens); zwischen zwei Gruppen steht ein Leerzeichen.
// Passt der Satz nicht zu den Tokens (Datenfehler), wird jedes Wort-Token eine eigene Gruppe –
// der Satz bleibt lesbar, statt zu stürzen; words.test.js fängt so etwas ohnehin.
import { nfc } from './deva.js'

// Notfall-Layout: jedes Token eine Gruppe, Satzzeichen (ohne de) aber weiter am Token davor.
const fallback = list => list.reduce((gs, t) => {
  if (!t.de && gs.length) gs[gs.length - 1].push(t)
  else gs.push([t])
  return gs
}, [])

export function sentenceGroups(dev, tokens) {
  const list = tokens || []
  // Verglichen wird in NFC: dieselbe Silbe kann im Satz zerlegt, im Token zusammengesetzt
  // stehen (oder umgekehrt) – das ist kein Datenfehler.
  const text = typeof dev === 'string' ? nfc(dev).trim() : ''
  const groups = []
  let pos = 0
  for (const tok of list) {
    let spaced = false
    while (pos < text.length && /\s/.test(text[pos])) { pos++; spaced = true }
    const t = nfc(tok.t)
    if (!text.startsWith(t, pos)) return fallback(list)
    pos += t.length
    if (spaced || groups.length === 0) groups.push([tok])
    else groups[groups.length - 1].push(tok)
  }
  if (text.slice(pos).trim() !== '') return fallback(list)
  return groups
}

// Tippflächen für die antippbaren Stücke EINER Zeile (rein, Zahlen in px).
// spans: [{ left, right }] der sichtbaren Stücke, von links nach rechts. Ergebnis: je Stück
// ein Abschnitt [{ left, right }], lückenlos aneinander, nie überlappend, jeder mindestens
// `min` breit – auch bei kurzen, angeklebten Stücken (तपाईं|लाई, यो, मा). Der sichtbare Text
// bleibt, wo er ist; nur die unsichtbare Fläche wird verteilt.
// Ausgangspunkt sind die natürlichen Grenzen (Zeilenanfang, Mitte jeder Lücke bzw. die
// Naht angeklebter Stücke, Zeilenende); sie werden so wenig wie möglich verschoben
// (kleinste Quadrate), bis jeder Abschnitt ≥ min ist: mit e_i = c_i − min·i wird daraus
// „e nicht fallend, möglichst nah an d_i = b_i − min·i“ – eine isotone Regression (Pool
// Adjacent Violators). lo/hi (optional): Rahmen, in den die Flächen zurückgeschoben werden,
// soweit Platz ist – sonst ragten sie über den Rand und erzeugten seitliches Scrollen.
export function hitSegments(spans, min = 44, lo = -Infinity, hi = Infinity) {
  const n = spans.length
  if (!n) return []
  const b = [spans[0].left]
  for (let i = 1; i < n; i++) b.push((spans[i - 1].right + spans[i].left) / 2)
  b.push(spans[n - 1].right)
  // Pool Adjacent Violators auf d_i
  const blocks = [] // { sum, count }
  b.forEach((x, i) => {
    blocks.push({ sum: x - min * i, count: 1 })
    while (blocks.length > 1) {
      const a = blocks[blocks.length - 2], c = blocks[blocks.length - 1]
      if (a.sum / a.count <= c.sum / c.count) break
      blocks.splice(-2, 2, { sum: a.sum + c.sum, count: a.count + c.count })
    }
  })
  const c = []
  for (const blk of blocks) for (let k = 0; k < blk.count; k++) c.push(blk.sum / blk.count + min * c.length)
  // In den Rahmen schieben, soweit er reicht.
  let shift = 0
  if (c[0] < lo) shift = lo - c[0]
  if (c[n] + shift > hi) shift = Math.max(lo - c[0], hi - c[n])
  return spans.map((_, i) => ({ left: c[i] + shift, right: c[i + 1] + shift }))
}
