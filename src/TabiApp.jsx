import { useState, useRef, useEffect, createContext, useContext } from 'react'
import { useAuth } from './AuthGate.jsx'
import { useProgress, computeStats, weeklyXp, dueKana } from './useProgress.js'
import { KANA_STROKES, STROKE_VIEWBOX } from './kanaStrokes.js'

// Fortschritt (aus Firestore) für alle Screens verfügbar machen.
const ProgressCtx = createContext({
  progress: { completedLessons: [], completedWordBlocks: [], completedGrammar: [], xpByDate: {}, srs: {} },
  awardXp: async () => {},
  completeLesson: async () => {},
  completeWordBlock: async () => {},
  completeGrammar: async () => {},
  reviewCard: async () => {},
  reset: async () => {},
})

// XP-Belohnungen
const XP_PER_KANA = 10  // pro Zeichen in einer abgeschlossenen Lektion
const XP_PER_CARD = 5   // pro wiederholter SRS-Karte / richtiger Übungsantwort
const XP_PER_WORD = 15     // pro gelerntem Wort
const XP_PER_GRAMMAR = 20  // pro gelerntem Grammatik-Thema

// Kana-Statistiken (als Funktionen, da LESSONS weiter unten definiert ist).
function totalKanaCount() {
  return new Set(LESSONS.flatMap(l => l.kana)).size
}
function completedKanaList(completedLessons) {
  const set = new Set()
  LESSONS.filter(l => completedLessons.includes(l.id)).forEach(l => l.kana.forEach(k => set.add(k)))
  return [...set]
}
function completedKanaCount(completedLessons) {
  return completedKanaList(completedLessons).length
}

// ─── Color tokens ───────────────────────────────────────────────────────────
const C = {
  sumi: '#211F1B',
  indigo: '#1E4368',
  shu: '#DA4A38',
  washi: '#EFEBE0',
  matcha: '#5E8A6A',
  washiDark: '#E0DAC8',
  indigoLight: '#2A5A8C',
  textMuted: '#6B6660',
}

// ─── Kana-Daten: echte Strichpfade (KanjiVG, CC BY-SA) + Merkhilfen ───────────
const TIPS = {
  あ: 'Wie ein Mensch, der winkt', い: 'Zwei parallele Linien', う: 'Ein Haken mit Dach',
  え: 'Kreuz mit Schwung', お: 'Wie え aber voller', か: 'Vertikale mit Kreuz',
  き: 'Zwei Querstriche mit Stiel', く: 'Ein Winkel nach links', け: 'Vertikale mit rechtem Arm',
  こ: 'Zwei Querstriche', さ: 'Querstrich und Schleife', し: 'Ein Haken nach rechts',
  す: 'Dach mit Haken', せ: 'Wie け gespiegelt', そ: 'Querstrich mit Schwung',
}

// char → { romaji, strokes, tip }  (strokes aus kanaStrokes.js, 109×109-Raster)
const KANA_DATA = Object.fromEntries(
  Object.entries(KANA_STROKES).map(([ch, v]) => [ch, { ...v, tip: TIPS[ch] }]),
)

// Lektionen = Gojūon-Zeilen, erst Hiragana, dann Katakana.
const HIRA_ROWS = [
  ['あ','い','う','え','お'], ['か','き','く','け','こ'], ['さ','し','す','せ','そ'],
  ['た','ち','つ','て','と'], ['な','に','ぬ','ね','の'], ['は','ひ','ふ','へ','ほ'],
  ['ま','み','む','め','も'], ['や','ゆ','よ'], ['ら','り','る','れ','ろ'], ['わ','を','ん'],
]
const KATA_ROWS = [
  ['ア','イ','ウ','エ','オ'], ['カ','キ','ク','ケ','コ'], ['サ','シ','ス','セ','ソ'],
  ['タ','チ','ツ','テ','ト'], ['ナ','ニ','ヌ','ネ','ノ'], ['ハ','ヒ','フ','ヘ','ホ'],
  ['マ','ミ','ム','メ','モ'], ['ヤ','ユ','ヨ'], ['ラ','リ','ル','レ','ロ'], ['ワ','ヲ','ン'],
]
const LESSONS = [
  ...HIRA_ROWS.map((kana, i) => ({ id: `h${i + 1}`, title: kana.join(''), kana, script: 'Hiragana' })),
  ...KATA_ROWS.map((kana, i) => ({ id: `k${i + 1}`, title: kana.join(''), kana, script: 'Katakana' })),
]

const PHRASES = [
  { jp: 'ありがとうございます', romaji: 'arigatou gozaimasu', de: 'Vielen Dank' },
  { jp: 'すみません', romaji: 'sumimasen', de: 'Entschuldigung / Excuse me' },
  { jp: 'これをください', romaji: 'kore wo kudasai', de: 'Das hier, bitte' },
  { jp: 'いくらですか？', romaji: 'ikura desu ka?', de: 'Wie viel kostet das?' },
  { jp: 'どこですか？', romaji: 'doko desu ka?', de: 'Wo ist …?' },
  { jp: 'わかりません', romaji: 'wakarimasen', de: 'Ich verstehe nicht' },
  { jp: 'えいごはなせますか？', romaji: 'eigo hanasemasu ka?', de: 'Sprechen Sie Englisch?' },
  { jp: 'おねがいします', romaji: 'onegaishimasu', de: 'Bitte (höflich)' },
]

// Wörter-Blöcke: je 5 thematisch gruppierte Wörter mit Kanji, Hiragana,
// Übersetzung und Beispielsatz (mit Lesung, Übersetzung, Erklärung).
// Blöcke schalten der Reihe nach frei. Jedes Wort wird im SRS über sein Kanji abgefragt.
// Beispielsätze in der Höflichkeitsform (です/ます). Jeder Satz ist in „tokens"
// zerlegt: t = Text, r = Lesung, de = Bedeutung, b = grammatischer Aufbau.
// Tokens ohne de (z. B. „。") sind nicht antippbar.
const WORD_BLOCKS = [
  {
    id: 'wb1', theme: '🏔️', title: 'Natur', words: [
      { kanji: '山', kana: 'やま', romaji: 'yama', de: 'Berg', ex: { jp: '山が高いです。', kana: 'やまがたかいです。', de: 'Der Berg ist hoch.', tokens: [
        { t: '山', r: 'やま', de: 'Berg', b: 'Nomen' }, { t: 'が', de: '(Subjekt)', b: 'Subjektpartikel' }, { t: '高い', r: 'たかい', de: 'hoch', b: 'い-Adjektiv' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
      { kanji: '川', kana: 'かわ', romaji: 'kawa', de: 'Fluss', ex: { jp: '川を見ます。', kana: 'かわをみます。', de: 'Ich sehe den Fluss.', tokens: [
        { t: '川', r: 'かわ', de: 'Fluss', b: 'Nomen' }, { t: 'を', de: '(Objekt)', b: 'Objektpartikel' }, { t: '見ます', r: 'みます', de: 'sehen', b: 'Verb, höflich (von 見る)' }, { t: '。' },
      ] } },
      { kanji: '空', kana: 'そら', romaji: 'sora', de: 'Himmel', ex: { jp: '空が青いです。', kana: 'そらがあおいです。', de: 'Der Himmel ist blau.', tokens: [
        { t: '空', r: 'そら', de: 'Himmel', b: 'Nomen' }, { t: 'が', de: '(Subjekt)', b: 'Subjektpartikel' }, { t: '青い', r: 'あおい', de: 'blau', b: 'い-Adjektiv' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
      { kanji: '星', kana: 'ほし', romaji: 'hoshi', de: 'Stern', ex: { jp: '星がきれいです。', kana: 'ほしがきれいです。', de: 'Die Sterne sind schön.', tokens: [
        { t: '星', r: 'ほし', de: 'Stern', b: 'Nomen' }, { t: 'が', de: '(Subjekt)', b: 'Subjektpartikel' }, { t: 'きれい', de: 'schön', b: 'な-Adjektiv' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
      { kanji: '月', kana: 'つき', romaji: 'tsuki', de: 'Mond', ex: { jp: '月が出ます。', kana: 'つきがでます。', de: 'Der Mond geht auf.', tokens: [
        { t: '月', r: 'つき', de: 'Mond', b: 'Nomen' }, { t: 'が', de: '(Subjekt)', b: 'Subjektpartikel' }, { t: '出ます', r: 'でます', de: 'aufgehen / herauskommen', b: 'Verb, höflich (von 出る)' }, { t: '。' },
      ] } },
    ],
  },
  {
    id: 'wb2', theme: '🐾', title: 'Tiere', words: [
      { kanji: '猫', kana: 'ねこ', romaji: 'neko', de: 'Katze', ex: { jp: '猫が好きです。', kana: 'ねこがすきです。', de: 'Ich mag Katzen.', tokens: [
        { t: '猫', r: 'ねこ', de: 'Katze', b: 'Nomen' }, { t: 'が', de: '(Subjekt)', b: 'Partikel bei 好き' }, { t: '好き', r: 'すき', de: 'mögen / mag', b: 'な-Adjektiv' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
      { kanji: '犬', kana: 'いぬ', romaji: 'inu', de: 'Hund', ex: { jp: '犬が走ります。', kana: 'いぬがはしります。', de: 'Der Hund rennt.', tokens: [
        { t: '犬', r: 'いぬ', de: 'Hund', b: 'Nomen' }, { t: 'が', de: '(Subjekt)', b: 'Subjektpartikel' }, { t: '走ります', r: 'はしります', de: 'rennen', b: 'Verb, höflich (von 走る)' }, { t: '。' },
      ] } },
      { kanji: '鳥', kana: 'とり', romaji: 'tori', de: 'Vogel', ex: { jp: '鳥が鳴きます。', kana: 'とりがなきます。', de: 'Der Vogel zwitschert.', tokens: [
        { t: '鳥', r: 'とり', de: 'Vogel', b: 'Nomen' }, { t: 'が', de: '(Subjekt)', b: 'Subjektpartikel' }, { t: '鳴きます', r: 'なきます', de: '(Tier) Laut geben', b: 'Verb, höflich (von 鳴く)' }, { t: '。' },
      ] } },
      { kanji: '魚', kana: 'さかな', romaji: 'sakana', de: 'Fisch', ex: { jp: '魚を食べます。', kana: 'さかなをたべます。', de: 'Ich esse Fisch.', tokens: [
        { t: '魚', r: 'さかな', de: 'Fisch', b: 'Nomen' }, { t: 'を', de: '(Objekt)', b: 'Objektpartikel' }, { t: '食べます', r: 'たべます', de: 'essen', b: 'Verb, höflich (von 食べる)' }, { t: '。' },
      ] } },
      { kanji: '馬', kana: 'うま', romaji: 'uma', de: 'Pferd', ex: { jp: '馬が大きいです。', kana: 'うまがおおきいです。', de: 'Das Pferd ist groß.', tokens: [
        { t: '馬', r: 'うま', de: 'Pferd', b: 'Nomen' }, { t: 'が', de: '(Subjekt)', b: 'Subjektpartikel' }, { t: '大きい', r: 'おおきい', de: 'groß', b: 'い-Adjektiv' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
    ],
  },
  {
    id: 'wb3', theme: '👤', title: 'Körper', words: [
      { kanji: '目', kana: 'め', romaji: 'me', de: 'Auge', ex: { jp: '目が痛いです。', kana: 'めがいたいです。', de: 'Meine Augen tun weh.', tokens: [
        { t: '目', r: 'め', de: 'Auge', b: 'Nomen' }, { t: 'が', de: '(Subjekt)', b: 'Subjektpartikel' }, { t: '痛い', r: 'いたい', de: 'schmerzhaft / weh', b: 'い-Adjektiv' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
      { kanji: '口', kana: 'くち', romaji: 'kuchi', de: 'Mund', ex: { jp: '口を開けます。', kana: 'くちをあけます。', de: 'Ich öffne den Mund.', tokens: [
        { t: '口', r: 'くち', de: 'Mund', b: 'Nomen' }, { t: 'を', de: '(Objekt)', b: 'Objektpartikel' }, { t: '開けます', r: 'あけます', de: 'öffnen', b: 'Verb, höflich (von 開ける)' }, { t: '。' },
      ] } },
      { kanji: '耳', kana: 'みみ', romaji: 'mimi', de: 'Ohr', ex: { jp: '耳が大きいです。', kana: 'みみがおおきいです。', de: 'Die Ohren sind groß.', tokens: [
        { t: '耳', r: 'みみ', de: 'Ohr', b: 'Nomen' }, { t: 'が', de: '(Subjekt)', b: 'Subjektpartikel' }, { t: '大きい', r: 'おおきい', de: 'groß', b: 'い-Adjektiv' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
      { kanji: '手', kana: 'て', romaji: 'te', de: 'Hand', ex: { jp: '手を洗います。', kana: 'てをあらいます。', de: 'Ich wasche die Hände.', tokens: [
        { t: '手', r: 'て', de: 'Hand', b: 'Nomen' }, { t: 'を', de: '(Objekt)', b: 'Objektpartikel' }, { t: '洗います', r: 'あらいます', de: 'waschen', b: 'Verb, höflich (von 洗う)' }, { t: '。' },
      ] } },
      { kanji: '足', kana: 'あし', romaji: 'ashi', de: 'Fuß / Bein', ex: { jp: '足が速いです。', kana: 'あしがはやいです。', de: 'Er ist schnell.', tokens: [
        { t: '足', r: 'あし', de: 'Fuß / Bein', b: 'Nomen' }, { t: 'が', de: '(Subjekt)', b: 'Subjektpartikel' }, { t: '速い', r: 'はやい', de: 'schnell', b: 'い-Adjektiv' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
    ],
  },
  {
    id: 'wb4', theme: '🏠', title: 'Alltag', words: [
      { kanji: '人', kana: 'ひと', romaji: 'hito', de: 'Mensch', ex: { jp: '人が多いです。', kana: 'ひとがおおいです。', de: 'Es sind viele Menschen da.', tokens: [
        { t: '人', r: 'ひと', de: 'Mensch', b: 'Nomen' }, { t: 'が', de: '(Subjekt)', b: 'Subjektpartikel' }, { t: '多い', r: 'おおい', de: 'viel / zahlreich', b: 'い-Adjektiv' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
      { kanji: '家', kana: 'いえ', romaji: 'ie', de: 'Haus', ex: { jp: '家に帰ります。', kana: 'いえにかえります。', de: 'Ich gehe nach Hause.', tokens: [
        { t: '家', r: 'いえ', de: 'Haus / Zuhause', b: 'Nomen' }, { t: 'に', de: '(Richtung)', b: 'Richtungspartikel (wohin)' }, { t: '帰ります', r: 'かえります', de: 'zurückkehren', b: 'Verb, höflich (von 帰る)' }, { t: '。' },
      ] } },
      { kanji: '水', kana: 'みず', romaji: 'mizu', de: 'Wasser', ex: { jp: '水を飲みます。', kana: 'みずをのみます。', de: 'Ich trinke Wasser.', tokens: [
        { t: '水', r: 'みず', de: 'Wasser', b: 'Nomen' }, { t: 'を', de: '(Objekt)', b: 'Objektpartikel' }, { t: '飲みます', r: 'のみます', de: 'trinken', b: 'Verb, höflich (von 飲む)' }, { t: '。' },
      ] } },
      { kanji: '車', kana: 'くるま', romaji: 'kuruma', de: 'Auto', ex: { jp: '車で行きます。', kana: 'くるまでいきます。', de: 'Ich fahre mit dem Auto.', tokens: [
        { t: '車', r: 'くるま', de: 'Auto', b: 'Nomen' }, { t: 'で', de: '(Mittel)', b: 'Partikel: womit / Mittel' }, { t: '行きます', r: 'いきます', de: 'gehen / fahren', b: 'Verb, höflich (von 行く)' }, { t: '。' },
      ] } },
      { kanji: '店', kana: 'みせ', romaji: 'mise', de: 'Laden', ex: { jp: '店が開きます。', kana: 'みせがあきます。', de: 'Der Laden öffnet.', tokens: [
        { t: '店', r: 'みせ', de: 'Laden / Geschäft', b: 'Nomen' }, { t: 'が', de: '(Subjekt)', b: 'Subjektpartikel' }, { t: '開きます', r: 'あきます', de: 'sich öffnen', b: 'Verb, höflich (von 開く)' }, { t: '。' },
      ] } },
    ],
  },
]
const ALL_WORDS = WORD_BLOCKS.flatMap(b => b.words)
const WORD_BY_KANJI = Object.fromEntries(ALL_WORDS.map(w => [w.kanji, w]))

// Kanji aller Wörter aus abgeschlossenen Blöcken (= fällige Wort-Karten fürs SRS).
function learnedWordKanji(completedBlocks) {
  return WORD_BLOCKS.filter(b => completedBlocks.includes(b.id)).flatMap(b => b.words.map(w => w.kanji))
}

// ─── Grammatik-Themen ────────────────────────────────────────────────────────
// Jedes Thema: Glyphe, Titel, Kurzbeschreibung, Erklärungs-Abschnitte (body),
// Beispiele (jp/kana/de + antippbare tokens) und Anwendungs-Übungen (exercises).
// Beispiel-Tokens: { t: Text, r: Lesung, de: Bedeutung, b: Aufbau } – Tokens ohne
// „de" (z. B. 。) sind nicht antippbar. Übung: { q: Satz mit ＿, a: Lösung,
// options: [..], hint: Erklärung }. Themen schalten der Reihe nach frei.
const GRAMMAR = [
  {
    id: 'g1', glyph: 'は', title: 'は – das Thema', summary: 'Worüber gesprochen wird (gelesen „wa")',
    body: [
      { text: 'Die Partikel は markiert das Thema des Satzes – das, worüber etwas gesagt wird. Wichtig: als Partikel wird は „wa" gesprochen, nicht „ha".' },
      { h: 'Muster', text: '〈Thema〉 は 〈Aussage〉。  →  oft „A は B です" = „A ist B".' },
    ],
    examples: [
      { jp: 'これは水です。', kana: 'これはみずです。', de: 'Das ist Wasser.', tokens: [
        { t: 'これ', r: 'これ', de: 'das / dies', b: 'Demonstrativpronomen' }, { t: 'は', r: 'wa', de: '(Thema)', b: 'Themenpartikel' }, { t: '水', r: 'みず', de: 'Wasser', b: 'Nomen' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' } ] },
      { jp: '山は高いです。', kana: 'やまはたかいです。', de: 'Der Berg ist hoch.', tokens: [
        { t: '山', r: 'やま', de: 'Berg', b: 'Nomen' }, { t: 'は', r: 'wa', de: '(Thema)', b: 'Themenpartikel' }, { t: '高い', r: 'たかい', de: 'hoch', b: 'い-Adjektiv' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '山＿高いです。', a: 'は', options: ['は', 'を', 'に'], hint: 'は markiert das Thema: „Was den Berg betrifft – hoch."' },
      { q: 'これ＿水です。', a: 'は', options: ['は', 'が', 'で'], hint: 'A は B です = „A ist B".' },
    ],
  },
  {
    id: 'g2', glyph: 'です', title: 'です – „sein"', summary: 'Höfliche Kopula am Satzende',
    body: [
      { text: 'です ist das höfliche „ist/sind". Es steht am Satzende nach einem Nomen oder Adjektiv.' },
      { h: 'Verneinung', text: '„ではありません" (förmlich) oder „じゃないです" (lockerer) = „ist nicht".' },
      { h: 'Vergangenheit', text: '„でした" = „war".' },
    ],
    examples: [
      { jp: '猫です。', kana: 'ねこです。', de: 'Es ist eine Katze.', tokens: [
        { t: '猫', r: 'ねこ', de: 'Katze', b: 'Nomen' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' } ] },
      { jp: '水ではありません。', kana: 'みずではありません。', de: 'Es ist kein Wasser.', tokens: [
        { t: '水', r: 'みず', de: 'Wasser', b: 'Nomen' }, { t: 'ではありません', de: 'ist nicht', b: 'Verneinung von です' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '猫＿。 (Es ist eine Katze.)', a: 'です', options: ['です', 'ます', 'を'], hint: 'Nomen + です = „ist".' },
      { q: '水＿。 (Es ist kein Wasser.)', a: 'ではありません', options: ['ではありません', 'です', 'でした'], hint: 'Verneinung von です = ではありません.' },
    ],
  },
  {
    id: 'g3', glyph: 'が', title: 'が – das Subjekt', summary: 'Wer/was etwas tut oder ist',
    body: [
      { text: 'が markiert das Subjekt – wer oder was etwas tut oder ist. Oft bei neuer Information sowie mit 好き, ある/いる und Adjektiven.' },
      { h: 'は vs が', text: 'は hebt das Thema hervor („was X betrifft …"), が betont das Subjekt selbst („gerade DIESES").' },
    ],
    examples: [
      { jp: '犬が走ります。', kana: 'いぬがはしります。', de: 'Der Hund rennt.', tokens: [
        { t: '犬', r: 'いぬ', de: 'Hund', b: 'Nomen' }, { t: 'が', de: '(Subjekt)', b: 'Subjektpartikel' }, { t: '走ります', r: 'はしります', de: 'rennen', b: 'Verb, höflich' }, { t: '。' } ] },
      { jp: '猫が好きです。', kana: 'ねこがすきです。', de: 'Ich mag Katzen.', tokens: [
        { t: '猫', r: 'ねこ', de: 'Katze', b: 'Nomen' }, { t: 'が', de: '(Subjekt)', b: 'Partikel bei 好き' }, { t: '好き', r: 'すき', de: 'mögen', b: 'な-Adjektiv' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '犬＿走ります。', a: 'が', options: ['が', 'を', 'は'], hint: 'Das Subjekt (der Hund) wird mit が markiert.' },
      { q: '猫＿好きです。', a: 'が', options: ['が', 'を', 'に'], hint: 'Bei 好き steht das Gemochte mit が.' },
    ],
  },
  {
    id: 'g4', glyph: 'を', title: 'を – das Objekt', summary: 'Das direkte Objekt (gesprochen „o")',
    body: [
      { text: 'を markiert das direkte Objekt – das Ding, mit dem etwas gemacht wird. Es steht direkt vor dem Verb.' },
      { h: 'Muster', text: '〈Objekt〉 を 〈Verb〉。' },
    ],
    examples: [
      { jp: '水を飲みます。', kana: 'みずをのみます。', de: 'Ich trinke Wasser.', tokens: [
        { t: '水', r: 'みず', de: 'Wasser', b: 'Nomen' }, { t: 'を', r: 'o', de: '(Objekt)', b: 'Objektpartikel' }, { t: '飲みます', r: 'のみます', de: 'trinken', b: 'Verb, höflich' }, { t: '。' } ] },
      { jp: '魚を食べます。', kana: 'さかなをたべます。', de: 'Ich esse Fisch.', tokens: [
        { t: '魚', r: 'さかな', de: 'Fisch', b: 'Nomen' }, { t: 'を', r: 'o', de: '(Objekt)', b: 'Objektpartikel' }, { t: '食べます', r: 'たべます', de: 'essen', b: 'Verb, höflich' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '水＿飲みます。', a: 'を', options: ['を', 'が', 'は'], hint: 'Das Objekt vor dem Verb → を.' },
      { q: '魚＿食べます。', a: 'を', options: ['を', 'に', 'で'], hint: 'Was gegessen wird, ist das Objekt → を.' },
    ],
  },
  {
    id: 'g5', glyph: 'に', title: 'に & で – Ort, Ziel, Mittel', summary: 'Wohin/wann (に) und wo/womit (で)',
    body: [
      { h: 'に', text: 'に zeigt Ziel/Richtung („wohin"), Zeitpunkt („wann") oder den Ort, an dem etwas existiert.' },
      { h: 'で', text: 'で zeigt den Ort einer Handlung („wo") oder das Mittel („womit").' },
    ],
    examples: [
      { jp: '家に帰ります。', kana: 'いえにかえります。', de: 'Ich gehe nach Hause. (Ziel)', tokens: [
        { t: '家', r: 'いえ', de: 'Haus / Zuhause', b: 'Nomen' }, { t: 'に', de: '(Richtung)', b: 'Richtungspartikel (wohin)' }, { t: '帰ります', r: 'かえります', de: 'zurückkehren', b: 'Verb, höflich' }, { t: '。' } ] },
      { jp: '車で行きます。', kana: 'くるまでいきます。', de: 'Ich fahre mit dem Auto. (Mittel)', tokens: [
        { t: '車', r: 'くるま', de: 'Auto', b: 'Nomen' }, { t: 'で', de: '(Mittel)', b: 'Partikel: womit' }, { t: '行きます', r: 'いきます', de: 'gehen / fahren', b: 'Verb, höflich' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '家＿帰ります。', a: 'に', options: ['に', 'で', 'を'], hint: 'Ziel/Richtung („wohin") → に.' },
      { q: '車＿行きます。', a: 'で', options: ['で', 'に', 'を'], hint: 'Mittel („womit") → で.' },
    ],
  },
  {
    id: 'g6', glyph: 'ます', title: 'Verben: die ます-Form', summary: 'Höfliche Gegenwart, Verneinung, Vergangenheit',
    body: [
      { text: 'In höflicher Sprache enden Verben auf 〜ます.' },
      { h: 'Formen', text: 'Gegenwart/Zukunft: 〜ます · Verneinung: 〜ません · Vergangenheit: 〜ました · verneinte Vergangenheit: 〜ませんでした.' },
      { text: 'Beispiel 飲む (trinken) → 飲みます / 飲みません / 飲みました.' },
    ],
    examples: [
      { jp: '水を飲みます。', kana: 'みずをのみます。', de: 'Ich trinke Wasser.', tokens: [
        { t: '水', r: 'みず', de: 'Wasser', b: 'Nomen' }, { t: 'を', r: 'o', de: '(Objekt)', b: 'Objektpartikel' }, { t: '飲みます', r: 'のみます', de: 'trinke', b: 'ます-Form (Gegenwart)' }, { t: '。' } ] },
      { jp: '水を飲みません。', kana: 'みずをのみません。', de: 'Ich trinke kein Wasser.', tokens: [
        { t: '水', r: 'みず', de: 'Wasser', b: 'Nomen' }, { t: 'を', r: 'o', de: '(Objekt)', b: 'Objektpartikel' }, { t: '飲みません', r: 'のみません', de: 'trinke nicht', b: 'verneinte ます-Form' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '水を飲み＿。 (Ich trinke nicht.)', a: 'ません', options: ['ません', 'ます', 'ました'], hint: 'Verneinung: 〜ません.' },
      { q: '水を飲み＿。 (Ich trank.)', a: 'ました', options: ['ました', 'ます', 'ません'], hint: 'Vergangenheit: 〜ました.' },
    ],
  },
  {
    id: 'g7', glyph: 'い', title: 'い- und な-Adjektive', summary: 'Die zwei Adjektiv-Typen',
    body: [
      { h: 'い-Adjektive', text: 'enden auf い (高い hoch, 大きい groß). Direkt vor dem Nomen oder am Satzende mit です.' },
      { h: 'な-Adjektive', text: 'brauchen な vor einem Nomen (きれいな花 = eine schöne Blume). Am Satzende ebenfalls mit です.' },
    ],
    examples: [
      { jp: '山は高いです。', kana: 'やまはたかいです。', de: 'Der Berg ist hoch. (い-Adjektiv)', tokens: [
        { t: '山', r: 'やま', de: 'Berg', b: 'Nomen' }, { t: 'は', r: 'wa', de: '(Thema)', b: 'Themenpartikel' }, { t: '高い', r: 'たかい', de: 'hoch', b: 'い-Adjektiv' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' } ] },
      { jp: '星はきれいです。', kana: 'ほしはきれいです。', de: 'Die Sterne sind schön. (な-Adjektiv)', tokens: [
        { t: '星', r: 'ほし', de: 'Stern', b: 'Nomen' }, { t: 'は', r: 'wa', de: '(Thema)', b: 'Themenpartikel' }, { t: 'きれい', de: 'schön', b: 'な-Adjektiv (am Satzende ohne な)' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '山は＿です。 (hoch)', a: '高い', options: ['高い', '高', '高く'], hint: 'い-Adjektiv bleibt vor です unverändert: 高い.' },
      { q: '星は＿です。 (schön)', a: 'きれい', options: ['きれい', 'きれいな', 'きれく'], hint: 'な-Adjektiv am Satzende ohne な: きれい です.' },
    ],
  },
  {
    id: 'g8', glyph: 'か', title: 'か – die Frage', summary: 'Aus einem Satz eine Frage machen',
    body: [
      { text: 'か am Satzende macht aus einer Aussage eine Frage. Ein Fragezeichen ist nicht nötig (wird aber oft trotzdem geschrieben).' },
      { h: 'Muster', text: '〈Aussage〉 か。' },
    ],
    examples: [
      { jp: '猫ですか。', kana: 'ねこですか。', de: 'Ist es eine Katze?', tokens: [
        { t: '猫', r: 'ねこ', de: 'Katze', b: 'Nomen' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: 'か', de: '(Frage)', b: 'Fragepartikel' }, { t: '。' } ] },
      { jp: '水を飲みますか。', kana: 'みずをのみますか。', de: 'Trinkst du Wasser?', tokens: [
        { t: '水', r: 'みず', de: 'Wasser', b: 'Nomen' }, { t: 'を', r: 'o', de: '(Objekt)', b: 'Objektpartikel' }, { t: '飲みます', r: 'のみます', de: 'trinken', b: 'Verb, höflich' }, { t: 'か', de: '(Frage)', b: 'Fragepartikel' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '猫です＿。 (Ist es eine Katze?)', a: 'か', options: ['か', 'は', 'を'], hint: 'か am Satzende macht die Frage.' },
      { q: '水を飲みます＿。 (Trinkst du Wasser?)', a: 'か', options: ['か', 'は', 'です'], hint: 'Auch nach ます: 〜ますか = Frage.' },
    ],
  },
  {
    id: 'g9', glyph: 'の', title: 'の – Verbindung & Besitz', summary: 'A の B = „Bs A"',
    body: [
      { text: 'の verbindet zwei Nomen. „A の B" bedeutet meist „Bs A" bzw. „das B von A".' },
    ],
    examples: [
      { jp: '私の犬。', kana: 'わたしのいぬ。', de: 'Mein Hund. (私 = ich)', tokens: [
        { t: '私', r: 'わたし', de: 'ich', b: 'Nomen' }, { t: 'の', de: 'von / -s', b: 'Verbindungspartikel (Besitz)' }, { t: '犬', r: 'いぬ', de: 'Hund', b: 'Nomen' }, { t: '。' } ] },
      { jp: '日本の車。', kana: 'にほんのくるま。', de: 'Ein japanisches Auto. (日本 = Japan)', tokens: [
        { t: '日本', r: 'にほん', de: 'Japan', b: 'Nomen' }, { t: 'の', de: 'von / -s', b: 'Verbindungspartikel' }, { t: '車', r: 'くるま', de: 'Auto', b: 'Nomen' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '私＿犬。 (mein Hund)', a: 'の', options: ['の', 'は', 'が'], hint: 'A の B = „Bs A": 私 の 犬.' },
      { q: '日本＿車。 (japanisches Auto)', a: 'の', options: ['の', 'に', 'で'], hint: 'の verbindet die zwei Nomen.' },
    ],
  },
  {
    id: 'g10', glyph: '文', title: 'Satzbau (SOV)', summary: 'Das Verb steht am Ende',
    body: [
      { text: 'Japanisch ist eine SOV-Sprache: Subjekt – Objekt – Verb. Das Verb steht (fast) immer am Satzende.' },
      { text: 'Weil Partikel die Rolle jedes Wortes anzeigen, ist die Reihenfolge flexibler als im Deutschen – das Verb bleibt aber hinten.' },
    ],
    examples: [
      { jp: '猫が魚を食べます。', kana: 'ねこがさかなをたべます。', de: 'Die Katze frisst den Fisch.', tokens: [
        { t: '猫', r: 'ねこ', de: 'Katze', b: 'Subjekt' }, { t: 'が', de: '(Subjekt)', b: 'Subjektpartikel' }, { t: '魚', r: 'さかな', de: 'Fisch', b: 'Objekt' }, { t: 'を', r: 'o', de: '(Objekt)', b: 'Objektpartikel' }, { t: '食べます', r: 'たべます', de: 'essen', b: 'Verb (am Ende!)' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '„Die Katze frisst den Fisch." – Welcher Satz ist korrekt?', a: '猫が魚を食べます。', options: ['猫が魚を食べます。', '魚が猫を食べます。', '食べます猫が魚を。'], hint: 'Subjekt(が) – Objekt(を) – Verb am Ende.' },
      { q: 'Wo steht im japanischen Satz das Verb?', a: 'am Ende', options: ['am Ende', 'am Anfang', 'in der Mitte'], hint: 'SOV: Das Verb steht (fast) immer am Satzende.' },
    ],
  },
]

// ─── Durchgehende Geschichte ─────────────────────────────────────────────────
// Eine fortlaufende Reise-Erzählung: pro Station ein Kapitel. Es baut auf dem
// auf, was man gelernt hat, und wendet es AKTIV an: jede Station hat eine
// `scene` (Illustration + Übersetzungsfrage), die man am Lektionsende erlebt.
// scene = { art, ask (jp), kana, answer (de), options }. Schlüssel = Stations-ID.
const STORY = {
  h1: { de: 'Dein Flugzeug landet in Japan. Müde, aber voller Vorfreude trittst du hinaus. Über dem Gate leuchten fremde Zeichen – あ、い、う… Deine Reise beginnt.',
    scene: { art: 'airplane', ask: '飛行機', kana: 'ひこうき', answer: 'Flugzeug', options: ['Flugzeug', 'Zug', 'Schiff'] } },
  h2: { de: 'Am Bahnhof suchst du den richtigen Zug. Überall Hiragana. Langsam erkennst du Silben wieder: か、き、く… Die ersten Schilder ergeben Sinn!',
    scene: { art: 'station', ask: '駅', kana: 'えき', answer: 'Bahnhof', options: ['Bahnhof', 'Flughafen', 'Hafen'] } },
  h3: { de: 'Im Zug gleitet die Landschaft vorbei. Leise übst du die Laute, die du kennst – さ、し、す… Eine alte Frau gegenüber lächelt dir zu.',
    scene: { art: 'train', ask: '電車', kana: 'でんしゃ', answer: 'Zug', options: ['Zug', 'Bus', 'Boot'] } },
  h4: { de: 'Du steigst in einer kleinen Stadt aus. た、ち、つ… Die Zeichen werden vertrauter, fast wie alte Bekannte.',
    scene: { art: 'town', ask: '町', kana: 'まち', answer: 'Stadt', options: ['Stadt', 'Berg', 'Fluss'] } },
  h5: { de: 'Vor einem Lädchen liest du die Speisekarte – noch nicht alles, aber immer mehr. な、に、ぬ… Dein Magen knurrt.',
    scene: { art: 'tea', ask: 'お茶', kana: 'おちゃ', answer: 'Tee', options: ['Tee', 'Wasser', 'Reis'] } },
  h6: { de: 'Ein Wegweiser zeigt zu den Bergen. は、ひ、ふ… Du entzifferst ihn fast mühelos und folgst der Richtung.',
    scene: { art: 'mountain', ask: '山', kana: 'やま', answer: 'Berg', options: ['Berg', 'Fluss', 'Meer'] } },
  h7: { de: 'Am Ortsrand endet das Pflaster. ま、み、む… Vor dir öffnet sich weites, grünes Land.',
    scene: { art: 'sky', ask: '空', kana: 'そら', answer: 'Himmel', options: ['Himmel', 'Meer', 'Wald'] } },
  h8: { de: 'Ein schmaler Pfad führt bergauf. や、ゆ、よ… Fast alle Hiragana sitzen jetzt.',
    scene: { art: 'path', ask: '道', kana: 'みち', answer: 'Weg', options: ['Weg', 'Tür', 'Brücke'] } },
  h9: { de: 'Vögel rufen über dir. ら、り、る… Du liest ein Schild am Wegrand laut vor – und verstehst es.',
    scene: { art: 'bird', ask: '鳥', kana: 'とり', answer: 'Vogel', options: ['Vogel', 'Fisch', 'Hund'] } },
  h10: { de: 'わ、を、ん – die letzten Hiragana! Du kannst jetzt alles lesen, was in Hiragana geschrieben steht. Ein kleiner Triumph.',
    scene: { art: 'torii', ask: '日本', kana: 'にほん', answer: 'Japan', options: ['Japan', 'China', 'Korea'] } },
  wb1: { de: 'Vor dir ragt ein Berg auf, ein Fluss glitzert im Tal. Endlich kannst du benennen, was du siehst:', jp: 'これは山です。', kana: 'これはやまです。', tr: 'Das ist ein Berg.',
    scene: { art: 'mountain', ask: 'これは山です。', kana: 'これはやまです。', answer: 'Das ist ein Berg.', options: ['Das ist ein Berg.', 'Das ist ein Fluss.', 'Das ist der Himmel.'] } },
  g1: { de: 'Du lernst, worüber du sprichst zu markieren – mit は. Über den Berg vor dir sagst du:', jp: '山は高いです。', kana: 'やまはたかいです。', tr: 'Der Berg ist hoch.',
    scene: { art: 'mountain', ask: '山は高いです。', kana: 'やまはたかいです。', answer: 'Der Berg ist hoch.', options: ['Der Berg ist hoch.', 'Der Berg ist schön.', 'Der Fluss ist hoch.'] } },
  g2: { de: 'Mit です sagst du höflich, was etwas ist. Du zeigst auf das Wasser:', jp: 'これは川です。', kana: 'これはかわです。', tr: 'Das ist ein Fluss.',
    scene: { art: 'river', ask: 'これは川です。', kana: 'これはかわです。', answer: 'Das ist ein Fluss.', options: ['Das ist ein Fluss.', 'Das ist ein Berg.', 'Das ist ein See.'] } },
  k1: { de: 'Auf einem Wegweiser stehen kantigere Zeichen – Katakana. ア、イ、ウ… für Wörter aus aller Welt.',
    scene: { art: 'town', ask: 'ホテル', kana: 'ホテル', answer: 'Hotel', options: ['Hotel', 'Bahnhof', 'Laden'] } },
  k2: { de: 'カ、キ、ク… An einem Automaten erkennst du ein Wort: コーヒー – Kaffee! Du gönnst dir eine Pause.',
    scene: { art: 'coffee', ask: 'コーヒー', kana: 'コーヒー', answer: 'Kaffee', options: ['Kaffee', 'Tee', 'Milch'] } },
  k3: { de: 'サ、シ、ス… An einer Hütte hängt eine Karte mit Namen in Katakana.',
    scene: { art: 'town', ask: 'レストラン', kana: 'レストラン', answer: 'Restaurant', options: ['Restaurant', 'Hotel', 'Bahnhof'] } },
  k4: { de: 'タ、チ、ツ… Ein anderer Wanderer grüßt dich freundlich auf dem Pfad.',
    scene: { art: 'car', ask: 'タクシー', kana: 'タクシー', answer: 'Taxi', options: ['Taxi', 'Bus', 'Zug'] } },
  k5: { de: 'ナ、ニ、ヌ… Du liest jetzt beide Schriften, mal langsam, mal schon flüssig.',
    scene: { art: 'tea', ask: 'パン', kana: 'パン', answer: 'Brot', options: ['Brot', 'Reis', 'Fisch'] } },
  wb2: { de: 'Ein Hund läuft über den Weg, Vögel fliegen auf, im Fluss blitzt ein Fisch. Tiere überall:', jp: '犬が走ります。', kana: 'いぬがはしります。', tr: 'Der Hund rennt.',
    scene: { art: 'animal', ask: '犬が走ります。', kana: 'いぬがはしります。', answer: 'Der Hund rennt.', options: ['Der Hund rennt.', 'Die Katze rennt.', 'Der Hund schläft.'] } },
  g3: { de: 'Mit が betonst du, WER etwas tut. Eine Katze schleicht heran:', jp: '猫が好きです。', kana: 'ねこがすきです。', tr: 'Ich mag Katzen.',
    scene: { art: 'animal', ask: '猫が好きです。', kana: 'ねこがすきです。', answer: 'Ich mag Katzen.', options: ['Ich mag Katzen.', 'Ich mag Hunde.', 'Ich sehe eine Katze.'] } },
  g4: { de: 'Am Fluss holt ein Fischer seinen Fang ein. Mit を zeigst du das Objekt einer Handlung:', jp: '魚を食べます。', kana: 'さかなをたべます。', tr: 'Ich esse Fisch.',
    scene: { art: 'fish', ask: '魚を食べます。', kana: 'さかなをたべます。', answer: 'Ich esse Fisch.', options: ['Ich esse Fisch.', 'Ich sehe Fisch.', 'Ich kaufe Fisch.'] } },
  k6: { de: 'ハ、ヒ、フ… Der Weg wird steiler, der Atem schwerer.',
    scene: { art: 'path', ask: '地図', kana: 'ちず', answer: 'Karte', options: ['Karte', 'Buch', 'Brief'] } },
  k7: { de: 'マ、ミ、ム… Dein Rücken schmerzt, doch du gehst weiter, Schritt für Schritt.',
    scene: { art: 'sky', ask: '雨', kana: 'あめ', answer: 'Regen', options: ['Regen', 'Schnee', 'Wind'] } },
  k8: { de: 'ヤ、ユ、ヨ… Kühler Nebel zieht den Hang herauf.',
    scene: { art: 'mountain', ask: '森', kana: 'もり', answer: 'Wald', options: ['Wald', 'Berg', 'Meer'] } },
  k9: { de: 'ラ、リ、ル… Aus dem Grau taucht eine kleine Schutzhütte auf.',
    scene: { art: 'river', ask: '水', kana: 'みず', answer: 'Wasser', options: ['Wasser', 'Tee', 'Milch'] } },
  k10: { de: 'ワ、ヲ、ン – alle Katakana! Beide Schriften beherrschst du nun. Niemand kann dich mehr aufhalten.',
    scene: { art: 'torii', ask: '日本語', kana: 'にほんご', answer: 'Japanisch', options: ['Japanisch', 'Englisch', 'Chinesisch'] } },
  wb3: { de: 'Nach dem langen Aufstieg spürst du jeden Teil deines Körpers:', jp: '足が痛いです。', kana: 'あしがいたいです。', tr: 'Meine Füße tun weh.',
    scene: { art: 'body', ask: '足が痛いです。', kana: 'あしがいたいです。', answer: 'Meine Füße tun weh.', options: ['Meine Füße tun weh.', 'Meine Augen tun weh.', 'Meine Füße sind groß.'] } },
  g5: { de: 'Du denkst an Ziel und Weg. に zeigt wohin, で womit:', jp: '家に帰ります。', kana: 'いえにかえります。', tr: 'Ich gehe nach Hause.',
    scene: { art: 'home', ask: '家に帰ります。', kana: 'いえにかえります。', answer: 'Ich gehe nach Hause.', options: ['Ich gehe nach Hause.', 'Ich gehe zur Stadt.', 'Ich bin zu Hause.'] } },
  g6: { de: 'An einer kalten Quelle rastest du. Höfliche Verben enden auf ます:', jp: '水を飲みます。', kana: 'みずをのみます。', tr: 'Ich trinke Wasser.',
    scene: { art: 'river', ask: '水を飲みます。', kana: 'みずをのみます。', answer: 'Ich trinke Wasser.', options: ['Ich trinke Wasser.', 'Ich trinke Tee.', 'Ich sehe Wasser.'] } },
  wb4: { de: 'Im letzten Dorf vor dem Gipfel pulsiert der Alltag: Menschen, Häuser, ein vorbeifahrendes Auto.', jp: '車で行きます。', kana: 'くるまでいきます。', tr: 'Ich fahre mit dem Auto.',
    scene: { art: 'car', ask: '車で行きます。', kana: 'くるまでいきます。', answer: 'Ich fahre mit dem Auto.', options: ['Ich fahre mit dem Auto.', 'Ich gehe zu Fuß.', 'Ich fahre mit dem Zug.'] } },
  g7: { de: 'Nachts am Lager beschreibst du, was du siehst – mit Adjektiven:', jp: '星はきれいです。', kana: 'ほしはきれいです。', tr: 'Die Sterne sind schön.',
    scene: { art: 'night', ask: '星はきれいです。', kana: 'ほしはきれいです。', answer: 'Die Sterne sind schön.', options: ['Die Sterne sind schön.', 'Der Mond ist schön.', 'Die Sterne sind hell.'] } },
  g8: { de: 'Ein Mitwanderer dreht sich zu dir. Mit か wird aus einer Aussage eine Frage:', jp: '水を飲みますか。', kana: 'みずをのみますか。', tr: 'Trinkst du Wasser?',
    scene: { art: 'river', ask: '水を飲みますか。', kana: 'みずをのみますか。', answer: 'Trinkst du Wasser?', options: ['Trinkst du Wasser?', 'Ich trinke Wasser.', 'Trinkst du Tee?'] } },
  g9: { de: 'Im Morgenlicht erhebt sich vor dir der berühmteste Berg des Landes. の verbindet zwei Nomen:', jp: '日本の山。', kana: 'にほんのやま。', tr: 'Japans Berg.',
    scene: { art: 'mountain', ask: '日本の山。', kana: 'にほんのやま。', answer: 'Japans Berg.', options: ['Japans Berg.', 'Japans Fluss.', 'Ein hoher Berg.'] } },
  g10: { de: 'Du verstehst jetzt, wie ein ganzer Satz gebaut ist – Subjekt, Objekt, Verb am Ende. Worte fügen sich zusammen:', jp: '猫が魚を食べます。', kana: 'ねこがさかなをたべます。', tr: 'Die Katze frisst den Fisch.',
    scene: { art: 'fish', ask: '猫が魚を食べます。', kana: 'ねこがさかなをたべます。', answer: 'Die Katze frisst den Fisch.', options: ['Die Katze frisst den Fisch.', 'Der Fisch frisst die Katze.', 'Die Katze sieht den Fisch.'] } },
  fuji: { de: 'Du stehst auf dem Gipfel. Unter dir liegt das ganze Land, das dir vor Wochen noch völlig fremd war – und jetzt kannst du es lesen, benennen, verstehen. 旅は終わりました。Die Reise ist zu Ende. Eine neue beginnt.', jp: 'おめでとうございます！', kana: 'おめでとうございます！', tr: 'Herzlichen Glückwunsch!' },
}

// Japanisch vorlesen (Web Speech API).
function speak(text) {
  if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ja-JP'
    speechSynthesis.cancel()
    speechSynthesis.speak(u)
  }
}

// Text in die Zwischenablage kopieren (mit Fallback für ältere Browser).
async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch (e) { /* Fallback unten */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    return true
  } catch (e) {
    return false
  }
}

// Anzeige-Infos für eine SRS-Karte (Kana oder Wort-Kanji).
function srsItemInfo(key) {
  const w = WORD_BY_KANJI[key]
  if (w) return { reading: w.kana, sub: `${w.romaji} · ${w.de}`, isWord: true }
  const d = KANA_DATA[key]
  return { reading: d?.romaji, sub: d?.tip, isWord: false }
}

// ─── Tiny components ─────────────────────────────────────────────────────────

function TabBar({ active, setActive }) {
  const tabs = [
    { id: 'reise', label: '旅', sub: 'Reise' },
    { id: 'heute', label: '今日', sub: 'Heute' },
    { id: 'lernen', label: '学ぶ', sub: 'Lernen' },
    { id: 'ueben', label: '練習', sub: 'Üben' },
    { id: 'fortschritt', label: '進歩', sub: 'Fortschritt' },
  ]
  return (
    <nav style={{
      display: 'flex', borderTop: `2px solid ${C.washiDark}`,
      background: C.washi, position: 'fixed', bottom: 0, left: 0, right: 0,
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 50, boxShadow: '0 -2px 8px rgba(33,31,27,0.08)',
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setActive(t.id)} style={{
          flex: 1, padding: '10px 0 8px', border: 'none', background: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          color: active === t.id ? C.shu : C.textMuted,
          borderTop: active === t.id ? `2px solid ${C.shu}` : '2px solid transparent',
          marginTop: -2,
        }}>
          <span style={{ fontSize: 20, fontFamily: "'Noto Serif JP', serif" }}>{t.label}</span>
          <span style={{ fontSize: 10, fontWeight: 500 }}>{t.sub}</span>
        </button>
      ))}
    </nav>
  )
}

function Card({ children, style }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '16px',
      boxShadow: '0 1px 4px rgba(33,31,27,0.08)', ...style,
    }}>{children}</div>
  )
}

function Btn({ children, onClick, variant = 'primary', style }) {
  const bg = variant === 'primary' ? C.shu : variant === 'secondary' ? C.indigo : C.washiDark
  const color = variant === 'ghost' ? C.sumi : '#fff'
  return (
    <button onClick={onClick} style={{
      background: bg, color, border: 'none', borderRadius: 8,
      padding: '12px 24px', fontSize: 15, fontWeight: 600,
      fontFamily: 'inherit', cursor: 'pointer', ...style,
    }}>{children}</button>
  )
}

// Flache Illustrationen für die Geschichts-Szenen (viewBox 240×120).
function storyArt(name) {
  const wrap = (bg, kids) => (
    <svg viewBox="0 0 240 120" width="100%" style={{ display: 'block' }} aria-hidden="true">
      <rect width="240" height="120" fill={bg} />
      {kids}
    </svg>
  )
  switch (name) {
    case 'airplane': return wrap('#DCE7EE', <>
      <ellipse cx="55" cy="28" rx="22" ry="8" fill="#fff" opacity="0.8" />
      <ellipse cx="186" cy="24" rx="18" ry="7" fill="#fff" opacity="0.8" />
      <ellipse cx="120" cy="66" rx="68" ry="15" fill="#1E4368" />
      <polygon points="118,66 168,42 150,66" fill="#16314D" />
      <polygon points="118,70 150,96 108,74" fill="#16314D" />
      <polygon points="58,66 42,52 66,62" fill="#1E4368" />
      <circle cx="182" cy="66" r="6" fill="#DA4A38" />
      <circle cx="96" cy="64" r="3" fill="#DCE7EE" /><circle cx="114" cy="64" r="3" fill="#DCE7EE" /><circle cx="132" cy="64" r="3" fill="#DCE7EE" /><circle cx="150" cy="64" r="3" fill="#DCE7EE" />
    </>)
    case 'station': return wrap('#DCE7EE', <>
      <rect y="92" width="240" height="28" fill="#E6DEC9" />
      <rect x="46" y="42" width="148" height="52" rx="6" fill="#5E8A6A" />
      <rect x="46" y="42" width="148" height="15" fill="#4A7257" />
      <text x="120" y="82" textAnchor="middle" fontSize="24" fontFamily="'Noto Serif JP', serif" fill="#fff">駅</text>
      <rect x="150" y="60" width="36" height="28" rx="3" fill="#DCE7EE" />
    </>)
    case 'train': return wrap('#DCE7EE', <>
      <rect y="98" width="240" height="6" fill="#9A8D6E" />
      <rect x="34" y="40" width="172" height="58" rx="12" fill="#1E4368" />
      <rect x="44" y="50" width="152" height="22" rx="4" fill="#DCE7EE" />
      <rect x="34" y="40" width="16" height="58" rx="8" fill="#DA4A38" />
      <circle cx="74" cy="102" r="7" fill="#3a3a38" /><circle cx="166" cy="102" r="7" fill="#3a3a38" />
    </>)
    case 'town': return wrap('#DCE7EE', <>
      <rect y="92" width="240" height="28" fill="#CFE0C4" />
      <rect x="34" y="58" width="44" height="36" fill="#EFE7D6" /><polygon points="30,58 56,38 82,58" fill="#DA4A38" /><rect x="50" y="74" width="12" height="20" fill="#8A6E4B" />
      <rect x="100" y="50" width="44" height="44" fill="#E6DEC9" /><polygon points="96,50 122,30 148,50" fill="#1E4368" /><rect x="116" y="72" width="12" height="22" fill="#8A6E4B" />
      <rect x="166" y="62" width="40" height="32" fill="#EFE7D6" /><polygon points="162,62 186,44 210,62" fill="#5E8A6A" />
    </>)
    case 'tea': return wrap('#EFEADF', <>
      <ellipse cx="120" cy="104" rx="50" ry="7" fill="#D8CDB5" />
      <path d="M88,64 h56 v14 a28,28 0 0 1 -56,0 z" fill="#fff" stroke="#C9BFA6" strokeWidth="2" />
      <path d="M144,70 a13,13 0 0 1 0,22" fill="none" stroke="#C9BFA6" strokeWidth="4" />
      <ellipse cx="116" cy="78" rx="20" ry="5" fill="#6E9A78" />
      <path d="M104,56 q5,-8 0,-16 M120,56 q5,-8 0,-16 M136,56 q5,-8 0,-16" stroke="#B7AE97" strokeWidth="2.5" fill="none" />
    </>)
    case 'mountain': return wrap('#DCE7EE', <>
      <rect y="92" width="240" height="28" fill="#CFE0C4" />
      <polygon points="0,96 52,58 104,96" fill="#A8B6BC" />
      <polygon points="58,96 120,28 182,96" fill="#8FA0A8" />
      <polygon points="100,54 120,28 140,54 130,58 120,50 110,58" fill="#F4F2EC" />
    </>)
    case 'sky': return wrap('#DCE7EE', <>
      <circle cx="192" cy="34" r="20" fill="#E8B84B" />
      <ellipse cx="70" cy="48" rx="34" ry="13" fill="#fff" opacity="0.9" />
      <ellipse cx="128" cy="76" rx="40" ry="14" fill="#fff" opacity="0.75" />
    </>)
    case 'path': return wrap('#CFE0C4', <>
      <path d="M96,120 C140,95 80,80 120,55 C150,35 100,25 120,0" fill="none" stroke="#E0D6BC" strokeWidth="22" strokeLinecap="round" />
      <path d="M96,120 C140,95 80,80 120,55 C150,35 100,25 120,0" fill="none" stroke="#C2B894" strokeWidth="2" strokeDasharray="2 8" />
      <polygon points="44,66 30,96 58,96" fill="#5E8A6A" /><rect x="42" y="96" width="4" height="10" fill="#7A6242" />
      <polygon points="200,72 188,98 212,98" fill="#5E8A6A" /><rect x="198" y="98" width="4" height="9" fill="#7A6242" />
    </>)
    case 'bird': return wrap('#DCE7EE', <>
      <path d="M60,40 q12,-12 24,0 q12,-12 24,0" fill="none" stroke="#1E4368" strokeWidth="3.5" strokeLinecap="round" />
      <ellipse cx="138" cy="74" rx="26" ry="17" fill="#5E8A6A" />
      <circle cx="162" cy="64" r="10" fill="#5E8A6A" />
      <circle cx="165" cy="62" r="2" fill="#211F1B" />
      <polygon points="170,63 184,66 170,70" fill="#E8B84B" />
      <polygon points="128,72 106,60 126,82" fill="#4A7257" />
    </>)
    case 'torii': return wrap('#DCE7EE', <>
      <rect y="96" width="240" height="24" fill="#CFE0C4" />
      <rect x="80" y="40" width="10" height="60" fill="#DA4A38" />
      <rect x="150" y="40" width="10" height="60" fill="#DA4A38" />
      <rect x="64" y="32" width="112" height="11" fill="#B23A2B" />
      <rect x="74" y="48" width="92" height="7" fill="#DA4A38" />
    </>)
    case 'coffee': return wrap('#EFEADF', <>
      <rect x="84" y="56" width="62" height="46" rx="6" fill="#fff" stroke="#C9BFA6" strokeWidth="2" />
      <path d="M146,64 a14,14 0 0 1 0,24" fill="none" stroke="#C9BFA6" strokeWidth="4" />
      <rect x="90" y="62" width="50" height="14" rx="3" fill="#6F4E37" />
      <path d="M100,50 q5,-8 0,-16 M120,50 q5,-8 0,-16" stroke="#B7AE97" strokeWidth="2.5" fill="none" />
    </>)
    case 'car': return wrap('#DCE7EE', <>
      <rect y="96" width="240" height="24" fill="#9A8D6E" />
      <path d="M64,90 v-22 q0,-6 6,-6 h16 l14,-16 q3,-4 8,-4 h28 q5,0 8,4 l12,16 h14 q6,0 6,6 v22 z" fill="#DA4A38" />
      <rect x="96" y="50" width="44" height="16" rx="3" fill="#DCE7EE" />
      <circle cx="92" cy="92" r="11" fill="#2c2c2a" /><circle cx="162" cy="92" r="11" fill="#2c2c2a" />
    </>)
    case 'river': return wrap('#CFE0C4', <>
      <path d="M0,36 q60,-12 120,0 t120,0 v22 q-60,12 -120,0 t-120,0 z" fill="#7FB0D6" />
      <path d="M0,58 q60,-12 120,0 t120,0 v26 q-60,12 -120,0 t-120,0 z" fill="#5E97C2" />
      <path d="M30,50 q8,-3 16,0 M120,64 q8,-3 16,0 M186,50 q8,-3 16,0" stroke="#fff" strokeWidth="2" fill="none" opacity="0.7" />
    </>)
    case 'animal': return wrap('#CFE0C4', <>
      <rect y="100" width="240" height="20" fill="#BBD0B4" />
      <ellipse cx="116" cy="78" rx="40" ry="19" fill="#B98B5E" />
      <circle cx="158" cy="62" r="16" fill="#B98B5E" />
      <polygon points="150,50 145,36 159,48" fill="#9A7048" />
      <circle cx="163" cy="60" r="2.4" fill="#211F1B" />
      <circle cx="171" cy="66" r="3" fill="#211F1B" />
      <rect x="90" y="92" width="5" height="14" fill="#9A7048" /><rect x="138" y="92" width="5" height="14" fill="#9A7048" />
      <path d="M78,72 q-16,-6 -10,8" fill="none" stroke="#B98B5E" strokeWidth="6" strokeLinecap="round" />
    </>)
    case 'fish': return wrap('#7FB0D6', <>
      <ellipse cx="120" cy="60" rx="44" ry="24" fill="#DA8A4A" />
      <polygon points="76,60 50,44 50,76" fill="#C2702F" />
      <circle cx="150" cy="54" r="3.4" fill="#211F1B" />
      <path d="M118,36 q8,-12 18,-6" fill="none" stroke="#C2702F" strokeWidth="4" />
      <circle cx="58" cy="30" r="4" fill="#fff" opacity="0.6" /><circle cx="46" cy="40" r="2.6" fill="#fff" opacity="0.6" />
    </>)
    case 'body': return wrap('#EFEADF', <>
      <circle cx="120" cy="34" r="13" fill="#E8C9A0" />
      <rect x="108" y="48" width="24" height="40" rx="8" fill="#1E4368" />
      <rect x="112" y="86" width="8" height="28" fill="#5A4632" /><rect x="120" y="86" width="8" height="28" fill="#5A4632" />
      <rect x="97" y="52" width="8" height="30" rx="4" fill="#1E4368" /><rect x="135" y="52" width="8" height="30" rx="4" fill="#1E4368" />
    </>)
    case 'night': return wrap('#2A3A55', <>
      <circle cx="192" cy="34" r="15" fill="#F4F2EC" />
      <circle cx="186" cy="30" r="13" fill="#2A3A55" />
      <g fill="#E8B84B">
        <circle cx="40" cy="32" r="2.4" /><circle cx="78" cy="54" r="1.8" /><circle cx="110" cy="28" r="2.2" /><circle cx="150" cy="60" r="1.8" /><circle cx="64" cy="80" r="2" /><circle cx="130" cy="84" r="2.2" /><circle cx="30" cy="64" r="1.6" />
      </g>
    </>)
    case 'home': return wrap('#DCE7EE', <>
      <rect y="96" width="240" height="24" fill="#CFE0C4" />
      <rect x="86" y="56" width="68" height="40" fill="#EFE7D6" />
      <polygon points="78,56 120,28 162,56" fill="#DA4A38" />
      <rect x="112" y="72" width="18" height="24" fill="#8A6E4B" />
      <rect x="94" y="62" width="14" height="12" fill="#7FB0D6" />
    </>)
    default: return wrap('#EFEADF', <>
      <rect x="60" y="34" width="120" height="64" rx="6" fill="#fff" stroke="#C9BFA6" strokeWidth="2" />
      <path d="M76,52 h88 M76,66 h88 M76,80 h60" stroke="#C9BFA6" strokeWidth="3" />
    </>)
  }
}

// Eine aktiv erlebte Geschichts-Szene (am Lektionsende): Erzählung + Illustration
// + kleine Übersetzungsfrage. Baut auf Gelerntem auf und wendet es an.
function StoryScene({ id }) {
  const { awardXp } = useContext(ProgressCtx)
  const s = STORY[id]
  const [ans, setAns] = useState(null)
  if (!s) return null
  const sc = s.scene
  const revealed = ans != null
  const choose = (o) => { if (revealed || !sc) return; setAns(o); if (o === sc.answer) awardXp(XP_PER_CARD) }

  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '14px 16px', marginTop: 18,
      borderLeft: `4px solid ${C.shu}`, boxShadow: '0 1px 4px rgba(33,31,27,0.08)', textAlign: 'left',
    }}>
      <div style={{ fontSize: 11, color: C.shu, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>📖 DEINE REISE</div>
      <p style={{ fontSize: 14, color: C.sumi, lineHeight: 1.65, margin: 0 }}>{s.de}</p>
      {sc ? (
        <>
          <div style={{ marginTop: 10, border: `1px solid ${C.washiDark}`, borderRadius: 8, overflow: 'hidden' }}>
            {storyArt(sc.art)}
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <span style={{ fontSize: 22, fontFamily: "'Noto Serif JP', serif", color: C.sumi }}>{sc.ask}</span>
              {sc.kana && sc.kana !== sc.ask && <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 8 }}>{sc.kana}</span>}
            </div>
            <button onClick={() => speak(sc.ask)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>🔊</button>
          </div>
          <p style={{ fontSize: 13, color: C.textMuted, margin: '8px 0' }}>Was bedeutet das?</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
            {sc.options.map(o => {
              const correct = o === sc.answer, chosen = o === ans
              return (
                <button key={o} onClick={() => choose(o)} disabled={revealed}
                  style={{
                    padding: '10px 12px', borderRadius: 8, border: '2px solid', textAlign: 'left',
                    borderColor: !revealed ? C.washiDark : correct ? C.matcha : chosen ? C.shu : C.washiDark,
                    background: !revealed ? '#fff' : correct ? `${C.matcha}20` : chosen ? `${C.shu}20` : '#fff',
                    fontSize: 14, color: C.sumi, cursor: revealed ? 'default' : 'pointer',
                  }}>{o}</button>
              )
            })}
          </div>
          {revealed && (
            <p style={{ marginTop: 8, fontSize: 13, color: ans === sc.answer ? C.matcha : C.shu, fontWeight: 600 }}>
              {ans === sc.answer ? '✓ Richtig!' : `✗ ${sc.ask} = ${sc.answer}`}
            </p>
          )}
        </>
      ) : s.jp && (
        <div style={{ marginTop: 10, background: `${C.indigo}0D`, borderRadius: 8, padding: 10 }}>
          <span style={{ fontSize: 22, fontFamily: "'Noto Serif JP', serif", color: C.sumi }}>{s.jp}</span>
          <div style={{ fontSize: 14, color: C.indigo }}>„{s.tr}"</div>
        </div>
      )}
    </div>
  )
}

// ─── Stroke animation (echte KanjiVG-Pfade, 109×109) ─────────────────────────

const STROKE_COLORS = ['#DA4A38', '#1E4368', '#5E8A6A', '#8B6914', '#7B3FA0', '#1A7A6E', '#B5651D']

function strokeStart(d) {
  const m = d.match(/^M\s*(-?[\d.]+)[ ,]\s*(-?[\d.]+)/)
  return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : null
}

function StrokeDisplay({ char }) {
  const data = KANA_DATA[char]
  const strokes = data?.strokes || []
  const len = strokes.length
  const V = STROKE_VIEWBOX

  const [drawn, setDrawn] = useState(0)       // vollständig gezeichnete Striche
  const [animating, setAnimating] = useState(true)

  // Bei neuem Zeichen automatisch von vorn animieren.
  useEffect(() => { setDrawn(0); setAnimating(true) }, [char])

  const activeIdx = animating && drawn < len ? drawn : -1   // dieser Strich wird gerade gezeichnet
  const showCount = animating ? Math.min(drawn + 1, len) : drawn

  return (
    <div style={{ textAlign: 'center' }}>
      <style>{`@keyframes tabiDraw { to { stroke-dashoffset: 0; } }`}</style>
      <svg width="180" height="180" viewBox={`0 0 ${V} ${V}`} style={{
        background: '#fafaf8', borderRadius: 8, border: `1px solid ${C.washiDark}`,
      }}>
        {/* Raster */}
        <line x1={V / 2} y1="0" x2={V / 2} y2={V} stroke={C.washiDark} strokeWidth="0.6" strokeDasharray="3,3" />
        <line x1="0" y1={V / 2} x2={V} y2={V / 2} stroke={C.washiDark} strokeWidth="0.6" strokeDasharray="3,3" />
        {/* Geist-Zeichen */}
        <text x={V / 2} y={V * 0.8} textAnchor="middle" fontSize={V * 0.85}
          fontFamily="'Noto Serif JP', serif" fill="#EFEBE0" style={{ userSelect: 'none' }}>{char}</text>

        {/* Striche bis showCount */}
        {strokes.slice(0, showCount).map((d, i) => {
          const isActive = i === activeIdx
          return (
            <path
              key={`${char}-${i}-${isActive ? 'a' : 's'}`}
              d={d} stroke={STROKE_COLORS[i % STROKE_COLORS.length]}
              strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round"
              pathLength="1"
              style={isActive ? {
                strokeDasharray: 1, strokeDashoffset: 1,
                animation: 'tabiDraw 0.75s linear forwards',
              } : undefined}
              onAnimationEnd={isActive ? () => setDrawn(d2 => d2 + 1) : undefined}
            />
          )
        })}

        {/* Start-Nummern */}
        {strokes.slice(0, showCount).map((d, i) => {
          const p = strokeStart(d)
          if (!p) return null
          const col = STROKE_COLORS[i % STROKE_COLORS.length]
          return (
            <g key={`n-${i}`}>
              <circle cx={p.x} cy={p.y} r="7" fill="#fff" stroke={col} strokeWidth="1.5" />
              <text x={p.x} y={p.y + 3.2} textAnchor="middle" fontSize="9" fontWeight="700" fill={col}>{i + 1}</text>
            </g>
          )
        })}
      </svg>

      <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {strokes.map((_, i) => (
          <button key={i} onClick={() => { setAnimating(false); setDrawn(i + 1) }}
            style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none',
              background: showCount > i ? STROKE_COLORS[i % STROKE_COLORS.length] : C.washiDark,
              color: showCount > i ? '#fff' : C.textMuted,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>{i + 1}</button>
        ))}
        <button onClick={() => { setDrawn(0); setAnimating(true) }}
          style={{
            padding: '0 12px', height: 28, borderRadius: 14, border: 'none',
            background: C.indigo, color: '#fff', fontSize: 12, cursor: 'pointer',
          }}>▶ Abspielen</button>
        <button onClick={() => { setAnimating(false); setDrawn(0) }}
          style={{
            padding: '0 12px', height: 28, borderRadius: 14, border: 'none',
            background: C.washiDark, color: C.sumi, fontSize: 12, cursor: 'pointer',
          }}>↺</button>
      </div>
      <p style={{ fontSize: 12, color: C.textMuted, marginTop: 8 }}>
        Strich {showCount} von {len} · Oben → Unten, Links → Rechts
      </p>
    </div>
  )
}

// ─── Drawing canvas ───────────────────────────────────────────────────────────

function DrawCanvas({ char }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const lastPos = useRef(null)

  const getPos = (e, canvas) => {
    const r = canvas.getBoundingClientRect()
    const src = e.touches ? e.touches[0] : e
    return { x: src.clientX - r.left, y: src.clientY - r.top }
  }

  const start = (e) => {
    e.preventDefault()
    drawing.current = true
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    lastPos.current = pos
  }

  const move = (e) => {
    e.preventDefault()
    if (!drawing.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = C.sumi
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.stroke()
    lastPos.current = pos
  }

  const end = () => { drawing.current = false }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const size = 160

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {/* Ghost character */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: size, height: size,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.7, fontFamily: "'Noto Serif JP', serif",
          color: C.washiDark, pointerEvents: 'none', userSelect: 'none',
          lineHeight: 1,
        }}>{char}</div>
        {/* Grid lines */}
        <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
          <line x1={size/2} y1="0" x2={size/2} y2={size} stroke={C.washiDark} strokeWidth="1" strokeDasharray="4,4" />
          <line x1="0" y1={size/2} x2={size} y2={size/2} stroke={C.washiDark} strokeWidth="1" strokeDasharray="4,4" />
        </svg>
        <canvas ref={canvasRef} width={size} height={size}
          style={{
            border: `2px solid ${C.washiDark}`, borderRadius: 8,
            background: 'rgba(255,255,255,0.85)', display: 'block', touchAction: 'none',
          }}
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        />
      </div>
      <div style={{ marginTop: 8 }}>
        <button onClick={clear} style={{
          background: C.washiDark, border: 'none', borderRadius: 8,
          padding: '8px 20px', fontSize: 13, cursor: 'pointer', color: C.sumi,
        }}>Löschen ↺</button>
      </div>
    </div>
  )
}

// ─── Lesson player ────────────────────────────────────────────────────────────

function QuizStep({ kana, onFinish }) {
  // Quiz einmalig aufbauen: jedes Kana einmal, gemischt, mit stabilen Optionen.
  const [quiz] = useState(() => {
    const pool = [...new Set(kana)]
    const allRomaji = [...new Set(Object.values(KANA_DATA).map(v => v.romaji))]
    return [...pool].sort(() => Math.random() - 0.5).map(ch => {
      const correct = KANA_DATA[ch]?.romaji
      let distractors = [...new Set(pool.filter(k => k !== ch).map(k => KANA_DATA[k]?.romaji))]
        .filter(r => r && r !== correct)
      for (const r of allRomaji.sort(() => Math.random() - 0.5)) {
        if (distractors.length >= 2) break
        if (r !== correct && !distractors.includes(r)) distractors.push(r)
      }
      distractors = distractors.sort(() => Math.random() - 0.5).slice(0, 2)
      const options = [correct, ...distractors].sort(() => Math.random() - 0.5)
      return { char: ch, correct, options }
    })
  })

  const [qi, setQi] = useState(0)
  const [answer, setAnswer] = useState(null)
  const cur = quiz[qi]
  const isLastQ = qi === quiz.length - 1
  const revealed = answer !== null

  const next = () => {
    if (isLastQ) { onFinish(); return }
    setQi(qi + 1)
    setAnswer(null)
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 8 }}>
        Kurzer Check · {qi + 1} / {quiz.length}
      </p>
      <div style={{ fontSize: 72, fontFamily: "'Noto Serif JP', serif", marginBottom: 20, color: C.sumi }}>
        {cur.char}
      </div>
      <p style={{ marginBottom: 16, fontWeight: 500 }}>Welche Lesung ist richtig?</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {cur.options.map(o => {
          const isCorrect = o === cur.correct
          const isChosen = o === answer
          return (
            <button key={o} onClick={() => !revealed && setAnswer(o)} disabled={revealed}
              style={{
                padding: '14px 8px', borderRadius: 8, border: '2px solid',
                borderColor: !revealed ? C.washiDark : isCorrect ? C.matcha : isChosen ? C.shu : C.washiDark,
                background: !revealed ? '#fff' : isCorrect ? `${C.matcha}20` : isChosen ? `${C.shu}20` : '#fff',
                fontSize: 18, fontWeight: 600, color: C.sumi,
                cursor: revealed ? 'default' : 'pointer',
              }}>{o}</button>
          )
        })}
      </div>
      {revealed && (
        <>
          <p style={{ marginTop: 12, color: answer === cur.correct ? C.matcha : C.shu, fontWeight: 600 }}>
            {answer === cur.correct ? '✓ Richtig!' : `✗ Richtig wäre: ${cur.correct}`}
          </p>
          <Btn onClick={next} style={{ marginTop: 12, width: '100%' }}>
            {isLastQ ? 'Quiz abschließen →' : 'Nächstes Zeichen →'}
          </Btn>
        </>
      )}
    </div>
  )
}

function LessonPlayer({ lesson, onComplete, onClose }) {
  const kana = lesson.kana
  const totalSteps = kana.length * 3 + 2 // intro + (explain+stroke+draw) * n + quiz + done
  const [step, setStep] = useState(0)

  const progress = Math.round((step / totalSteps) * 100)
  const isQuiz = step === totalSteps - 2

  // Determine what to show
  let content = null

  if (step === 0) {
    // Intro
    content = (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🗾</div>
        <h2 style={{ fontSize: 22, fontFamily: "'Noto Serif JP', serif", color: C.indigo, marginBottom: 8 }}>
          {lesson.title}
        </h2>
        <p style={{ color: C.textMuted, lineHeight: 1.6, marginBottom: 16 }}>
          In dieser Lektion lernst du {kana.length} {lesson.script || 'Hiragana'}-Zeichen.
          Jedes Zeichen wird erklärt, du siehst die Strichreihenfolge
          und übst es selbst zu schreiben.
        </p>
        <div style={{ background: `${C.indigo}15`, borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <p style={{ fontSize: 13, color: C.indigo }}>
            💡 <strong>Lerntipp:</strong> Strichreihenfolge ist wichtig –
            sie macht das Schreiben schneller und natürlicher.
          </p>
        </div>
      </div>
    )
  } else if (step === totalSteps - 1) {
    // Done
    content = (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
        <h2 style={{ fontSize: 22, fontFamily: "'Noto Serif JP', serif", color: C.matcha, marginBottom: 8 }}>
          よくできました！
        </h2>
        <p style={{ color: C.textMuted, marginBottom: 4 }}>Sehr gut gemacht!</p>
        <p style={{ lineHeight: 1.6, marginBottom: 16 }}>
          Du hast <strong>{kana.length} Zeichen</strong> gelernt und geübt.
          Diese kommen in deinen Wiederholungen wieder.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {kana.map(k => (
            <span key={k} style={{
              fontSize: 28, fontFamily: "'Noto Serif JP', serif",
              background: `${C.matcha}20`, borderRadius: 8, padding: '4px 12px',
            }}>{k}</span>
          ))}
        </div>
        <StoryScene id={lesson.id} />
      </div>
    )
  } else {
    // Determine which kana and which phase
    const innerStep = step - 1
    const kanaIdx = Math.floor(innerStep / 3)
    const phase = innerStep % 3

    // Quiz step comes before done
    if (step === totalSteps - 2) {
      content = <QuizStep kana={kana} onFinish={() => setStep(s => s + 1)} />
    } else {
      const char = kana[kanaIdx]
      const data = KANA_DATA[char]

      if (phase === 0) {
        // Explain
        content = (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 88, fontFamily: "'Noto Serif JP', serif",
              color: C.sumi, lineHeight: 1, marginBottom: 12 }}>{char}</div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>Lesung</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.indigo }}>{data?.romaji}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>Aussprache</div>
                <div style={{ fontSize: 14, color: C.sumi }}>wie „{data?.romaji}" im Deutschen</div>
              </div>
            </div>
            <button onClick={() => {
              if ('speechSynthesis' in window) {
                const u = new SpeechSynthesisUtterance(char)
                u.lang = 'ja-JP'
                speechSynthesis.speak(u)
              }
            }} style={{
              background: `${C.indigo}15`, border: `1px solid ${C.indigo}40`,
              borderRadius: 20, padding: '6px 16px', fontSize: 13, cursor: 'pointer',
              color: C.indigo, marginBottom: 16,
            }}>🔊 Aussprechen</button>
            {data?.tip && (
              <div style={{ background: `${C.shu}10`, borderRadius: 8, padding: 12 }}>
                <p style={{ fontSize: 13, color: C.shu }}>💡 Merkhilfe: {data.tip}</p>
              </div>
            )}
          </div>
        )
      } else if (phase === 1) {
        // Stroke order
        content = (
          <div>
            <p style={{ textAlign: 'center', color: C.textMuted, fontSize: 13, marginBottom: 12 }}>
              Strichreihenfolge für <strong style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 20 }}>{char}</strong>
            </p>
            <StrokeDisplay char={char} />
            <p style={{ textAlign: 'center', fontSize: 12, color: C.textMuted, marginTop: 10 }}>
              Strichpfade: KanjiVG (CC BY-SA)
            </p>
          </div>
        )
      } else {
        // Draw
        content = (
          <div>
            <p style={{ textAlign: 'center', color: C.textMuted, fontSize: 13, marginBottom: 12 }}>
              Schreibe <strong style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 20 }}>{char}</strong> nach
            </p>
            <DrawCanvas char={char} />
            <p style={{ textAlign: 'center', fontSize: 12, color: C.textMuted, marginTop: 8 }}>
              Mit dem Finger oder Stift nachzeichnen
            </p>
          </div>
        )
      }
    }
  }

  const isLast = step === totalSteps - 1

  return (
    <div style={{
      position: 'fixed', inset: 0, background: C.washi,
      display: 'flex', flexDirection: 'column', zIndex: 100,
    }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', background: '#fff', borderBottom: `1px solid ${C.washiDark}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.textMuted,
          }}>✕</button>
          <div style={{ flex: 1 }}>
            <div style={{ height: 6, background: C.washiDark, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progress}%`, background: C.shu,
                borderRadius: 3, transition: 'width 0.3s',
              }} />
            </div>
          </div>
          <span style={{ fontSize: 12, color: C.textMuted }}>{step}/{totalSteps}</span>
        </div>
        <h3 style={{ fontSize: 14, fontFamily: "'Noto Serif JP', serif", color: C.indigo }}>
          {lesson.title}
        </h3>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {content}
      </div>

      {/* Footer – beim Quiz ausgeblendet, da QuizStep eigene Knöpfe hat */}
      {!isQuiz && (
        <div style={{ padding: '16px 20px', background: '#fff', borderTop: `1px solid ${C.washiDark}` }}>
          {isLast ? (
            <Btn onClick={onComplete} style={{ width: '100%' }}>
              Lektion abschließen ✓
            </Btn>
          ) : (
            <Btn onClick={() => setStep(s => s + 1)} style={{ width: '100%' }}>
              {step === 0 ? 'Los geht\'s →' : 'Weiter →'}
            </Btn>
          )}
        </div>
      )}
    </div>
  )
}

// ─── SRS Quiz ────────────────────────────────────────────────────────────────

// Bewertungsknöpfe → SM-2-Qualität
const SRS_RATINGS = [
  ['Nochmal', C.shu, 1],
  ['Schwer', '#E8A020', 3],
  ['Gut', C.matcha, 4],
  ['Leicht', C.indigo, 5],
]

function SRSQuiz({ onClose }) {
  const { progress, awardXp, reviewCard } = useContext(ProgressCtx)
  // Fällige Karten = heute fällige gelernte Kana UND gelernte Wörter.
  const [deck] = useState(() => {
    const learned = [
      ...completedKanaList(progress.completedLessons || []),
      ...learnedWordKanji(progress.completedWordBlocks || []),
    ]
    return dueKana(progress, learned)
  })
  const [queue, setQueue] = useState(deck)   // Arbeits-Warteschlange (kann wachsen)
  const [flipped, setFlipped] = useState(false)
  const [passed, setPassed] = useState(0)    // endgültig gekonnte Karten
  const [lapses, setLapses] = useState(0)    // wie oft „Nochmal"
  const [repeats, setRepeats] = useState(() => new Set()) // welche Karten schon mal daneben

  // Nichts fällig (oder noch nichts gelernt)
  if (deck.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🌿</div>
        <h3 style={{ fontSize: 18, marginBottom: 8 }}>Nichts fällig</h3>
        <p style={{ color: C.textMuted, marginBottom: 16 }}>
          Aktuell sind keine Wiederholungen fällig. Lerne neue Kana oder Wörter
          oder komm später wieder – fällige Karten erscheinen automatisch.
        </p>
        <Btn onClick={onClose}>Zurück</Btn>
      </div>
    )
  }

  if (queue.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
        <h3 style={{ fontSize: 18, marginBottom: 8 }}>Alle fälligen Karten gemeistert!</h3>
        <p style={{ color: C.textMuted, marginBottom: 16 }}>
          {passed} Karten · +{passed * XP_PER_CARD} XP
          {lapses > 0 && ` · ${lapses}× wiederholt`}
        </p>
        <Btn onClick={onClose}>Fertig</Btn>
      </div>
    )
  }

  const item = queue[0]
  const info = srsItemInfo(item)
  const isRepeat = repeats.has(item)

  const rate = (quality) => {
    if (quality < 3) {
      // „Nochmal": Karte ans Ende der Warteschlange – kommt in dieser Sitzung wieder.
      setRepeats(prev => new Set(prev).add(item))
      setQueue(prev => [...prev.slice(1), prev[0]])
      setLapses(l => l + 1)
    } else {
      // gekonnt: Plan speichern, XP, aus der Warteschlange nehmen.
      reviewCard(item, quality)
      awardXp(XP_PER_CARD)
      setPassed(p => p + 1)
      setQueue(prev => prev.slice(1))
    }
    setFlipped(false)
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: C.textMuted, fontSize: 13 }}>
          {passed} / {deck.length} gekonnt · noch {queue.length}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>

      <Card style={{ textAlign: 'center', minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 16, position: 'relative' }}>
        {isRepeat && (
          <div style={{ position: 'absolute', top: 10, left: 12, fontSize: 11, color: C.shu, fontWeight: 600 }}>🔁 nochmal</div>
        )}
        <button onClick={() => speak(item)} title="Anhören"
          style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>🔊</button>
        <div style={{ fontSize: item.length > 1 ? 52 : 80, fontFamily: "'Noto Serif JP', serif", marginBottom: 12 }}>{item}</div>
        {flipped ? (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.indigo, marginBottom: 4 }}>{info.reading}</div>
            {info.sub && <div style={{ fontSize: 13, color: C.textMuted }}>{info.sub}</div>}
          </>
        ) : (
          <div style={{ color: C.textMuted, fontSize: 14 }}>Tippen zum Aufdecken</div>
        )}
      </Card>

      {!flipped ? (
        <Btn onClick={() => setFlipped(true)} style={{ width: '100%' }} variant="secondary">
          Aufdecken
        </Btn>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          {SRS_RATINGS.map(([label, color, q]) => (
            <button key={label} onClick={() => rate(q)}
              style={{ padding: '10px 4px', borderRadius: 8, border: `2px solid ${color}`,
                background: `${color}15`, color, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Erkennen & Hören (Übungen) ──────────────────────────────────────────────

// Mischt ein Array (neue Kopie).
function shuffled(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

// Baut Multiple-Choice-Runden über die gelernten Kana.
function buildRounds(learnedKana) {
  const pool = [...new Set(learnedKana)]
  return shuffled(pool).map(ch => {
    const distractors = shuffled(pool.filter(k => k !== ch)).slice(0, 3)
    const options = shuffled([ch, ...distractors])
    return { char: ch, options }
  })
}

function PracticeQuiz({ mode, onClose }) {
  // mode: 'erkennen' (Zeichen → Lesung) | 'hoeren' (Audio → Zeichen)
  const { progress, awardXp } = useContext(ProgressCtx)
  const learned = completedKanaList(progress.completedLessons || [])
  const [rounds] = useState(() => buildRounds(learned).slice(0, 12))
  const [idx, setIdx] = useState(0)
  const [answer, setAnswer] = useState(null)
  const [correctCount, setCorrectCount] = useState(0)

  // Bei „Hören" automatisch vorlesen, sobald eine neue Runde erscheint.
  const cur = rounds[idx]
  useEffect(() => {
    if (mode === 'hoeren' && cur) speak(cur.char)
  }, [mode, idx]) // eslint-disable-line

  if (learned.length < 4) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
        <h3 style={{ fontSize: 18, marginBottom: 8 }}>Noch zu wenig gelernt</h3>
        <p style={{ color: C.textMuted, marginBottom: 16 }}>
          Lerne zuerst ein paar Kana im „Lernen"-Tab – dann kannst du sie hier üben.
        </p>
        <Btn onClick={onClose}>Zurück</Btn>
      </div>
    )
  }

  if (idx >= rounds.length) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
        <h3 style={{ fontSize: 18, marginBottom: 8 }}>Übung fertig!</h3>
        <p style={{ color: C.textMuted, marginBottom: 16 }}>
          {correctCount} / {rounds.length} richtig · +{correctCount * XP_PER_CARD} XP
        </p>
        <Btn onClick={onClose}>Fertig</Btn>
      </div>
    )
  }

  const revealed = answer !== null
  const choose = (opt) => {
    if (revealed) return
    setAnswer(opt)
    if (opt === cur.char) { awardXp(XP_PER_CARD); setCorrectCount(c => c + 1) }
  }
  const next = () => { setAnswer(null); setIdx(i => i + 1) }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: C.textMuted, fontSize: 13 }}>
          {mode === 'erkennen' ? 'Erkennen' : 'Hören'} · {idx + 1} / {rounds.length}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>

      {/* Aufgabe */}
      <Card style={{ textAlign: 'center', minHeight: 140, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 16 }}>
        {mode === 'erkennen' ? (
          <>
            <div style={{ fontSize: 80, fontFamily: "'Noto Serif JP', serif", marginBottom: 4 }}>{cur.char}</div>
            <div style={{ fontSize: 13, color: C.textMuted }}>Welche Lesung?</div>
          </>
        ) : (
          <>
            <button onClick={() => speak(cur.char)}
              style={{ background: `${C.indigo}15`, border: `1px solid ${C.indigo}40`, borderRadius: 40,
                width: 80, height: 80, fontSize: 36, cursor: 'pointer', margin: '0 auto 8px' }}>🔊</button>
            <div style={{ fontSize: 13, color: C.textMuted }}>Welches Zeichen hast du gehört?</div>
          </>
        )}
      </Card>

      {/* Optionen */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {cur.options.map(opt => {
          const isCorrect = opt === cur.char
          const isChosen = opt === answer
          // Erkennen: Optionen sind Lesungen; Hören: Optionen sind Zeichen.
          const label = mode === 'erkennen' ? KANA_DATA[opt]?.romaji : opt
          return (
            <button key={opt} onClick={() => choose(opt)} disabled={revealed}
              style={{
                padding: '16px 8px', borderRadius: 8, border: '2px solid',
                borderColor: !revealed ? C.washiDark : isCorrect ? C.matcha : isChosen ? C.shu : C.washiDark,
                background: !revealed ? '#fff' : isCorrect ? `${C.matcha}20` : isChosen ? `${C.shu}20` : '#fff',
                fontSize: mode === 'erkennen' ? 18 : 28,
                fontFamily: mode === 'erkennen' ? 'inherit' : "'Noto Serif JP', serif",
                fontWeight: 600, color: C.sumi, cursor: revealed ? 'default' : 'pointer',
              }}>{label}</button>
          )
        })}
      </div>

      {revealed && (
        <>
          <p style={{ textAlign: 'center', marginTop: 12, color: answer === cur.char ? C.matcha : C.shu, fontWeight: 600 }}>
            {answer === cur.char ? '✓ Richtig!' : `✗ Richtig: ${cur.char} (${KANA_DATA[cur.char]?.romaji})`}
          </p>
          <Btn onClick={next} style={{ marginTop: 12, width: '100%' }}>
            {idx === rounds.length - 1 ? 'Übung abschließen →' : 'Weiter →'}
          </Btn>
        </>
      )}
    </div>
  )
}

// ─── Screens ─────────────────────────────────────────────────────────────────

function HeuteScreen() {
  const { progress } = useContext(ProgressCtx)
  const { streak, xpToday: xp, goal } = computeStats(progress)
  const learnedAll = [...completedKanaList(progress.completedLessons || []), ...learnedWordKanji(progress.completedWordBlocks || [])]
  const due = dueKana(progress, learnedAll).length
  const charOfDay = 'あ'
  const data = KANA_DATA[charOfDay]

  return (
    <div style={{ padding: '16px 16px 0' }}>
      {/* Greeting */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontFamily: "'Noto Serif JP', serif", color: C.indigo }}>
          おはようございます 👋
        </h1>
        <p style={{ color: C.textMuted, fontSize: 13 }}>Guten Morgen! Bereit zum Lernen?</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Streak', value: `${streak} 🔥`, color: C.shu },
          { label: 'XP heute', value: `${xp}`, color: C.indigo },
          { label: 'Zu üben', value: `${due}`, color: C.matcha },
        ].map(s => (
          <Card key={s.label} style={{ textAlign: 'center', padding: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Goal ring */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <svg width="56" height="56">
            <circle cx="28" cy="28" r="22" fill="none" stroke={C.washiDark} strokeWidth="5" />
            <circle cx="28" cy="28" r="22" fill="none" stroke={C.shu} strokeWidth="5"
              strokeDasharray={`${2 * Math.PI * 22 * Math.min(xp / goal, 1)} ${2 * Math.PI * 22}`}
              strokeLinecap="round" transform="rotate(-90 28 28)" />
            <text x="28" y="33" textAnchor="middle" fontSize="13" fontWeight="700" fill={C.shu}>
              {Math.min(Math.round(xp / goal * 100), 100)}%
            </text>
          </svg>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Tagesziel</div>
            <div style={{ fontSize: 13, color: C.textMuted }}>{xp} / {goal} XP</div>
            <div style={{ fontSize: 12, color: C.textMuted }}>
              {xp >= goal ? 'Tagesziel erreicht 🎉' : `noch ${goal - xp} XP bis zum Ziel`}
            </div>
          </div>
        </div>
      </Card>

      {/* Zeichen des Tages */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8, fontWeight: 600, letterSpacing: 1 }}>
          ZEICHEN DES TAGES
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 70, height: 70, background: '#fafaf8',
            border: `1px solid ${C.washiDark}`, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 52, fontFamily: "'Noto Serif JP', serif",
          }}>{charOfDay}</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.indigo }}>{data.romaji}</div>
            <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>Hiragana</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>💡 {data.tip}</div>
          </div>
        </div>
      </Card>

      {/* Phrases preview */}
      <Card>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10, fontWeight: 600, letterSpacing: 1 }}>
          ÜBERLEBENSPHRASEN
        </div>
        {PHRASES.slice(0, 3).map((p, i) => (
          <div key={i} style={{
            padding: '10px 0', borderBottom: i < 2 ? `1px solid ${C.washiDark}` : 'none',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8,
          }}>
            <div>
              <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 15 }}>{p.jp}</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>{p.romaji}</div>
            </div>
            <div style={{ fontSize: 12, color: C.indigo, textAlign: 'right', flexShrink: 0 }}>{p.de}</div>
          </div>
        ))}
      </Card>
    </div>
  )
}

// ─── Wörter: Block-Lernkurse (5 Wörter pro Block) ────────────────────────────

// Quiz am Ende eines Blocks: Kanji → Bedeutung wählen.
function BlockQuiz({ words, onFinish }) {
  const [quiz] = useState(() => {
    const allDe = [...new Set(ALL_WORDS.map(w => w.de))]
    return shuffled(words).map(w => {
      const distractors = shuffled(allDe.filter(d => d !== w.de)).slice(0, 3)
      return { kanji: w.kanji, kana: w.kana, correct: w.de, options: shuffled([w.de, ...distractors]) }
    })
  })
  const [qi, setQi] = useState(0)
  const [answer, setAnswer] = useState(null)
  const cur = quiz[qi]
  const isLast = qi === quiz.length - 1
  const revealed = answer !== null
  const next = () => { if (isLast) onFinish(); else { setQi(qi + 1); setAnswer(null) } }

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 8 }}>Quiz · {qi + 1} / {quiz.length}</p>
      <div style={{ fontSize: 72, fontFamily: "'Noto Serif JP', serif", marginBottom: 4, color: C.sumi }}>{cur.kanji}</div>
      <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 16 }}>{cur.kana}</div>
      <p style={{ marginBottom: 16, fontWeight: 500 }}>Was bedeutet das?</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {cur.options.map(o => {
          const isCorrect = o === cur.correct
          const isChosen = o === answer
          return (
            <button key={o} onClick={() => !revealed && setAnswer(o)} disabled={revealed}
              style={{
                padding: '14px 8px', borderRadius: 8, border: '2px solid',
                borderColor: !revealed ? C.washiDark : isCorrect ? C.matcha : isChosen ? C.shu : C.washiDark,
                background: !revealed ? '#fff' : isCorrect ? `${C.matcha}20` : isChosen ? `${C.shu}20` : '#fff',
                fontSize: 15, fontWeight: 600, color: C.sumi, cursor: revealed ? 'default' : 'pointer',
              }}>{o}</button>
          )
        })}
      </div>
      {revealed && (
        <>
          <p style={{ marginTop: 12, color: answer === cur.correct ? C.matcha : C.shu, fontWeight: 600 }}>
            {answer === cur.correct ? '✓ Richtig!' : `✗ Richtig: ${cur.correct}`}
          </p>
          <Btn onClick={next} style={{ marginTop: 12, width: '100%' }}>
            {isLast ? 'Quiz abschließen →' : 'Nächstes →'}
          </Btn>
        </>
      )}
    </div>
  )
}

function WordDetail({ word }) {
  const [copied, setCopied] = useState(false)
  const [activeTok, setActiveTok] = useState(null)

  // „Aufbau"-Zeile aus den antippbaren Tokens (für die Zwischenablage).
  const aufbau = word.ex.tokens
    .filter(t => t.de)
    .map(t => `${t.t}${t.r && t.r !== t.t ? ` (${t.r})` : ''} = ${t.de} [${t.b}]`)
    .join(' · ')

  const clip =
    `${word.kanji}（${word.kana} / ${word.romaji}）— ${word.de}\n\n` +
    `Beispielsatz:\n${word.ex.jp}\n${word.ex.kana}\n„${word.ex.de}"\n` +
    `Aufbau: ${aufbau}`

  const handleCopy = async () => {
    const ok = await copyText(clip)
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1800) }
  }

  const tk = activeTok != null ? word.ex.tokens[activeTok] : null

  return (
    <div>
      {/* Kanji + Lesung + Übersetzung */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 80, fontFamily: "'Noto Serif JP', serif", color: C.sumi, lineHeight: 1 }}>{word.kanji}</div>
        <button onClick={() => speak(word.kanji)}
          style={{ background: `${C.indigo}15`, border: `1px solid ${C.indigo}40`, borderRadius: 20, padding: '4px 14px', fontSize: 13, cursor: 'pointer', color: C.indigo, margin: '10px 0 6px' }}>
          🔊 Anhören
        </button>
        <div style={{ fontSize: 22, fontFamily: "'Noto Serif JP', serif", color: C.indigo }}>{word.kana}
          <span style={{ fontSize: 14, color: C.textMuted, fontFamily: 'inherit' }}> · {word.romaji}</span>
        </div>
        <div style={{ fontSize: 18, color: C.sumi, marginTop: 4 }}>{word.de}</div>
      </div>

      {/* Beispielsatz (größer, antippbare Wörter) */}
      <Card>
        <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: 1, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
          <span>BEISPIELSATZ</span>
          <button onClick={() => speak(word.ex.jp)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>🔊</button>
        </div>

        <div style={{ fontSize: 32, fontFamily: "'Noto Serif JP', serif", lineHeight: 1.5, marginBottom: 8 }}>
          {word.ex.tokens.map((t, i) => {
            if (!t.de) return <span key={i}>{t.t}</span>
            const active = activeTok === i
            return (
              <span key={i} onClick={() => setActiveTok(active ? null : i)}
                style={{
                  cursor: 'pointer', borderRadius: 4, padding: '0 1px',
                  borderBottom: `2px dotted ${active ? C.shu : `${C.indigo}66`}`,
                  background: active ? `${C.shu}22` : 'transparent',
                }}>{t.t}</span>
            )
          })}
        </div>
        <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 6 }}>{word.ex.kana}</div>
        <div style={{ fontSize: 16, color: C.indigo, marginBottom: 12 }}>„{word.ex.de}"</div>

        {/* Tooltip / Detailbox zum angetippten Wort */}
        {tk ? (
          <div style={{ background: `${C.indigo}10`, border: `1px solid ${C.indigo}30`, borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 24, fontFamily: "'Noto Serif JP', serif", color: C.sumi }}>{tk.t}</span>
              {tk.r && tk.r !== tk.t && <span style={{ fontSize: 14, color: C.textMuted }}>{tk.r}</span>}
            </div>
            <div style={{ fontSize: 15, color: C.indigo, fontWeight: 600 }}>{tk.de}</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Aufbau: {tk.b}</div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: C.textMuted, fontStyle: 'italic' }}>
            💡 Tippe ein Wort im Satz für Bedeutung & Aufbau
          </div>
        )}
      </Card>

      {/* In die Zwischenablage kopieren (z. B. um eine KI zu fragen) */}
      <button onClick={handleCopy}
        style={{
          width: '100%', marginTop: 12, padding: '11px 0', borderRadius: 8,
          border: `1px solid ${copied ? C.matcha : C.washiDark}`,
          background: copied ? `${C.matcha}15` : '#fff',
          color: copied ? C.matcha : C.indigo, fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
        {copied ? '✓ Kopiert' : '📋 Wort & Satz kopieren'}
      </button>
    </div>
  )
}

function BlockCourse({ block, onComplete, onClose }) {
  const words = block.words
  const totalSteps = words.length + 3 // intro + Wörter + Quiz + Abschluss
  const [step, setStep] = useState(0)

  const isIntro = step === 0
  const isQuiz = step === words.length + 1
  const isDone = step === words.length + 2
  const progress = Math.round((step / totalSteps) * 100)

  let content = null
  if (isIntro) {
    content = (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>{block.theme}</div>
        <h2 style={{ fontSize: 22, fontFamily: "'Noto Serif JP', serif", color: C.indigo, marginBottom: 8 }}>{block.title}</h2>
        <p style={{ color: C.textMuted, lineHeight: 1.6, marginBottom: 16 }}>
          In diesem Block lernst du {words.length} Wörter mit Kanji, Lesung und je einem Beispielsatz.
          Am Ende gibt es ein kurzes Quiz.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {words.map(w => (
            <span key={w.kanji} style={{ fontSize: 28, fontFamily: "'Noto Serif JP', serif", background: `${C.indigo}12`, borderRadius: 8, padding: '4px 12px' }}>{w.kanji}</span>
          ))}
        </div>
      </div>
    )
  } else if (isQuiz) {
    content = <BlockQuiz words={words} onFinish={() => setStep(s => s + 1)} />
  } else if (isDone) {
    content = (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
        <h2 style={{ fontSize: 22, fontFamily: "'Noto Serif JP', serif", color: C.matcha, marginBottom: 8 }}>Block geschafft!</h2>
        <p style={{ lineHeight: 1.6, marginBottom: 16 }}>
          Du hast <strong>{words.length} Wörter</strong> gelernt. Die Kanji kommen ab jetzt in deinen Wiederholungen vor.
        </p>
        <StoryScene id={block.id} />
      </div>
    )
  } else {
    content = <WordDetail key={words[step - 1].kanji} word={words[step - 1]} />
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.washi, display: 'flex', flexDirection: 'column', zIndex: 100 }}>
      <div style={{ padding: '12px 16px', background: '#fff', borderBottom: `1px solid ${C.washiDark}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.textMuted }}>✕</button>
          <div style={{ flex: 1, height: 6, background: C.washiDark, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: C.shu, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 12, color: C.textMuted }}>{step}/{totalSteps}</span>
        </div>
        <h3 style={{ fontSize: 14, fontFamily: "'Noto Serif JP', serif", color: C.indigo }}>{block.theme} {block.title}</h3>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>{content}</div>

      {!isQuiz && (
        <div style={{ padding: '16px 20px', background: '#fff', borderTop: `1px solid ${C.washiDark}` }}>
          {isDone ? (
            <Btn onClick={onComplete} style={{ width: '100%' }}>Block abschließen ✓</Btn>
          ) : (
            <Btn onClick={() => setStep(s => s + 1)} style={{ width: '100%' }}>
              {isIntro ? 'Los geht\'s →' : 'Weiter →'}
            </Btn>
          )}
        </div>
      )}
    </div>
  )
}

function BlockPath() {
  const { progress, completeWordBlock } = useContext(ProgressCtx)
  const [active, setActive] = useState(null)
  const done = progress.completedWordBlocks || []

  if (active) {
    const block = WORD_BLOCKS.find(b => b.id === active)
    return (
      <BlockCourse
        block={block}
        onComplete={() => {
          if (!done.includes(active)) completeWordBlock(active, block.words.length * XP_PER_WORD)
          setActive(null)
        }}
        onClose={() => setActive(null)}
      />
    )
  }

  const blocks = WORD_BLOCKS.map((b, i) => ({
    ...b,
    done: done.includes(b.id),
    locked: i === 0 ? false : !done.includes(WORD_BLOCKS[i - 1].id),
  }))

  return (
    <div>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 18 }}>
        Wörter in 5er-Blöcken: Kanji, Hiragana, Bedeutung und Beispielsätze – mit Quiz am Schluss.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 28, top: 28, bottom: 28, width: 2, background: C.washiDark, zIndex: 0 }} />
        {blocks.map((b, i) => (
          <div key={b.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: i < blocks.length - 1 ? 16 : 0, position: 'relative', zIndex: 1,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
              background: b.done ? C.matcha : b.locked ? C.washiDark : C.shu,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, color: '#fff',
              boxShadow: !b.locked && !b.done ? `0 0 0 4px ${C.shu}30` : 'none',
            }}>
              {b.done ? '✓' : b.locked ? '🔒' : b.theme}
            </div>
            <button onClick={() => !b.locked && setActive(b.id)} disabled={b.locked}
              style={{
                flex: 1, background: '#fff', border: '2px solid',
                borderColor: b.done ? C.matcha : b.locked ? C.washiDark : C.shu,
                borderRadius: 12, padding: '12px 14px', textAlign: 'left',
                cursor: b.locked ? 'not-allowed' : 'pointer', opacity: b.locked ? 0.6 : 1,
              }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>{b.title}</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>
                {b.done ? 'Abgeschlossen ✓'
                  : b.locked ? 'Noch gesperrt'
                    : `${b.words.length} Wörter · ${b.words.map(w => w.kanji).join(' ')}`}
              </div>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Grammatik-Lernpfad ──────────────────────────────────────────────────────

// Beispielsatz mit antippbaren Wörtern (Bedeutung + Aufbau als Tooltip).
function TappableSentence({ ex }) {
  const [active, setActive] = useState(null)
  const tokens = ex.tokens || null
  const tk = tokens && active != null ? tokens[active] : null

  return (
    <div style={{ padding: '6px 0', borderBottom: `1px solid ${C.washiDark}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ fontSize: 26, fontFamily: "'Noto Serif JP', serif", lineHeight: 1.5 }}>
          {tokens ? tokens.map((t, i) => {
            if (!t.de) return <span key={i}>{t.t}</span>
            const on = active === i
            return (
              <span key={i} onClick={() => setActive(on ? null : i)}
                style={{
                  cursor: 'pointer', borderRadius: 4, padding: '0 1px',
                  borderBottom: `2px dotted ${on ? C.shu : `${C.indigo}66`}`,
                  background: on ? `${C.shu}22` : 'transparent',
                }}>{t.t}</span>
            )
          }) : ex.jp}
        </div>
        <button onClick={() => speak(ex.jp)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>🔊</button>
      </div>
      <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>{ex.kana}</div>
      <div style={{ fontSize: 15, color: C.indigo }}>„{ex.de}"</div>

      {tokens && (tk ? (
        <div style={{ background: `${C.indigo}10`, border: `1px solid ${C.indigo}30`, borderRadius: 8, padding: 10, marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 22, fontFamily: "'Noto Serif JP', serif", color: C.sumi }}>{tk.t}</span>
            {tk.r && tk.r !== tk.t && <span style={{ fontSize: 13, color: C.textMuted }}>{tk.r}</span>}
          </div>
          <div style={{ fontSize: 14, color: C.indigo, fontWeight: 600 }}>{tk.de}</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Aufbau: {tk.b}</div>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: C.textMuted, fontStyle: 'italic', marginTop: 6 }}>
          💡 Tippe ein Wort für Bedeutung & Aufbau
        </div>
      ))}
    </div>
  )
}

const HAS_JP = /[぀-ヿ一-龯]/

// Eine Anwendungs-Übung: Lücke füllen, Lösung wählen, Erklärung sehen.
function GrammarExercise({ ex, idx, total, onNext, isLast }) {
  const { awardXp } = useContext(ProgressCtx)
  const [ans, setAns] = useState(null)
  const revealed = ans != null
  const correct = ans === ex.a

  const choose = (o) => {
    if (revealed) return
    setAns(o)
    if (o === ex.a) awardXp(XP_PER_CARD)
  }

  const shown = revealed ? ex.q.replace('＿', ex.a) : ex.q

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 12 }}>Anwenden · {idx} / {total}</p>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 24, fontFamily: "'Noto Serif JP', serif", lineHeight: 1.6, color: C.sumi }}>
          {revealed ? shown : ex.q.split('＿').map((part, i, arr) => (
            <span key={i}>{part}{i < arr.length - 1 && (
              <span style={{ display: 'inline-block', minWidth: 36, borderBottom: `2px solid ${C.shu}`, color: C.shu }}>＿</span>
            )}</span>
          ))}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {ex.options.map(o => {
          const isCorrect = o === ex.a
          const isChosen = o === ans
          return (
            <button key={o} onClick={() => choose(o)} disabled={revealed}
              style={{
                padding: '14px 8px', borderRadius: 8, border: '2px solid',
                borderColor: !revealed ? C.washiDark : isCorrect ? C.matcha : isChosen ? C.shu : C.washiDark,
                background: !revealed ? '#fff' : isCorrect ? `${C.matcha}20` : isChosen ? `${C.shu}20` : '#fff',
                fontSize: HAS_JP.test(o) ? 20 : 14,
                fontFamily: HAS_JP.test(o) ? "'Noto Serif JP', serif" : 'inherit',
                fontWeight: 600, color: C.sumi, cursor: revealed ? 'default' : 'pointer',
              }}>{o}</button>
          )
        })}
      </div>

      {revealed && (
        <>
          <p style={{ marginTop: 12, color: correct ? C.matcha : C.shu, fontWeight: 600 }}>
            {correct ? '✓ Richtig!' : `✗ Richtig: ${ex.a}`}
          </p>
          <div style={{ background: `${C.indigo}10`, border: `1px solid ${C.indigo}30`, borderRadius: 8, padding: 10, marginTop: 8, fontSize: 13, color: C.sumi }}>
            💡 {ex.hint}
          </div>
          <Btn onClick={onNext} style={{ marginTop: 12, width: '100%' }}>
            {isLast ? 'Übungen abschließen →' : 'Nächste Übung →'}
          </Btn>
        </>
      )}
    </div>
  )
}

function GrammarLesson({ topic, alreadyDone, onDone, onClose }) {
  const exercises = topic.exercises || []
  const totalSteps = 1 + exercises.length + 1 // Erklärung + Übungen + Abschluss
  const [step, setStep] = useState(0)
  const [copied, setCopied] = useState(false)

  const isIntro = step === 0
  const isExercise = step >= 1 && step <= exercises.length
  const isDone = step === totalSteps - 1
  const progress = Math.round((step / (totalSteps - 1)) * 100)

  const clip =
    `Grammatik: ${topic.title}\n\n` +
    topic.body.map(s => (s.h ? `${s.h}: ` : '') + s.text).join('\n') +
    '\n\nBeispiele:\n' +
    topic.examples.map(e => `${e.jp}  (${e.kana})  – „${e.de}"`).join('\n')
  const handleCopy = async () => {
    const ok = await copyText(clip)
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1800) }
  }

  let content = null
  if (isIntro) {
    content = (
      <>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 48, fontFamily: "'Noto Serif JP', serif", color: C.shu }}>{topic.glyph}</div>
          <h2 style={{ fontSize: 20, color: C.indigo, marginTop: 4 }}>{topic.title}</h2>
        </div>
        {topic.body.map((s, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            {s.h && <div style={{ fontSize: 12, color: C.shu, fontWeight: 700, marginBottom: 2 }}>{s.h}</div>}
            <p style={{ fontSize: 14, color: C.sumi, lineHeight: 1.6 }}>{s.text}</p>
          </div>
        ))}
        <Card style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>BEISPIELE</div>
          {topic.examples.map((ex, i) => <TappableSentence key={i} ex={ex} />)}
        </Card>
        <button onClick={handleCopy}
          style={{
            width: '100%', marginTop: 12, padding: '11px 0', borderRadius: 8,
            border: `1px solid ${copied ? C.matcha : C.washiDark}`,
            background: copied ? `${C.matcha}15` : '#fff',
            color: copied ? C.matcha : C.indigo, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
          {copied ? '✓ Kopiert' : '📋 Thema kopieren'}
        </button>
      </>
    )
  } else if (isExercise) {
    content = (
      <GrammarExercise
        key={step}
        ex={exercises[step - 1]}
        idx={step}
        total={exercises.length}
        isLast={step === exercises.length}
        onNext={() => setStep(s => s + 1)}
      />
    )
  } else {
    content = (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
        <h2 style={{ fontSize: 22, fontFamily: "'Noto Serif JP', serif", color: C.matcha, marginBottom: 8 }}>Geschafft!</h2>
        <p style={{ lineHeight: 1.6, marginBottom: 8 }}>
          Du hast <strong>{topic.title}</strong> verstanden und angewendet.
        </p>
        <div style={{ fontSize: 48, fontFamily: "'Noto Serif JP', serif", color: C.shu }}>{topic.glyph}</div>
        <StoryScene id={topic.id} />
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.washi, display: 'flex', flexDirection: 'column', zIndex: 100 }}>
      <div style={{ padding: '12px 16px', background: '#fff', borderBottom: `1px solid ${C.washiDark}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.textMuted }}>✕</button>
          <div style={{ flex: 1, height: 6, background: C.washiDark, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: C.shu, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
          <h3 style={{ fontSize: 13, fontFamily: "'Noto Serif JP', serif", color: C.indigo }}>{topic.glyph}</h3>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>{content}</div>

      {!isExercise && (
        <div style={{ padding: '16px 20px', background: '#fff', borderTop: `1px solid ${C.washiDark}` }}>
          {isIntro && exercises.length > 0 ? (
            <Btn onClick={() => setStep(1)} style={{ width: '100%' }}>Anwenden – Übungen starten →</Btn>
          ) : (
            <Btn onClick={onDone} style={{ width: '100%' }} variant={alreadyDone && isIntro ? 'ghost' : 'primary'}>
              {isDone ? 'Verstanden ✓' : alreadyDone ? 'Gelesen ✓ – Schließen' : 'Verstanden ✓'}
            </Btn>
          )}
        </div>
      )}
    </div>
  )
}

function GrammarPath() {
  const { progress, completeGrammar } = useContext(ProgressCtx)
  const [active, setActive] = useState(null)
  const done = progress.completedGrammar || []

  if (active) {
    const topic = GRAMMAR.find(t => t.id === active)
    const already = done.includes(active)
    return (
      <GrammarLesson
        topic={topic}
        alreadyDone={already}
        onDone={() => { if (!already) completeGrammar(active, XP_PER_GRAMMAR); setActive(null) }}
        onClose={() => setActive(null)}
      />
    )
  }

  const topics = GRAMMAR.map((t, i) => ({
    ...t,
    done: done.includes(t.id),
    locked: i === 0 ? false : !done.includes(GRAMMAR[i - 1].id),
  }))

  return (
    <div>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 18 }}>
        Grammatik Schritt für Schritt: Partikel, です, Verben, Adjektive, Fragen und Satzbau.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 28, top: 28, bottom: 28, width: 2, background: C.washiDark, zIndex: 0 }} />
        {topics.map((t, i) => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: i < topics.length - 1 ? 16 : 0, position: 'relative', zIndex: 1,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
              background: t.done ? C.matcha : t.locked ? C.washiDark : C.shu,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: t.locked ? 18 : 22, color: '#fff', fontFamily: "'Noto Serif JP', serif",
              boxShadow: !t.locked && !t.done ? `0 0 0 4px ${C.shu}30` : 'none',
            }}>
              {t.done ? '✓' : t.locked ? '🔒' : t.glyph}
            </div>
            <button onClick={() => !t.locked && setActive(t.id)} disabled={t.locked}
              style={{
                flex: 1, background: '#fff', border: '2px solid',
                borderColor: t.done ? C.matcha : t.locked ? C.washiDark : C.shu,
                borderRadius: 12, padding: '12px 14px', textAlign: 'left',
                cursor: t.locked ? 'not-allowed' : 'pointer', opacity: t.locked ? 0.6 : 1,
              }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{t.title}</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>
                {t.done ? 'Gelesen ✓' : t.locked ? 'Noch gesperrt' : t.summary}
              </div>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function LernenScreen() {
  const { progress, completeLesson } = useContext(ProgressCtx)
  const [activeLesson, setActiveLesson] = useState(null)
  const [view, setView] = useState('kana') // 'kana' | 'woerter'

  // Lektionen aus dem gespeicherten Fortschritt ableiten:
  // - done  = ID ist in completedLessons
  // - locked = die vorherige Lektion ist noch nicht abgeschlossen
  const completed = progress.completedLessons || []
  const lessons = LESSONS.map((l, i) => ({
    ...l,
    done: completed.includes(l.id),
    locked: i === 0 ? false : !completed.includes(LESSONS[i - 1].id),
  }))

  const handleComplete = (id) => {
    if (!completed.includes(id)) {
      const lesson = LESSONS.find(l => l.id === id)
      completeLesson(id, (lesson?.kana.length || 0) * XP_PER_KANA)
    }
    setActiveLesson(null)
  }

  if (activeLesson) {
    const lesson = lessons.find(l => l.id === activeLesson)
    return (
      <LessonPlayer
        lesson={lesson}
        onComplete={() => handleComplete(activeLesson)}
        onClose={() => setActiveLesson(null)}
      />
    )
  }

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <h2 style={{ fontSize: 20, fontFamily: "'Noto Serif JP', serif", color: C.indigo, marginBottom: 12 }}>
        Lernen
      </h2>

      {/* Umschalter Kana / Wörter / Grammatik */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {[['kana', 'あ Kana'], ['woerter', '語 Wörter'], ['grammatik', '文 Grammatik']].map(([id, label]) => (
          <button key={id} onClick={() => setView(id)}
            style={{
              flex: 1, padding: '8px 2px', borderRadius: 8, cursor: 'pointer',
              border: `2px solid ${view === id ? C.shu : C.washiDark}`,
              background: view === id ? `${C.shu}15` : '#fff',
              color: view === id ? C.shu : C.textMuted, fontWeight: 600, fontSize: 13,
            }}>{label}</button>
        ))}
      </div>

      {view === 'woerter' && <BlockPath />}
      {view === 'grammatik' && <GrammarPath />}

      {view === 'kana' && (
      <>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 20 }}>
        Schritt für Schritt durch Hiragana & Katakana
      </p>

      {/* Lesson path */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
        {/* Connecting line */}
        <div style={{
          position: 'absolute', left: 28, top: 28, bottom: 28,
          width: 2, background: C.washiDark, zIndex: 0,
        }} />

        {lessons.map((lesson, i) => (
          <div key={lesson.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: i < lessons.length - 1 ? 16 : 0,
            position: 'relative', zIndex: 1,
          }}>
            {/* Node */}
            <div style={{
              width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
              background: lesson.done ? C.matcha : lesson.locked ? C.washiDark : C.shu,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: lesson.done ? 22 : lesson.locked ? 18 : 24,
              color: '#fff', fontFamily: "'Noto Serif JP', serif",
              boxShadow: !lesson.locked && !lesson.done ? `0 0 0 4px ${C.shu}30` : 'none',
            }}>
              {lesson.done ? '✓' : lesson.locked ? '🔒' : lesson.kana[0]}
            </div>

            {/* Card */}
            <button onClick={() => !lesson.locked && setActiveLesson(lesson.id)}
              disabled={lesson.locked}
              style={{
                flex: 1, background: '#fff', border: `2px solid`,
                borderColor: lesson.done ? C.matcha : lesson.locked ? C.washiDark : C.shu,
                borderRadius: 12, padding: '12px 14px', textAlign: 'left',
                cursor: lesson.locked ? 'not-allowed' : 'pointer',
                opacity: lesson.locked ? 0.6 : 1,
              }}>
              <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 18, marginBottom: 2 }}>
                {lesson.title}
              </div>
              <div style={{ fontSize: 12, color: C.textMuted }}>
                {lesson.done ? 'Abgeschlossen ✓' :
                  lesson.locked ? 'Noch gesperrt' :
                    `${lesson.kana.length} Zeichen · Jetzt starten`}
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Phrases section */}
      <div style={{ marginTop: 28 }}>
        <h3 style={{ fontSize: 16, fontFamily: "'Noto Serif JP', serif", color: C.indigo, marginBottom: 12 }}>
          Überlebensphrasen
        </h3>
        {PHRASES.map((p, i) => (
          <Card key={i} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 17, marginBottom: 2 }}>{p.jp}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{p.romaji}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: C.indigo, textAlign: 'right' }}>{p.de}</div>
                <button onClick={() => {
                  if ('speechSynthesis' in window) {
                    const u = new SpeechSynthesisUtterance(p.jp)
                    u.lang = 'ja-JP'
                    speechSynthesis.speak(u)
                  }
                }} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer' }}>🔊</button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      </>
      )}
    </div>
  )
}

function UebenScreen() {
  const { progress } = useContext(ProgressCtx)
  const [mode, setMode] = useState(null)

  if (mode === 'srs') return <SRSQuiz onClose={() => setMode(null)} />
  if (mode === 'erkennen' || mode === 'hoeren') return <PracticeQuiz mode={mode} onClose={() => setMode(null)} />

  const learnedAll = [...completedKanaList(progress.completedLessons || []), ...learnedWordKanji(progress.completedWordBlocks || [])]
  const dueCount = dueKana(progress, learnedAll).length
  const exercises = [
    { id: 'srs', icon: '🗂', title: 'SRS-Wiederholungen', sub: dueCount > 0 ? `${dueCount} Karten fällig` : 'Nichts fällig', color: C.shu },
    { id: 'erkennen', icon: '👁', title: 'Erkennen', sub: 'Zeichen → Lesung', color: C.indigo },
    { id: 'hoeren', icon: '👂', title: 'Hören', sub: 'Was hast du gehört?', color: C.matcha },
    { id: 'tippen', icon: '⌨️', title: 'Tippen', sub: 'Kana per Tastatur', color: '#8B6914' },
    { id: 'satzbau', icon: '🧩', title: 'Satzbau', sub: 'Wörter sortieren', color: '#7B3FA0' },
    { id: 'konversation', icon: '💬', title: 'Rollenspiel', sub: 'Im Restaurant', color: '#1A7A6E' },
  ]

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <h2 style={{ fontSize: 20, fontFamily: "'Noto Serif JP', serif", color: C.indigo, marginBottom: 4 }}>
        Üben
      </h2>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 20 }}>Wähle einen Übungstyp</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {exercises.map(e => (
          <button key={e.id} onClick={() => setMode(e.id)}
            style={{
              background: '#fff', border: `2px solid ${e.color}20`,
              borderRadius: 12, padding: '14px 12px', textAlign: 'left',
              cursor: 'pointer',
            }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{e.icon}</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: C.sumi, marginBottom: 2 }}>{e.title}</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{e.sub}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function FortschrittScreen() {
  const { progress, reset } = useContext(ProgressCtx)
  const stats = computeStats(progress)
  const completed = progress.completedLessons || []
  const kanaDone = completedKanaCount(completed)
  const kanaTotal = totalKanaCount()
  const kanaPct = kanaTotal ? Math.round(kanaDone / kanaTotal * 100) : 0

  const week = weeklyXp(progress)
  const weekTotal = week.reduce((a, d) => a + d.xp, 0)
  const maxXP = Math.max(stats.goal, ...week.map(d => d.xp))

  // Fertigkeiten aus echtem Fortschritt abgeleitet (0, solange nichts gelernt).
  // Lesen/Schreiben hängen am Kana-Fortschritt; übrige Bereiche kommen später.
  const skills = [
    { label: 'Lesen', value: kanaPct, color: C.shu },
    { label: 'Schreiben', value: kanaPct, color: C.matcha },
    { label: 'Hören', value: 0, color: C.indigo },
    { label: 'Wortschatz', value: 0, color: '#8B6914' },
    { label: 'Grammatik', value: 0, color: '#7B3FA0' },
  ]

  // Errungenschaften mit echten Bedingungen.
  const achievements = [
    { icon: '🔥', label: '3-Tage-Streak', sub: 'Bleib dran!', earned: stats.streak >= 3 },
    { icon: '✍️', label: 'Erste Lektion', sub: 'Hiragana あいうえお', earned: completed.length >= 1 },
    { icon: '🎓', label: 'Alle Hiragana', sub: `${kanaDone}/${kanaTotal} Zeichen`, earned: kanaDone >= kanaTotal && kanaTotal > 0 },
  ]

  const handleReset = () => {
    if (window.confirm('Wirklich den gesamten Fortschritt auf 0 zurücksetzen? Das kann nicht rückgängig gemacht werden.')) {
      reset()
    }
  }

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <h2 style={{ fontSize: 20, fontFamily: "'Noto Serif JP', serif", color: C.indigo, marginBottom: 16 }}>
        Fortschritt
      </h2>

      {/* Gesamt-XP / Level */}
      <Card style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.shu }}>{stats.totalXp}</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>XP gesamt</div>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.indigo }}>{stats.level}</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>Level</div>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.matcha }}>{stats.streak} 🔥</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>Streak</div>
        </div>
      </Card>

      {/* XP Bar chart */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12, fontWeight: 600, letterSpacing: 1 }}>
          XP DIESE WOCHE
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 80 }}>
          {week.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: '100%', background: d.xp > 0 ? C.shu : C.washiDark,
                borderRadius: '3px 3px 0 0',
                height: `${Math.round(d.xp / maxXP * 60)}px`,
                minHeight: d.xp > 0 ? 4 : 2,
              }} />
              <span style={{ fontSize: 10, color: C.textMuted }}>{d.label}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: C.textMuted }}>
          Gesamt diese Woche: <strong style={{ color: C.sumi }}>{weekTotal} XP</strong>
        </div>
      </Card>

      {/* Skills */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12, fontWeight: 600, letterSpacing: 1 }}>
          FERTIGKEITEN
        </div>
        {skills.map(s => (
          <div key={s.label} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13 }}>{s.label}</span>
              <span style={{ fontSize: 12, color: C.textMuted }}>{s.value}%</span>
            </div>
            <div style={{ height: 6, background: C.washiDark, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${s.value}%`, background: s.color, borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </Card>

      {/* Achievements */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12, fontWeight: 600, letterSpacing: 1 }}>
          ERRUNGENSCHAFTEN
        </div>
        {achievements.map((a, i) => (
          <div key={i} style={{
            display: 'flex', gap: 12, alignItems: 'center',
            padding: '10px 0', borderBottom: i < achievements.length - 1 ? `1px solid ${C.washiDark}` : 'none',
            opacity: a.earned ? 1 : 0.4,
          }}>
            <div style={{ fontSize: 24, filter: a.earned ? 'none' : 'grayscale(1)' }}>{a.earned ? a.icon : '🔒'}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{a.label}</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>{a.earned ? a.sub : 'Noch nicht erreicht'}</div>
            </div>
          </div>
        ))}
      </Card>

      {/* Reset */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <button onClick={handleReset}
          style={{
            background: 'none', border: `1px solid ${C.washiDark}`, borderRadius: 8,
            padding: '8px 16px', fontSize: 12, color: C.textMuted, cursor: 'pointer',
          }}>
          Fortschritt zurücksetzen
        </button>
      </div>
    </div>
  )
}

// ─── Reise: der durchgehende Lernpfad (roter Faden) ──────────────────────────
// EIN geordneter Pfad bündelt Kana, Wörter, Grammatik und Wiederholung in
// „Welten". Jede Station startet die passende, bereits vorhandene Lektion.
// Didaktische Reihenfolge: Hiragana → Katakana → Wörter/Grammatik verzahnt,
// mit eingestreuten Wiederholungs-Checkpoints (SRS).
const PATH = [
  { world: 'ひらがな・一', sub: 'Erste Schritte' },
  { type: 'kana', id: 'h1' },
  { type: 'kana', id: 'h2' },
  { type: 'kana', id: 'h3' },
  { type: 'review', id: 'rv1' },
  { world: 'ひらがな・二', sub: 'Mehr Silben' },
  { type: 'kana', id: 'h4' },
  { type: 'kana', id: 'h5' },
  { type: 'kana', id: 'h6' },
  { type: 'kana', id: 'h7' },
  { type: 'review', id: 'rv2' },
  { world: 'ひらがな・三 & 言葉', sub: 'Hiragana fertig · erste Wörter' },
  { type: 'kana', id: 'h8' },
  { type: 'kana', id: 'h9' },
  { type: 'kana', id: 'h10' },
  { type: 'word', id: 'wb1' },
  { type: 'grammar', id: 'g1' },
  { type: 'grammar', id: 'g2' },
  { type: 'review', id: 'rv3' },
  { world: 'カタカナ・一', sub: 'Die zweite Schrift' },
  { type: 'kana', id: 'k1' },
  { type: 'kana', id: 'k2' },
  { type: 'kana', id: 'k3' },
  { type: 'kana', id: 'k4' },
  { type: 'kana', id: 'k5' },
  { type: 'word', id: 'wb2' },
  { type: 'grammar', id: 'g3' },
  { type: 'grammar', id: 'g4' },
  { type: 'review', id: 'rv4' },
  { world: 'カタカナ・二', sub: 'Katakana fertig' },
  { type: 'kana', id: 'k6' },
  { type: 'kana', id: 'k7' },
  { type: 'kana', id: 'k8' },
  { type: 'kana', id: 'k9' },
  { type: 'kana', id: 'k10' },
  { type: 'word', id: 'wb3' },
  { type: 'grammar', id: 'g5' },
  { type: 'grammar', id: 'g6' },
  { type: 'review', id: 'rv5' },
  { world: '文を作る', sub: 'Sätze bauen' },
  { type: 'word', id: 'wb4' },
  { type: 'grammar', id: 'g7' },
  { type: 'grammar', id: 'g8' },
  { type: 'grammar', id: 'g9' },
  { type: 'grammar', id: 'g10' },
  { type: 'goal', id: 'fuji' },
]

// Kleine flache Landschafts-Motive (Bäume, Torii) als SVG-Gruppen.
function sceneTree(x, baseY, s, key, c1 = '#5E8A6A', c2 = '#6E9A78') {
  return (
    <g key={key}>
      <rect x={x - 2 * s} y={baseY} width={4 * s} height={9 * s} fill="#7A6242" />
      <polygon points={`${x},${baseY - 20 * s} ${x - 12 * s},${baseY + 2 * s} ${x + 12 * s},${baseY + 2 * s}`} fill={c1} />
      <polygon points={`${x},${baseY - 30 * s} ${x - 9 * s},${baseY - 7 * s} ${x + 9 * s},${baseY - 7 * s}`} fill={c2} />
    </g>
  )
}
function sceneTorii(x, y, s, key) {
  return (
    <g key={key}>
      <rect x={x - 15 * s} y={y} width={4.5 * s} height={28 * s} fill="#DA4A38" />
      <rect x={x + 10.5 * s} y={y} width={4.5 * s} height={28 * s} fill="#DA4A38" />
      <rect x={x - 21 * s} y={y - 7 * s} width={42 * s} height={6 * s} fill="#B23A2B" />
      <rect x={x - 17 * s} y={y} width={34 * s} height={4 * s} fill="#DA4A38" />
    </g>
  )
}

// Ein durchgängiger, vertikaler Bergrücken (gewundene Silhouette) für den Hintergrund.
function verticalRidge(side, H, base, amp, period, phase, color, key, W = 400) {
  let d = side === 'L' ? `M0,0 L${base},0` : `M${W},0 L${W - base},0`
  for (let yy = 0; yy <= H; yy += 34) {
    const o = base + amp * Math.sin(yy / period + phase)
    d += ` L${side === 'L' ? o : W - o},${yy}`
  }
  d += side === 'L' ? ` L0,${H} Z` : ` L${W},${H} Z`
  return <path key={key} d={d} fill={color} />
}

// Durchgängige Tal-Landschaft über die volle Höhe H (für den Parallax-Hintergrund).
function buildBackdrop(H) {
  const W = 400
  const els = [<rect key="sky" x="0" y="0" width={W} height={H} fill="url(#tabiSky)" />]
  // ferne, blasse Rücken
  els.push(verticalRidge('L', H, 96, 26, 560, 0.0, '#D3DBD7', 'fl'))
  els.push(verticalRidge('R', H, 96, 26, 600, 1.4, '#D3DBD7', 'fr'))
  // nahe, grüne Rücken
  els.push(verticalRidge('L', H, 58, 36, 360, 0.6, '#C0D2B9', 'nl'))
  els.push(verticalRidge('R', H, 58, 36, 380, 2.1, '#C0D2B9', 'nr'))
  // Bäume entlang der nahen Rücken
  let k = 0
  for (let yy = 70; yy < H - 40; yy += 188, k++) {
    const lx = 58 + 36 * Math.sin(yy / 360 + 0.6)
    els.push(sceneTree(lx + 16, yy, 0.8, `btl${k}`, '#5E8A6A', '#6E9A78'))
    const rx = W - (58 + 36 * Math.sin((yy + 94) / 380 + 2.1))
    els.push(sceneTree(rx - 16, yy + 94, 0.7, `btr${k}`, '#5E8A6A', '#6E9A78'))
  }
  // wenige, weiche Wolken
  let c = 0
  for (let yy = 240; yy < H; yy += 820, c++) {
    els.push(<ellipse key={`bc${c}`} cx={c % 2 ? 255 : 150} cy={yy} rx="32" ry="9" fill="#FFFFFF" opacity="0.4" />)
  }
  return els
}

function isNodeDone(node, progress) {
  if (node.type === 'kana') return (progress.completedLessons || []).includes(node.id)
  if (node.type === 'word') return (progress.completedWordBlocks || []).includes(node.id)
  if (node.type === 'grammar') return (progress.completedGrammar || []).includes(node.id)
  return false
}
function pathNodeMeta(node) {
  if (node.type === 'kana') { const l = LESSONS.find(x => x.id === node.id); return { face: l.kana[0], label: l.title, kind: l.script } }
  if (node.type === 'word') { const b = WORD_BLOCKS.find(x => x.id === node.id); return { face: b.words[0].kanji, label: b.title, kind: 'Wörter' } }
  if (node.type === 'grammar') { const g = GRAMMAR.find(x => x.id === node.id); return { face: g.glyph, label: g.title, kind: 'Grammatik' } }
  if (node.type === 'review') return { face: '復', label: 'Wiederholung', kind: 'SRS' }
  return { face: '富', label: 'Gipfel', kind: 'Ziel' }
}

// Glatter Weg durch die Stationen (gewundene „Straße").
function roadPath(pts) {
  if (pts.length < 2) return ''
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], my = (a[1] + b[1]) / 2
    d += ` Q${a[0]},${my} ${(a[0] + b[0]) / 2},${my} T${b[0]},${b[1]}`
  }
  return d
}

const STATE_PALETTE = {
  done: ['#5E8A6A', '#4A7257'],
  current: ['#DA4A38', '#B23A2B'],
  review: ['#E8A020', '#BE8316'],
  locked: ['#E0DAC8', '#C7BFA9'],
}

// Das Reise-Tagebuch: alle bisher freigeschalteten Geschichts-Kapitel am Stück.
function StoryJournal({ progress, onClose }) {
  const beats = []
  PATH.forEach(n => {
    if (!n.type || n.type === 'review' || n.type === 'goal') return
    if (isNodeDone(n, progress) && STORY[n.id]) beats.push({ id: n.id, ...STORY[n.id] })
  })
  const contentNodes = PATH.filter(n => n.type && n.type !== 'review' && n.type !== 'goal')
  if (contentNodes.every(n => isNodeDone(n, progress)) && STORY.fuji) beats.push({ id: 'fuji', ...STORY.fuji })

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.washi, display: 'flex', flexDirection: 'column', zIndex: 100 }}>
      <div style={{ padding: '12px 16px', background: '#fff', borderBottom: `1px solid ${C.washiDark}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.textMuted }}>✕</button>
        <h3 style={{ fontSize: 15, fontFamily: "'Noto Serif JP', serif", color: C.indigo }}>📖 Deine Geschichte</h3>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {beats.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.textMuted, marginTop: 40 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>📖</div>
            <p style={{ lineHeight: 1.6 }}>Noch keine Kapitel. Schließe Stationen auf deiner Reise ab – dann erzählt sich deine Geschichte hier Stück für Stück weiter.</p>
          </div>
        ) : beats.map((b, i) => (
          <div key={b.id} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, color: C.shu, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>KAPITEL {i + 1}</div>
            <p style={{ fontSize: 15, color: C.sumi, lineHeight: 1.7, margin: 0 }}>{b.de}</p>
            {b.jp && (
              <div style={{ marginTop: 10, background: `${C.indigo}0D`, borderRadius: 8, padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 22, fontFamily: "'Noto Serif JP', serif", color: C.sumi }}>{b.jp}</span>
                  <button onClick={() => speak(b.jp)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>🔊</button>
                </div>
                {b.kana && <div style={{ fontSize: 12, color: C.textMuted }}>{b.kana}</div>}
                <div style={{ fontSize: 14, color: C.indigo }}>„{b.tr}"</div>
              </div>
            )}
            {i < beats.length - 1 && <div style={{ height: 1, background: C.washiDark, marginTop: 18 }} />}
          </div>
        ))}
      </div>
    </div>
  )
}

function ReiseScreen() {
  const { progress, completeLesson, completeWordBlock, completeGrammar } = useContext(ProgressCtx)
  const [active, setActive] = useState(null)
  const [showStory, setShowStory] = useState(false)
  const currentRef = useRef(null)
  const wrapRef = useRef(null)
  const backdropRef = useRef(null)

  useEffect(() => {
    try { currentRef.current?.scrollIntoView({ block: 'center' }) } catch (e) { /* egal */ }
    // Nächsten scrollbaren Vorfahren finden und leichten Parallax aufsetzen.
    let el = wrapRef.current
    while (el && el.scrollHeight <= el.clientHeight + 4) el = el.parentElement
    if (!el) return
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        if (backdropRef.current) backdropRef.current.style.transform = `translateY(${el.scrollTop * 0.1}px)`
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => { el.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [])

  // Fällige Wiederholungen (für Checkpoint-Status).
  const learnedAll = [
    ...completedKanaList(progress.completedLessons || []),
    ...learnedWordKanji(progress.completedWordBlocks || []),
  ]
  const dueCount = dueKana(progress, learnedAll).length
  const contentNodes = PATH.filter(n => n.type && n.type !== 'review' && n.type !== 'goal')
  const doneCount = contentNodes.filter(n => isNodeDone(n, progress)).length
  const allDone = doneCount === contentNodes.length

  // ─ Aktive Lektion als Vollbild-Overlay (nutzt bestehende Komponenten) ─
  if (active) {
    const close = () => setActive(null)
    if (active.type === 'kana') {
      const lesson = LESSONS.find(l => l.id === active.id)
      return (
        <LessonPlayer lesson={lesson} onClose={close}
          onComplete={() => {
            if (!(progress.completedLessons || []).includes(active.id)) completeLesson(active.id, lesson.kana.length * XP_PER_KANA)
            close()
          }} />
      )
    }
    if (active.type === 'word') {
      const block = WORD_BLOCKS.find(b => b.id === active.id)
      return (
        <BlockCourse block={block} onClose={close}
          onComplete={() => {
            if (!(progress.completedWordBlocks || []).includes(active.id)) completeWordBlock(active.id, block.words.length * XP_PER_WORD)
            close()
          }} />
      )
    }
    if (active.type === 'grammar') {
      const topic = GRAMMAR.find(t => t.id === active.id)
      const already = (progress.completedGrammar || []).includes(active.id)
      return (
        <GrammarLesson topic={topic} alreadyDone={already} onClose={close}
          onDone={() => { if (!already) completeGrammar(active.id, XP_PER_GRAMMAR); close() }} />
      )
    }
    if (active.type === 'review') {
      return (
        <div style={{ position: 'fixed', inset: 0, background: C.washi, zIndex: 100, overflow: 'auto' }}>
          <SRSQuiz onClose={close} />
        </div>
      )
    }
  }

  // ─ Layout der Karte berechnen ─
  const R = 30, AMP = 86, CENTER = 160, XPAT = [0, 1, 0, -1]
  const bands = [], headers = [], laid = []
  let y = 22, ni = 0, foundCurrent = false
  let bandStart = null, bandIdx = -1
  for (const it of PATH) {
    if (it.world) {
      if (bandIdx >= 0) bands.push({ top: bandStart, bottom: y, idx: bandIdx })
      bandIdx++
      bandStart = y
      headers.push({ y, world: it.world, sub: it.sub })
      y += 50
      continue
    }
    const done = isNodeDone(it, progress)
    let state
    if (it.type === 'review') state = foundCurrent ? 'locked' : (dueCount > 0 ? 'review' : 'done')
    else if (it.type === 'goal') state = allDone ? 'done' : 'locked'
    else if (foundCurrent) state = 'locked'
    else if (done) state = 'done'
    else { state = 'current'; foundCurrent = true }

    const x = CENTER + AMP * XPAT[ni % 4]
    laid.push({ node: it, state, x, y: y + R })
    y += 2 * R + 56
    ni++
  }
  if (bandIdx >= 0) bands.push({ top: bandStart, bottom: y, idx: bandIdx })
  const trackH = y + 60
  const road = roadPath(laid.map(n => [n.x, n.y]))
  const goal = laid[laid.length - 1]

  // Durchgängiger Parallax-Hintergrund (eine Tal-Landschaft über die volle Höhe).
  const backdropH = trackH + 80
  const backdrop = buildBackdrop(backdropH)

  return (
    <div ref={wrapRef} style={{ paddingBottom: 8 }}>
      {showStory && <StoryJournal progress={progress} onClose={() => setShowStory(false)} />}
      {/* Intro + Gesamtfortschritt */}
      <div style={{ padding: '16px 16px 12px', position: 'relative', zIndex: 1 }}>
        <h2 style={{ fontSize: 20, fontFamily: "'Noto Serif JP', serif", color: C.indigo, marginBottom: 4 }}>
          Deine Reise 旅
        </h2>
        <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 12 }}>
          Ein Weg vom Anfang bis zum Gipfel – Schrift, Wörter und Grammatik Schritt für Schritt.
        </p>
        <div style={{ height: 8, background: C.washiDark, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.round(doneCount / contentNodes.length * 100)}%`, background: C.matcha, borderRadius: 4, transition: 'width 0.3s' }} />
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>
          {doneCount} / {contentNodes.length} Stationen gemeistert
          {dueCount > 0 && <span style={{ color: '#BE8316' }}> · {dueCount} fällig</span>}
        </div>
        <button onClick={() => setShowStory(true)}
          style={{
            marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#fff', border: `1px solid ${C.washiDark}`, borderRadius: 10,
            padding: '8px 14px', fontSize: 13, fontWeight: 600, color: C.indigo, cursor: 'pointer',
          }}>
          📖 Deine Geschichte
        </button>
      </div>

      {/* Karte */}
      <div style={{ position: 'relative', width: '100%', height: trackH, overflow: 'hidden' }}>
        {/* Durchgängiger Parallax-Hintergrund */}
        <div ref={backdropRef} aria-hidden="true" style={{ position: 'absolute', top: -40, left: 0, right: 0, height: backdropH, zIndex: 0, willChange: 'transform' }}>
          <svg width="100%" height={backdropH} viewBox={`0 0 400 ${backdropH}`} preserveAspectRatio="none" style={{ display: 'block' }}>
            <defs>
              <linearGradient id="tabiSky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#DCE7EE" />
                <stop offset="0.5" stopColor="#E7EDE6" />
                <stop offset="1" stopColor="#EEEADF" />
              </linearGradient>
            </defs>
            {backdrop}
          </svg>
        </div>

        {/* Fuji hinter dem Gipfel */}
        {goal && (
          <svg width="180" height="120" viewBox="0 0 180 120" style={{ position: 'absolute', left: '50%', top: goal.y - 96, transform: 'translateX(-50%)', opacity: 0.95, zIndex: 1 }} aria-hidden="true">
            <polygon points="40,110 90,18 140,110" fill="#B7C4D0" />
            <polygon points="72,46 90,18 108,46 98,52 90,44 82,52" fill="#F4F2EC" />
          </svg>
        )}

        {/* zentrierte Spur mit Weg + Stationen */}
        <div style={{ position: 'relative', zIndex: 1, width: 320, margin: '0 auto', height: trackH }}>
          <svg width="320" height={trackH} viewBox={`0 0 320 ${trackH}`} style={{ position: 'absolute', left: 0, top: 0 }} aria-hidden="true">
            {laid[0] && sceneTorii(258, laid[0].y - 30, 0.72, 'torii')}
            <path d={road} fill="none" stroke="#D7CEB6" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
            <path d={road} fill="none" stroke="#EFEBE0" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d={road} fill="none" stroke="#C2B894" strokeWidth="2" strokeDasharray="1 9" strokeLinecap="round" />
          </svg>

          {/* Welten-Überschriften */}
          {headers.map((h, i) => (
            <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: h.y, textAlign: 'center' }}>
              <span style={{ display: 'inline-block', background: '#fff', border: `1px solid ${C.washiDark}`, borderRadius: 16, padding: '4px 14px' }}>
                <span style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 14, color: C.indigo, marginRight: 6 }}>{h.world}</span>
                <span style={{ fontSize: 11, color: C.textMuted }}>{h.sub}</span>
              </span>
            </div>
          ))}

          {/* Stationen */}
          {laid.map((n, i) => {
            const meta = pathNodeMeta(n.node)
            const [bg, edge] = STATE_PALETTE[n.state]
            const locked = n.state === 'locked'
            const isGoal = n.node.type === 'goal'
            const Rr = isGoal ? 34 : R
            return (
              <div key={i} ref={n.state === 'current' ? currentRef : null}
                style={{ position: 'absolute', left: n.x, top: n.y, transform: 'translate(-50%,-50%)', width: 2 * Rr + 64, textAlign: 'center' }}>
                <button onClick={() => !locked && !isGoal && setActive(n.node)} disabled={locked || isGoal}
                  style={{
                    position: 'relative', width: 2 * Rr, height: 2 * Rr, borderRadius: '50%',
                    background: bg, border: `3px solid ${edge}`, cursor: locked || isGoal ? 'default' : 'pointer',
                    boxShadow: n.state === 'current' ? `0 0 0 6px ${C.shu}28` : 'none',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                  }}>
                  <span style={{ fontFamily: "'Noto Serif JP', serif", fontSize: isGoal ? 30 : 24, color: locked ? C.textMuted : '#fff', lineHeight: 1 }}>
                    {locked ? '🔒' : meta.face}
                  </span>
                  {n.state === 'done' && (
                    <span style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: '#E8B84B', color: '#7A5A14', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
                  )}
                </button>
                <div style={{ marginTop: 4 }}>
                  <span style={{ display: 'inline-block', background: 'rgba(239,235,224,0.85)', borderRadius: 8, padding: '1px 6px', fontSize: 11, color: C.sumi, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {meta.label}
                  </span>
                </div>
                {n.state === 'current' && (
                  <div style={{ marginTop: 2 }}>
                    <span style={{ background: C.shu, color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 9px', borderRadius: 10 }}>START</span>
                  </div>
                )}
                {n.state === 'review' && (
                  <div style={{ marginTop: 2 }}>
                    <span style={{ background: '#E8A020', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 9px', borderRadius: 10 }}>{dueCount} fällig</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function TabiApp() {
  const [tab, setTab] = useState('reise')
  const { user, logout } = useAuth()
  const { progress, awardXp, completeLesson, completeWordBlock, completeGrammar, reviewCard, scheduleNew, reset } = useProgress(user?.uid)
  const { level } = computeStats(progress)

  // Neu gelernte Kana/Wörter in den Wiederholungsplan einplanen (und bereits
  // gelernte, aber noch ungeplante migrieren). Hält die „fällig"-Zahl sinnvoll.
  useEffect(() => {
    const learned = [
      ...completedKanaList(progress.completedLessons || []),
      ...learnedWordKanji(progress.completedWordBlocks || []),
    ]
    scheduleNew(learned)
  }, [progress.completedLessons, progress.completedWordBlocks, progress.srs])

  const screens = {
    reise: <ReiseScreen />,
    heute: <HeuteScreen />,
    lernen: <LernenScreen />,
    ueben: <UebenScreen />,
    fortschritt: <FortschrittScreen />,
  }

  return (
    <ProgressCtx.Provider value={{ progress, awardXp, completeLesson, completeWordBlock, completeGrammar, reviewCard, reset }}>
    <div style={{
      maxWidth: 480, margin: '0 auto', height: '100vh',
      display: 'flex', flexDirection: 'column', position: 'relative',
      background: C.washi,
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 10px',
        background: '#fff',
        borderBottom: `2px solid ${C.washiDark}`,
        display: 'flex', alignItems: 'center', gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, background: C.shu, borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontFamily: "'Noto Serif JP', serif", color: '#fff',
        }}>旅</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Noto Serif JP', serif", color: C.sumi, lineHeight: 1 }}>Tabi</div>
          <div style={{ fontSize: 10, color: C.textMuted, lineHeight: 1 }}>旅 · Japanisch für Reisende</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ background: `${C.shu}15`, borderRadius: 12, padding: '3px 10px', fontSize: 12, color: C.shu, fontWeight: 600 }}>
            Level {level}
          </div>
          <button onClick={logout} title={`Abmelden (${user?.email || ''})`}
            style={{
              background: 'none', border: `1px solid ${C.washiDark}`, borderRadius: 12,
              padding: '3px 10px', fontSize: 12, color: C.textMuted, cursor: 'pointer',
            }}>
            Abmelden
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        {screens[tab]}
      </div>

      <TabBar active={tab} setActive={setTab} />
    </div>
    </ProgressCtx.Provider>
  )
}
