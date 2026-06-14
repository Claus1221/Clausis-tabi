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

const VOCAB = [
  { jp: '駅', romaji: 'eki', de: 'Bahnhof', type: 'kanji' },
  { jp: '出口', romaji: 'deguchi', de: 'Ausgang', type: 'kanji' },
  { jp: '入口', romaji: 'iriguchi', de: 'Eingang', type: 'kanji' },
  { jp: '円', romaji: 'en', de: 'Yen', type: 'kanji' },
  { jp: 'お手洗い', romaji: 'otearai', de: 'Toilette', type: 'kanji' },
  { jp: '男', romaji: 'otoko', de: 'Mann / Herren', type: 'kanji' },
  { jp: '女', romaji: 'onna', de: 'Frau / Damen', type: 'kanji' },
  { jp: '水', romaji: 'mizu', de: 'Wasser', type: 'kanji' },
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
// Beispiele (jp/kana/de). Themen schalten der Reihe nach frei.
const GRAMMAR = [
  {
    id: 'g1', glyph: 'は', title: 'は – das Thema', summary: 'Worüber gesprochen wird (gelesen „wa")',
    body: [
      { text: 'Die Partikel は markiert das Thema des Satzes – das, worüber etwas gesagt wird. Wichtig: als Partikel wird は „wa" gesprochen, nicht „ha".' },
      { h: 'Muster', text: '〈Thema〉 は 〈Aussage〉。  →  oft „A は B です" = „A ist B".' },
    ],
    examples: [
      { jp: 'これは水です。', kana: 'これはみずです。', de: 'Das ist Wasser.' },
      { jp: '山は高いです。', kana: 'やまはたかいです。', de: 'Der Berg ist hoch.' },
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
      { jp: '猫です。', kana: 'ねこです。', de: 'Es ist eine Katze.' },
      { jp: '水ではありません。', kana: 'みずではありません。', de: 'Es ist kein Wasser.' },
    ],
  },
  {
    id: 'g3', glyph: 'が', title: 'が – das Subjekt', summary: 'Wer/was etwas tut oder ist',
    body: [
      { text: 'が markiert das Subjekt – wer oder was etwas tut oder ist. Oft bei neuer Information sowie mit 好き, ある/いる und Adjektiven.' },
      { h: 'は vs が', text: 'は hebt das Thema hervor („was X betrifft …"), が betont das Subjekt selbst („gerade DIESES").' },
    ],
    examples: [
      { jp: '犬が走ります。', kana: 'いぬがはしります。', de: 'Der Hund rennt.' },
      { jp: '猫が好きです。', kana: 'ねこがすきです。', de: 'Ich mag Katzen.' },
    ],
  },
  {
    id: 'g4', glyph: 'を', title: 'を – das Objekt', summary: 'Das direkte Objekt (gesprochen „o")',
    body: [
      { text: 'を markiert das direkte Objekt – das Ding, mit dem etwas gemacht wird. Es steht direkt vor dem Verb.' },
      { h: 'Muster', text: '〈Objekt〉 を 〈Verb〉。' },
    ],
    examples: [
      { jp: '水を飲みます。', kana: 'みずをのみます。', de: 'Ich trinke Wasser.' },
      { jp: '魚を食べます。', kana: 'さかなをたべます。', de: 'Ich esse Fisch.' },
    ],
  },
  {
    id: 'g5', glyph: 'に', title: 'に & で – Ort, Ziel, Mittel', summary: 'Wohin/wann (に) und wo/womit (で)',
    body: [
      { h: 'に', text: 'に zeigt Ziel/Richtung („wohin"), Zeitpunkt („wann") oder den Ort, an dem etwas existiert.' },
      { h: 'で', text: 'で zeigt den Ort einer Handlung („wo") oder das Mittel („womit").' },
    ],
    examples: [
      { jp: '家に帰ります。', kana: 'いえにかえります。', de: 'Ich gehe nach Hause. (Ziel)' },
      { jp: '車で行きます。', kana: 'くるまでいきます。', de: 'Ich fahre mit dem Auto. (Mittel)' },
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
      { jp: '水を飲みます。', kana: 'みずをのみます。', de: 'Ich trinke Wasser.' },
      { jp: '水を飲みません。', kana: 'みずをのみません。', de: 'Ich trinke kein Wasser.' },
    ],
  },
  {
    id: 'g7', glyph: 'い', title: 'い- und な-Adjektive', summary: 'Die zwei Adjektiv-Typen',
    body: [
      { h: 'い-Adjektive', text: 'enden auf い (高い hoch, 大きい groß). Direkt vor dem Nomen oder am Satzende mit です.' },
      { h: 'な-Adjektive', text: 'brauchen な vor einem Nomen (きれいな花 = eine schöne Blume). Am Satzende ebenfalls mit です.' },
    ],
    examples: [
      { jp: '山は高いです。', kana: 'やまはたかいです。', de: 'Der Berg ist hoch. (い-Adjektiv)' },
      { jp: '星はきれいです。', kana: 'ほしはきれいです。', de: 'Die Sterne sind schön. (な-Adjektiv)' },
    ],
  },
  {
    id: 'g8', glyph: 'か', title: 'か – die Frage', summary: 'Aus einem Satz eine Frage machen',
    body: [
      { text: 'か am Satzende macht aus einer Aussage eine Frage. Ein Fragezeichen ist nicht nötig (wird aber oft trotzdem geschrieben).' },
      { h: 'Muster', text: '〈Aussage〉 か。' },
    ],
    examples: [
      { jp: '猫ですか。', kana: 'ねこですか。', de: 'Ist es eine Katze?' },
      { jp: '水を飲みますか。', kana: 'みずをのみますか。', de: 'Trinkst du Wasser?' },
    ],
  },
  {
    id: 'g9', glyph: 'の', title: 'の – Verbindung & Besitz', summary: 'A の B = „Bs A"',
    body: [
      { text: 'の verbindet zwei Nomen. „A の B" bedeutet meist „Bs A" bzw. „das B von A".' },
    ],
    examples: [
      { jp: '私の犬。', kana: 'わたしのいぬ。', de: 'Mein Hund. (私 = ich)' },
      { jp: '日本の車。', kana: 'にほんのくるま。', de: 'Ein japanisches Auto. (日本 = Japan)' },
    ],
  },
  {
    id: 'g10', glyph: '文', title: 'Satzbau (SOV)', summary: 'Das Verb steht am Ende',
    body: [
      { text: 'Japanisch ist eine SOV-Sprache: Subjekt – Objekt – Verb. Das Verb steht (fast) immer am Satzende.' },
      { text: 'Weil Partikel die Rolle jedes Wortes anzeigen, ist die Reihenfolge flexibler als im Deutschen – das Verb bleibt aber hinten.' },
    ],
    examples: [
      { jp: '猫が魚を食べます。', kana: 'ねこがさかなをたべます。', de: 'Die Katze frisst den Fisch.' },
    ],
  },
]

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

function ExampleRow({ ex }) {
  return (
    <div style={{ padding: '8px 0', borderBottom: `1px solid ${C.washiDark}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ fontSize: 19, fontFamily: "'Noto Serif JP', serif" }}>{ex.jp}</div>
        <button onClick={() => speak(ex.jp)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, flexShrink: 0 }}>🔊</button>
      </div>
      <div style={{ fontSize: 12, color: C.textMuted }}>{ex.kana}</div>
      <div style={{ fontSize: 14, color: C.indigo }}>„{ex.de}"</div>
    </div>
  )
}

function GrammarLesson({ topic, alreadyDone, onDone, onClose }) {
  const [copied, setCopied] = useState(false)
  const clip =
    `Grammatik: ${topic.title}\n\n` +
    topic.body.map(s => (s.h ? `${s.h}: ` : '') + s.text).join('\n') +
    '\n\nBeispiele:\n' +
    topic.examples.map(e => `${e.jp}  (${e.kana})  – „${e.de}"`).join('\n')
  const handleCopy = async () => {
    const ok = await copyText(clip)
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1800) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.washi, display: 'flex', flexDirection: 'column', zIndex: 100 }}>
      <div style={{ padding: '12px 16px', background: '#fff', borderBottom: `1px solid ${C.washiDark}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.textMuted }}>✕</button>
        <h3 style={{ fontSize: 14, fontFamily: "'Noto Serif JP', serif", color: C.indigo }}>Grammatik</h3>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
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
          {topic.examples.map((ex, i) => <ExampleRow key={i} ex={ex} />)}
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
      </div>

      <div style={{ padding: '16px 20px', background: '#fff', borderTop: `1px solid ${C.washiDark}` }}>
        <Btn onClick={onDone} style={{ width: '100%' }} variant={alreadyDone ? 'ghost' : 'primary'}>
          {alreadyDone ? 'Gelesen ✓ – Schließen' : 'Verstanden ✓'}
        </Btn>
      </div>
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

      {/* Vocab preview */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 15, fontFamily: "'Noto Serif JP', serif", color: C.indigo, marginBottom: 12 }}>
          Überlebens-Kanji
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {VOCAB.map((v, i) => (
            <Card key={i} style={{ padding: 12 }}>
              <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 24, color: C.sumi, marginBottom: 4 }}>{v.jp}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>{v.romaji}</div>
              <div style={{ fontSize: 13, color: C.indigo, fontWeight: 500 }}>{v.de}</div>
            </Card>
          ))}
        </div>
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

const WORLD_TINTS = ['#E9EFEA', '#E7ECEF', '#EBEFE6', '#ECEAEF', '#EFEDE6', '#E7EEF1']
const GROUND_TINTS = ['#D7E0CE', '#CBD7C8', '#D9E0CB', '#D3CFDC', '#E0DBC8', '#CCD9D8']

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

function ReiseScreen() {
  const { progress, completeLesson, completeWordBlock, completeGrammar } = useContext(ProgressCtx)
  const [active, setActive] = useState(null)
  const currentRef = useRef(null)

  useEffect(() => {
    try { currentRef.current?.scrollIntoView({ block: 'center' }) } catch (e) { /* egal */ }
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

  // Landschaft: pro Welt ein Boden-Hügel mit Bäumen, Wolken, Torii am Start.
  const scenery = []
  bands.forEach((b, i) => {
    const gy = b.bottom - 4
    scenery.push(<path key={`grd${i}`} d={`M0,${b.bottom + 1} L0,${gy - 14} Q80,${gy - 30} 160,${gy - 14} T320,${gy - 14} L320,${b.bottom + 1} Z`} fill={GROUND_TINTS[i % GROUND_TINTS.length]} />)
    scenery.push(sceneTree(32, gy - 18, 1, `t${i}a`))
    scenery.push(sceneTree(292, gy - 24, 0.85, `t${i}b`))
    if (i % 2 === 0) scenery.push(sceneTree(72, gy - 12, 0.7, `t${i}c`, '#6E9A78', '#83AE8A'))
    if (i % 2 === 1) scenery.push(sceneTree(250, gy - 10, 0.65, `t${i}d`, '#6E9A78', '#83AE8A'))
    if (i > 0) scenery.push(<ellipse key={`cl${i}`} cx={i % 2 ? 240 : 80} cy={b.top + 24} rx="24" ry="8" fill="#FFFFFF" opacity="0.55" />)
  })
  if (laid[0]) scenery.push(sceneTorii(256, laid[0].y - 28, 0.7, 'torii'))

  return (
    <div style={{ paddingBottom: 8 }}>
      {/* Intro + Gesamtfortschritt */}
      <div style={{ padding: '16px 16px 12px' }}>
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
      </div>

      {/* Karte */}
      <div style={{ position: 'relative', width: '100%', height: trackH, overflow: 'hidden' }}>
        {/* Welten-Bänder */}
        {bands.map(b => (
          <div key={b.idx} style={{ position: 'absolute', left: 0, right: 0, top: b.top, height: b.bottom - b.top, background: WORLD_TINTS[b.idx % WORLD_TINTS.length] }} />
        ))}

        {/* Fuji hinter dem Gipfel */}
        {goal && (
          <svg width="180" height="120" viewBox="0 0 180 120" style={{ position: 'absolute', left: '50%', top: goal.y - 96, transform: 'translateX(-50%)', opacity: 0.9 }} aria-hidden="true">
            <polygon points="40,110 90,18 140,110" fill="#C7D2DC" />
            <polygon points="72,46 90,18 108,46 98,52 90,44 82,52" fill="#F2F0EA" />
          </svg>
        )}

        {/* zentrierte Spur mit Weg + Stationen */}
        <div style={{ position: 'relative', width: 320, margin: '0 auto', height: trackH }}>
          <svg width="320" height={trackH} viewBox={`0 0 320 ${trackH}`} style={{ position: 'absolute', left: 0, top: 0 }} aria-hidden="true">
            {scenery}
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
  const { progress, awardXp, completeLesson, completeWordBlock, completeGrammar, reviewCard, reset } = useProgress(user?.uid)
  const { level } = computeStats(progress)

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
