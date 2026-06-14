// Generiert src/kanaStrokes.js aus den echten KanjiVG-Strichdaten (CC BY-SA).
// Aufruf:  node scripts/gen-kana-strokes.mjs
// Lädt für jedes Kana die offizielle SVG von KanjiVG, extrahiert die Pfade
// (in Strichreihenfolge) auf dem 109×109-Raster.
import { writeFile } from 'node:fs/promises'

// [Zeichen, Romaji]
const HIRAGANA = [
  ['あ','a'],['い','i'],['う','u'],['え','e'],['お','o'],
  ['か','ka'],['き','ki'],['く','ku'],['け','ke'],['こ','ko'],
  ['さ','sa'],['し','shi'],['す','su'],['せ','se'],['そ','so'],
  ['た','ta'],['ち','chi'],['つ','tsu'],['て','te'],['と','to'],
  ['な','na'],['に','ni'],['ぬ','nu'],['ね','ne'],['の','no'],
  ['は','ha'],['ひ','hi'],['ふ','fu'],['へ','he'],['ほ','ho'],
  ['ま','ma'],['み','mi'],['む','mu'],['め','me'],['も','mo'],
  ['や','ya'],['ゆ','yu'],['よ','yo'],
  ['ら','ra'],['り','ri'],['る','ru'],['れ','re'],['ろ','ro'],
  ['わ','wa'],['を','wo'],['ん','n'],
]
const KATAKANA = [
  ['ア','a'],['イ','i'],['ウ','u'],['エ','e'],['オ','o'],
  ['カ','ka'],['キ','ki'],['ク','ku'],['ケ','ke'],['コ','ko'],
  ['サ','sa'],['シ','shi'],['ス','su'],['セ','se'],['ソ','so'],
  ['タ','ta'],['チ','chi'],['ツ','tsu'],['テ','te'],['ト','to'],
  ['ナ','na'],['ニ','ni'],['ヌ','nu'],['ネ','ne'],['ノ','no'],
  ['ハ','ha'],['ヒ','hi'],['フ','fu'],['ヘ','he'],['ホ','ho'],
  ['マ','ma'],['ミ','mi'],['ム','mu'],['メ','me'],['モ','mo'],
  ['ヤ','ya'],['ユ','yu'],['ヨ','yo'],
  ['ラ','ra'],['リ','ri'],['ル','ru'],['レ','re'],['ロ','ro'],
  ['ワ','wa'],['ヲ','wo'],['ン','n'],
]

const hex = (ch) => ch.codePointAt(0).toString(16).padStart(5, '0')

async function fetchStrokes(ch) {
  const url = `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${hex(ch)}.svg`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} für ${ch}`)
  const svg = await res.text()
  const strokes = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map(m => m[1])
  if (strokes.length === 0) throw new Error(`Keine Pfade für ${ch}`)
  return strokes
}

async function build(list) {
  const out = {}
  for (const [ch, romaji] of list) {
    const strokes = await fetchStrokes(ch)
    out[ch] = { romaji, strokes }
    process.stdout.write(`${ch}(${strokes.length}) `)
  }
  return out
}

console.log('Hiragana laden…')
const hira = await build(HIRAGANA)
console.log('\nKatakana laden…')
const kata = await build(KATAKANA)

const body = `// AUTOGENERIERT von scripts/gen-kana-strokes.mjs — nicht von Hand bearbeiten.
// Strichdaten: KanjiVG (https://kanjivg.tagaini.net), Lizenz CC BY-SA 3.0.
// Koordinatensystem: 109 × 109.

export const STROKE_VIEWBOX = 109

export const HIRAGANA = ${JSON.stringify(hira, null, 0)}

export const KATAKANA = ${JSON.stringify(kata, null, 0)}

export const KANA_STROKES = { ...HIRAGANA, ...KATAKANA }
`

await writeFile(new URL('../src/kanaStrokes.js', import.meta.url), body)
console.log('\n→ src/kanaStrokes.js geschrieben')
