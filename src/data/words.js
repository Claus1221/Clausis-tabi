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
      { kanji: '足', kana: 'あし', romaji: 'ashi', de: 'Fuß / Bein', ex: { jp: '足が速いです。', kana: 'あしがはやいです。', de: 'Er läuft schnell. (wörtlich: „Die Beine sind schnell.")', tokens: [
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
  {
    id: 'wb5', theme: '🔢', title: 'Zahlen 1–5', words: [
      { kanji: '一', kana: 'いち', romaji: 'ichi', de: 'eins', ex: { jp: '一番です。', kana: 'いちばんです。', de: 'Es ist die Nummer eins.', tokens: [
        { t: '一', r: 'いち', de: 'eins', b: 'Zahl' }, { t: '番', r: 'ばん', de: 'Nummer ~', b: 'Zählwort (Ordnungszahl)' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
      { kanji: '二', kana: 'に', romaji: 'ni', de: 'zwei', ex: { jp: '二番です。', kana: 'にばんです。', de: 'Es ist die Nummer zwei.', tokens: [
        { t: '二', r: 'に', de: 'zwei', b: 'Zahl' }, { t: '番', r: 'ばん', de: 'Nummer ~', b: 'Zählwort (Ordnungszahl)' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
      { kanji: '三', kana: 'さん', romaji: 'san', de: 'drei', ex: { jp: '三番です。', kana: 'さんばんです。', de: 'Es ist die Nummer drei.', tokens: [
        { t: '三', r: 'さん', de: 'drei', b: 'Zahl' }, { t: '番', r: 'ばん', de: 'Nummer ~', b: 'Zählwort (Ordnungszahl)' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
      { kanji: '四', kana: 'よん', romaji: 'yon', de: 'vier', ex: { jp: '四番です。', kana: 'よんばんです。', de: 'Es ist die Nummer vier.', tokens: [
        { t: '四', r: 'よん', de: 'vier', b: 'Zahl' }, { t: '番', r: 'ばん', de: 'Nummer ~', b: 'Zählwort (Ordnungszahl)' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
      { kanji: '五', kana: 'ご', romaji: 'go', de: 'fünf', ex: { jp: '五番です。', kana: 'ごばんです。', de: 'Es ist die Nummer fünf.', tokens: [
        { t: '五', r: 'ご', de: 'fünf', b: 'Zahl' }, { t: '番', r: 'ばん', de: 'Nummer ~', b: 'Zählwort (Ordnungszahl)' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
    ],
  },
  {
    id: 'wb6', theme: '🔢', title: 'Zahlen 6–10', words: [
      { kanji: '六', kana: 'ろく', romaji: 'roku', de: 'sechs', ex: { jp: '六番です。', kana: 'ろくばんです。', de: 'Es ist die Nummer sechs.', tokens: [
        { t: '六', r: 'ろく', de: 'sechs', b: 'Zahl' }, { t: '番', r: 'ばん', de: 'Nummer ~', b: 'Zählwort (Ordnungszahl)' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
      { kanji: '七', kana: 'なな', romaji: 'nana', de: 'sieben', ex: { jp: '七番です。', kana: 'ななばんです。', de: 'Es ist die Nummer sieben.', tokens: [
        { t: '七', r: 'なな', de: 'sieben', b: 'Zahl' }, { t: '番', r: 'ばん', de: 'Nummer ~', b: 'Zählwort (Ordnungszahl)' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
      { kanji: '八', kana: 'はち', romaji: 'hachi', de: 'acht', ex: { jp: '八番です。', kana: 'はちばんです。', de: 'Es ist die Nummer acht.', tokens: [
        { t: '八', r: 'はち', de: 'acht', b: 'Zahl' }, { t: '番', r: 'ばん', de: 'Nummer ~', b: 'Zählwort (Ordnungszahl)' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
      { kanji: '九', kana: 'きゅう', romaji: 'kyuu', de: 'neun', ex: { jp: '九番です。', kana: 'きゅうばんです。', de: 'Es ist die Nummer neun.', tokens: [
        { t: '九', r: 'きゅう', de: 'neun', b: 'Zahl' }, { t: '番', r: 'ばん', de: 'Nummer ~', b: 'Zählwort (Ordnungszahl)' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
      { kanji: '十', kana: 'じゅう', romaji: 'juu', de: 'zehn', ex: { jp: '十番です。', kana: 'じゅうばんです。', de: 'Es ist die Nummer zehn.', tokens: [
        { t: '十', r: 'じゅう', de: 'zehn', b: 'Zahl' }, { t: '番', r: 'ばん', de: 'Nummer ~', b: 'Zählwort (Ordnungszahl)' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
    ],
  },
  {
    id: 'wb7', theme: '💴', title: 'Geld', words: [
      { kanji: '百', kana: 'ひゃく', romaji: 'hyaku', de: 'hundert', ex: { jp: '百円です。', kana: 'ひゃくえんです。', de: 'Das sind 100 Yen.', tokens: [
        { t: '百', r: 'ひゃく', de: 'hundert', b: 'Zahl' }, { t: '円', r: 'えん', de: 'Yen', b: 'Nomen (Währung)' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
      { kanji: '千', kana: 'せん', romaji: 'sen', de: 'tausend', ex: { jp: '千円です。', kana: 'せんえんです。', de: 'Das sind 1000 Yen.', tokens: [
        { t: '千', r: 'せん', de: 'tausend', b: 'Zahl' }, { t: '円', r: 'えん', de: 'Yen', b: 'Nomen (Währung)' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
      { kanji: '万', kana: 'まん', romaji: 'man', de: 'zehntausend', ex: { jp: '一万円です。', kana: 'いちまんえんです。', de: 'Das sind 10.000 Yen.', tokens: [
        { t: '一', r: 'いち', de: 'eins', b: 'Zahl' }, { t: '万', r: 'まん', de: 'zehntausend', b: 'Zahl' }, { t: '円', r: 'えん', de: 'Yen', b: 'Nomen (Währung)' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
      { kanji: '円', kana: 'えん', romaji: 'en', de: 'Yen', ex: { jp: '三百円です。', kana: 'さんびゃくえんです。', de: 'Das sind 300 Yen.', tokens: [
        { t: '三百', r: 'さんびゃく', de: 'dreihundert', b: 'Zahl' }, { t: '円', r: 'えん', de: 'Yen', b: 'Nomen (Währung)' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
      { kanji: '全部', kana: 'ぜんぶ', romaji: 'zenbu', de: 'alles / insgesamt', ex: { jp: '全部で五百円です。', kana: 'ぜんぶでごひゃくえんです。', de: 'Insgesamt sind das 500 Yen.', tokens: [
        { t: '全部', r: 'ぜんぶ', de: 'alles / insgesamt', b: 'Nomen' }, { t: 'で', de: '(Rahmen: insgesamt)', b: 'Partikel: Summe/Rahmen' }, { t: '五百', r: 'ごひゃく', de: 'fünfhundert', b: 'Zahl' }, { t: '円', r: 'えん', de: 'Yen', b: 'Nomen (Währung)' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
    ],
  },
  {
    id: 'wb8', theme: '📅', title: 'Tage', words: [
      { kanji: '今日', kana: 'きょう', romaji: 'kyou', de: 'heute', ex: { jp: '今日は暑いです。', kana: 'きょうはあついです。', de: 'Heute ist es heiß.', tokens: [
        { t: '今日', r: 'きょう', de: 'heute', b: 'Zeitwort (ohne Partikel möglich)' }, { t: 'は', r: 'wa', de: '(Thema)', b: 'Themenpartikel' }, { t: '暑い', r: 'あつい', de: 'heiß', b: 'い-Adjektiv' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
      { kanji: '明日', kana: 'あした', romaji: 'ashita', de: 'morgen', ex: { jp: '明日、行きます。', kana: 'あした、いきます。', de: 'Morgen gehe ich.', tokens: [
        { t: '明日', r: 'あした', de: 'morgen', b: 'Zeitwort (ohne Partikel)' }, { t: '、' }, { t: '行きます', r: 'いきます', de: 'gehen / fahren', b: 'Verb, höflich (von 行く)' }, { t: '。' },
      ] } },
      { kanji: '昨日', kana: 'きのう', romaji: 'kinou', de: 'gestern', ex: { jp: '昨日は雨でした。', kana: 'きのうはあめでした。', de: 'Gestern war Regen.', tokens: [
        { t: '昨日', r: 'きのう', de: 'gestern', b: 'Zeitwort' }, { t: 'は', r: 'wa', de: '(Thema)', b: 'Themenpartikel' }, { t: '雨', r: 'あめ', de: 'Regen', b: 'Nomen' }, { t: 'でした', de: 'war', b: 'Vergangenheit von です' }, { t: '。' },
      ] } },
      { kanji: '毎日', kana: 'まいにち', romaji: 'mainichi', de: 'jeden Tag', ex: { jp: '毎日、お茶を飲みます。', kana: 'まいにち、おちゃをのみます。', de: 'Jeden Tag trinke ich Tee.', tokens: [
        { t: '毎日', r: 'まいにち', de: 'jeden Tag', b: 'Zeitwort (ohne Partikel)' }, { t: '、' }, { t: 'お茶', r: 'おちゃ', de: 'Tee', b: 'Nomen' }, { t: 'を', de: '(Objekt)', b: 'Objektpartikel' }, { t: '飲みます', r: 'のみます', de: 'trinken', b: 'Verb, höflich (von 飲む)' }, { t: '。' },
      ] } },
      { kanji: '週末', kana: 'しゅうまつ', romaji: 'shuumatsu', de: 'Wochenende', ex: { jp: '週末に山へ行きます。', kana: 'しゅうまつにやまへいきます。', de: 'Am Wochenende fahre ich in die Berge.', tokens: [
        { t: '週末', r: 'しゅうまつ', de: 'Wochenende', b: 'Nomen' }, { t: 'に', de: '(Zeitpunkt)', b: 'Partikel: wann' }, { t: '山', r: 'やま', de: 'Berg', b: 'Nomen' }, { t: 'へ', r: 'e', de: '(Richtung)', b: 'Richtungspartikel' }, { t: '行きます', r: 'いきます', de: 'fahren / gehen', b: 'Verb, höflich (von 行く)' }, { t: '。' },
      ] } },
    ],
  },
  {
    id: 'wb9', theme: '🗓️', title: 'Wochentage', words: [
      { kanji: '月曜日', kana: 'げつようび', romaji: 'getsuyoubi', de: 'Montag', ex: { jp: '今日は月曜日です。', kana: 'きょうはげつようびです。', de: 'Heute ist Montag.', tokens: [
        { t: '今日', r: 'きょう', de: 'heute', b: 'Zeitwort' }, { t: 'は', r: 'wa', de: '(Thema)', b: 'Themenpartikel' }, { t: '月曜日', r: 'げつようび', de: 'Montag (月 = Mond)', b: 'Nomen' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
      { kanji: '火曜日', kana: 'かようび', romaji: 'kayoubi', de: 'Dienstag', ex: { jp: '明日は火曜日です。', kana: 'あしたはかようびです。', de: 'Morgen ist Dienstag.', tokens: [
        { t: '明日', r: 'あした', de: 'morgen', b: 'Zeitwort' }, { t: 'は', r: 'wa', de: '(Thema)', b: 'Themenpartikel' }, { t: '火曜日', r: 'かようび', de: 'Dienstag (火 = Feuer)', b: 'Nomen' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
      { kanji: '水曜日', kana: 'すいようび', romaji: 'suiyoubi', de: 'Mittwoch', ex: { jp: '昨日は水曜日でした。', kana: 'きのうはすいようびでした。', de: 'Gestern war Mittwoch.', tokens: [
        { t: '昨日', r: 'きのう', de: 'gestern', b: 'Zeitwort' }, { t: 'は', r: 'wa', de: '(Thema)', b: 'Themenpartikel' }, { t: '水曜日', r: 'すいようび', de: 'Mittwoch (水 = Wasser)', b: 'Nomen' }, { t: 'でした', de: 'war', b: 'Vergangenheit von です' }, { t: '。' },
      ] } },
      { kanji: '木曜日', kana: 'もくようび', romaji: 'mokuyoubi', de: 'Donnerstag', ex: { jp: '木曜日に行きます。', kana: 'もくようびにいきます。', de: 'Am Donnerstag gehe ich.', tokens: [
        { t: '木曜日', r: 'もくようび', de: 'Donnerstag (木 = Baum)', b: 'Nomen' }, { t: 'に', de: '(Zeitpunkt)', b: 'Partikel: wann' }, { t: '行きます', r: 'いきます', de: 'gehen / fahren', b: 'Verb, höflich (von 行く)' }, { t: '。' },
      ] } },
      { kanji: '金曜日', kana: 'きんようび', romaji: 'kinyoubi', de: 'Freitag', ex: { jp: '金曜日が好きです。', kana: 'きんようびがすきです。', de: 'Ich mag Freitage.', tokens: [
        { t: '金曜日', r: 'きんようび', de: 'Freitag (金 = Gold/Metall)', b: 'Nomen' }, { t: 'が', de: '(das Gemochte)', b: 'Partikel bei 好き' }, { t: '好き', r: 'すき', de: 'mögen', b: 'な-Adjektiv' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
      { kanji: '土曜日', kana: 'どようび', romaji: 'doyoubi', de: 'Samstag', ex: { jp: 'お祭りは土曜日です。', kana: 'おまつりはどようびです。', de: 'Das Fest ist am Samstag.', tokens: [
        { t: 'お祭り', r: 'おまつり', de: 'Fest', b: 'Nomen' }, { t: 'は', r: 'wa', de: '(Thema)', b: 'Themenpartikel' }, { t: '土曜日', r: 'どようび', de: 'Samstag (土 = Erde)', b: 'Nomen' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
      ] } },
      { kanji: '日曜日', kana: 'にちようび', romaji: 'nichiyoubi', de: 'Sonntag', ex: { jp: '日曜日は家にいます。', kana: 'にちようびはいえにいます。', de: 'Am Sonntag bin ich zu Hause.', tokens: [
        { t: '日曜日', r: 'にちようび', de: 'Sonntag (日 = Sonne)', b: 'Nomen' }, { t: 'は', r: 'wa', de: '(Thema)', b: 'Themenpartikel' }, { t: '家', r: 'いえ', de: 'Haus / Zuhause', b: 'Nomen' }, { t: 'に', de: '(Ort)', b: 'Partikel: wo (bei います)' }, { t: 'います', de: 'sein / sich befinden', b: 'Verb, höflich (Lebewesen)' }, { t: '。' },
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
