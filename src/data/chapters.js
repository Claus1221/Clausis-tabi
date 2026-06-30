// Wort-Tokens für die Story-Sätze (antippbar → Lesung, Bedeutung, Aufbau).
// Schlüssel = der jp-Furigana-String der Story-Szene.
export const STORY_TOKENS = {
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
  '人(ひと)が多(おお)いです。': [
    { t: '人', r: 'ひと', de: 'Mensch', b: 'Nomen' }, { t: 'が', de: '(Subjekt)', b: 'Subjektpartikel' }, { t: '多い', r: 'おおい', de: 'viel / zahlreich', b: 'い-Adjektiv' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
  ],
  '魚を食べました。': [
    { t: '魚', r: 'さかな', de: 'Fisch', b: 'Nomen' }, { t: 'を', de: '(Objekt)', b: 'Objektpartikel' }, { t: '食べました', r: 'たべました', de: 'habe gegessen', b: 'ます-Form, Vergangenheit' }, { t: '。' },
  ],
  '小さい店です。': [
    { t: '小さい', r: 'ちいさい', de: 'klein', b: 'い-Adjektiv' }, { t: '店', r: 'みせ', de: 'Laden', b: 'Nomen' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
  ],
  '駅から東京まで行きます。': [
    { t: '駅', r: 'えき', de: 'Bahnhof', b: 'Nomen' }, { t: 'から', de: 'von / ab', b: 'Partikel' }, { t: '東京', r: 'とうきょう', de: 'Tokyo', b: 'Nomen' }, { t: 'まで', de: 'bis', b: 'Partikel' }, { t: '行きます', r: 'いきます', de: 'fahren / gehen', b: 'Verb, höflich' }, { t: '。' },
  ],
  'トイレは中です。': [
    { t: 'トイレ', de: 'Toilette', b: 'Nomen' }, { t: 'は', r: 'wa', de: '(Thema)', b: 'Themenpartikel' }, { t: '中', r: 'なか', de: 'Mitte / drinnen', b: 'Nomen' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
  ],
  '寺はきれいです。': [
    { t: '寺', r: 'てら', de: 'Tempel', b: 'Nomen' }, { t: 'は', r: 'wa', de: '(Thema)', b: 'Themenpartikel' }, { t: 'きれい', de: 'schön', b: 'な-Adjektiv' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
  ],
  '寺(てら)は東(ひがし)です。': [
    { t: '寺', r: 'てら', de: 'Tempel', b: 'Nomen' }, { t: 'は', r: 'wa', de: '(Thema)', b: 'Themenpartikel' }, { t: '東', r: 'ひがし', de: 'Osten', b: 'Nomen' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
  ],
  '猫(ねこ)は寺(てら)の前(まえ)です。': [
    { t: '猫', r: 'ねこ', de: 'Katze', b: 'Nomen' }, { t: 'は', r: 'wa', de: '(Thema)', b: 'Themenpartikel' }, { t: '寺', r: 'てら', de: 'Tempel', b: 'Nomen' }, { t: 'の', de: 'von / -s', b: 'Verbindungspartikel (Genitiv)' }, { t: '前', r: 'まえ', de: 'vor / davor', b: 'Nomen' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' },
  ],
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
export const CHAPTERS = [
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
    { kind: 'story', emoji: 'mountain', jp: '山(やま)が見(み)えます。', tr: 'Ein Berg ist zu sehen.', text: 'Der Weg führt in die Berge. Ein Fluss glitzert im Tal.' },
    { kind: 'intro', emoji: 'river', jp: '川', reading: 'かわ', de: 'Fluss' },
    { kind: 'intro', emoji: 'sun', jp: '空', reading: 'そら', de: 'Himmel' },
    { kind: 'pic', emoji: 'river', options: ['川', '山', '空'], answer: '川', de: 'Fluss' },
    { kind: 'audio', say: 'そら', options: ['空', '川', '山'], answer: '空', de: 'Himmel' },
    { kind: 'build', prompt: 'Bilde den Satz: „Das ist ein Berg."', tiles: ['これ', 'は', '山', 'です'], answer: ['これ', 'は', '山', 'です'], tr: 'これは山です。' },
    { kind: 'gap', text: 'これ＿山です。', prompt: 'Welche Partikel markiert das Thema?', options: ['は', 'を', 'が'], answer: 'は', hint: 'は markiert das Thema.' },
    { kind: 'trace', char: '川', reading: 'かわ', de: 'Fluss' },
    { kind: 'build', prompt: 'Bilde: „Ich schaue in den Himmel."', tiles: ['空', 'を', '見ます'], answer: ['空', 'を', '見ます'], tr: '空を見ます。' },
    { kind: 'build', prompt: 'Bilde: „Das ist ein Stern."', tiles: ['これ', 'は', '星', 'です'], answer: ['これ', 'は', '星', 'です'], tr: 'これは星です。' },
    { kind: 'story', emoji: 'river', jp: 'これは川(かわ)です。', tr: 'Das ist ein Fluss.', text: 'Das ist ein Fluss. Du benennst, was du siehst.' },
  ] },
  { id: 'c4', title: 'Begegnungen', steps: [
    { kind: 'story', emoji: 'dog', jp: '犬(いぬ)が走(はし)ります。', tr: 'Der Hund rennt.', text: 'Tiere überall – und neue, kantige Zeichen: Katakana.' },
    { kind: 'intro', emoji: 'dog', jp: '犬', reading: 'いぬ', de: 'Hund' },
    { kind: 'intro', emoji: 'fish', jp: '魚', reading: 'さかな', de: 'Fisch' },
    { kind: 'pic', emoji: 'dog', options: ['犬', '猫', '魚'], answer: '犬', de: 'Hund' },
    { kind: 'pic_choice', jp: '魚', options: ['fish', 'dog', 'cat'], answer: 'fish', de: 'Fisch' },
    { kind: 'sign', sign: 'コーヒー', prompt: 'An einem Automaten: コーヒー. Das ist…', options: ['Kaffee', 'Tee', 'Milch'], answer: 'Kaffee' },
    { kind: 'build', prompt: 'Bilde: „Der Hund rennt."', tiles: ['犬', 'が', '走ります'], answer: ['犬', 'が', '走ります'], tr: '犬が走ります。' },
    { kind: 'gap', text: '魚＿食べます。', prompt: 'Welche Partikel markiert das Objekt?', options: ['を', 'が', 'に'], answer: 'を', hint: 'を markiert das Objekt.' },
    { kind: 'build', prompt: 'Bilde: „Die Katze sieht den Fisch."', tiles: ['猫', 'が', '魚', 'を', '見ます'], answer: ['猫', 'が', '魚', 'を', '見ます'], tr: '猫が魚を見ます。' },
    { kind: 'build', prompt: 'Bilde: „Der Hund ist am Fluss."', tiles: ['犬', 'が', '川', 'に', 'います'], answer: ['犬', 'が', '川', 'に', 'います'], tr: '犬が川にいます。' },
    { kind: 'story', emoji: 'fish', jp: '魚(さかな)を見(み)ます。', tr: 'Ich sehe einen Fisch.', text: 'Am Fluss winkt dir ein Fischer zu.' },
  ] },
  { id: 'c5', title: 'Der Aufstieg', steps: [
    { kind: 'story', emoji: 'person', jp: '山(やま)を登(のぼ)ります。', tr: 'Ich besteige den Berg.', text: 'Der Aufstieg wird hart. Du spürst jeden Muskel.' },
    { kind: 'intro', emoji: 'eye', jp: '目', reading: 'め', de: 'Auge' },
    { kind: 'intro', emoji: 'hand', jp: '手', reading: 'て', de: 'Hand' },
    { kind: 'pic', emoji: 'eye', options: ['目', '手', '耳'], answer: '目', de: 'Auge' },
    { kind: 'audio', say: 'て', options: ['手', '目', '耳'], answer: '手', de: 'Hand' },
    { kind: 'trace', char: '目', reading: 'め', de: 'Auge' },
    { kind: 'build', prompt: 'Bilde: „Ich trinke Wasser."', tiles: ['水', 'を', '飲みます'], answer: ['水', 'を', '飲みます'], tr: '水を飲みます。' },
    { kind: 'gap', text: '山＿行きます。', prompt: 'Welche Partikel zeigt das Ziel (wohin)?', options: ['に', 'で', 'を'], answer: 'に', hint: 'に zeigt Ziel/Richtung.' },
    { kind: 'build', prompt: 'Bilde: „Der Berg ist hoch."', tiles: ['山', 'が', '高い', 'です'], answer: ['山', 'が', '高い', 'です'], tr: '山が高いです。' },
    { kind: 'build', prompt: 'Bilde: „Die Augen sind schön."', tiles: ['目', 'が', 'きれい', 'です'], answer: ['目', 'が', 'きれい', 'です'], tr: '目がきれいです。' },
    { kind: 'story', emoji: 'mountain', jp: '足(あし)が痛(いた)いです。', tr: 'Meine Füße tun weh.', text: 'Erschöpft erreichst du eine Hütte. Morgen wartet der Gipfel.' },
  ] },
  { id: 'c6', title: 'Zum Gipfel', steps: [
    { kind: 'story', emoji: 'fuji', jp: '日本(にほん)の山(やま)です。', tr: 'Es ist Japans Berg.', text: 'Der letzte Morgen. Vor dir ragt der berühmteste Berg Japans auf.' },
    { kind: 'intro', emoji: 'japan', jp: '日本', reading: 'にほん', de: 'Japan' },
    { kind: 'pic_choice', jp: '日本', options: ['japan', 'mountain', 'torii'], answer: 'japan', de: 'Japan' },
    { kind: 'build', prompt: 'Bilde: „Die Katze frisst den Fisch."', tiles: ['猫', 'が', '魚', 'を', '食べます'], answer: ['猫', 'が', '魚', 'を', '食べます'], tr: '猫が魚を食べます。' },
    { kind: 'gap', text: '星＿きれいです。', prompt: 'Welche Partikel markiert das Thema „die Sterne"?', options: ['は', 'を', 'が'], answer: 'は', hint: 'は markiert das Thema.' },
    { kind: 'dialog', emoji: 'person', line: '水を飲みますか？', prompt: 'Ein Mitwanderer fragt. Du hast Durst. Antworte höflich:', options: ['はい、飲みます。', 'いいえ、飲みません。', 'こんにちは。'], answer: 'はい、飲みます。', tr: 'Ja, ich trinke.' },
    { kind: 'tf', emoji: 'fuji', jp: '日本の山です。', prompt: 'Stimmt es zum Bild?', answer: true },
    { kind: 'build', prompt: 'Bilde: „Ist das ein Berg in Japan?"', tiles: ['これ', 'は', '日本', 'の', '山', 'です', 'か'], answer: ['これ', 'は', '日本', 'の', '山', 'です', 'か'], tr: 'これは日本の山ですか。' },
    { kind: 'build', prompt: 'Bilde: „Sind die Sterne schön?"', tiles: ['星', 'は', 'きれい', 'です', 'か'], answer: ['星', 'は', 'きれい', 'です', 'か'], tr: '星はきれいですか。' },
    { kind: 'story', emoji: 'party', jp: 'おめでとうございます！旅(たび)は終(お)わりました。', tr: 'Herzlichen Glückwunsch! Die Reise ist zu Ende.', text: 'Du stehst auf dem Gipfel. Eine neue Reise beginnt.' },
  ] },
  { id: 'c7', title: 'Ankunft in Tokyo', steps: [
    { kind: 'story', emoji: 'train', jp: '人(ひと)が多(おお)いです。', tr: 'Es sind viele Menschen da.', text: 'Vom Gipfel geht es zurück ins Tal und mit dem Zug weiter in Japans größte Stadt: Tokyo. Der Bahnhof ist riesig – überall Menschen, Lärm und Schilder.' },
    { kind: 'intro', emoji: 'city', jp: '東京', reading: 'とうきょう', de: 'Tokyo' },
    { kind: 'audio', say: 'とうきょう', options: ['東京', '電車', '飛行機'], answer: '東京', de: 'Tokyo' },
    { kind: 'intro', emoji: 'station', jp: '出口', reading: 'でぐち', de: 'Ausgang' },
    { kind: 'sign', sign: '出口', prompt: 'Am Bahnsteig hängt dieses Schild. Was bedeutet es?', options: ['Ausgang', 'Eingang', 'Bahnsteig'], answer: 'Ausgang' },
    { kind: 'intro', emoji: 'hand', jp: '右', reading: 'みぎ', de: 'rechts' },
    { kind: 'intro', emoji: 'hand', jp: '左', reading: 'ひだり', de: 'links' },
    { kind: 'story', emoji: 'map', text: 'Orte zeigen – neu: ここ = hier (bei mir), そこ = da (bei dir), あそこ = dort (weiter weg). Und „Wo ist …?" heißt 〜は どこ ですか。' },
    { kind: 'gap', text: '出口は ＿ です。', prompt: '„Der Ausgang ist dort drüben." Welches Wort passt?', options: ['あそこ', 'ここ', 'どこ'], answer: 'あそこ', hint: 'あそこ = dort (weiter entfernt).' },
    { kind: 'build', prompt: 'Bilde: „Wo ist der Ausgang?"', tiles: ['出口', 'は', 'どこ', 'です', 'か'], answer: ['出口', 'は', 'どこ', 'です', 'か'], tr: '出口はどこですか。' },
    { kind: 'dialog', emoji: 'person', line: 'みぎですか、ひだりですか？', prompt: 'Der Bahnhofsangestellte fragt: rechts oder links? Der Ausgang ist rechts.', options: ['みぎです。', 'ひだりです。', 'たべます。'], answer: 'みぎです。', tr: 'Rechts.' },
    { kind: 'build', prompt: 'Bilde: „Wo ist der Bahnhof?"', tiles: ['駅', 'は', 'どこ', 'です', 'か'], answer: ['駅', 'は', 'どこ', 'です', 'か'], tr: '駅はどこですか。' },
    { kind: 'build', prompt: 'Bilde: „Der Ausgang ist dort drüben."', tiles: ['出口', 'は', 'あそこ', 'です'], answer: ['出口', 'は', 'あそこ', 'です'], tr: '出口はあそこです。' },
    { kind: 'story', emoji: 'city', text: 'Du findest den richtigen Ausgang und trittst hinaus: Neonlicht, Menschenmengen, unzählige Schilder. Deine Stadt-Reise hat begonnen.' },
  ] },
  { id: 'c8', title: 'Im Restaurant', steps: [
    { kind: 'story', emoji: 'food', text: 'In der Stadt wirst du hungrig. Du suchst dir ein Restaurant und setzt dich an einen Tisch.' },
    { kind: 'intro', emoji: 'food', jp: '食べます', reading: 'たべます', de: 'essen' },
    { kind: 'intro', emoji: 'food', jp: 'レストラン', reading: 'レストラン', de: 'Restaurant' },
    { kind: 'audio', say: 'たべます', options: ['食べます', '飲みます', '見ます'], answer: '食べます', de: 'essen' },
    { kind: 'story', emoji: 'food', text: 'Neu: 〜たいです drückt einen Wunsch aus. 食べます → 食べたいです = „ich möchte essen". 飲みます → 飲みたいです = „ich möchte trinken".' },
    { kind: 'gap', text: '魚を 食べ＿です。', prompt: '„Ich möchte Fisch essen." Welche Endung passt?', options: ['たい', 'ます', 'ません'], answer: 'たい', hint: '〜たいです = „möchte".' },
    { kind: 'build', prompt: 'Bilde: „Ich möchte Wasser trinken."', tiles: ['水', 'を', '飲みたい', 'です'], answer: ['水', 'を', '飲みたい', 'です'], tr: '水を飲みたいです。' },
    { kind: 'dialog', emoji: 'person', line: 'いらっしゃいませ！', prompt: 'Du möchtest Fisch essen. Was sagst du?', options: ['魚を 食べたいです。', 'さようなら。', '右です。'], answer: '魚を 食べたいです。', tr: 'Ich möchte Fisch essen.' },
    { kind: 'build', prompt: 'Bilde: „Ich möchte in Tokyo essen."', tiles: ['東京', 'で', '食べたい', 'です'], answer: ['東京', 'で', '食べたい', 'です'], tr: '東京で食べたいです。' },
    { kind: 'build', prompt: 'Bilde: „Ich esse im Restaurant."', tiles: ['レストラン', 'で', '食べます'], answer: ['レストラン', 'で', '食べます'], tr: 'レストランで食べます。' },
    { kind: 'story', emoji: 'fish', jp: '魚を食べました。', tr: 'Ich habe Fisch gegessen.' },
  ] },
  { id: 'c9', title: 'Im Konbini', steps: [
    { kind: 'story', emoji: 'city', text: 'Nach dem Essen brauchst du Wasser. Gleich um die Ecke leuchtet ein Konbini – ein kleiner Laden, rund um die Uhr offen.' },
    { kind: 'intro', emoji: 'mountain', jp: '大きい', reading: 'おおきい', de: 'groß' },
    { kind: 'intro', emoji: 'star', jp: '小さい', reading: 'ちいさい', de: 'klein' },
    { kind: 'audio', say: 'ちいさい', options: ['小さい', '大きい', '高い'], answer: '小さい', de: 'klein' },
    { kind: 'story', emoji: 'water', text: 'Neu: 〜が あります = „es gibt ~". 水が あります = „es gibt Wasser". Mit か wird daraus die Frage: 水が ありますか？' },
    { kind: 'gap', text: '水＿ あります。', prompt: '„Es gibt Wasser." Welche Partikel passt?', options: ['が', 'を', 'は'], answer: 'が', hint: '〜が あります = „es gibt ~".' },
    { kind: 'build', prompt: 'Bilde: „Es gibt einen Laden."', tiles: ['店', 'が', 'あります'], answer: ['店', 'が', 'あります'], tr: '店があります。' },
    { kind: 'dialog', emoji: 'person', line: 'いらっしゃいませ。', prompt: 'Du suchst Wasser und fragst die Person im Laden:', options: ['水が ありますか？', 'さようなら。', '大きいです。'], answer: '水が ありますか？', tr: 'Gibt es Wasser?' },
    { kind: 'build', prompt: 'Bilde: „Es gibt einen großen Laden."', tiles: ['大きい', '店', 'が', 'あります'], answer: ['大きい', '店', 'が', 'あります'], tr: '大きい店があります。' },
    { kind: 'build', prompt: 'Bilde: „Es gibt einen großen Fisch."', tiles: ['大きい', '魚', 'が', 'あります'], answer: ['大きい', '魚', 'が', 'あります'], tr: '大きい魚があります。' },
    { kind: 'story', emoji: 'city', jp: '小さい店です。', tr: 'Es ist ein kleiner Laden.' },
  ] },
  { id: 'c10', title: 'Mit der U-Bahn', steps: [
    { kind: 'story', emoji: 'train', text: 'Tokyo ist riesig – zu Fuß kommst du nicht weit. Du nimmst die U-Bahn. Im Bahnhof geht es treppauf und treppab.' },
    { kind: 'intro', emoji: 'map', jp: '上', reading: 'うえ', de: 'oben' },
    { kind: 'intro', emoji: 'map', jp: '下', reading: 'した', de: 'unten' },
    { kind: 'sign', sign: '下', prompt: 'Ein Pfeil mit diesem Zeichen zeigt…', options: ['nach unten', 'nach oben', 'geradeaus'], answer: 'nach unten' },
    { kind: 'audio', say: 'うえ', options: ['上', '下', '右'], answer: '上', de: 'oben' },
    { kind: 'story', emoji: 'train', text: 'Neu: 〜から = „von/ab", 〜まで = „bis". 駅から 東京まで = „vom Bahnhof bis Tokyo".' },
    { kind: 'gap', text: '駅＿ 東京まで。', prompt: '„Vom Bahnhof bis Tokyo." Welches Wort heißt „von/ab"?', options: ['から', 'まで', 'に'], answer: 'から', hint: '〜から = von/ab, 〜まで = bis.' },
    { kind: 'build', prompt: 'Bilde: „Ich gehe nach oben."', tiles: ['上', 'に', '行きます'], answer: ['上', 'に', '行きます'], tr: '上に行きます。' },
    { kind: 'dialog', emoji: 'person', line: 'きっぷは どこですか？', prompt: 'Jemand sucht die Fahrkarten – sie sind unten. Antworte:', options: ['下です。', '上です。', '魚です。'], answer: '下です。', tr: 'Unten.' },
    { kind: 'build', prompt: 'Bilde: „Ich fahre von Tokyo bis zum Bahnhof."', tiles: ['東京', 'から', '駅', 'まで', '行きます'], answer: ['東京', 'から', '駅', 'まで', '行きます'], tr: '東京から駅まで行きます。' },
    { kind: 'build', prompt: 'Bilde: „Unten gibt es einen Ausgang."', tiles: ['下', 'に', '出口', 'が', 'あります'], answer: ['下', 'に', '出口', 'が', 'あります'], tr: '下に出口があります。' },
    { kind: 'story', emoji: 'train', jp: '駅から東京まで行きます。', tr: 'Ich fahre vom Bahnhof bis Tokyo.' },
  ] },
  { id: 'c11', title: 'Schilder lesen', steps: [
    { kind: 'story', emoji: 'map', text: 'Überall Schilder. Du musst dringend zur Toilette – und lernst, die wichtigsten Zeichen zu erkennen.' },
    { kind: 'intro', emoji: 'person', jp: '男', reading: 'おとこ', de: 'Mann' },
    { kind: 'intro', emoji: 'person', jp: '女', reading: 'おんな', de: 'Frau' },
    { kind: 'intro', emoji: 'house', jp: 'トイレ', reading: 'トイレ', de: 'Toilette' },
    { kind: 'sign', sign: '男', prompt: 'Auf einer Toilettentür steht 男. Das ist…', options: ['Herren', 'Damen', 'Ausgang'], answer: 'Herren' },
    { kind: 'sign', sign: '女', prompt: 'Und auf der anderen Tür: 女. Das ist…', options: ['Damen', 'Herren', 'Eingang'], answer: 'Damen' },
    { kind: 'intro', emoji: 'house', jp: '中', reading: 'なか', de: 'Mitte / drinnen' },
    { kind: 'story', emoji: 'house', text: 'Neu: 〜の 中 = „in / innerhalb von ~". 店の 中 = „im Laden", 家の 中 = „im Haus".' },
    { kind: 'gap', text: '家の ＿に います。', prompt: '„Ich bin im Haus." Welches Wort passt?', options: ['中', '右', '上'], answer: '中', hint: '〜の 中 = im Inneren.' },
    { kind: 'dialog', emoji: 'person', line: 'トイレは どこですか？', prompt: 'Jemand sucht die Toilette – sie ist dort drüben. Antworte:', options: ['あそこです。', '魚です。', '大きいです。'], answer: 'あそこです。', tr: 'Dort drüben.' },
    { kind: 'build', prompt: 'Bilde: „Ich bin im Laden."', tiles: ['店', 'の', '中', 'に', 'います'], answer: ['店', 'の', '中', 'に', 'います'], tr: '店の中にいます。' },
    { kind: 'build', prompt: 'Bilde: „Die Toilette ist rechts."', tiles: ['トイレ', 'は', '右', 'です'], answer: ['トイレ', 'は', '右', 'です'], tr: 'トイレは右です。' },
    { kind: 'story', emoji: 'house', jp: 'トイレは中です。', tr: 'Die Toilette ist drinnen.' },
  ] },
  { id: 'c12', title: 'Beim Tempel', steps: [
    { kind: 'story', emoji: 'torii', text: 'Am Stadtrand liegt ein alter Tempel. Hinter dem roten Torii wird es still. Du möchtest diesen Moment festhalten.' },
    { kind: 'intro', emoji: 'torii', jp: '寺', reading: 'てら', de: 'Tempel' },
    { kind: 'intro', emoji: 'city', jp: 'カメラ', reading: 'カメラ', de: 'Kamera' },
    { kind: 'audio', say: 'てら', options: ['寺', '店', '家'], answer: '寺', de: 'Tempel' },
    { kind: 'story', emoji: 'party', text: 'Neu: 〜ましょう schlägt etwas vor: „lass uns ~". 行きます → 行きましょう = „lass uns gehen". 見ます → 見ましょう = „lass uns schauen".' },
    { kind: 'gap', text: '寺に 行き＿。', prompt: '„Lass uns zum Tempel gehen!" Welche Endung passt?', options: ['ましょう', 'ました', 'ません'], answer: 'ましょう', hint: '〜ましょう = „lass uns ~".' },
    { kind: 'build', prompt: 'Bilde: „Lass uns den Tempel anschauen."', tiles: ['寺', 'を', '見ましょう'], answer: ['寺', 'を', '見ましょう'], tr: '寺を見ましょう。' },
    { kind: 'dialog', emoji: 'person', line: 'しゃしんを とりましょうか？', prompt: 'Jemand bietet an, ein Foto von dir zu machen. Du freust dich:', options: ['はい、おねがいします。', 'いいえ。', 'たべます。'], answer: 'はい、おねがいします。', tr: 'Ja, bitte.' },
    { kind: 'build', prompt: 'Bilde: „Lass uns zum Tempel in Tokyo gehen."', tiles: ['東京', 'の', '寺', 'に', '行きましょう'], answer: ['東京', 'の', '寺', 'に', '行きましょう'], tr: '東京の寺に行きましょう。' },
    { kind: 'build', prompt: 'Bilde: „Es ist ein großer Tempel."', tiles: ['大きい', '寺', 'です'], answer: ['大きい', '寺', 'です'], tr: '大きい寺です。' },
    { kind: 'story', emoji: 'torii', jp: '寺はきれいです。', tr: 'Der Tempel ist schön.' },
  ] },
  { id: 'c13', title: 'Himmelsrichtungen', steps: [
    { kind: 'story', emoji: 'map', text: 'Am Tor des Tempels hängt eine Wegweiser-Tafel. Pfeile zeigen in alle vier Richtungen – Zeit, dich zu orientieren.' },
    { kind: 'intro', emoji: 'map', jp: '北', reading: 'きた', de: 'Norden' },
    { kind: 'intro', emoji: 'map', jp: '南', reading: 'みなみ', de: 'Süden' },
    { kind: 'intro', emoji: 'map', jp: '東', reading: 'ひがし', de: 'Osten' },
    { kind: 'intro', emoji: 'map', jp: '西', reading: 'にし', de: 'Westen' },
    { kind: 'sign', sign: '北', prompt: 'Ein Pfeil auf der Tafel zeigt dieses Zeichen. Welche Richtung ist das?', options: ['Norden', 'Süden', 'Westen'], answer: 'Norden' },
    { kind: 'audio', say: 'にし', options: ['西', '東', '南'], answer: '西', de: 'Westen' },
    { kind: 'story', emoji: 'map', text: 'Neu: 〜は 北です／南です／東です／西です sagt, wo etwas liegt. „駅は北です" = „Der Bahnhof liegt im Norden."' },
    { kind: 'gap', text: '駅は ＿です。', prompt: '„Der Bahnhof liegt im Süden." Welches Wort passt?', options: ['南', '北', '東'], answer: '南', hint: '南 = Süden.' },
    { kind: 'build', prompt: 'Bilde: „Der Tempel liegt im Osten."', tiles: ['寺', 'は', '東', 'です'], answer: ['寺', 'は', '東', 'です'], tr: '寺は東です。' },
    { kind: 'dialog', emoji: 'person', line: '駅は どちらですか？', prompt: 'Ein Wanderer fragt nach dem Bahnhof. Er liegt im Westen. Antworte:', options: ['西です。', '東です。', '北です。'], answer: '西です。', tr: 'Im Westen.' },
    { kind: 'story', emoji: 'map', jp: '寺(てら)は東(ひがし)です。', tr: 'Der Tempel liegt im Osten.', text: 'Mit der Karte in der Hand findest du die Richtung – weiter geht deine Reise.' },
  ] },
  { id: 'c14', title: 'Im Tempelgarten', steps: [
    { kind: 'story', emoji: 'torii', text: 'Hinter dem Tempel liegt ein stiller Garten. Dort soll die Tempelkatze schlafen – du machst dich auf die Suche.' },
    { kind: 'intro', emoji: 'torii', jp: '前', reading: 'まえ', de: 'vor' },
    { kind: 'intro', emoji: 'torii', jp: '後ろ', reading: 'うしろ', de: 'hinter' },
    { kind: 'intro', emoji: 'torii', jp: '隣', reading: 'となり', de: 'neben' },
    { kind: 'audio', say: 'まえ', options: ['前', '後ろ', '隣'], answer: '前', de: 'vor' },
    { kind: 'story', emoji: 'torii', text: 'Neu: Bei Lebewesen heißt „es gibt / ist da" 〜が います (nicht あります). 猫が います＝„Da ist eine Katze." Schon bekannt: 〜の上に＝auf/über ~, 〜の下に＝unter ~, 〜の中に＝in ~. Neu dazu: 〜の前に／後ろに／隣に＝vor／hinter／neben ~.' },
    { kind: 'gap', text: '寺の ＿に 猫が います。', prompt: '„Die Katze ist hinter dem Tempel." Welches Wort passt?', options: ['後ろ', '前', '隣'], answer: '後ろ', hint: '後ろ = hinter.' },
    { kind: 'build', prompt: 'Bilde: „Die Katze ist neben dem Tempel."', tiles: ['猫', 'は', '寺', 'の', '隣', 'です'], answer: ['猫', 'は', '寺', 'の', '隣', 'です'], tr: '猫は寺の隣です。' },
    { kind: 'dialog', emoji: 'person', line: '猫は どこですか？', prompt: 'Ein Mönch fragt nach der Katze. Sie liegt vor dem Tempel. Antworte:', options: ['寺の前です。', '寺の中です。', '右です。'], answer: '寺の前です。', tr: 'Vor dem Tempel.' },
    { kind: 'tf', emoji: 'cat', jp: '猫は寺の前です。', prompt: 'Stimmt es zum Bild?', answer: true },
    { kind: 'story', emoji: 'torii', jp: '猫(ねこ)は寺(てら)の前(まえ)です。', tr: 'Die Katze ist vor dem Tempel.', text: 'Du findest die Katze – sie schläft friedlich im Schatten des Tempels. Deine Reise durch Japan geht weiter.' },
  ] },
]
export const CHAPTER_BY_ID = Object.fromEntries(CHAPTERS.map(c => [c.id, c]))

// ─── Kapitel-Sternesystem (Kenntnisstand je Kapitel) ─────────────────────────
// Jedes Kapitel führt in seinen „intro"-Schritten Vokabeln ein. Diese Wörter
// werden zu SRS-Karten (Schlüssel = das jp-Wort) und tragen den Kenntnisstand:
//   1 Stern  = Kapitel abgeschlossen
//   2–5 Sterne = wachsen mit dem SRS-Kenntnisstand der Kapitel-Vokabeln
//   5 Sterne = alle Vokabeln „Gemeistert"
// Üben (Üben-Tab UND die Kapitel-Übung) bewertet dieselben Karten → hebt Sterne.
export const CHAPTER_WORD = Object.fromEntries(
  CHAPTERS.flatMap(c => c.steps.filter(s => s.kind === 'intro').map(s => [s.jp, { reading: s.reading, de: s.de }])),
)
