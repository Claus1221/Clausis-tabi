import { useState, useRef, useEffect, createContext, useContext } from 'react'
import { useAuth } from './AuthGate.jsx'
import { useProgress, computeStats, dueKana, SRS_STAGE_BOUNDS, SETTINGS_DEFAULTS, getSettings } from './useProgress.js'
import { KANA_STROKES, STROKE_VIEWBOX } from './kanaStrokes.js'

// Fortschritt (aus Firestore) für alle Screens verfügbar machen.
const ProgressCtx = createContext({
  progress: { completedLessons: [], completedWordBlocks: [], completedGrammar: [], completedChapters: [], completedDialogs: [], xpByDate: {}, srs: {}, settings: {} },
  settings: SETTINGS_DEFAULTS,
  awardXp: async () => {},
  completeLesson: async () => {},
  completeWordBlock: async () => {},
  completeGrammar: async () => {},
  completeChapter: async () => {},
  completeDialog: async () => {},
  reviewCard: async () => {},
  saveSettings: async () => {},
  reset: async () => {},
})

// XP-Belohnungen
const XP_PER_KANA = 10  // pro Zeichen in einer abgeschlossenen Lektion
const XP_PER_CARD = 5   // pro wiederholter SRS-Karte / richtiger Übungsantwort
const XP_PER_WORD = 15     // pro gelerntem Wort
const XP_PER_GRAMMAR = 20  // pro gelerntem Grammatik-Thema
const XP_PER_CHAPTER = 30  // Bonus pro abgeschlossenem Geschichts-Kapitel
const XP_PER_DIALOG = 25   // Bonus pro abgeschlossener Gesprächs-Szene

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

// Japanische Display-Schrift — zentral, statt dutzendfach inline wiederholt.
const JP = "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', Meiryo, sans-serif"

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

// 50 Überlebensphrasen für Touristen, thematisch gruppiert (cat = Kategorie).
const PHRASES = [
  // Begrüßung & Höflichkeit
  { jp: 'こんにちは', romaji: 'konnichiwa', de: 'Hallo / Guten Tag', cat: 'Höflichkeit' },
  { jp: 'おはようございます', romaji: 'ohayou gozaimasu', de: 'Guten Morgen', cat: 'Höflichkeit' },
  { jp: 'こんばんは', romaji: 'konbanwa', de: 'Guten Abend', cat: 'Höflichkeit' },
  { jp: 'さようなら', romaji: 'sayounara', de: 'Auf Wiedersehen', cat: 'Höflichkeit' },
  { jp: 'ありがとうございます', romaji: 'arigatou gozaimasu', de: 'Vielen Dank', cat: 'Höflichkeit' },
  { jp: 'どういたしまして', romaji: 'dou itashimashite', de: 'Gern geschehen', cat: 'Höflichkeit' },
  { jp: 'すみません', romaji: 'sumimasen', de: 'Entschuldigung / Verzeihung', cat: 'Höflichkeit' },
  { jp: 'ごめんなさい', romaji: 'gomen nasai', de: 'Es tut mir leid', cat: 'Höflichkeit' },
  { jp: 'おねがいします', romaji: 'onegai shimasu', de: 'Bitte (höflich)', cat: 'Höflichkeit' },
  { jp: 'はい / いいえ', romaji: 'hai / iie', de: 'Ja / Nein', cat: 'Höflichkeit' },
  // Verständigung
  { jp: 'わかりません', romaji: 'wakarimasen', de: 'Ich verstehe nicht', cat: 'Verständigung' },
  { jp: 'わかりました', romaji: 'wakarimashita', de: 'Ich habe verstanden', cat: 'Verständigung' },
  { jp: 'えいごをはなせますか？', romaji: 'eigo o hanasemasu ka?', de: 'Sprechen Sie Englisch?', cat: 'Verständigung' },
  { jp: 'もういちど おねがいします', romaji: 'mou ichido onegai shimasu', de: 'Noch einmal, bitte', cat: 'Verständigung' },
  { jp: 'ゆっくり おねがいします', romaji: 'yukkuri onegai shimasu', de: 'Langsamer, bitte', cat: 'Verständigung' },
  { jp: 'にほんごが すこし わかります', romaji: 'nihongo ga sukoshi wakarimasu', de: 'Ich verstehe etwas Japanisch', cat: 'Verständigung' },
  { jp: 'これは にほんごで なんですか？', romaji: 'kore wa nihongo de nan desu ka?', de: 'Wie heißt das auf Japanisch?', cat: 'Verständigung' },
  { jp: 'たすけて ください', romaji: 'tasukete kudasai', de: 'Bitte helfen Sie mir', cat: 'Verständigung' },
  // Orientierung
  { jp: 'すみません、どこですか？', romaji: 'sumimasen, doko desu ka?', de: 'Entschuldigung, wo ist …?', cat: 'Orientierung' },
  { jp: 'えきは どこですか？', romaji: 'eki wa doko desu ka?', de: 'Wo ist der Bahnhof?', cat: 'Orientierung' },
  { jp: 'トイレは どこですか？', romaji: 'toire wa doko desu ka?', de: 'Wo ist die Toilette?', cat: 'Orientierung' },
  { jp: 'ちかいですか？', romaji: 'chikai desu ka?', de: 'Ist es in der Nähe?', cat: 'Orientierung' },
  { jp: 'みぎ / ひだり', romaji: 'migi / hidari', de: 'rechts / links', cat: 'Orientierung' },
  { jp: 'まっすぐ', romaji: 'massugu', de: 'geradeaus', cat: 'Orientierung' },
  { jp: 'これは ちずに ありますか？', romaji: 'kore wa chizu ni arimasu ka?', de: 'Ist das auf der Karte?', cat: 'Orientierung' },
  // Unterwegs / Verkehr
  { jp: 'この でんしゃは ○○に いきますか？', romaji: 'kono densha wa ○○ ni ikimasu ka?', de: 'Fährt dieser Zug nach ○○?', cat: 'Verkehr' },
  { jp: 'きっぷを ください', romaji: 'kippu o kudasai', de: 'Eine Fahrkarte, bitte', cat: 'Verkehr' },
  { jp: 'なんばんせんですか？', romaji: 'nan-ban-sen desu ka?', de: 'Welches Gleis?', cat: 'Verkehr' },
  { jp: 'タクシーを よんで ください', romaji: 'takushii o yonde kudasai', de: 'Rufen Sie bitte ein Taxi', cat: 'Verkehr' },
  { jp: 'ここで とめて ください', romaji: 'koko de tomete kudasai', de: 'Bitte hier anhalten', cat: 'Verkehr' },
  { jp: 'くうこうまで おねがいします', romaji: 'kuukou made onegai shimasu', de: 'Zum Flughafen, bitte', cat: 'Verkehr' },
  // Restaurant
  { jp: 'メニューを ください', romaji: 'menyuu o kudasai', de: 'Die Speisekarte, bitte', cat: 'Restaurant' },
  { jp: 'これを ください', romaji: 'kore o kudasai', de: 'Das hier, bitte', cat: 'Restaurant' },
  { jp: 'おすすめは なんですか？', romaji: 'osusume wa nan desu ka?', de: 'Was empfehlen Sie?', cat: 'Restaurant' },
  { jp: 'おみずを ください', romaji: 'omizu o kudasai', de: 'Wasser, bitte', cat: 'Restaurant' },
  { jp: 'おいしいです！', romaji: 'oishii desu!', de: 'Das ist lecker!', cat: 'Restaurant' },
  { jp: 'おかんじょう おねがいします', romaji: 'okanjou onegai shimasu', de: 'Die Rechnung, bitte', cat: 'Restaurant' },
  { jp: 'にくは たべません', romaji: 'niku wa tabemasen', de: 'Ich esse kein Fleisch', cat: 'Restaurant' },
  { jp: 'アレルギーが あります', romaji: 'arerugii ga arimasu', de: 'Ich habe eine Allergie', cat: 'Restaurant' },
  // Einkaufen
  { jp: 'いくらですか？', romaji: 'ikura desu ka?', de: 'Wie viel kostet das?', cat: 'Einkaufen' },
  { jp: 'たかいです', romaji: 'takai desu', de: 'Das ist teuer', cat: 'Einkaufen' },
  { jp: 'カードで はらえますか？', romaji: 'kaado de haraemasu ka?', de: 'Kann ich mit Karte zahlen?', cat: 'Einkaufen' },
  { jp: 'みて いるだけです', romaji: 'mite iru dake desu', de: 'Ich schaue nur', cat: 'Einkaufen' },
  { jp: 'ふくろを ください', romaji: 'fukuro o kudasai', de: 'Eine Tüte, bitte', cat: 'Einkaufen' },
  { jp: 'これは ありますか？', romaji: 'kore wa arimasu ka?', de: 'Haben Sie das?', cat: 'Einkaufen' },
  // Notfall & Gesundheit
  { jp: 'たすけて！', romaji: 'tasukete!', de: 'Hilfe!', cat: 'Notfall' },
  { jp: 'びょういんは どこですか？', romaji: 'byouin wa doko desu ka?', de: 'Wo ist ein Krankenhaus?', cat: 'Notfall' },
  { jp: 'けいさつを よんで ください', romaji: 'keisatsu o yonde kudasai', de: 'Rufen Sie die Polizei', cat: 'Notfall' },
  { jp: 'きぶんが わるいです', romaji: 'kibun ga warui desu', de: 'Mir ist schlecht', cat: 'Notfall' },
  { jp: 'みちに まよいました', romaji: 'michi ni mayoimashita', de: 'Ich habe mich verlaufen', cat: 'Notfall' },
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

// Japanisch vorlesen (Web Speech API).
function speak(text) {
  if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ja-JP'
    speechSynthesis.cancel()
    speechSynthesis.speak(u)
  }
}

// Ein SRS-Item vorlesen: bei Wörtern die Kana-Lesung (nicht das Kanji – sonst
// liest die TTS z. B. 月 als „getsu" statt „tsuki"), bei Kana das Zeichen selbst.
function speakItem(item) {
  const w = WORD_BY_KANJI[item]
  speak(w ? w.kana : item)
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

// ─── Twemoji-Grafiken (CC-BY, in public/twemoji/) ────────────────────────────
// Name → Unicode-Codepoint; gerendert als <img> aus dem öffentlichen Ordner.
const EMOJI = {
  airplane: '2708', ship: '1f6a2', car: '1f697', train: '1f686', station: '1f689',
  city: '1f3d9', mountain: '26f0', fuji: '1f5fb', wave: '1f30a', river: '1f3de',
  water: '1f4a7', sun: '2600', tree: '1f332', tea: '1f375', coffee: '2615',
  bread: '1f35e', map: '1f5fa', rain: '1f327', bird: '1f426', dog: '1f415',
  cat: '1f431', fish: '1f41f', horse: '1f434', eye: '1f441', mouth: '1f444',
  hand: '270b', foot: '1f9b6', ear: '1f442', house: '1f3e0', hotel: '1f3e8',
  food: '1f374', taxi: '1f695', bus: '1f68c', torii: '26e9', oldwoman: '1f475',
  person: '1f9cd', star: '2b50', night: '1f303', party: '1f389', japan: '1f5fe', hello: '1f44b',
}
function Emoji({ name, size = 48, style }) {
  const cp = EMOJI[name]
  if (!cp) return null
  return <img src={`${import.meta.env.BASE_URL}twemoji/${cp}.svg`} width={size} height={size} alt=""
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }} />
}

// ─── Tiny components ─────────────────────────────────────────────────────────

function TabBar({ active, setActive }) {
  const tabs = [
    { id: 'reise', label: '旅', sub: 'Reise' },
    { id: 'lernen', label: '辞書', sub: 'Bibliothek' },
    { id: 'ueben', label: '練習', sub: 'Üben' },
    { id: 'fortschritt', label: '進歩', sub: 'Fortschritt' },
  ]
  return (
    <nav style={{
      display: 'flex', borderTop: `1px solid ${C.washiDark}`,
      background: 'rgba(252,250,245,0.9)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      position: 'fixed', bottom: 0, left: 0, right: 0,
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 50, boxShadow: '0 -10px 24px -18px rgba(33,31,27,0.5)',
    }}>
      {tabs.map(t => {
        const on = active === t.id
        return (
          <button key={t.id} onClick={() => setActive(t.id)} style={{
            flex: 1, padding: '9px 0 8px', border: 'none', background: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            color: on ? C.shu : C.textMuted, position: 'relative',
            transition: 'color 0.25s ease',
          }}>
            <span aria-hidden="true" style={{
              position: 'absolute', top: 0, width: 4, height: 4, borderRadius: 99,
              background: C.shu, opacity: on ? 1 : 0, transform: on ? 'scale(1)' : 'scale(0.3)',
              transition: 'opacity 0.25s ease, transform 0.25s ease',
            }} />
            <span style={{ fontSize: 20, fontFamily: JP, transform: on ? 'translateY(-1px)' : 'none', transition: 'transform 0.25s ease' }}>{t.label}</span>
            <span style={{ fontSize: 10, fontWeight: on ? 700 : 500, letterSpacing: 0.2 }}>{t.sub}</span>
          </button>
        )
      })}
    </nav>
  )
}

function Card({ children, style }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '16px',
      border: '1px solid rgba(33,31,27,0.05)',
      boxShadow: 'var(--shadow-card)', ...style,
    }}>{children}</div>
  )
}

function Btn({ children, onClick, variant = 'primary', style }) {
  const bg = variant === 'primary' ? C.shu : variant === 'secondary' ? C.indigo : C.washiDark
  const color = variant === 'ghost' ? C.sumi : '#fff'
  const shadow = variant === 'primary' ? '0 2px 5px rgba(218,74,56,0.30), 0 8px 18px -10px rgba(218,74,56,0.5)'
    : variant === 'secondary' ? '0 2px 5px rgba(30,67,104,0.26), 0 8px 18px -10px rgba(30,67,104,0.45)'
    : 'none'
  return (
    <button onClick={onClick} className="tabi-press" style={{
      background: bg, color, border: 'none', borderRadius: 10,
      padding: '12px 24px', fontSize: 15, fontWeight: 600,
      fontFamily: 'inherit', cursor: 'pointer', boxShadow: shadow,
      transition: 'transform 0.12s ease, filter 0.12s ease', ...style,
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
          fontFamily={JP} fill="#EFEBE0" style={{ userSelect: 'none' }}>{char}</text>

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
          fontSize: size * 0.7, fontFamily: JP,
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
      <div style={{ fontSize: 72, fontFamily: JP, marginBottom: 20, color: C.sumi }}>
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
        <h2 style={{ fontSize: 22, fontFamily: JP, color: C.indigo, marginBottom: 8 }}>
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
        <h2 style={{ fontSize: 22, fontFamily: JP, color: C.matcha, marginBottom: 8 }}>
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
              fontSize: 28, fontFamily: JP,
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
            <div style={{ fontSize: 88, fontFamily: JP,
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
              Strichreihenfolge für <strong style={{ fontFamily: JP, fontSize: 20 }}>{char}</strong>
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
              Schreibe <strong style={{ fontFamily: JP, fontSize: 20 }}>{char}</strong> nach
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
        <h3 style={{ fontSize: 14, fontFamily: JP, color: C.indigo }}>
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

// Spaced-Repetition-Quiz. Modus 'due' = heute fällige Karten; 'free' = Fleiß-
// Übung über ALLE gelernten Karten (begrenzte Session), auch wenn nichts fällig
// ist. Nur wirklich fällige Karten verschieben dabei den Wiederholungsplan.
function SRSQuiz({ onClose, initialMode = 'due' }) {
  const { progress, awardXp, reviewCard, settings } = useContext(ProgressCtx)

  const learned = [
    ...completedKanaList(progress.completedLessons || []),
    ...learnedWordKanji(progress.completedWordBlocks || []),
  ]
  // Welche Karten sind WIRKLICH heute fällig? Nur diese verschieben den Plan.
  const [dueSet, setDueSet] = useState(() => new Set(dueKana(progress, learned)))

  // Stapel je nach Modus bauen und mischen, damit nicht immer dasselbe Schema
  // (a, e, i, o, u …) abgefragt wird – sonst lernt man die Reihenfolge.
  const buildDeck = (m) => {
    const pool = m === 'free' ? learned : [...dueSet]
    const d = shuffled(pool)
    return m === 'free' ? d.slice(0, settings.freeSize) : d
  }

  const [mode, setMode] = useState(initialMode)
  const [deck, setDeck] = useState(() => buildDeck(initialMode))
  const [queue, setQueue] = useState(deck)   // Arbeits-Warteschlange (kann wachsen)
  const [flipped, setFlipped] = useState(false)
  const [passed, setPassed] = useState(0)    // endgültig gekonnte Karten
  const [lapses, setLapses] = useState(0)    // wie oft „Nochmal"
  const [repeats, setRepeats] = useState(() => new Set()) // welche Karten schon mal daneben

  // Eine Fleiß-Session über alle gelernten Karten starten – auch wenn nichts fällig ist.
  const startFree = () => {
    const d = buildDeck('free')
    setMode('free'); setDeck(d); setQueue(d)
    setPassed(0); setLapses(0); setRepeats(new Set()); setFlipped(false)
  }

  // Leerer Stapel: nichts fällig – oder im Fleiß-Modus noch nichts gelernt.
  if (deck.length === 0) {
    const canFree = mode !== 'free' && learned.length > 0
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🌿</div>
        <h3 style={{ fontSize: 18, marginBottom: 8 }}>
          {mode === 'free' ? 'Noch nichts zu üben' : 'Nichts fällig'}
        </h3>
        <p style={{ color: C.textMuted, marginBottom: 16 }}>
          {mode === 'free'
            ? 'Lerne erst ein paar Kana oder Wörter auf der Reise – dann kannst du hier nach Lust und Laune üben.'
            : 'Aktuell sind keine Wiederholungen fällig. Du kannst trotzdem zur Übung alle gelernten Karten durchgehen.'}
        </p>
        {canFree && <Btn onClick={startFree} style={{ width: '100%', marginBottom: 8 }}>🔥 Trotzdem üben</Btn>}
        <Btn onClick={onClose} variant={canFree ? 'ghost' : 'primary'} style={{ width: '100%' }}>Zurück</Btn>
      </div>
    )
  }

  if (queue.length === 0) {
    const canMore = learned.length > 0
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{mode === 'free' ? '🔥' : '✅'}</div>
        <h3 style={{ fontSize: 18, marginBottom: 8 }}>
          {mode === 'free' ? 'Fleiß-Session geschafft!' : 'Alle fälligen Karten gemeistert!'}
        </h3>
        <p style={{ color: C.textMuted, marginBottom: 16 }}>
          {passed} Karten · +{passed * XP_PER_CARD} XP
          {lapses > 0 && ` · ${lapses}× wiederholt`}
        </p>
        {canMore && (
          <Btn onClick={startFree} style={{ width: '100%', marginBottom: 8 }}>
            🔥 {mode === 'free' ? 'Noch eine Runde' : 'Weiter üben (Fleiß)'}
          </Btn>
        )}
        <Btn onClick={onClose} variant={canMore ? 'ghost' : 'primary'} style={{ width: '100%' }}>Fertig</Btn>
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
      // „Gekonnt": nur WIRKLICH fällige Karten verschieben den Wiederholungsplan –
      // so bringt Vorab-Üben („Fleiß") den Plan nicht durcheinander. Danach gilt
      // die Karte als erledigt (kein Doppel-Review in einer späteren Fleiß-Runde).
      if (dueSet.has(item)) {
        reviewCard(item, quality)
        setDueSet(prev => { const n = new Set(prev); n.delete(item); return n })
      }
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
          {mode === 'free' && <span style={{ color: '#C2410C', fontWeight: 700 }}>🔥 Fleiß · </span>}
          {passed} / {deck.length} gekonnt · noch {queue.length}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 16 }}>✕</button>
      </div>

      <Card style={{ textAlign: 'center', minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 16, position: 'relative' }}>
        {isRepeat && (
          <div style={{ position: 'absolute', top: 10, left: 12, fontSize: 11, color: C.shu, fontWeight: 600 }}>🔁 nochmal</div>
        )}
        <button onClick={() => speakItem(item)} title="Anhören"
          style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>🔊</button>
        <div style={{ fontSize: item.length > 1 ? 52 : 80, fontFamily: JP, marginBottom: 12 }}>{item}</div>
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

// Antwortmöglichkeiten pro Multiple-Choice-Runde. Mehr Optionen = weniger
// Treffer per Ausschlussprinzip (Raten durch Wegstreichen der offensichtlich
// Falschen).
const OPTIONS_PER_ROUND = 6

// Baut Multiple-Choice-Runden über die gelernten Kana. Die Zahl der Ablenker
// passt sich an, falls noch nicht genug Zeichen gelernt sind.
function buildRounds(learnedKana, optionCount = OPTIONS_PER_ROUND) {
  const pool = [...new Set(learnedKana)]
  const nDistract = Math.min(optionCount - 1, pool.length - 1)
  return shuffled(pool).map(ch => {
    const distractors = shuffled(pool.filter(k => k !== ch)).slice(0, nDistract)
    const options = shuffled([ch, ...distractors])
    return { char: ch, options }
  })
}

function PracticeQuiz({ mode, onClose }) {
  // mode: 'erkennen' (Zeichen → Lesung) | 'hoeren' (Audio → Zeichen)
  const { progress, awardXp, settings } = useContext(ProgressCtx)
  const learned = completedKanaList(progress.completedLessons || [])
  const [rounds] = useState(() => buildRounds(learned, settings.options).slice(0, settings.roundSize))
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
            <div style={{ fontSize: 80, fontFamily: JP, marginBottom: 4 }}>{cur.char}</div>
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
                fontFamily: mode === 'erkennen' ? 'inherit' : JP,
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

// Tagesstatus — war früher der „Heute"-Tab, jetzt eingebettet im Kopf der Reise.
// Tagesziel-Ring + Streak + Link zu den fälligen Wiederholungen (→ Üben).
function DailyStrip({ onReview }) {
  const { progress } = useContext(ProgressCtx)
  const { streak, xpToday: xp, goal } = computeStats(progress)
  const learnedAll = [...completedKanaList(progress.completedLessons || []), ...learnedWordKanji(progress.completedWordBlocks || [])]
  const due = dueKana(progress, learnedAll).length
  const pct = Math.min(xp / goal, 1)

  return (
    <Card style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <svg width="56" height="56" style={{ flexShrink: 0 }}>
          <circle cx="28" cy="28" r="22" fill="none" stroke={C.washiDark} strokeWidth="5" />
          <circle cx="28" cy="28" r="22" fill="none" stroke={C.shu} strokeWidth="5"
            strokeDasharray={`${2 * Math.PI * 22 * pct} ${2 * Math.PI * 22}`}
            strokeLinecap="round" transform="rotate(-90 28 28)" />
          <text x="28" y="33" textAnchor="middle" fontSize="13" fontWeight="700" fill={C.shu}>
            {Math.min(Math.round(xp / goal * 100), 100)}%
          </text>
        </svg>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>Tagesziel</div>
          <div style={{ fontSize: 13, color: C.textMuted }}>{xp} / {goal} XP</div>
          <div style={{ fontSize: 12, color: C.textMuted }}>
            {xp >= goal ? 'erreicht 🎉' : `noch ${goal - xp} XP`}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.shu, lineHeight: 1 }}>{streak} 🔥</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8 }}>Streak</div>
          {due > 0 ? (
            <button onClick={onReview} style={{
              background: `${C.shu}14`, border: `1px solid ${C.shu}40`, borderRadius: 999,
              padding: '4px 10px', fontSize: 12, fontWeight: 700, color: C.shu, cursor: 'pointer',
            }}>{due} fällig →</button>
          ) : (
            <div style={{ fontSize: 11, color: C.textMuted }}>nichts fällig</div>
          )}
        </div>
      </div>
    </Card>
  )
}

// Liste der Überlebensphrasen (im Lernen-Tab), thematisch gruppiert.
function PhraseList() {
  const cats = [...new Set(PHRASES.map(p => p.cat))]
  return (
    <div>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
        {PHRASES.length} nützliche Sätze für deine Reise – nach Situation sortiert. 🔊 zum Anhören.
      </p>
      {cats.map(cat => (
        <div key={cat} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: C.shu, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>{cat.toUpperCase()}</div>
          {PHRASES.filter(p => p.cat === cat).map((p, i) => (
            <Card key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: JP, fontSize: 17, marginBottom: 2 }}>{p.jp}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>{p.romaji}</div>
                  <div style={{ fontSize: 13, color: C.indigo, marginTop: 2 }}>{p.de}</div>
                </div>
                <button onClick={() => speak(p.jp)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>🔊</button>
              </div>
            </Card>
          ))}
        </div>
      ))}
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
      <div style={{ fontSize: 72, fontFamily: JP, marginBottom: 4, color: C.sumi }}>{cur.kanji}</div>
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
        <div style={{ fontSize: 80, fontFamily: JP, color: C.sumi, lineHeight: 1 }}>{word.kanji}</div>
        <button onClick={() => speak(word.kana)}
          style={{ background: `${C.indigo}15`, border: `1px solid ${C.indigo}40`, borderRadius: 20, padding: '4px 14px', fontSize: 13, cursor: 'pointer', color: C.indigo, margin: '10px 0 6px' }}>
          🔊 Anhören
        </button>
        <div style={{ fontSize: 22, fontFamily: JP, color: C.indigo }}>{word.kana}
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

        <div style={{ fontSize: 32, fontFamily: JP, lineHeight: 1.5, marginBottom: 8 }}>
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
              <span style={{ fontSize: 24, fontFamily: JP, color: C.sumi }}>{tk.t}</span>
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
        <h2 style={{ fontSize: 22, fontFamily: JP, color: C.indigo, marginBottom: 8 }}>{block.title}</h2>
        <p style={{ color: C.textMuted, lineHeight: 1.6, marginBottom: 16 }}>
          In diesem Block lernst du {words.length} Wörter mit Kanji, Lesung und je einem Beispielsatz.
          Am Ende gibt es ein kurzes Quiz.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {words.map(w => (
            <span key={w.kanji} style={{ fontSize: 28, fontFamily: JP, background: `${C.indigo}12`, borderRadius: 8, padding: '4px 12px' }}>{w.kanji}</span>
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
        <h2 style={{ fontSize: 22, fontFamily: JP, color: C.matcha, marginBottom: 8 }}>Block geschafft!</h2>
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
        <h3 style={{ fontSize: 14, fontFamily: JP, color: C.indigo }}>{block.theme} {block.title}</h3>
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

// BlockPath/GrammarPath (parallele Lernpfade) entfernt — Fortschritt läuft über
// die Reise; „Lernen" ist jetzt eine reine Nachschlage-Bibliothek (s. u.).

// ─── Grammatik-Lernpfad ──────────────────────────────────────────────────────

// Beispielsatz mit antippbaren Wörtern (Bedeutung + Aufbau als Tooltip).
function TappableSentence({ ex }) {
  const [active, setActive] = useState(null)
  const tokens = ex.tokens || null
  const tk = tokens && active != null ? tokens[active] : null

  return (
    <div style={{ padding: '6px 0', borderBottom: `1px solid ${C.washiDark}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ fontSize: 26, fontFamily: JP, lineHeight: 1.5 }}>
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
            <span style={{ fontSize: 22, fontFamily: JP, color: C.sumi }}>{tk.t}</span>
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
        <div style={{ fontSize: 24, fontFamily: JP, lineHeight: 1.6, color: C.sumi }}>
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
                fontFamily: HAS_JP.test(o) ? JP : 'inherit',
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
          <div style={{ fontSize: 48, fontFamily: JP, color: C.shu }}>{topic.glyph}</div>
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
        <h2 style={{ fontSize: 22, fontFamily: JP, color: C.matcha, marginBottom: 8 }}>Geschafft!</h2>
        <p style={{ lineHeight: 1.6, marginBottom: 8 }}>
          Du hast <strong>{topic.title}</strong> verstanden und angewendet.
        </p>
        <div style={{ fontSize: 48, fontFamily: JP, color: C.shu }}>{topic.glyph}</div>
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
          <h3 style={{ fontSize: 13, fontFamily: JP, color: C.indigo }}>{topic.glyph}</h3>
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

// Grammatik-Reihenfolge identisch zur Reise (Satz-Grundgerüst zuerst).
const GRAMMAR_ORDER = ['g2', 'g1', 'g6', 'g3', 'g4', 'g5', 'g7', 'g8', 'g9', 'g10']
const GRAMMAR_SEQ = GRAMMAR_ORDER.map(id => GRAMMAR.find(g => g.id === id))

// „Lernen" ist jetzt eine reine Nachschlage-Bibliothek: alles frei einsehbar,
// keine Sperren, kein XP. Gelernt/freigeschaltet wird auf der Reise.
function LernenScreen() {
  const [view, setView] = useState('kana') // 'kana' | 'woerter' | 'grammatik' | 'phrasen'

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <h2 style={{ fontSize: 20, fontFamily: JP, color: C.indigo, marginBottom: 4 }}>
        Bibliothek
      </h2>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
        Alles zum Nachschlagen – ohne Sperren, ohne Druck. Gelernt und freigeschaltet wird auf der Reise.
      </p>

      {/* Umschalter Kana / Wörter / Grammatik / Phrasen */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 18 }}>
        {[['kana', 'あ Kana'], ['woerter', '語 Wörter'], ['grammatik', '文 Grammatik'], ['phrasen', '会 Phrasen']].map(([id, label]) => (
          <button key={id} onClick={() => setView(id)}
            style={{
              flex: 1, padding: '8px 2px', borderRadius: 8, cursor: 'pointer',
              border: `2px solid ${view === id ? C.shu : C.washiDark}`,
              background: view === id ? `${C.shu}15` : '#fff',
              color: view === id ? C.shu : C.textMuted, fontWeight: 600, fontSize: 12,
            }}>{label}</button>
        ))}
      </div>

      {view === 'kana' && <KanaLibrary />}
      {view === 'woerter' && <WordLibrary />}
      {view === 'grammatik' && <GrammarLibrary />}
      {view === 'phrasen' && <PhraseList />}
    </div>
  )
}

// Vollbild-Nachschlageblatt (read-only) für die Bibliothek.
function LibSheet({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: C.washi, display: 'flex', flexDirection: 'column', zIndex: 100 }}>
      <div style={{ padding: '12px 16px', background: '#fff', borderBottom: `1px solid ${C.washiDark}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.textMuted }}>✕</button>
        <h3 style={{ fontSize: 15, fontFamily: JP, color: C.indigo }}>{title}</h3>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>{children}</div>
    </div>
  )
}

// Kana-Tabelle zum Nachschlagen — tippen öffnet Strichfolge, Lesung und Schreibfeld.
function KanaLibrary() {
  const [sel, setSel] = useState(null)

  if (sel) {
    const d = KANA_DATA[sel]
    return (
      <LibSheet title={`${sel}${d?.romaji ? ` · ${d.romaji}` : ''}`} onClose={() => setSel(null)}>
        <StrokeDisplay char={sel} />
        <div style={{ textAlign: 'center', margin: '14px 0' }}>
          <button onClick={() => speak(sel)}
            style={{ background: `${C.indigo}15`, border: `1px solid ${C.indigo}40`, borderRadius: 20, padding: '4px 14px', fontSize: 13, cursor: 'pointer', color: C.indigo }}>
            🔊 Anhören
          </button>
          {d?.tip && <div style={{ fontSize: 13, color: C.textMuted, marginTop: 8 }}>💡 {d.tip}</div>}
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: 1, margin: '8px 0' }}>SELBST SCHREIBEN</div>
        <DrawCanvas char={sel} />
      </LibSheet>
    )
  }

  const Grid = ({ rows }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: 6 }}>
          {row.map(ch => (
            <button key={ch} onClick={() => setSel(ch)}
              style={{
                flex: 1, aspectRatio: '1 / 1', minWidth: 0, background: '#fff',
                border: `1px solid ${C.washiDark}`, borderRadius: 8, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
              <span style={{ fontSize: 22, fontFamily: JP, color: C.sumi, lineHeight: 1 }}>{ch}</span>
              <span style={{ fontSize: 9, color: C.textMuted }}>{KANA_DATA[ch]?.romaji || ''}</span>
            </button>
          ))}
          {row.length < 5 && Array.from({ length: 5 - row.length }).map((_, k) => <div key={`s${k}`} style={{ flex: 1 }} />)}
        </div>
      ))}
    </div>
  )

  return (
    <div>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 14 }}>
        Alle Kana – tippe ein Zeichen für Strichfolge, Lesung und Schreibfeld.
      </p>
      <div style={{ fontSize: 11, color: C.shu, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>HIRAGANA</div>
      <Grid rows={HIRA_ROWS} />
      <div style={{ fontSize: 11, color: C.shu, fontWeight: 700, letterSpacing: 1, margin: '18px 0 8px' }}>KATAKANA</div>
      <Grid rows={KATA_ROWS} />
    </div>
  )
}

// Alle Wörter zum Nachschlagen, nach Thema gruppiert.
function WordLibrary() {
  const [sel, setSel] = useState(null)

  if (sel) {
    const w = WORD_BY_KANJI[sel]
    return (
      <LibSheet title={`${w.kanji} · ${w.de}`} onClose={() => setSel(null)}>
        <WordDetail word={w} />
      </LibSheet>
    )
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 14 }}>
        Alle Wörter mit Kanji, Lesung, Bedeutung und Beispielsatz.
      </p>
      {WORD_BLOCKS.map(block => (
        <div key={block.id} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: C.shu, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>
            {block.theme} {block.title.toUpperCase()}
          </div>
          {block.words.map(w => (
            <button key={w.kanji} onClick={() => setSel(w.kanji)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
                background: '#fff', border: '1px solid rgba(33,31,27,0.05)', borderRadius: 12,
                boxShadow: 'var(--shadow-card)', padding: '10px 14px', marginBottom: 8, cursor: 'pointer',
              }}>
              <span style={{ fontSize: 30, fontFamily: JP, color: C.sumi, lineHeight: 1 }}>{w.kanji}</span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 14, fontFamily: JP, color: C.indigo }}>{w.kana} · {w.romaji}</span>
                <span style={{ display: 'block', fontSize: 13, color: C.sumi }}>{w.de}</span>
              </span>
              <span style={{ fontSize: 16, color: C.textMuted }}>›</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

// Alle Grammatik-Themen als read-only Erklärung (Beispiele antippbar, keine Übungen/XP).
function GrammarLibrary() {
  const [sel, setSel] = useState(null)

  if (sel) {
    const topic = GRAMMAR.find(t => t.id === sel)
    return (
      <LibSheet title={`${topic.glyph} · ${topic.title}`} onClose={() => setSel(null)}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 48, fontFamily: JP, color: C.shu }}>{topic.glyph}</div>
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
      </LibSheet>
    )
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 14 }}>
        Alle Grammatik-Themen zum Nachlesen – mit Beispielen zum Antippen.
      </p>
      {GRAMMAR_SEQ.map(t => (
        <button key={t.id} onClick={() => setSel(t.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
            background: '#fff', border: '1px solid rgba(33,31,27,0.05)', borderRadius: 12,
            boxShadow: 'var(--shadow-card)', padding: '12px 14px', marginBottom: 8, cursor: 'pointer',
          }}>
          <span style={{
            width: 42, height: 42, flexShrink: 0, borderRadius: 10, background: `${C.shu}12`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontFamily: JP, color: C.shu,
          }}>{t.glyph}</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: C.sumi }}>{t.title}</span>
            <span style={{ display: 'block', fontSize: 12, color: C.textMuted }}>{t.summary}</span>
          </span>
          <span style={{ fontSize: 16, color: C.textMuted }}>›</span>
        </button>
      ))}
    </div>
  )
}

// Kleine geteilte Bausteine für die Üben-Übungen.
function UebenHead({ title, idx, total, onClose }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <span style={{ color: C.textMuted, fontSize: 13 }}>{title}{total ? ` · ${idx + 1} / ${total}` : ''}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 16 }}>✕</button>
    </div>
  )
}
function UebenEmpty({ onClose, text }) {
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
      <h3 style={{ fontSize: 18, marginBottom: 8 }}>Noch zu wenig gelernt</h3>
      <p style={{ color: C.textMuted, marginBottom: 16 }}>{text || 'Lerne zuerst etwas im Lernen-Tab oder auf der Reise.'}</p>
      <Btn onClick={onClose}>Zurück</Btn>
    </div>
  )
}
function UebenDone({ correct, total, onClose }) {
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
      <h3 style={{ fontSize: 18, marginBottom: 8 }}>Übung fertig!</h3>
      <p style={{ color: C.textMuted, marginBottom: 16 }}>
        {correct != null ? `${correct} / ${total} richtig · +${correct * XP_PER_CARD} XP` : 'Gut gemacht!'}
      </p>
      <Btn onClick={onClose}>Fertig</Btn>
    </div>
  )
}

// Tippen: Kana ansehen, Lesung (Romaji) per Tastatur eingeben.
function TypeQuiz({ onClose }) {
  const { progress, awardXp, settings } = useContext(ProgressCtx)
  const learned = completedKanaList(progress.completedLessons || [])
  const [rounds] = useState(() => shuffled(learned).slice(0, settings.roundSize))
  const [idx, setIdx] = useState(0)
  const [val, setVal] = useState('')
  const [res, setRes] = useState(null)
  const [correct, setCorrect] = useState(0)
  const inputRef = useRef(null)
  useEffect(() => { inputRef.current?.focus() }, [idx])

  if (learned.length < 1) return <UebenEmpty onClose={onClose} text="Lerne zuerst ein paar Kana – dann kannst du sie hier tippen." />
  if (idx >= rounds.length) return <UebenDone correct={correct} total={rounds.length} onClose={onClose} />

  const cur = rounds[idx]
  const answer = KANA_DATA[cur]?.romaji
  const revealed = res != null
  const check = () => { if (!val.trim()) return; const ok = val.trim().toLowerCase() === answer; setRes(ok); if (ok) { awardXp(XP_PER_CARD); setCorrect(c => c + 1) } }
  const next = () => { setVal(''); setRes(null); setIdx(i => i + 1) }

  return (
    <div style={{ padding: 20 }}>
      <UebenHead title="Tippen" idx={idx} total={rounds.length} onClose={onClose} />
      <Card style={{ textAlign: 'center', minHeight: 140, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 80, fontFamily: JP, marginBottom: 6 }}>{cur}</div>
        <button onClick={() => speak(cur)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>🔊</button>
      </Card>
      <input ref={inputRef} value={val} onChange={e => setVal(e.target.value)} disabled={revealed}
        onKeyDown={e => { if (e.key === 'Enter') (revealed ? next() : check()) }}
        placeholder="Lesung tippen (z. B. ka)" autoCapitalize="none" autoCorrect="off"
        style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: 18, borderRadius: 10, textAlign: 'center', border: `2px solid ${revealed ? (res ? C.matcha : C.shu) : C.washiDark}` }} />
      {revealed && (
        <p style={{ textAlign: 'center', marginTop: 12, color: res ? C.matcha : C.shu, fontWeight: 600 }}>
          {res ? '✓ Richtig!' : `✗ Richtig: ${answer}`}
        </p>
      )}
      <Btn onClick={revealed ? next : check} style={{ width: '100%', marginTop: 12 }}>
        {revealed ? (idx === rounds.length - 1 ? 'Fertig →' : 'Weiter →') : 'Prüfen'}
      </Btn>
    </div>
  )
}

// Satzbau: Satz aus Wort-Kacheln bauen (aus gelernten Grammatik-Beispielen).
function SentenceQuiz({ onClose }) {
  const { progress } = useContext(ProgressCtx)
  const done = progress.completedGrammar || []
  const [rounds] = useState(() => {
    const ex = GRAMMAR.filter(g => done.includes(g.id)).flatMap(g => g.examples)
    return shuffled(ex).slice(0, 6).map(e => {
      const ans = e.tokens.map(t => t.t).filter(t => t !== '。' && t !== '！')
      return { prompt: `Bilde: „${e.de}"`, tiles: ans, answer: ans, tr: e.de }
    })
  })
  const [idx, setIdx] = useState(0)
  const [solved, setSolved] = useState(false)

  if (rounds.length === 0) return <UebenEmpty onClose={onClose} text="Lerne zuerst Grammatik – dann kannst du hier Sätze bauen." />
  if (idx >= rounds.length) return <UebenDone total={rounds.length} onClose={onClose} />
  const last = idx === rounds.length - 1

  return (
    <div style={{ padding: 20 }}>
      <UebenHead title="Satzbau" idx={idx} total={rounds.length} onClose={onClose} />
      <BuildStep key={idx} step={rounds[idx]} onSolved={() => setSolved(true)} />
      {solved && <Btn onClick={() => { setSolved(false); setIdx(i => i + 1) }} style={{ width: '100%', marginTop: 14 }}>{last ? 'Fertig →' : 'Weiter →'}</Btn>}
    </div>
  )
}

// ─── Gemischte Wiederholung ──────────────────────────────────────────────────
// Verschränkt mehrere Übungsformen in einer Session (Interleaving fördert das
// Lernen mehr als „Blocken" einer Form). Pro Aufgabe wechselt zufällig das
// Format aus dem, was du schon gelernt hast.
const MIX_LABEL = {
  erkennen: '👁 Erkennen', hoeren: '👂 Hören', tippen: '⌨️ Tippen',
  karte: '🗂 Karteikarte', satzbau: '🧩 Satzbau',
}

function buildMixTasks({ kana, learnedAll, sentencePool, settings }) {
  const types = []
  if (kana.length >= 2) types.push('erkennen', 'hoeren')
  if (kana.length >= 1) types.push('tippen')
  if (learnedAll.length >= 1) types.push('karte')
  if (sentencePool.length >= 1) types.push('satzbau')
  if (!types.length) return []

  const rand = arr => arr[Math.floor(Math.random() * arr.length)]
  const mkOptions = (ch) => {
    const n = Math.min(settings.options - 1, kana.length - 1)
    return shuffled([ch, ...shuffled(kana.filter(k => k !== ch)).slice(0, n)])
  }
  const out = []
  for (let i = 0; i < settings.roundSize; i++) {
    const type = rand(types)
    if (type === 'erkennen' || type === 'hoeren') {
      const ch = rand(kana); out.push({ type, char: ch, options: mkOptions(ch) })
    } else if (type === 'tippen') {
      out.push({ type, char: rand(kana) })
    } else if (type === 'karte') {
      out.push({ type, item: rand(learnedAll) })
    } else {
      const e = rand(sentencePool)
      const ans = e.tokens.map(t => t.t).filter(t => t !== '。' && t !== '！')
      out.push({ type, step: { prompt: `Bilde: „${e.de}"`, tiles: ans, answer: ans, tr: e.de } })
    }
  }
  return out
}

function MixQuiz({ onClose }) {
  const { progress, reviewCard, settings } = useContext(ProgressCtx)
  const kana = completedKanaList(progress.completedLessons || [])
  const learnedAll = [...kana, ...learnedWordKanji(progress.completedWordBlocks || [])]
  const sentencePool = GRAMMAR.filter(g => (progress.completedGrammar || []).includes(g.id)).flatMap(g => g.examples)

  const [tasks] = useState(() => buildMixTasks({ kana, learnedAll, sentencePool, settings }))
  // Nur WIRKLICH fällige Karten verschieben den Wiederholungsplan (wie bei „Fleiß").
  const [dueSet, setDueSet] = useState(() => new Set(dueKana(progress, learnedAll)))
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)

  if (tasks.length === 0) {
    return <UebenEmpty onClose={onClose} text="Lerne erst ein paar Kana, Wörter oder Grammatik – dann mischt die Wiederholung daraus." />
  }
  if (idx >= tasks.length) {
    return <UebenDone correct={score} total={tasks.length} onClose={onClose} />
  }

  const cardReview = (item, q) => {
    if (dueSet.has(item)) {
      reviewCard(item, q)
      setDueSet(prev => { const n = new Set(prev); n.delete(item); return n })
    }
  }
  const next = (ok) => { if (ok) setScore(s => s + 1); setIdx(i => i + 1) }

  return (
    <div style={{ padding: 20 }}>
      <UebenHead title="Gemischt" idx={idx} total={tasks.length} onClose={onClose} />
      <MixStep key={idx} task={tasks[idx]} cardReview={cardReview} onNext={next} />
    </div>
  )
}

// Eine einzelne Aufgabe der gemischten Wiederholung – Rendering je nach Format.
function MixStep({ task, cardReview, onNext }) {
  const { awardXp } = useContext(ProgressCtx)
  const [answer, setAnswer] = useState(null)   // Multiple-Choice
  const [val, setVal] = useState('')           // Tippen-Eingabe
  const [typed, setTyped] = useState(null)      // Tippen-Ergebnis
  const [flipped, setFlipped] = useState(false) // Karteikarte aufgedeckt
  const [built, setBuilt] = useState(null)       // Satzbau-Ergebnis
  const inputRef = useRef(null)

  useEffect(() => {
    if (task.type === 'hoeren') speak(task.char)
    else if (task.type === 'karte') speakItem(task.item)
    if (task.type === 'tippen') inputRef.current?.focus()
  }, []) // eslint-disable-line

  const chip = (
    <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.3, marginBottom: 8 }}>
      {MIX_LABEL[task.type]}
    </div>
  )

  // ── Multiple-Choice: Erkennen / Hören ──
  if (task.type === 'erkennen' || task.type === 'hoeren') {
    const revealed = answer !== null
    const choose = (opt) => { if (revealed) return; setAnswer(opt); if (opt === task.char) awardXp(XP_PER_CARD) }
    return (
      <>
        {chip}
        <Card style={{ textAlign: 'center', minHeight: 140, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 16 }}>
          {task.type === 'erkennen' ? (
            <>
              <div style={{ fontSize: 80, fontFamily: JP, marginBottom: 4 }}>{task.char}</div>
              <div style={{ fontSize: 13, color: C.textMuted }}>Welche Lesung?</div>
            </>
          ) : (
            <>
              <button onClick={() => speak(task.char)}
                style={{ background: `${C.indigo}15`, border: `1px solid ${C.indigo}40`, borderRadius: 40, width: 80, height: 80, fontSize: 36, cursor: 'pointer', margin: '0 auto 8px' }}>🔊</button>
              <div style={{ fontSize: 13, color: C.textMuted }}>Welches Zeichen hast du gehört?</div>
            </>
          )}
        </Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {task.options.map(opt => {
            const isCorrect = opt === task.char
            const isChosen = opt === answer
            const label = task.type === 'erkennen' ? KANA_DATA[opt]?.romaji : opt
            return (
              <button key={opt} onClick={() => choose(opt)} disabled={revealed}
                style={{
                  padding: '16px 8px', borderRadius: 8, border: '2px solid',
                  borderColor: !revealed ? C.washiDark : isCorrect ? C.matcha : isChosen ? C.shu : C.washiDark,
                  background: !revealed ? '#fff' : isCorrect ? `${C.matcha}20` : isChosen ? `${C.shu}20` : '#fff',
                  fontSize: task.type === 'erkennen' ? 18 : 28,
                  fontFamily: task.type === 'erkennen' ? 'inherit' : JP,
                  fontWeight: 600, color: C.sumi, cursor: revealed ? 'default' : 'pointer',
                }}>{label}</button>
            )
          })}
        </div>
        {revealed && (
          <>
            <p style={{ textAlign: 'center', marginTop: 12, color: answer === task.char ? C.matcha : C.shu, fontWeight: 600 }}>
              {answer === task.char ? '✓ Richtig!' : `✗ Richtig: ${task.char} (${KANA_DATA[task.char]?.romaji})`}
            </p>
            <Btn onClick={() => onNext(answer === task.char)} style={{ width: '100%', marginTop: 12 }}>Weiter →</Btn>
          </>
        )}
      </>
    )
  }

  // ── Tippen ──
  if (task.type === 'tippen') {
    const ans = KANA_DATA[task.char]?.romaji
    const revealed = typed !== null
    const check = () => { if (!val.trim()) return; const ok = val.trim().toLowerCase() === ans; setTyped(ok); if (ok) awardXp(XP_PER_CARD) }
    return (
      <>
        {chip}
        <Card style={{ textAlign: 'center', minHeight: 140, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 80, fontFamily: JP, marginBottom: 6 }}>{task.char}</div>
          <button onClick={() => speak(task.char)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>🔊</button>
        </Card>
        <input ref={inputRef} value={val} onChange={e => setVal(e.target.value)} disabled={revealed}
          onKeyDown={e => { if (e.key === 'Enter') (revealed ? onNext(typed) : check()) }}
          placeholder="Lesung tippen (z. B. ka)" autoCapitalize="none" autoCorrect="off"
          style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: 18, borderRadius: 10, textAlign: 'center', border: `2px solid ${revealed ? (typed ? C.matcha : C.shu) : C.washiDark}` }} />
        {revealed && (
          <p style={{ textAlign: 'center', marginTop: 12, color: typed ? C.matcha : C.shu, fontWeight: 600 }}>
            {typed ? '✓ Richtig!' : `✗ Richtig: ${ans}`}
          </p>
        )}
        <Btn onClick={revealed ? () => onNext(typed) : check} style={{ width: '100%', marginTop: 12 }}>
          {revealed ? 'Weiter →' : 'Prüfen'}
        </Btn>
      </>
    )
  }

  // ── Karteikarte (Selbstbewertung wie im SRS) ──
  if (task.type === 'karte') {
    const info = srsItemInfo(task.item)
    const rate = (q) => { cardReview(task.item, q); if (q >= 3) awardXp(XP_PER_CARD); onNext(q >= 3) }
    return (
      <>
        {chip}
        <Card style={{ textAlign: 'center', minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 16, position: 'relative' }}>
          <button onClick={() => speakItem(task.item)} title="Anhören"
            style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>🔊</button>
          <div style={{ fontSize: task.item.length > 1 ? 52 : 80, fontFamily: JP, marginBottom: 12 }}>{task.item}</div>
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
          <Btn onClick={() => setFlipped(true)} style={{ width: '100%' }} variant="secondary">Aufdecken</Btn>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
            {SRS_RATINGS.map(([label, color, q]) => (
              <button key={label} onClick={() => rate(q)}
                style={{ padding: '10px 4px', borderRadius: 8, border: `2px solid ${color}`, background: `${color}15`, color, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>
        )}
      </>
    )
  }

  // ── Satzbau (renutzt BuildStep) ──
  return (
    <>
      {chip}
      <BuildStep step={task.step} onSolved={(ok) => setBuilt(!!ok)} />
      {built !== null && <Btn onClick={() => onNext(built)} style={{ width: '100%', marginTop: 14 }}>Weiter →</Btn>}
    </>
  )
}

// ─── Gesprächspfad (Rollenspiel als Lernpfad) ────────────────────────────────
// Didaktik (aus der Recherche zu wirksamem Sprachenlernen):
//  • Aufgabenorientiert (TBLT): jede Szene hat ein echtes Reiseziel.
//  • Kontext zuerst: eine Intro-Karte aktiviert das Situations-Schema (comprehensible input).
//  • Abruf ohne L1-Krücke: der NPC spricht Japanisch, du wählst eine japanische
//    Antwort; Deutsch erscheint nur im Feedback.
//  • Verblassende Hilfen: 'voll' zeigt die Übersetzung sofort + klar verschiedene
//    Antworten, 'mittel' blendet sie erst nach der Antwort ein, 'frei' ganz ohne
//    Übersetzung und mit mehr/ähnlicheren Antworten.
//  • Verschränktes Wiederholen: Wiederholungs-Knoten mischen Wechsel früherer Szenen.
//  • Hören-zuerst: die NPC-Zeile wird automatisch vorgelesen, deine Antwort beim Tippen.
//  • Gating wie die Reise: eine Szene schaltet die nächste frei.
const DIALOGS = [
  { section: '到着', sub: 'Ankunft in Japan' },
  { id: 'd1', title: 'Begrüßung', goal: 'Begrüße jemanden und stell dich vor.', emoji: 'hello', scaffold: 'voll', turns: [
    { npc: 'こんにちは！', de: 'Guten Tag!', options: ['こんにちは。', 'さようなら。', 'すみません。'], answer: 'こんにちは。' },
    { npc: 'おなまえは？', de: 'Wie heißen Sie?', options: ['クラウスです。', 'いくらですか？', 'みぎです。'], answer: 'クラウスです。' },
    { npc: 'どこから？', de: 'Woher kommen Sie?', options: ['ドイツからです。', 'たべます。', 'たかいです。'], answer: 'ドイツからです。' },
  ] },
  { id: 'd2', title: 'Mit dem Taxi', goal: 'Lass dich zum Hotel fahren.', emoji: 'taxi', scaffold: 'voll', turns: [
    { npc: 'どちらまで？', de: 'Wohin?', options: ['ホテルまで おねがいします。', 'いただきます。', 'おやすみなさい。'], answer: 'ホテルまで おねがいします。' },
    { npc: 'わかりました。', de: 'Verstanden.', options: ['ありがとうございます。', 'たすけて！', 'たかいです。'], answer: 'ありがとうございます。' },
    { npc: 'つきましたよ。', de: 'Wir sind da.', options: ['いくらですか？', 'おはよう。', 'さかなです。'], answer: 'いくらですか？' },
  ] },
  { section: 'ホテル', sub: 'Im Hotel' },
  { id: 'd3', title: 'Check-in', goal: 'Checke im Hotel ein.', emoji: 'hotel', scaffold: 'voll', turns: [
    { npc: 'いらっしゃいませ。', de: 'Willkommen.', options: ['チェックイン おねがいします。', 'メニューを ください。', 'みぎです。'], answer: 'チェックイン おねがいします。' },
    { npc: 'おなまえを どうぞ。', de: 'Ihren Namen, bitte.', options: ['クラウスです。', 'みずです。', 'やすいです。'], answer: 'クラウスです。' },
    { npc: 'パスポートを おねがいします。', de: 'Ihren Pass, bitte.', options: ['はい、どうぞ。', 'いいえ、けっこうです。', 'たべません。'], answer: 'はい、どうぞ。' },
  ] },
  { id: 'dr1', review: true, title: 'Wiederholung 1', goal: 'Gemischte Wechsel aus Ankunft & Hotel.', emoji: 'star', from: ['d1', 'd2', 'd3'] },
  { section: '食事', sub: 'Essen & Trinken' },
  { id: 'd4', title: 'Im Restaurant', goal: 'Bestelle Essen und bitte um die Rechnung.', emoji: 'food', scaffold: 'mittel', turns: [
    { npc: 'いらっしゃいませ！', de: 'Willkommen!', options: ['こんにちは。', 'さようなら。', 'いくらですか？'], answer: 'こんにちは。' },
    { npc: 'ごちゅうもんは？', de: 'Ihre Bestellung?', options: ['メニューを ください。', 'たすけて！', 'みぎです。'], answer: 'メニューを ください。' },
    { npc: 'おのみものは？', de: 'Etwas zu trinken?', options: ['おみずを ください。', 'さようなら。', 'わかりません。'], answer: 'おみずを ください。' },
    { npc: 'ありがとうございました！', de: 'Vielen Dank!', options: ['おかんじょう おねがいします。', 'こんばんは。', 'たかいです。'], answer: 'おかんじょう おねがいします。' },
  ] },
  { id: 'd5', title: 'Im Café', goal: 'Bestelle einen Kaffee.', emoji: 'coffee', scaffold: 'mittel', turns: [
    { npc: 'いらっしゃいませ。', de: 'Willkommen.', options: ['コーヒーを ください。', 'えきは どこですか？', 'たすけて！'], answer: 'コーヒーを ください。' },
    { npc: 'ホットですか、アイスですか？', de: 'Heiß oder kalt?', options: ['ホットを おねがいします。', 'みぎです。', 'さようなら。'], answer: 'ホットを おねがいします。' },
    { npc: 'いじょうで よろしいですか？', de: 'Ist das alles?', options: ['はい、けっこうです。', 'いくらですか？', 'たべません。'], answer: 'はい、けっこうです。' },
  ] },
  { id: 'dr2', review: true, title: 'Wiederholung 2', goal: 'Gemischte Wechsel aus den Essens-Szenen.', emoji: 'star', from: ['d4', 'd5'] },
  { section: '移動', sub: 'Unterwegs' },
  { id: 'd6', title: 'Nach dem Weg fragen', goal: 'Finde den Bahnhof.', emoji: 'map', scaffold: 'mittel', turns: [
    { npc: 'はい、なんでしょう？', de: 'Ja, bitte?', options: ['すみません、えきは どこですか？', 'いただきます。', 'おやすみなさい。'], answer: 'すみません、えきは どこですか？' },
    { npc: 'まっすぐ、それから みぎです。', de: 'Geradeaus, dann rechts.', options: ['ありがとうございます。', 'いくらですか？', 'たべません。'], answer: 'ありがとうございます。' },
    { npc: 'きを つけて！', de: 'Pass auf dich auf!', options: ['さようなら。', 'メニューを ください。', 'みぎです。'], answer: 'さようなら。' },
  ] },
  { id: 'd7', title: 'Zugticket kaufen', goal: 'Kaufe ein Ticket nach Tokyo.', emoji: 'train', scaffold: 'mittel', turns: [
    { npc: 'どちらまで？', de: 'Bis wohin?', options: ['とうきょうまで おねがいします。', 'コーヒーを ください。', 'たすけて！'], answer: 'とうきょうまで おねがいします。' },
    { npc: 'かたみちですか、おうふくですか？', de: 'Einfach oder hin und zurück?', options: ['かたみちで おねがいします。', 'みぎです。', 'さようなら。'], answer: 'かたみちで おねがいします。' },
    { npc: 'にせんえんです。', de: 'Das macht 2000 Yen.', options: ['はい、どうぞ。', 'わかりません。', 'たかいです。'], answer: 'はい、どうぞ。' },
  ] },
  { section: '買い物', sub: 'Einkaufen' },
  { id: 'd8', title: 'Im Laden', goal: 'Frag nach dem Preis und bezahle.', emoji: 'person', scaffold: 'frei', turns: [
    { npc: 'いらっしゃいませ。', de: 'Willkommen.', options: ['これは いくらですか？', 'えきは どこですか？', 'たすけて！', 'おやすみなさい。'], answer: 'これは いくらですか？' },
    { npc: 'せんえんです。', de: '1000 Yen.', options: ['じゃあ、これを ください。', 'メニューを ください。', 'みぎです。', 'たべません。'], answer: 'じゃあ、これを ください。' },
    { npc: 'カードで よろしいですか？', de: 'Mit Karte in Ordnung?', options: ['はい、おねがいします。', 'いいえ、けっこうです。', 'えきは どこですか？', 'さようなら。'], answer: 'はい、おねがいします。' },
    { npc: 'ありがとうございました。', de: 'Vielen Dank.', options: ['どうも。', 'いただきます。', 'たかいです。', 'わかりません。'], answer: 'どうも。' },
  ] },
  { section: '困った時', sub: 'Wenn es brenzlig wird' },
  { id: 'd9', title: 'Um Hilfe bitten', goal: 'Du hast dich verlaufen – bitte um Hilfe.', emoji: 'hand', scaffold: 'frei', turns: [
    { npc: 'だいじょうぶですか？', de: 'Geht es Ihnen gut?', options: ['みちに まよいました。', 'いただきます。', 'おいしいです。', 'こんばんは。'], answer: 'みちに まよいました。' },
    { npc: 'どうしましたか？', de: 'Was ist passiert?', options: ['ホテルが わかりません。', 'メニューを ください。', 'みぎです。', 'たべます。'], answer: 'ホテルが わかりません。' },
    { npc: 'いっしょに いきましょう。', de: 'Gehen wir zusammen.', options: ['ありがとうございます、たすかります。', 'いくらですか？', 'さようなら。', 'たかいです。'], answer: 'ありがとうございます、たすかります。' },
  ] },
]

// Verwaltet Pfad-Liste ↔ aktive Szene.
function DialogHub({ onClose }) {
  const { progress, completeDialog } = useContext(ProgressCtx)
  const done = progress.completedDialogs || []
  const [active, setActive] = useState(null)

  const steps = DIALOGS.filter(n => !n.section)
  const unlocked = (id) => { const i = steps.findIndex(s => s.id === id); return i <= 0 || done.includes(steps[i - 1].id) }

  if (active) {
    const node = DIALOGS.find(n => n.id === active)
    return <DialogPlay node={node} alreadyDone={done.includes(active)}
      onComplete={() => completeDialog(active, XP_PER_DIALOG)}
      onClose={() => setActive(null)} />
  }

  const doneCount = steps.filter(s => done.includes(s.id)).length

  return (
    <div style={{ padding: '16px 16px 24px' }}>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 10 }}>← Üben</button>
      <h2 style={{ fontSize: 20, fontFamily: JP, color: C.indigo, margin: '0 0 4px' }}>会話の道 · Gesprächspfad</h2>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
        Echte Reise-Situationen. {doneCount}/{steps.length} gemeistert – jede Szene öffnet die nächste.
      </p>
      {DIALOGS.map((n, i) => {
        if (n.section) return (
          <div key={`s${i}`} style={{ margin: '18px 0 8px' }}>
            <div style={{ fontSize: 16, fontFamily: JP, color: C.sumi }}>{n.section}</div>
            <div style={{ fontSize: 12, color: C.textMuted }}>{n.sub}</div>
          </div>
        )
        const isDone = done.includes(n.id), open = unlocked(n.id)
        return (
          <button key={n.id} onClick={() => open && setActive(n.id)} disabled={!open}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
              background: '#fff', border: `2px solid ${isDone ? `${C.matcha}55` : open ? C.washiDark : C.washiDark}`,
              borderRadius: 12, padding: '12px 14px', marginBottom: 8, opacity: open ? 1 : 0.5,
              cursor: open ? 'pointer' : 'default', boxShadow: '0 1px 3px rgba(33,31,27,0.06)' }}>
            <div style={{ position: 'relative' }}>
              <Emoji name={n.emoji} size={36} style={{ filter: open ? 'none' : 'grayscale(1)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: C.sumi }}>{n.title}{n.review && <span style={{ fontWeight: 400, fontSize: 11, color: C.textMuted }}> · Mix</span>}</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>{n.goal}</div>
            </div>
            <div style={{ fontSize: 18 }}>{isDone ? '✓' : open ? '›' : '🔒'}</div>
          </button>
        )
      })}
    </div>
  )
}

// Spielt eine Gesprächs-Szene: Kontext-Intro → Wechsel mit verblassenden Hilfen.
function DialogPlay({ node, alreadyDone, onComplete, onClose }) {
  const { awardXp } = useContext(ProgressCtx)
  const [turns] = useState(() => {
    if (node.review) {
      const pool = node.from.flatMap(id => DIALOGS.find(d => d.id === id)?.turns || [])
      return shuffled(pool).slice(0, 5)
    }
    return node.turns
  })
  const scaffold = node.review ? 'mittel' : node.scaffold
  const [phase, setPhase] = useState('intro')
  const [turn, setTurn] = useState(0)
  const [ans, setAns] = useState(null)
  const [score, setScore] = useState(0)

  useEffect(() => { if (phase === 'done' && !alreadyDone) onComplete() }, [phase])
  // NPC-Zeile beim Erscheinen vorlesen (Hören-zuerst).
  useEffect(() => { if (phase === 'play') speak(turns[turn]?.npc) }, [phase, turn])

  if (phase === 'intro') {
    return (
      <div style={{ padding: 20 }}>
        <UebenHead title={node.title} idx={0} total={turns.length} onClose={onClose} />
        <Card style={{ textAlign: 'center', padding: '24px 18px' }}>
          <Emoji name={node.emoji} size={64} />
          <p style={{ fontSize: 13, color: C.textMuted, margin: '14px 0 2px', letterSpacing: 1 }}>SITUATION</p>
          <p style={{ fontWeight: 600, fontSize: 17, color: C.sumi, margin: 0 }}>{node.goal}</p>
        </Card>
        <Btn onClick={() => setPhase('play')} style={{ width: '100%', marginTop: 16 }}>Los geht's →</Btn>
      </div>
    )
  }
  if (phase === 'done') {
    return (
      <div style={{ padding: 20 }}>
        <UebenHead title={node.title} idx={turns.length} total={turns.length} onClose={onClose} />
        <Card style={{ textAlign: 'center', padding: '28px 18px' }}>
          <div style={{ fontSize: 44 }}>🎉</div>
          <p style={{ fontWeight: 600, fontSize: 18, color: C.sumi, margin: '8px 0 2px' }}>Szene gemeistert!</p>
          <p style={{ color: C.textMuted, fontSize: 14 }}>
            {score} / {turns.length} passend{!alreadyDone && ` · +${XP_PER_DIALOG} XP`}
          </p>
        </Card>
        <Btn onClick={onClose} style={{ width: '100%', marginTop: 16 }}>Zurück zum Pfad →</Btn>
      </div>
    )
  }

  const t = turns[turn]
  const revealed = ans != null
  const showDe = scaffold === 'voll' || revealed
  const choose = (o) => { if (revealed) return; setAns(o); speak(o); if (o === t.answer) { awardXp(XP_PER_CARD); setScore(s => s + 1) } }
  const next = () => { if (turn === turns.length - 1) { setPhase('done'); return } setAns(null); setTurn(x => x + 1) }

  return (
    <div style={{ padding: 20 }}>
      <UebenHead title={node.title} idx={turn} total={turns.length} onClose={onClose} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
        <Emoji name={node.emoji} size={48} />
        <div style={{ background: '#fff', border: `1px solid ${C.washiDark}`, borderRadius: 12, padding: '10px 14px', flex: 1 }}>
          <div style={{ fontSize: 19, fontFamily: JP, color: C.sumi }}>{t.npc}</div>
          {showDe && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>„{t.de}"</div>}
          <button onClick={() => speak(t.npc)} style={{ background: 'none', border: 'none', fontSize: 13, cursor: 'pointer', padding: '2px 0 0', color: C.textMuted }}>🔊 nochmal hören</button>
        </div>
      </div>
      <p style={{ fontWeight: 500, marginBottom: 12 }}>Was antwortest du?</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
        {t.options.map(o => {
          const correct = o === t.answer, chosen = o === ans
          return (
            <button key={o} onClick={() => choose(o)} disabled={revealed}
              style={{ padding: '12px 14px', borderRadius: 10, border: `2px solid ${!revealed ? C.washiDark : correct ? C.matcha : chosen ? C.shu : C.washiDark}`,
                background: !revealed ? '#fff' : correct ? `${C.matcha}20` : chosen ? `${C.shu}20` : '#fff',
                fontSize: 17, fontFamily: JP, color: C.sumi, cursor: revealed ? 'default' : 'pointer', textAlign: 'left' }}>{o}</button>
          )
        })}
      </div>
      {revealed && (
        <>
          <p style={{ marginTop: 12, fontWeight: 600, color: ans === t.answer ? C.matcha : C.shu }}>
            {ans === t.answer ? '✓ Gute Antwort!' : '✗ Passt nicht ganz'}
            <span style={{ display: 'block', fontWeight: 400, fontSize: 13, color: C.textMuted, marginTop: 2 }}>NPC: „{t.de}"</span>
          </p>
          <Btn onClick={next} style={{ width: '100%', marginTop: 12 }}>{turn === turns.length - 1 ? 'Fertig →' : 'Weiter →'}</Btn>
        </>
      )}
    </div>
  )
}

function UebenScreen({ initialMode, onConsumeInitial }) {
  const { progress } = useContext(ProgressCtx)
  const [mode, setMode] = useState(initialMode || null)
  // einmaligen Deep-Link (z. B. „Wiederholen" aus Reise/Fortschritt) verbrauchen
  useEffect(() => { if (initialMode) onConsumeInitial?.() }, [])

  if (mode === 'mix') return <MixQuiz onClose={() => setMode(null)} />
  if (mode === 'srs') return <SRSQuiz onClose={() => setMode(null)} />
  if (mode === 'fleiss') return <SRSQuiz initialMode="free" onClose={() => setMode(null)} />
  if (mode === 'erkennen' || mode === 'hoeren') return <PracticeQuiz mode={mode} onClose={() => setMode(null)} />
  if (mode === 'tippen') return <TypeQuiz onClose={() => setMode(null)} />
  if (mode === 'satzbau') return <SentenceQuiz onClose={() => setMode(null)} />
  if (mode === 'konversation') return <DialogHub onClose={() => setMode(null)} />

  const learnedAll = [...completedKanaList(progress.completedLessons || []), ...learnedWordKanji(progress.completedWordBlocks || [])]
  const dueCount = dueKana(progress, learnedAll).length
  const dialogsDone = (progress.completedDialogs || []).length
  const exercises = [
    { id: 'mix', icon: '🎲', title: 'Gemischte Wiederholung', sub: 'Alle Übungsarten bunt gemischt', color: C.indigo },
    { id: 'srs', icon: '🗂', title: 'SRS-Wiederholungen', sub: dueCount > 0 ? `${dueCount} Karten fällig` : 'Nichts fällig', color: C.shu },
    { id: 'fleiss', icon: '🔥', title: 'Fleiß-Übung', sub: 'Alle Karten, jederzeit', color: '#C2410C' },
    { id: 'erkennen', icon: '👁', title: 'Erkennen', sub: 'Zeichen → Lesung', color: C.indigo },
    { id: 'hoeren', icon: '👂', title: 'Hören', sub: 'Was hast du gehört?', color: C.matcha },
    { id: 'tippen', icon: '⌨️', title: 'Tippen', sub: 'Kana per Tastatur', color: '#8B6914' },
    { id: 'satzbau', icon: '🧩', title: 'Satzbau', sub: 'Wörter sortieren', color: '#7B3FA0' },
    { id: 'konversation', icon: '💬', title: 'Rollenspiel', sub: `Gesprächspfad · ${dialogsDone}/${DIALOGS.filter(n => !n.section).length}`, color: '#1A7A6E' },
  ]

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <h2 style={{ fontSize: 20, fontFamily: JP, color: C.indigo, marginBottom: 4 }}>
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

// XP gebündelt nach Zeitraum (Woche = 7 Tage, Monat = 4 Wochen, Jahr = 12 Monate).
function periodBuckets(xpByDate, period) {
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const out = []
  if (period === 'woche') {
    const names = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
    for (let o = -6; o <= 0; o++) { const d = new Date(); d.setDate(d.getDate() + o); out.push({ label: names[d.getDay()], xp: xpByDate[fmt(d)] || 0 }) }
  } else if (period === 'monat') {
    for (let w = 3; w >= 0; w--) {
      let sum = 0
      for (let day = 0; day < 7; day++) { const d = new Date(); d.setDate(d.getDate() - (w * 7 + day)); sum += xpByDate[fmt(d)] || 0 }
      const s = new Date(); s.setDate(s.getDate() - (w * 7 + 6))
      out.push({ label: `${s.getDate()}.${s.getMonth() + 1}.`, xp: sum })
    }
  } else {
    const mn = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
    const sums = {}
    Object.keys(xpByDate).forEach(k => { const p = k.slice(0, 7); sums[p] = (sums[p] || 0) + (xpByDate[k] || 0) })
    for (let m = 11; m >= 0; m--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - m); out.push({ label: mn[d.getMonth()], xp: sums[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] || 0 }) }
  }
  return out
}

// Vokabel-Kenntnisstufen nach SRS-Intervall (Tage). Grenzen aus SRS_STAGE_BOUNDS,
// damit Anzeige und Rückstufungs-Logik (sm2) nicht auseinanderlaufen.
const SRS_STAGES = [
  { label: 'Neu', color: '#B3AA92', test: e => (e.interval || 0) < SRS_STAGE_BOUNDS[0] },
  { label: 'Lernphase', color: '#DA4A38', test: e => e.interval >= SRS_STAGE_BOUNDS[0] && e.interval < SRS_STAGE_BOUNDS[1] },
  { label: 'Vertraut', color: '#E8A020', test: e => e.interval >= SRS_STAGE_BOUNDS[1] && e.interval < SRS_STAGE_BOUNDS[2] },
  { label: 'Gefestigt', color: '#5E8A6A', test: e => e.interval >= SRS_STAGE_BOUNDS[2] && e.interval < SRS_STAGE_BOUNDS[3] },
  { label: 'Gemeistert', color: '#1E4368', test: e => e.interval >= SRS_STAGE_BOUNDS[3] },
]

function FortschrittScreen({ onReview }) {
  const { progress, reset } = useContext(ProgressCtx)
  const [period, setPeriod] = useState('woche')
  const stats = computeStats(progress)
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0

  const completed = progress.completedLessons || []
  const kanaDone = completedKanaCount(completed)
  const kanaTotal = totalKanaCount()
  const wordsLearned = learnedWordKanji(progress.completedWordBlocks || []).length
  const grammarDone = (progress.completedGrammar || []).length
  const chaptersDone = (progress.completedChapters || []).length

  // XP-zum-nächsten-Level (1000 XP pro Level).
  const xpInLevel = stats.totalXp % 1000
  const xpToNext = 1000 - xpInLevel

  // Zeitraum-Chart.
  const buckets = periodBuckets(progress.xpByDate || {}, period)
  const periodTotal = buckets.reduce((a, b) => a + b.xp, 0)
  const maxXP = Math.max(1, ...buckets.map(b => b.xp))

  // Vokabeln nach Kenntnisstand.
  const srsVals = Object.values(progress.srs || {})
  const stageCounts = SRS_STAGES.map(s => ({ ...s, n: srsVals.filter(s.test).length }))
  const vocabTotal = srsVals.length
  const due = dueKana(progress, [...completedKanaList(completed), ...learnedWordKanji(progress.completedWordBlocks || [])]).length

  // Fertigkeiten mit Aufschlüsselung (so kommt der Prozentwert zustande).
  const skills = [
    { label: 'Lesen (Kana)', value: pct(kanaDone, kanaTotal), detail: `${kanaDone} / ${kanaTotal} Zeichen gelernt`, color: C.shu },
    { label: 'Wortschatz', value: pct(wordsLearned, ALL_WORDS.length), detail: `${wordsLearned} / ${ALL_WORDS.length} Wörter gelernt`, color: '#8B6914' },
    { label: 'Grammatik', value: pct(grammarDone, GRAMMAR.length), detail: `${grammarDone} / ${GRAMMAR.length} Themen verstanden`, color: '#7B3FA0' },
    { label: 'Geschichte', value: pct(chaptersDone, CHAPTERS.length), detail: `${chaptersDone} / ${CHAPTERS.length} Kapitel erlebt`, color: C.matcha },
  ]

  const hiraDone = LESSONS.filter(l => l.script === 'Hiragana').every(l => completed.includes(l.id))
  const kataDone = LESSONS.filter(l => l.script === 'Katakana').every(l => completed.includes(l.id))
  const achievements = [
    { icon: '✍️', label: 'Erste Lektion', sub: 'Die Reise beginnt', earned: completed.length >= 1 },
    { icon: '🔥', label: '3-Tage-Streak', sub: 'Drei Tage in Folge', earned: stats.streak >= 3 },
    { icon: '🔥', label: '7-Tage-Streak', sub: 'Eine ganze Woche dran', earned: stats.streak >= 7 },
    { icon: '🈂️', label: 'Alle Hiragana', sub: '46 Hiragana gelernt', earned: hiraDone },
    { icon: '🈁', label: 'Alle Katakana', sub: '46 Katakana gelernt', earned: kataDone },
    { icon: '🗣️', label: 'Erste Wörter', sub: 'Ersten Wort-Block geschafft', earned: (progress.completedWordBlocks || []).length >= 1 },
    { icon: '📐', label: 'Grammatik-Start', sub: 'Erstes Thema verstanden', earned: grammarDone >= 1 },
    { icon: '📖', label: 'Erstes Kapitel', sub: 'Erste Episode erlebt', earned: chaptersDone >= 1 },
    { icon: '🎓', label: 'Vokabel gemeistert', sub: 'Ein Wort fest im Kopf', earned: stageCounts[4].n >= 1 },
    { icon: '⭐', label: 'Level 5', sub: '5000 XP gesammelt', earned: stats.level >= 5 },
    { icon: '🗻', label: 'Gipfel erreicht', sub: 'Alle Kapitel abgeschlossen', earned: chaptersDone >= CHAPTERS.length },
  ]
  const earnedCount = achievements.filter(a => a.earned).length

  const handleReset = () => {
    if (window.confirm('Wirklich den gesamten Fortschritt auf 0 zurücksetzen? Das kann nicht rückgängig gemacht werden.')) reset()
  }

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <h2 style={{ fontSize: 20, fontFamily: JP, color: C.indigo, marginBottom: 16 }}>
        Fortschritt
      </h2>

      {/* Gesamt-XP / Level / Streak */}
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

      {/* XP bis zum nächsten Level */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textMuted, marginBottom: 6 }}>
          <span style={{ fontWeight: 600, letterSpacing: 1 }}>LEVEL {stats.level} → {stats.level + 1}</span>
          <span>{xpInLevel} / 1000 XP</span>
        </div>
        <div style={{ height: 10, background: C.washiDark, borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${xpInLevel / 10}%`, background: C.indigo, borderRadius: 5, transition: 'width 0.3s' }} />
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>Noch <strong style={{ color: C.sumi }}>{xpToNext} XP</strong> bis Level {stats.level + 1}</div>
      </Card>

      {/* XP-Chart mit Zeitraum-Auswahl */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: 1 }}>XP-VERLAUF</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {[['woche', 'Woche'], ['monat', 'Monat'], ['jahr', 'Jahr']].map(([id, label]) => (
              <button key={id} onClick={() => setPeriod(id)}
                style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: 'none', background: period === id ? C.shu : C.washiDark, color: period === id ? '#fff' : C.textMuted }}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: period === 'jahr' ? 3 : 6, alignItems: 'flex-end', height: 80 }}>
          {buckets.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', background: d.xp > 0 ? C.shu : C.washiDark, borderRadius: '3px 3px 0 0', height: `${Math.round(d.xp / maxXP * 60)}px`, minHeight: d.xp > 0 ? 4 : 2 }} />
              <span style={{ fontSize: period === 'jahr' ? 8 : 10, color: C.textMuted }}>{d.label}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: C.textMuted }}>
          Summe ({period === 'woche' ? 'Woche' : period === 'monat' ? '4 Wochen' : 'Jahr'}): <strong style={{ color: C.sumi }}>{periodTotal} XP</strong>
        </div>
      </Card>

      {/* Vokabeln nach Kenntnisstand */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12, fontWeight: 600, letterSpacing: 1 }}>
          VOKABELN NACH KENNTNISSTAND · {vocabTotal} gesamt
        </div>
        {vocabTotal === 0 ? (
          <p style={{ fontSize: 13, color: C.textMuted }}>Noch keine Vokabeln im Wiederholungsplan. Lerne Kana und Wörter auf der Reise.</p>
        ) : (
          <>
            <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
              {stageCounts.map(s => s.n > 0 && <div key={s.label} style={{ width: `${s.n / vocabTotal * 100}%`, background: s.color }} />)}
            </div>
            {stageCounts.map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, flex: 1 }}>{s.label}</span>
                <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 600 }}>{s.n}</span>
              </div>
            ))}
            <button onClick={onReview} style={{
              width: '100%', marginTop: 10, padding: '10px 0', borderRadius: 8,
              border: `1px solid ${due > 0 ? C.shu : C.washiDark}`,
              background: due > 0 ? `${C.shu}12` : '#fff',
              color: due > 0 ? C.shu : C.indigo, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              {due > 0 ? `${due} fällig – jetzt wiederholen →` : 'Wiederholung öffnen →'}
            </button>
          </>
        )}
      </Card>

      {/* Fertigkeiten mit Aufschlüsselung */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12, fontWeight: 600, letterSpacing: 1 }}>
          FERTIGKEITEN
        </div>
        {skills.map(s => (
          <div key={s.label} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</span>
              <span style={{ fontSize: 12, color: C.textMuted }}>{s.value}%</span>
            </div>
            <div style={{ height: 6, background: C.washiDark, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${s.value}%`, background: s.color, borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{s.detail}</div>
          </div>
        ))}
      </Card>

      {/* Errungenschaften */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12, fontWeight: 600, letterSpacing: 1 }}>
          ERRUNGENSCHAFTEN · {earnedCount}/{achievements.length}
        </div>
        {achievements.map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '9px 0', borderBottom: i < achievements.length - 1 ? `1px solid ${C.washiDark}` : 'none', opacity: a.earned ? 1 : 0.45 }}>
            <div style={{ fontSize: 22, filter: a.earned ? 'none' : 'grayscale(1)' }}>{a.earned ? a.icon : '🔒'}</div>
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
          style={{ background: 'none', border: `1px solid ${C.washiDark}`, borderRadius: 8, padding: '8px 16px', fontSize: 12, color: C.textMuted, cursor: 'pointer' }}>
          Fortschritt zurücksetzen
        </button>
      </div>
    </div>
  )
}

// Furigana-Rendering: „漢字(かんじ)" → <ruby>漢字<rt>かんじ</rt></ruby>.
function renderFuri(s) {
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
function furiPlain(s) { return s.replace(/\([^)]*\)/g, '') }

// Wort-Tokens für die Story-Sätze (antippbar → Lesung, Bedeutung, Aufbau).
// Schlüssel = der jp-Furigana-String der Story-Szene.
const STORY_TOKENS = {
  '日本(にほん)に着(つ)きました。': [
    { t: '日本', r: 'にほん', de: 'Japan', b: 'Nomen' }, { t: 'に', de: '(Richtung)', b: 'Partikel: wohin' }, { t: '着きました', r: 'つきました', de: 'ankommen', b: 'Verb, höflich · Vergangenheit (着く)' }, { t: '。' },
  ],
  '電車(でんしゃ)に乗(の)ります。': [
    { t: '電車', r: 'でんしゃ', de: 'Zug', b: 'Nomen' }, { t: 'に', de: '(Ziel)', b: 'Partikel: einsteigen in' }, { t: '乗ります', r: 'のります', de: 'einsteigen / fahren', b: 'Verb, höflich (乗る)' }, { t: '。' },
  ],
  '町(まち)を歩(ある)きます。': [
    { t: '町', r: 'まち', de: 'Stadt', b: 'Nomen' }, { t: 'を', de: '(Objekt)', b: 'Objektpartikel' }, { t: '歩きます', r: 'あるきます', de: 'gehen / laufen', b: 'Verb, höflich (歩く)' }, { t: '。' },
  ],
  'お茶(ちゃ)を飲(の)みます。': [
    { t: 'お茶', r: 'おちゃ', de: 'Tee', b: 'Nomen' }, { t: 'を', de: '(Objekt)', b: 'Objektpartikel' }, { t: '飲みます', r: 'のみます', de: 'trinken', b: 'Verb, höflich (飲む)' }, { t: '。' },
  ],
  '山(やま)が見(み)えます。': [
    { t: '山', r: 'やま', de: 'Berg', b: 'Nomen' }, { t: 'が', de: '(Subjekt)', b: 'Subjektpartikel' }, { t: '見えます', r: 'みえます', de: 'zu sehen sein', b: 'Verb, höflich (見える)' }, { t: '。' },
  ],
  'これは川(かわ)です。': [
    { t: 'これ', de: 'das / dies', b: 'Demonstrativpronomen' }, { t: 'は', r: 'wa', de: '(Thema)', b: 'Themenpartikel' }, { t: '川', r: 'かわ', de: 'Fluss', b: 'Nomen' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
  ],
  '犬(いぬ)が走(はし)ります。': [
    { t: '犬', r: 'いぬ', de: 'Hund', b: 'Nomen' }, { t: 'が', de: '(Subjekt)', b: 'Subjektpartikel' }, { t: '走ります', r: 'はしります', de: 'rennen', b: 'Verb, höflich (走る)' }, { t: '。' },
  ],
  '魚(さかな)を見(み)ます。': [
    { t: '魚', r: 'さかな', de: 'Fisch', b: 'Nomen' }, { t: 'を', de: '(Objekt)', b: 'Objektpartikel' }, { t: '見ます', r: 'みます', de: 'sehen / anschauen', b: 'Verb, höflich (見る)' }, { t: '。' },
  ],
  '山(やま)を登(のぼ)ります。': [
    { t: '山', r: 'やま', de: 'Berg', b: 'Nomen' }, { t: 'を', de: '(Objekt)', b: 'Objektpartikel' }, { t: '登ります', r: 'のぼります', de: 'besteigen / hinaufgehen', b: 'Verb, höflich (登る)' }, { t: '。' },
  ],
  '足(あし)が痛(いた)いです。': [
    { t: '足', r: 'あし', de: 'Fuß / Bein', b: 'Nomen' }, { t: 'が', de: '(Subjekt)', b: 'Subjektpartikel' }, { t: '痛い', r: 'いたい', de: 'schmerzhaft / weh', b: 'い-Adjektiv' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
  ],
  '日本(にほん)の山(やま)です。': [
    { t: '日本', r: 'にほん', de: 'Japan', b: 'Nomen' }, { t: 'の', de: 'von / -s', b: 'Verbindungspartikel (Genitiv)' }, { t: '山', r: 'やま', de: 'Berg', b: 'Nomen' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
  ],
  'おめでとうございます！旅(たび)は終(お)わりました。': [
    { t: 'おめでとうございます', de: 'Herzlichen Glückwunsch', b: 'feste Wendung' }, { t: '！' }, { t: '旅', r: 'たび', de: 'Reise', b: 'Nomen' }, { t: 'は', r: 'wa', de: '(Thema)', b: 'Themenpartikel' }, { t: '終わりました', r: 'おわりました', de: 'ist zu Ende', b: 'Verb, höflich · Vergangenheit (終わる)' }, { t: '。' },
  ],
}

// Antippbare Story-Zeile mit Furigana: Wort tippen → Lesung, Bedeutung, Aufbau.
function StoryLine({ tokens }) {
  const [active, setActive] = useState(null)
  const tk = active != null ? tokens[active] : null
  const plain = tokens.map(t => t.t).join('')
  return (
    <div>
      <div style={{ fontSize: 24, fontFamily: JP, lineHeight: 2.1, color: C.sumi }}>
        {tokens.map((t, i) => {
          const hasKanji = /[一-龯々]/.test(t.t)
          const inner = hasKanji && t.r ? <ruby>{t.t}<rt style={{ fontSize: '0.5em', color: '#6B6660', fontWeight: 400 }}>{t.r}</rt></ruby> : t.t
          if (!t.de) return <span key={i}>{inner}</span>
          const on = active === i
          return (
            <span key={i} onClick={() => setActive(on ? null : i)}
              style={{ cursor: 'pointer', borderRadius: 4, padding: '0 1px', borderBottom: `2px dotted ${on ? C.shu : `${C.indigo}66`}`, background: on ? `${C.shu}22` : 'transparent' }}>
              {inner}
            </span>
          )
        })}
        <button onClick={() => speak(plain)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, marginLeft: 6, verticalAlign: 'middle' }}>🔊</button>
      </div>
      {tk ? (
        <div style={{ background: `${C.indigo}10`, border: `1px solid ${C.indigo}30`, borderRadius: 8, padding: 10, marginTop: 10, textAlign: 'left', maxWidth: 300, margin: '10px auto 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 22, fontFamily: JP, color: C.sumi }}>{tk.t}</span>
            {tk.r && <span style={{ fontSize: 13, color: C.textMuted }}>{tk.r}</span>}
          </div>
          <div style={{ fontSize: 15, color: C.indigo, fontWeight: 600 }}>{tk.de}</div>
          {tk.b && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Aufbau: {tk.b}</div>}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: C.textMuted, fontStyle: 'italic', marginTop: 8 }}>💡 Tippe ein Wort für Bedeutung & Aufbau</div>
      )}
    </div>
  )
}

// ─── Geschichts-Kapitel (eine Episode pro Welt) ──────────────────────────────
// Jede Episode führt zuerst die NEUEN Wörter ein (intro: Bild+Schrift+Audio,
// Deutsch nur einmal) und übt sie dann per ABRUF OHNE deutsche Krücke. Step-Typen:
//   story      – Erzählbeat (Text + Bild)        intro      – neues Wort lernen
//   pic        – Bild → Schrift wählen           pic_choice – Schrift → Bild wählen
//   audio      – Audio → Schrift wählen          trace      – Zeichen nachzeichnen
//   sign       – Schild → Bedeutung (Lesen)      dialog     – Figur antworten
//   gap        – Partikel-Lücke füllen           tf         – wahr/falsch · build – Satz bauen
// Deutsch erscheint bei pic/audio/pic_choice ERST im Feedback (Feld `de`).
const CHAPTERS = [
  { id: 'c1', title: 'Ankunft in Japan', steps: [
    { kind: 'story', emoji: 'airplane', text: 'Dein Flugzeug landet in Japan. Du atmest tief durch – die Reise beginnt.' },
    { kind: 'intro', emoji: 'airplane', jp: '飛行機', reading: 'ひこうき', de: 'Flugzeug' },
    { kind: 'intro', emoji: 'station', jp: '駅', reading: 'えき', de: 'Bahnhof' },
    { kind: 'intro', emoji: 'train', jp: '電車', reading: 'でんしゃ', de: 'Zug' },
    { kind: 'pic', emoji: 'airplane', options: ['飛行機', '駅', '電車'], answer: '飛行機', de: 'Flugzeug' },
    { kind: 'audio', say: 'でんしゃ', options: ['電車', '駅', '飛行機'], answer: '電車', de: 'Zug' },
    { kind: 'pic_choice', jp: '駅', options: ['station', 'airplane', 'train'], answer: 'station', de: 'Bahnhof' },
    { kind: 'dialog', emoji: 'oldwoman', line: 'こんにちは。', prompt: 'Eine alte Frau grüßt dich. Was antwortest du?', options: ['こんにちは。', 'さようなら。', 'ありがとう。'], answer: 'こんにちは。', tr: 'Hallo / Guten Tag.' },
    { kind: 'story', emoji: 'train', text: 'Du findest den richtigen Zug. Deine Reise rollt los.' },
  ] },
  { id: 'c2', title: 'Durch die Stadt', steps: [
    { kind: 'story', emoji: 'city', text: 'Der Zug hält in einer kleinen Stadt. Du schlenderst durch enge Gassen voller Schilder.' },
    { kind: 'intro', emoji: 'tea', jp: 'お茶', reading: 'おちゃ', de: 'Tee' },
    { kind: 'intro', emoji: 'mountain', jp: '山', reading: 'やま', de: 'Berg' },
    { kind: 'pic', emoji: 'tea', options: ['お茶', '山', '空'], answer: 'お茶', de: 'Tee' },
    { kind: 'pic_choice', jp: '山', options: ['mountain', 'wave', 'city'], answer: 'mountain', de: 'Berg' },
    { kind: 'trace', char: '山', reading: 'やま', de: 'Berg' },
    { kind: 'dialog', emoji: 'person', line: 'いらっしゃいませ！', prompt: 'Der Händler begrüßt dich. Du möchtest Tee. Was sagst du?', options: ['お茶、おねがいします。', 'さようなら。', 'こんばんは。'], answer: 'お茶、おねがいします。', tr: 'Tee, bitte.' },
    { kind: 'story', emoji: 'tea', text: 'Mit einer Tasse Tee verlässt du die Stadt. Vor dir: grüne Hügel.' },
  ] },
  { id: 'c3', title: 'In die Natur', steps: [
    { kind: 'story', emoji: 'mountain', jp: '山(やま)が見(み)えます。', text: 'Der Weg führt in die Berge. Ein Fluss glitzert im Tal.' },
    { kind: 'intro', emoji: 'river', jp: '川', reading: 'かわ', de: 'Fluss' },
    { kind: 'intro', emoji: 'sun', jp: '空', reading: 'そら', de: 'Himmel' },
    { kind: 'pic', emoji: 'river', options: ['川', '山', '空'], answer: '川', de: 'Fluss' },
    { kind: 'audio', say: 'そら', options: ['空', '川', '山'], answer: '空', de: 'Himmel' },
    { kind: 'build', prompt: 'Bilde den Satz: „Das ist ein Berg."', tiles: ['これ', 'は', '山', 'です'], answer: ['これ', 'は', '山', 'です'], tr: 'これは山です。' },
    { kind: 'gap', text: 'これ＿山です。', prompt: 'Welche Partikel markiert das Thema?', options: ['は', 'を', 'が'], answer: 'は', hint: 'は markiert das Thema.' },
    { kind: 'trace', char: '川', reading: 'かわ', de: 'Fluss' },
    { kind: 'story', emoji: 'river', jp: 'これは川(かわ)です。', text: 'Das ist ein Fluss. Du benennst, was du siehst.' },
  ] },
  { id: 'c4', title: 'Begegnungen', steps: [
    { kind: 'story', emoji: 'dog', jp: '犬(いぬ)が走(はし)ります。', text: 'Tiere überall – und neue, kantige Zeichen: Katakana.' },
    { kind: 'intro', emoji: 'dog', jp: '犬', reading: 'いぬ', de: 'Hund' },
    { kind: 'intro', emoji: 'fish', jp: '魚', reading: 'さかな', de: 'Fisch' },
    { kind: 'pic', emoji: 'dog', options: ['犬', '猫', '魚'], answer: '犬', de: 'Hund' },
    { kind: 'pic_choice', jp: '魚', options: ['fish', 'dog', 'cat'], answer: 'fish', de: 'Fisch' },
    { kind: 'sign', sign: 'コーヒー', prompt: 'An einem Automaten: コーヒー. Das ist…', options: ['Kaffee', 'Tee', 'Milch'], answer: 'Kaffee' },
    { kind: 'build', prompt: 'Bilde: „Der Hund rennt."', tiles: ['犬', 'が', '走ります'], answer: ['犬', 'が', '走ります'], tr: '犬が走ります。' },
    { kind: 'gap', text: '魚＿食べます。', prompt: 'Welche Partikel markiert das Objekt?', options: ['を', 'が', 'に'], answer: 'を', hint: 'を markiert das Objekt.' },
    { kind: 'story', emoji: 'fish', jp: '魚(さかな)を見(み)ます。', text: 'Am Fluss winkt dir ein Fischer zu.' },
  ] },
  { id: 'c5', title: 'Der Aufstieg', steps: [
    { kind: 'story', emoji: 'person', jp: '山(やま)を登(のぼ)ります。', text: 'Der Aufstieg wird hart. Du spürst jeden Muskel.' },
    { kind: 'intro', emoji: 'eye', jp: '目', reading: 'め', de: 'Auge' },
    { kind: 'intro', emoji: 'hand', jp: '手', reading: 'て', de: 'Hand' },
    { kind: 'pic', emoji: 'eye', options: ['目', '手', '耳'], answer: '目', de: 'Auge' },
    { kind: 'audio', say: 'て', options: ['手', '目', '耳'], answer: '手', de: 'Hand' },
    { kind: 'trace', char: '目', reading: 'め', de: 'Auge' },
    { kind: 'build', prompt: 'Bilde: „Ich trinke Wasser."', tiles: ['水', 'を', '飲みます'], answer: ['水', 'を', '飲みます'], tr: '水を飲みます。' },
    { kind: 'gap', text: '家＿帰ります。', prompt: 'Welche Partikel zeigt das Ziel (wohin)?', options: ['に', 'で', 'を'], answer: 'に', hint: 'に zeigt Ziel/Richtung.' },
    { kind: 'story', emoji: 'mountain', jp: '足(あし)が痛(いた)いです。', text: 'Erschöpft erreichst du eine Hütte. Morgen wartet der Gipfel.' },
  ] },
  { id: 'c6', title: 'Zum Gipfel', steps: [
    { kind: 'story', emoji: 'fuji', jp: '日本(にほん)の山(やま)です。', text: 'Der letzte Morgen. Vor dir ragt der berühmteste Berg Japans auf.' },
    { kind: 'intro', emoji: 'japan', jp: '日本', reading: 'にほん', de: 'Japan' },
    { kind: 'pic_choice', jp: '日本', options: ['japan', 'mountain', 'torii'], answer: 'japan', de: 'Japan' },
    { kind: 'build', prompt: 'Bilde: „Die Katze frisst den Fisch."', tiles: ['猫', 'が', '魚', 'を', '食べます'], answer: ['猫', 'が', '魚', 'を', '食べます'], tr: '猫が魚を食べます。' },
    { kind: 'gap', text: '星＿きれいです。', prompt: 'Welche Partikel markiert das Thema „die Sterne"?', options: ['は', 'を', 'が'], answer: 'は', hint: 'は markiert das Thema.' },
    { kind: 'dialog', emoji: 'person', line: '水を飲みますか？', prompt: 'Ein Mitwanderer fragt. Du hast Durst. Antworte höflich:', options: ['はい、飲みます。', 'いいえ、飲みません。', 'こんにちは。'], answer: 'はい、飲みます。', tr: 'Ja, ich trinke.' },
    { kind: 'tf', emoji: 'fuji', jp: '日本の山です。', prompt: 'Stimmt es zum Bild?', answer: true },
    { kind: 'story', emoji: 'party', jp: 'おめでとうございます！旅(たび)は終(お)わりました。', text: 'Du stehst auf dem Gipfel. Eine neue Reise beginnt.' },
  ] },
]
const CHAPTER_BY_ID = Object.fromEntries(CHAPTERS.map(c => [c.id, c]))

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
  { type: 'chapter', id: 'c1' },
  { world: 'ひらがな・二', sub: 'Mehr Silben' },
  { type: 'kana', id: 'h4' },
  { type: 'kana', id: 'h5' },
  { type: 'kana', id: 'h6' },
  { type: 'kana', id: 'h7' },
  { type: 'chapter', id: 'c2' },
  { world: 'ひらがな・三 & 文の基本', sub: 'Hiragana fertig · Satz-Grundgerüst' },
  { type: 'kana', id: 'h8' },
  { type: 'kana', id: 'h9' },
  { type: 'kana', id: 'h10' },
  { type: 'grammar', id: 'g2' },
  { type: 'grammar', id: 'g1' },
  { type: 'grammar', id: 'g6' },
  { type: 'grammar', id: 'g3' },
  { type: 'grammar', id: 'g4' },
  { type: 'word', id: 'wb1' },
  { type: 'chapter', id: 'c3' },
  { world: 'カタカナ・一', sub: 'Die zweite Schrift' },
  { type: 'kana', id: 'k1' },
  { type: 'kana', id: 'k2' },
  { type: 'kana', id: 'k3' },
  { type: 'kana', id: 'k4' },
  { type: 'kana', id: 'k5' },
  { type: 'grammar', id: 'g5' },
  { type: 'word', id: 'wb2' },
  { type: 'chapter', id: 'c4' },
  { world: 'カタカナ・二', sub: 'Katakana fertig' },
  { type: 'kana', id: 'k6' },
  { type: 'kana', id: 'k7' },
  { type: 'kana', id: 'k8' },
  { type: 'kana', id: 'k9' },
  { type: 'kana', id: 'k10' },
  { type: 'grammar', id: 'g7' },
  { type: 'word', id: 'wb3' },
  { type: 'chapter', id: 'c5' },
  { world: '文を作る', sub: 'Sätze bauen' },
  { type: 'word', id: 'wb4' },
  { type: 'grammar', id: 'g8' },
  { type: 'grammar', id: 'g9' },
  { type: 'grammar', id: 'g10' },
  { type: 'chapter', id: 'c6' },
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
  if (node.type === 'chapter') return (progress.completedChapters || []).includes(node.id)
  return false
}
function pathNodeMeta(node) {
  if (node.type === 'kana') { const l = LESSONS.find(x => x.id === node.id); return { face: l.kana[0], label: l.title, kind: l.script } }
  if (node.type === 'word') { const b = WORD_BLOCKS.find(x => x.id === node.id); return { face: b.words[0].kanji, label: b.title, kind: 'Wörter' } }
  if (node.type === 'grammar') { const g = GRAMMAR.find(x => x.id === node.id); return { face: g.glyph, label: g.title, kind: 'Grammatik' } }
  if (node.type === 'chapter') { const c = CHAPTER_BY_ID[node.id]; return { face: '物', label: c ? c.title : 'Geschichte', kind: 'Kapitel' } }
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
  locked: ['#E0DAC8', '#C7BFA9'],
}

// ─── Geschichts-Kapitel: Übungs-Schritte + Player ────────────────────────────

// Auswahl-Übung (deckt tap/sign/listen/dialog/gap/tf ab): Reiz + Optionen + Auflösung.
function ChoiceStep({ step, onSolved }) {
  const { awardXp } = useContext(ProgressCtx)
  const [ans, setAns] = useState(null)
  const revealed = ans != null

  // Abruf OHNE deutsche Krücke: pic (Bild→Schrift), audio (Audio→Schrift),
  // pic_choice (Schrift→Bild). Deutsch erscheint NUR im Feedback nach der Antwort.
  let options, answerValue, emojiOptions = false
  if (step.kind === 'pic_choice') { options = step.options.map(n => ({ value: n, emoji: n })); answerValue = step.answer; emojiOptions = true }
  else if (step.kind === 'tf') { options = [{ value: 'Ja' }, { value: 'Nein' }]; answerValue = step.answer ? 'Ja' : 'Nein' }
  else { options = step.options.map(o => ({ value: o })); answerValue = step.answer } // pic, audio, sign, dialog, gap

  const prompt = step.prompt || (step.kind === 'pic' ? 'Welches Wort passt?' : step.kind === 'audio' ? 'Was hörst du?' : step.kind === 'pic_choice' ? 'Welches Bild passt?' : '')

  useEffect(() => { if (step.kind === 'audio') speak(step.say) }, []) // eslint-disable-line

  const choose = (v) => { if (revealed) return; setAns(v); if (v === answerValue) awardXp(XP_PER_CARD); onSolved() }

  // Feedback-Glosse (Deutsch ERST hier): Schrift — „Bedeutung".
  let gloss = ''
  if (step.de) gloss = (step.jp || step.answer || '') + ' — „' + step.de + '"'
  else if (step.tr) gloss = (step.line || step.sign || '') + ' — „' + step.tr + '"'

  return (
    <div style={{ textAlign: 'center' }}>
      {step.kind === 'pic' && <div style={{ marginBottom: 14 }}><Emoji name={step.emoji} size={76} /></div>}
      {step.kind === 'pic_choice' && <div style={{ fontSize: 42, fontFamily: JP, color: C.sumi, marginBottom: 14 }}>{step.jp}</div>}
      {step.kind === 'audio' && (
        <button onClick={() => speak(step.say)} style={{ background: `${C.indigo}15`, border: `1px solid ${C.indigo}40`, borderRadius: 50, width: 76, height: 76, fontSize: 32, cursor: 'pointer', margin: '0 auto 14px' }}>🔊</button>
      )}
      {step.kind === 'sign' && (
        <div style={{ display: 'inline-block', background: '#1E4368', color: '#fff', borderRadius: 10, padding: '14px 26px', marginBottom: 14 }}>
          <span style={{ fontSize: 34, fontFamily: JP }}>{step.sign}</span>
        </div>
      )}
      {step.kind === 'dialog' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, textAlign: 'left' }}>
          <Emoji name={step.emoji} size={48} />
          <div style={{ background: '#fff', border: `1px solid ${C.washiDark}`, borderRadius: 12, padding: '10px 14px', flex: 1 }}>
            <span style={{ fontSize: 20, fontFamily: JP, color: C.sumi }}>{step.line}</span>
          </div>
        </div>
      )}
      {step.kind === 'tf' && (
        <div style={{ marginBottom: 12 }}>
          <Emoji name={step.emoji} size={72} />
          <div style={{ fontSize: 26, fontFamily: JP, color: C.sumi, marginTop: 8 }}>{step.jp}</div>
        </div>
      )}
      {step.kind === 'gap' && (
        <div style={{ fontSize: 28, fontFamily: JP, color: C.sumi, marginBottom: 12 }}>
          {step.text.split('＿').map((part, i, arr) => (
            <span key={i}>{part}{i < arr.length - 1 && <span style={{ display: 'inline-block', minWidth: 34, borderBottom: `2px solid ${C.shu}`, color: C.shu }}>＿</span>}</span>
          ))}
        </div>
      )}

      {prompt && <p style={{ fontWeight: 500, marginBottom: 14, color: C.textMuted }}>{prompt}</p>}

      <div style={{ display: emojiOptions ? 'flex' : 'grid', gridTemplateColumns: step.kind === 'tf' ? '1fr 1fr' : '1fr', gap: 10, justifyContent: 'center' }}>
        {options.map(o => {
          const correct = o.value === answerValue, chosen = o.value === ans
          const bc = !revealed ? C.washiDark : correct ? C.matcha : chosen ? C.shu : C.washiDark
          const isJa = /[぀-ヿ一-龯]/.test(o.value)
          return (
            <button key={o.value} onClick={() => choose(o.value)} disabled={revealed}
              style={{
                padding: emojiOptions ? 10 : '12px 14px', borderRadius: 10, border: `2px solid ${bc}`,
                background: !revealed ? '#fff' : correct ? `${C.matcha}20` : chosen ? `${C.shu}20` : '#fff',
                cursor: revealed ? 'default' : 'pointer', flex: emojiOptions ? 1 : undefined,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: isJa ? 22 : 15, fontFamily: isJa ? JP : 'inherit',
                fontWeight: 600, color: C.sumi,
              }}>
              {o.emoji ? <Emoji name={o.emoji} size={52} /> : <span>{o.value}</span>}
            </button>
          )
        })}
      </div>

      {revealed && (
        <p style={{ marginTop: 14, fontWeight: 600, color: ans === answerValue ? C.matcha : C.shu }}>
          {ans === answerValue ? '✓ Richtig!' : (emojiOptions ? '✗ Leider falsch' : `✗ Richtig: ${answerValue}`)}
          {gloss && <span style={{ display: 'block', fontWeight: 400, fontSize: 13, color: C.textMuted, marginTop: 4 }}>{gloss}</span>}
        </p>
      )}
    </div>
  )
}

// Wort-Einführungskarte: Bild + Schrift + Lesung + Audio. Deutsch nur einmal.
function IntroStep({ step }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.indigo, marginBottom: 12 }}>NEUES WORT</div>
      <div style={{ width: 96, height: 96, borderRadius: 20, background: '#EAF0EA', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <Emoji name={step.emoji} size={56} />
      </div>
      <div style={{ fontSize: 13, color: C.textMuted, marginTop: 12 }}>{step.reading}</div>
      <div style={{ fontSize: 48, fontFamily: JP, color: C.sumi, lineHeight: 1.1 }}>{step.jp}</div>
      <button onClick={() => speak(step.reading || step.jp)}
        style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: `${C.indigo}15`, border: `1px solid ${C.indigo}40`, color: C.indigo, borderRadius: 20, padding: '7px 16px', fontSize: 14, cursor: 'pointer' }}>
        🔊 Anhören
      </button>
      <div style={{ fontSize: 13, color: C.textMuted, paddingTop: 10, borderTop: `1px solid ${C.washiDark}`, maxWidth: 260, margin: '14px auto 0' }}>
        Bedeutung: <strong style={{ color: C.sumi }}>{step.de}</strong>
      </div>
    </div>
  )
}

// Nachzeichnen (produktiver Abruf): das Zeichen selbst auf die Fläche schreiben.
function TraceStep({ step }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontWeight: 500, marginBottom: 4 }}>
        Schreibe nach: <span style={{ fontFamily: JP, fontSize: 24 }}>{step.char}</span>
      </p>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 12 }}>{step.reading}{step.de ? ' · ' + step.de : ''}</p>
      <DrawCanvas char={step.char} />
    </div>
  )
}

// Satzbau-Übung: Wort-Kacheln in die richtige Reihenfolge tippen.
function BuildStep({ step, onSolved }) {
  const { awardXp } = useContext(ProgressCtx)
  const [pool, setPool] = useState(() => shuffled(step.tiles.map((t, i) => ({ t, id: i }))))
  const [line, setLine] = useState([])
  const [result, setResult] = useState(null)

  const add = (tile) => { if (result != null) return; speak(tile.t); setPool(p => p.filter(x => x.id !== tile.id)); setLine(l => [...l, tile]) }
  const back = (tile) => { if (result != null) return; setLine(l => l.filter(x => x.id !== tile.id)); setPool(p => [...p, tile]) }
  const check = () => { const ok = line.map(x => x.t).join('') === step.answer.join(''); setResult(ok); if (ok) awardXp(XP_PER_CARD); onSolved(ok) }

  const tileStyle = (filled) => ({
    padding: '8px 12px', borderRadius: 8, border: `2px solid ${filled ? C.indigo : C.washiDark}`,
    background: filled ? `${C.indigo}10` : '#fff', fontSize: 20, fontFamily: JP,
    color: C.sumi, cursor: result != null ? 'default' : 'pointer',
  })

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontWeight: 500, marginBottom: 14 }}>{step.prompt}</p>
      <div style={{ minHeight: 52, border: `2px dashed ${C.washiDark}`, borderRadius: 10, padding: 8, marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
        {line.length === 0 && <span style={{ color: C.textMuted, fontSize: 13 }}>Tippe die Wörter der Reihe nach an</span>}
        {line.map(tile => <button key={tile.id} onClick={() => back(tile)} style={tileStyle(true)}>{tile.t}</button>)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
        {pool.map(tile => <button key={tile.id} onClick={() => add(tile)} style={tileStyle(false)}>{tile.t}</button>)}
      </div>
      {result == null ? (
        <Btn onClick={check} variant={line.length === step.tiles.length ? 'primary' : 'ghost'} style={{ width: '100%', opacity: line.length === step.tiles.length ? 1 : 0.5 }}>
          Prüfen
        </Btn>
      ) : (
        <div style={{ fontWeight: 600, color: result ? C.matcha : C.shu }}>
          {result ? '✓ Richtig!' : '✗ Nicht ganz'}
          <span style={{ display: 'block', fontWeight: 400, fontSize: 14, color: C.sumi, marginTop: 4, fontFamily: JP }}>
            {step.answer.join('')}
            <button onClick={() => speak(step.answer.join(''))} style={{ background: 'none', border: 'none', fontSize: 15, cursor: 'pointer', marginLeft: 6 }}>🔊</button>
          </span>
          <span style={{ display: 'block', fontWeight: 400, fontSize: 13, color: C.textMuted }}>„{step.tr}"</span>
        </div>
      )}
    </div>
  )
}

// Spielt ein Geschichts-Kapitel: Erzählbeats + abwechslungsreiche Übungen.
function ChapterPlayer({ chapter, alreadyDone, onComplete, onClose }) {
  const [step, setStep] = useState(0)
  const [solved, setSolved] = useState(false)
  const [finished, setFinished] = useState(false)
  const steps = chapter.steps
  const cur = steps[step]
  const total = steps.length
  const noGate = cur.kind === 'story' || cur.kind === 'intro' || cur.kind === 'trace'
  const canContinue = noGate || solved
  const isLastStep = step === total - 1
  const progress = Math.round(((finished ? total : step) / total) * 100)

  const advance = () => { if (isLastStep) { setFinished(true); return } setStep(s => s + 1); setSolved(false) }

  let content
  if (finished) {
    content = (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <Emoji name="party" size={72} />
        <h2 style={{ fontSize: 22, fontFamily: JP, color: C.matcha, margin: '10px 0 8px' }}>Kapitel geschafft!</h2>
        <p style={{ lineHeight: 1.6 }}>„{chapter.title}" – du hast das Gelernte angewendet und die Geschichte erlebt.</p>
      </div>
    )
  } else if (cur.kind === 'story') {
    const toks = cur.tokens || STORY_TOKENS[cur.jp]
    content = (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <Emoji name={cur.emoji} size={80} />
        {cur.jp && (
          <div style={{ marginTop: 16 }}>
            {toks ? <StoryLine tokens={toks} /> : (
              <div style={{ fontSize: 24, fontFamily: JP, lineHeight: 2.1, color: C.sumi }}>
                {renderFuri(cur.jp)}
                <button onClick={() => speak(furiPlain(cur.jp))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, marginLeft: 6, verticalAlign: 'middle' }}>🔊</button>
              </div>
            )}
          </div>
        )}
        {cur.text && <p style={{ fontSize: cur.jp ? 13 : 16, color: cur.jp ? C.textMuted : C.sumi, lineHeight: 1.6, marginTop: cur.jp ? 12 : 16 }}>{cur.text}</p>}
      </div>
    )
  } else if (cur.kind === 'intro') {
    content = <IntroStep key={step} step={cur} />
  } else if (cur.kind === 'trace') {
    content = <TraceStep key={step} step={cur} />
  } else if (cur.kind === 'build') {
    content = <BuildStep key={step} step={cur} onSolved={() => setSolved(true)} />
  } else {
    content = <ChoiceStep key={step} step={cur} onSolved={() => setSolved(true)} />
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.washi, display: 'flex', flexDirection: 'column', zIndex: 100 }}>
      <div style={{ padding: '12px 16px', background: '#fff', borderBottom: `1px solid ${C.washiDark}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.textMuted }}>✕</button>
          <div style={{ flex: 1, height: 6, background: C.washiDark, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: C.shu, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 12, color: C.textMuted }}>📖 {chapter.title}</span>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>{content}</div>

      <div style={{ padding: '16px 20px', background: '#fff', borderTop: `1px solid ${C.washiDark}` }}>
        {finished ? (
          <Btn onClick={onComplete} style={{ width: '100%' }}>Abschließen ✓</Btn>
        ) : (
          <Btn onClick={advance} style={{ width: '100%', opacity: canContinue ? 1 : 0.5 }} variant={canContinue ? 'primary' : 'ghost'}>
            {noGate ? 'Weiter →' : (isLastStep ? 'Kapitel abschließen →' : 'Weiter →')}
          </Btn>
        )}
      </div>
    </div>
  )
}

// Das Reise-Tagebuch: alle bisher freigeschalteten Kapitel der Reise am Stück.
// Erzählt die Geschichte aus den abgeschlossenen Kapiteln (c1–c6) nach – also
// genau das, was man unterwegs erlebt hat, samt der dort gelernten Sätze.
function StoryJournal({ progress, onClose }) {
  const beats = []
  PATH.forEach(n => {
    if (n.type !== 'chapter' || !isNodeDone(n, progress)) return
    const c = CHAPTER_BY_ID[n.id]
    if (!c) return
    const story = c.steps.filter(s => s.kind === 'story')
    if (story.length) beats.push({ id: c.id, title: c.title, story })
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.washi, display: 'flex', flexDirection: 'column', zIndex: 100 }}>
      <div style={{ padding: '12px 16px', background: '#fff', borderBottom: `1px solid ${C.washiDark}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.textMuted }}>✕</button>
        <h3 style={{ fontSize: 15, fontFamily: JP, color: C.indigo }}>📖 Deine Geschichte</h3>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {beats.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.textMuted, marginTop: 40 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>📖</div>
            <p style={{ lineHeight: 1.6 }}>Noch keine Kapitel. Schließe ein Kapitel auf deiner Reise ab – dann erzählt sich deine Geschichte hier Stück für Stück weiter.</p>
          </div>
        ) : beats.map((b, i) => (
          <div key={b.id} style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 11, color: C.shu, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>KAPITEL {i + 1}</div>
            <h4 style={{ fontSize: 16, fontFamily: JP, color: C.indigo, margin: '0 0 10px' }}>{b.title}</h4>
            {b.story.map((s, j) => (
              <div key={j} style={{ marginBottom: 12 }}>
                {s.jp && (
                  <div style={{ background: `${C.indigo}0D`, borderRadius: 8, padding: 10, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20, fontFamily: JP, color: C.sumi, lineHeight: 1.9 }}>{renderFuri(s.jp)}</span>
                    <button onClick={() => speak(furiPlain(s.jp))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>🔊</button>
                  </div>
                )}
                {s.text && <p style={{ fontSize: 15, color: C.sumi, lineHeight: 1.7, margin: 0 }}>{s.text}</p>}
              </div>
            ))}
            {i < beats.length - 1 && <div style={{ height: 1, background: C.washiDark, marginTop: 16 }} />}
          </div>
        ))}
      </div>
    </div>
  )
}

function ReiseScreen({ onReview }) {
  const { progress, completeLesson, completeWordBlock, completeGrammar, completeChapter } = useContext(ProgressCtx)
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

  const contentNodes = PATH.filter(n => n.type && n.type !== 'goal')
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
    if (active.type === 'chapter') {
      const chapter = CHAPTER_BY_ID[active.id]
      const already = (progress.completedChapters || []).includes(active.id)
      return (
        <ChapterPlayer chapter={chapter} alreadyDone={already} onClose={close}
          onComplete={() => { if (!already) completeChapter(active.id, XP_PER_CHAPTER); close() }} />
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
    if (it.type === 'goal') state = allDone ? 'done' : 'locked'
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
  const current = laid.find(n => n.state === 'current')   // nächste offene Station

  // Durchgängiger Parallax-Hintergrund (eine Tal-Landschaft über die volle Höhe).
  const backdropH = trackH + 80
  const backdrop = buildBackdrop(backdropH)

  return (
    <div ref={wrapRef} style={{ paddingBottom: 8 }}>
      {showStory && <StoryJournal progress={progress} onClose={() => setShowStory(false)} />}
      {/* Intro + Tagesstatus + Gesamtfortschritt */}
      <div style={{ padding: '16px 16px 12px', position: 'relative', zIndex: 1 }}>
        <h2 style={{ fontSize: 20, fontFamily: JP, color: C.indigo, marginBottom: 4 }}>
          Deine Reise 旅
        </h2>
        <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 12 }}>
          Ein Weg vom Anfang bis zum Gipfel – Schrift, Wörter und Grammatik Schritt für Schritt.
        </p>

        {/* Tagesstatus — eingebettet aus dem früheren „Heute"-Tab */}
        <DailyStrip onReview={onReview} />

        {/* Direkt an der nächsten offenen Station weitermachen */}
        {current ? (
          <Btn onClick={() => setActive(current.node)} style={{ width: '100%', marginBottom: 12 }}>
            Weiter: {pathNodeMeta(current.node).label} →
          </Btn>
        ) : (
          <Btn variant="secondary" onClick={onReview} style={{ width: '100%', marginBottom: 12 }}>
            Alles gemeistert 🎉 – Wiederholen
          </Btn>
        )}

        <div style={{ height: 8, background: C.washiDark, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.round(doneCount / contentNodes.length * 100)}%`, background: C.matcha, borderRadius: 4, transition: 'width 0.3s' }} />
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>
          {doneCount} / {contentNodes.length} Stationen gemeistert
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
                <span style={{ fontFamily: JP, fontSize: 14, color: C.indigo, marginRight: 6 }}>{h.world}</span>
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
                  <span style={{ fontFamily: JP, fontSize: isGoal ? 30 : 24, color: locked ? C.textMuted : '#fff', lineHeight: 1 }}>
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
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Einstellungen ───────────────────────────────────────────────────────────

// Zahlen-Einsteller (− Wert +) für einen Parameter.
function NumberSetting({ label, hint, value, min, max, step, suffix, onChange }) {
  const StepBtn = ({ dir, disabled }) => (
    <button onClick={() => onChange(Math.min(max, Math.max(min, value + dir * step)))} disabled={disabled}
      style={{
        width: 34, height: 34, borderRadius: 9, border: `1.5px solid ${C.washiDark}`,
        background: disabled ? C.washi : '#fff', color: disabled ? C.washiDark : C.indigo,
        fontSize: 20, fontWeight: 700, lineHeight: 1, cursor: disabled ? 'default' : 'pointer',
      }}>{dir < 0 ? '−' : '+'}</button>
  )
  return (
    <Card style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, color: C.sumi }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <StepBtn dir={-1} disabled={value <= min} />
        <span style={{ minWidth: 48, textAlign: 'center', fontWeight: 700, fontSize: 16, color: C.indigo }}>{value}{suffix || ''}</span>
        <StepBtn dir={1} disabled={value >= max} />
      </div>
    </Card>
  )
}

function SettingsScreen({ onClose }) {
  const { settings, saveSettings } = useContext(ProgressCtx)
  const set = (patch) => saveSettings(patch)

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: C.textMuted, cursor: 'pointer', lineHeight: 1 }}>←</button>
        <h2 style={{ fontSize: 20, fontFamily: JP, color: C.indigo, margin: 0 }}>Einstellungen</h2>
      </div>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 20, marginLeft: 30 }}>Übungen nach deinem Geschmack einstellen</p>

      {/* Standard-Wiederholung */}
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.5, marginBottom: 8 }}>STANDARD-WIEDERHOLUNG</div>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>Was startet, wenn du „Wiederholen" antippst:</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['mix', '🎲 Gemischt'], ['srs', '🗂 SRS-Karten']].map(([id, lbl]) => {
            const on = settings.standardReview === id
            return (
              <button key={id} onClick={() => set({ standardReview: id })}
                style={{
                  flex: 1, padding: '12px 8px', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600,
                  border: `2px solid ${on ? C.indigo : C.washiDark}`,
                  background: on ? `${C.indigo}12` : '#fff', color: on ? C.indigo : C.sumi,
                }}>{lbl}</button>
            )
          })}
        </div>
      </Card>

      {/* Übungs-Parameter */}
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.5, margin: '18px 0 8px' }}>PARAMETER</div>
      <NumberSetting label="Antwortmöglichkeiten" hint="Optionen bei Erkennen/Hören — mehr = weniger Raten"
        value={settings.options} min={4} max={8} step={1} onChange={v => set({ options: v })} />
      <NumberSetting label="Tagesziel" hint="XP, die du pro Tag schaffen möchtest" suffix=" XP"
        value={settings.dailyGoal} min={50} max={600} step={50} onChange={v => set({ dailyGoal: v })} />
      <NumberSetting label="Aufgaben pro Runde" hint="Fragen je Übung (Erkennen, Hören, Tippen, Gemischt)"
        value={settings.roundSize} min={5} max={30} step={1} onChange={v => set({ roundSize: v })} />
      <NumberSetting label="Fleiß-Session" hint="Karten je Fleiß-Übung"
        value={settings.freeSize} min={10} max={60} step={5} onChange={v => set({ freeSize: v })} />

      <p style={{ fontSize: 12, color: C.textMuted, marginTop: 16, lineHeight: 1.5 }}>
        Änderungen werden sofort gespeichert und gelten beim nächsten Start einer Übung.
      </p>
    </div>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function TabiApp() {
  const [tab, setTab] = useState('reise')
  const [prevTab, setPrevTab] = useState('reise')   // Rücksprung aus den Einstellungen
  const [uebenMode, setUebenMode] = useState(null)  // gewünschter Übungsmodus beim Tab-Wechsel
  const { user, logout } = useAuth()
  const { progress, awardXp, completeLesson, completeWordBlock, completeGrammar, completeChapter, completeDialog, reviewCard, scheduleNew, saveSettings, reset } = useProgress(user?.uid)
  const { level } = computeStats(progress)
  const settings = getSettings(progress)

  // Neu gelernte Kana/Wörter in den Wiederholungsplan einplanen (und bereits
  // gelernte, aber noch ungeplante migrieren). Hält die „fällig"-Zahl sinnvoll.
  useEffect(() => {
    const learned = [
      ...completedKanaList(progress.completedLessons || []),
      ...learnedWordKanji(progress.completedWordBlocks || []),
    ]
    scheduleNew(learned)
  }, [progress.completedLessons, progress.completedWordBlocks, progress.srs])

  // Wiederholungen leben an einem Ort (Üben). Andere Screens verlinken hierher;
  // gestartet wird die in den Einstellungen gewählte Standard-Wiederholung.
  const goToReview = () => { setUebenMode(settings.standardReview); setTab('ueben') }

  // Einstellungen öffnen/schließen (merkt sich den vorherigen Tab für den Rücksprung).
  const openSettings = () => { setPrevTab(tab); setTab('einstellungen') }

  const screens = {
    reise: <ReiseScreen onReview={goToReview} />,
    lernen: <LernenScreen />,
    ueben: <UebenScreen initialMode={uebenMode} onConsumeInitial={() => setUebenMode(null)} />,
    fortschritt: <FortschrittScreen onReview={goToReview} />,
    einstellungen: <SettingsScreen onClose={() => setTab(prevTab)} />,
  }

  return (
    <ProgressCtx.Provider value={{ progress, settings, awardXp, completeLesson, completeWordBlock, completeGrammar, completeChapter, completeDialog, reviewCard, saveSettings, reset }}>
    <div className="app-shell" style={{
      maxWidth: 480, margin: '0 auto', height: '100vh',
      display: 'flex', flexDirection: 'column', position: 'relative',
    }}>
      {/* Header — Tagebuch-Titelkopf mit Hanko-Siegel */}
      <div style={{
        padding: '13px 16px 11px',
        background: 'rgba(252,250,245,0.88)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${C.washiDark}`,
        boxShadow: '0 8px 20px -18px rgba(33,31,27,0.55)',
        display: 'flex', alignItems: 'center', gap: 11,
        flexShrink: 0, position: 'relative', zIndex: 10,
      }}>
        <div className="hanko-in" style={{
          width: 34, height: 34, background: C.shu, borderRadius: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 19, fontFamily: JP, color: '#fff', fontWeight: 600, lineHeight: 1,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.22), inset 0 -2px 5px rgba(120,20,10,0.32), 0 2px 6px rgba(218,74,56,0.34)',
        }}>旅</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: JP, color: C.sumi, lineHeight: 1, letterSpacing: 0.4 }}>Tabi</div>
          <div style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.3, marginTop: 3, letterSpacing: 0.3 }}>旅 · Japanisch für Reisende</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: `${C.shu}14`, border: `1px solid ${C.shu}33`, borderRadius: 999, padding: '3px 10px 3px 8px', fontSize: 12, color: C.shu, fontWeight: 700 }}>
            <span style={{ width: 5, height: 5, borderRadius: 99, background: C.shu, display: 'inline-block' }} />
            Level {level}
          </div>
          <button onClick={openSettings} title="Einstellungen" aria-label="Einstellungen"
            style={{
              background: tab === 'einstellungen' ? `${C.indigo}12` : 'none',
              border: `1px solid ${C.washiDark}`, borderRadius: 999,
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: tab === 'einstellungen' ? C.indigo : C.textMuted, cursor: 'pointer', lineHeight: 1,
            }}>
            ⚙
          </button>
          <button onClick={logout} title={`Abmelden (${user?.email || ''})`}
            style={{
              background: 'none', border: `1px solid ${C.washiDark}`, borderRadius: 999,
              padding: '4px 11px', fontSize: 12, color: C.textMuted, cursor: 'pointer',
            }}>
            Abmelden
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        <div key={tab} className="screen-enter">
          {screens[tab]}
        </div>
      </div>

      <TabBar active={tab} setActive={setTab} />
    </div>
    </ProgressCtx.Provider>
  )
}
