// Beispielsatz-Audit: Prüft, ob Beispielsätze (Grammatik-Themen, Wortblöcke,
// Kapitel) Kanji oder Grammatik verwenden, die im Lehrplan (PATH) erst SPÄTER
// eingeführt werden („Vorwärts-Referenzen"). Reine Analyse – ändert nichts.
//   node scripts/audit-examples.mjs
import { readFileSync } from 'fs'
const src = readFileSync(new URL('../src/TabiApp.jsx', import.meta.url), 'utf8')
const isKanji = c => /[一-鿿]/.test(c)

// Klammer-Matching für ein Array, das auf `marker` folgt (Strings werden beachtet).
function matchingBracket(s, open) {
  let depth = 0, inStr = false
  for (let i = open; i < s.length; i++) {
    const c = s[i]
    if (inStr) { if (c === "'" && s[i - 1] !== '\\') inStr = false; continue }
    if (c === "'") inStr = true
    else if (c === '[') depth++
    else if (c === ']') { depth--; if (depth === 0) return i }
  }
  return -1
}
function sliceArray(marker) {
  const m = src.indexOf(marker)
  const open = src.indexOf('[', m)
  return { text: src.slice(open, matchingBracket(src, open) + 1) }
}
const anchorsIn = (text, re) => [...text.matchAll(re)].map(m => ({ id: m[1], off: m.index }))
const lastAnchor = (anchors, off) => { let best = null; for (const a of anchors) if (a.off <= off && (!best || a.off > best.off)) best = a; return best && best.id }

// ─ PATH-Reihenfolge → Ordinalposition je Einheit ─
const pathText = sliceArray('const PATH =').text
let ord = 0; const posOf = {}
for (const m of pathText.matchAll(/type: '\w+', id: '(\w+)'/g)) posOf[m[1]] = ord++

// ─ Einführungsposition je Kanji (Wortblock-Headwords + Kapitel-Intros) ─
const wb = sliceArray('const WORD_BLOCKS =')
const ch = sliceArray('const CHAPTERS =')
const gr = sliceArray('const GRAMMAR =')
const wbAnchors = anchorsIn(wb.text, /id: '(wb\d+)'/g)
const chAnchors = anchorsIn(ch.text, /id: '(c\d+)'/g)
const grAnchors = anchorsIn(gr.text, /id: '(g\d+)'/g)

const kanjiIntro = {}
const noteKanji = (str, pos) => { for (const c of str) if (isKanji(c)) kanjiIntro[c] = Math.min(kanjiIntro[c] ?? Infinity, pos) }
for (const m of wb.text.matchAll(/kanji: '([^']+)'/g)) noteKanji(m[1], posOf[lastAnchor(wbAnchors, m.index)])
for (const m of ch.text.matchAll(/kind: 'intro'[^}]*?jp: '([^']+)'/g)) noteKanji(m[1], posOf[lastAnchor(chAnchors, m.index)])

// ─ Grammatik aus einem Token ableiten ─
function tokenGrammar(t, b) {
  b = b || ''
  if (t === 'です') return 'g2'
  if (t === 'は' && /Thema/.test(b)) return 'g1'
  if (t === 'が' && /Subjekt/.test(b)) return 'g3'
  if (t === 'を') return 'g4'
  if ((t === 'に' || t === 'で') && /Partikel|Richtung|Ziel|Mittel|Ort/.test(b)) return 'g5'
  if (t === 'か') return 'g8'
  if (t === 'の' && /Verbindung|Besitz|Genitiv/.test(b)) return 'g9'
  if (/Verb/.test(b) && /höflich/.test(b)) return 'g6'
  if (/Adjektiv/.test(b)) return 'g7'
  return null
}
const GLYPH = { g1: 'は', g2: 'です', g3: 'が', g4: 'を', g5: 'に/で', g6: 'ます', g7: '形(Adj)', g8: 'か', g9: 'の', g10: '文' }

const findings = []
// Tokens-Array prüfen (Grammatik-Vorwärts-Referenzen) + zugehörigen jp-Satz (Kanji)
function checkTokens(regionText, anchors, label) {
  for (const tm of regionText.matchAll(/tokens: \[/g)) {
    const open = tm.index + tm[0].length - 1
    const arr = regionText.slice(open, matchingBracket(regionText, open) + 1)
    const unit = lastAnchor(anchors, tm.index); const pos = posOf[unit]
    if (pos == null) continue
    // jp dieses Beispiels = letztes jp VOR dem tokens
    const before = regionText.slice(0, tm.index)
    const jms = [...before.matchAll(/jp: '([^']*)'/g)]
    const jp = jms.length ? jms[jms.length - 1][1] : ''
    for (const km of arr.matchAll(/\{ t: '([^']*)'(?:[^{}]*?b: '([^']*)')?[^{}]*?\}/g)) {
      const g = tokenGrammar(km[1], km[2])
      if (g && posOf[g] != null && posOf[g] > pos) findings.push({ unit, label, jp, kind: 'Grammatik', item: `${km[1]} (${GLYPH[g]}, ${g})` })
    }
    for (const c of new Set([...jp].filter(isKanji))) if (kanjiIntro[c] > pos) findings.push({ unit, label, jp, kind: 'Wort', item: c })
  }
}
checkTokens(gr.text, grAnchors, 'Grammatik-Beispiel')
checkTokens(wb.text, wbAnchors, 'Wortblock-Beispiel')

// Grammatik-Übungen (q ohne tokens) – nur Kanji-Check
for (const m of gr.text.matchAll(/\bq: '([^']+)'/g)) {
  const pos = posOf[lastAnchor(grAnchors, m.index)]
  for (const c of new Set([...m[1]].filter(isKanji))) if (kanjiIntro[c] > pos) findings.push({ unit: lastAnchor(grAnchors, m.index), label: 'Grammatik-Übung', jp: m[1], kind: 'Wort', item: c })
}

// Kapitel – lernerseitige jp-Felder (story jp, dialog line/answer, sign, build tiles, gap text)
for (const re of [/\bjp: '([^']+)'/g, /\bline: '([^']+)'/g, /\bsign: '([^']+)'/g, /\btext: '([^']*[一-鿿][^']*)'/g]) {
  for (const m of ch.text.matchAll(re)) {
    const unit = lastAnchor(chAnchors, m.index); const pos = posOf[unit]
    for (const c of new Set([...m[1]].filter(isKanji))) if (kanjiIntro[c] > pos) findings.push({ unit, label: 'Kapitel', jp: m[1], kind: 'Wort', item: c })
  }
}

// ─ Ausgabe ─
console.log(`Lehrplan-Positionen: ${ord} Stationen.  Kanji mit Einführungsort: ${Object.keys(kanjiIntro).length}`)
if (!findings.length) { console.log('\n✓ Keine Vorwärts-Referenzen gefunden.'); process.exit(0) }
const byUnit = {}
for (const f of findings) (byUnit[f.unit] ??= []).push(f)
const order = Object.keys(byUnit).sort((a, b) => posOf[a] - posOf[b])
console.log(`\n⚠ ${findings.length} Vorwärts-Referenzen (verwendet, bevor eingeführt):\n`)
for (const u of order) {
  console.log(`■ ${u} (Position ${posOf[u]})`)
  const seen = new Set()
  for (const f of byUnit[u]) {
    const key = `${f.kind}:${f.item}:${f.jp}`
    if (seen.has(key)) continue; seen.add(key)
    const introPos = f.kind === 'Wort' ? ` – erst bei Position ${kanjiIntro[f.item]}` : ''
    console.log(`   [${f.kind}] ${f.item}${introPos}   in „${f.jp}"`)
  }
}
