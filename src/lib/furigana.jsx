export function renderFuri(s) {
  const re = /([一-龯々〆ヶ]+)\(([^)]+)\)/g
  const out = []
  let last = 0, m, i = 0
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) out.push(<span key={i++}>{s.slice(last, m.index)}</span>)
    out.push(<ruby key={i++}>{m[1]}<rt style={{ fontSize: '0.5em', color: '#6B6660', fontWeight: 400 }}>{m[2]}</rt></ruby>)
    last = m.index + m[0].length
  }
  if (last < s.length) out.push(<span key={i++}>{s.slice(last)}</span>)
  return out
}
// Lesbare Klammern für die Sprachausgabe entfernen (Kanji bleiben stehen).
export function furiPlain(s) { return s.replace(/\([^)]*\)/g, '') }

export const HAS_JP = /[぀-ヿ一-龯]/
