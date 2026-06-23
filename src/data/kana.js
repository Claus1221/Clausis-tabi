import { KANA_STROKES } from '../kanaStrokes.js'

// ─── Kana-Daten: echte Strichpfade (KanjiVG, CC BY-SA) + Merkhilfen ───────────
const TIPS = {
  あ: 'Wie ein Mensch, der winkt', い: 'Zwei parallele Linien', う: 'Ein Haken mit Dach',
  え: 'Kreuz mit Schwung', お: 'Wie え aber voller', か: 'Vertikale mit Kreuz',
  き: 'Zwei Querstriche mit Stiel', く: 'Ein Winkel nach links', け: 'Vertikale mit rechtem Arm',
  こ: 'Zwei Querstriche', さ: 'Querstrich und Schleife', し: 'Ein Haken nach rechts',
  す: 'Dach mit Haken', せ: 'Wie け gespiegelt', そ: 'Querstrich mit Schwung',
}

// char → { romaji, strokes, tip }  (strokes aus kanaStrokes.js, 109×109-Raster)
export const KANA_DATA = Object.fromEntries(
  Object.entries(KANA_STROKES).map(([ch, v]) => [ch, { ...v, tip: TIPS[ch] }]),
)

// Lektionen = Gojūon-Zeilen, erst Hiragana, dann Katakana.
export const HIRA_ROWS = [
  ['あ','い','う','え','お'], ['か','き','く','け','こ'], ['さ','し','す','せ','そ'],
  ['た','ち','つ','て','と'], ['な','に','ぬ','ね','の'], ['は','ひ','ふ','へ','ほ'],
  ['ま','み','む','め','も'], ['や','ゆ','よ'], ['ら','り','る','れ','ろ'], ['わ','を','ん'],
]
export const KATA_ROWS = [
  ['ア','イ','ウ','エ','オ'], ['カ','キ','ク','ケ','コ'], ['サ','シ','ス','セ','ソ'],
  ['タ','チ','ツ','テ','ト'], ['ナ','ニ','ヌ','ネ','ノ'], ['ハ','ヒ','フ','ヘ','ホ'],
  ['マ','ミ','ム','メ','モ'], ['ヤ','ユ','ヨ'], ['ラ','リ','ル','レ','ロ'], ['ワ','ヲ','ン'],
]
export const LESSONS = [
  ...HIRA_ROWS.map((kana, i) => ({ id: `h${i + 1}`, title: kana.join(''), kana, script: 'Hiragana' })),
  ...KATA_ROWS.map((kana, i) => ({ id: `k${i + 1}`, title: kana.join(''), kana, script: 'Katakana' })),
]
