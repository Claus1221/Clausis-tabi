// Wörter-Blöcke: je 5 thematisch gruppierte Wörter mit Kanji, Hiragana,
// Übersetzung und Beispielsatz (mit Lesung, Übersetzung, Erklärung).
// Blöcke schalten der Reihe nach frei. Jedes Wort wird im SRS über sein Kanji abgefragt.
// Beispielsätze in der Höflichkeitsform (です/ます). Jeder Satz ist in „tokens"
// zerlegt: t = Text, r = Lesung, de = Bedeutung, b = grammatischer Aufbau.
// Tokens ohne de (z. B. „。") sind nicht antippbar.
export const WORD_BLOCKS = [
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
export const ALL_WORDS = WORD_BLOCKS.flatMap(b => b.words)
export const WORD_BY_KANJI = Object.fromEntries(ALL_WORDS.map(w => [w.kanji, w]))

// Kanji aller Wörter aus abgeschlossenen Blöcken (= fällige Wort-Karten fürs SRS).
export function learnedWordKanji(completedBlocks) {
  return WORD_BLOCKS.filter(b => completedBlocks.includes(b.id)).flatMap(b => b.words.map(w => w.kanji))
}
