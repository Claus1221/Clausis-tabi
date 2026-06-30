// ─── Grammatik-Themen ────────────────────────────────────────────────────────
// Jedes Thema: Glyphe, Titel, Kurzbeschreibung, Erklärungs-Abschnitte (body),
// Beispiele (jp/kana/de + antippbare tokens) und Anwendungs-Übungen (exercises).
// Beispiel-Tokens: { t: Text, r: Lesung, de: Bedeutung, b: Aufbau } – Tokens ohne
// „de" (z. B. 。) sind nicht antippbar. Übung: { q: Satz mit ＿, a: Lösung,
// options: [..], hint: Erklärung }. Themen schalten der Reihe nach frei.
export const GRAMMAR = [
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
      { q: 'Jemand fragt nach dem Berg. Du sprichst über DIESES Thema weiter: 山＿高いです。', a: 'は', options: ['は', 'が'], hint: 'Thema aufgreifen/fortführen → は.' },
      { q: 'Du zeigst zum ersten Mal auf einen Berg: „Schau, der ist aber hoch!" 山＿高いです。', a: 'が', options: ['は', 'が'], hint: 'Neue, hervorgehobene Information → が.' },
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
      { jp: '飲みます。', kana: 'のみます。', de: 'Ich trinke. (Gegenwart)', tokens: [
        { t: '飲みます', r: 'のみます', de: 'trinke', b: 'ます-Form (Gegenwart)' }, { t: '。' } ] },
      { jp: '飲みません。', kana: 'のみません。', de: 'Ich trinke nicht. (Verneinung)', tokens: [
        { t: '飲みません', r: 'のみません', de: 'trinke nicht', b: 'verneinte ます-Form' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '飲み＿。 (Ich trinke nicht.)', a: 'ません', options: ['ません', 'ます', 'ました'], hint: 'Verneinung: 〜ません.' },
      { q: '飲み＿。 (Ich trank.)', a: 'ました', options: ['ました', 'ます', 'ません'], hint: 'Vergangenheit: 〜ました.' },
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
      { jp: '猫の目。', kana: 'ねこのめ。', de: 'Das Auge der Katze.', tokens: [
        { t: '猫', r: 'ねこ', de: 'Katze', b: 'Nomen' }, { t: 'の', de: 'von / -s', b: 'Verbindungspartikel' }, { t: '目', r: 'め', de: 'Auge', b: 'Nomen' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '私＿犬。 (mein Hund)', a: 'の', options: ['の', 'は', 'が'], hint: 'A の B = „Bs A": 私 の 犬.' },
      { q: '猫＿目。 (das Auge der Katze)', a: 'の', options: ['の', 'に', 'で'], hint: 'の verbindet die zwei Nomen.' },
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
  {
    id: 'g11', glyph: 'て', title: 'die て-Form: Bitten', summary: 'Verb-て + ください = „Bitte tu ~"',
    body: [
      { text: 'Die て-Form ist eine Verb-Form ohne eigene Zeit – sie verbindet Sätze oder bildet zusammen mit ください eine höfliche Bitte: „Bitte tu ~".' },
      { h: 'Bildung', text: 'Je nach Verb-Endung ändert sich das Muster (て / って / んで / いて). Am Anfang lohnt es sich, die て-Form einzelner Verben einfach mitzulernen.' },
      { h: 'Beispiele', text: '食べます → 食べて (ます einfach durch て ersetzen). 飲みます → 飲んで (み-Verben → んで). 行きます → 行って (Ausnahme! nicht „行いて").' },
    ],
    examples: [
      { jp: '食べてください。', kana: 'たべてください。', de: 'Bitte iss / essen Sie.', tokens: [
        { t: '食べて', r: 'たべて', de: 'iss (て-Form)', b: 'て-Form von 食べます' }, { t: 'ください', de: 'bitte (Aufforderung)', b: 'höfliche Bitte' }, { t: '。' } ] },
      { jp: '飲んでください。', kana: 'のんでください。', de: 'Bitte trinken Sie.', tokens: [
        { t: '飲んで', r: 'のんで', de: 'trink (て-Form)', b: 'て-Form von 飲みます' }, { t: 'ください', de: 'bitte (Aufforderung)', b: 'höfliche Bitte' }, { t: '。' } ] },
    ],
    exercises: [
      { q: 'Wie lautet die て-Form von 飲みます (trinken)?', a: '飲んで', options: ['飲んで', '飲みて', '飲んだ'], hint: 'み-Verben (のむ) → んで, nicht みて.' },
      { q: 'Wie lautet die て-Form von 行きます (gehen)? (Achtung: Ausnahme!)', a: '行って', options: ['行って', '行いて', '行きて'], hint: '行く ist eine Ausnahme: 行って, nicht 行いて.' },
    ],
  },
]

// Grammatik-Reihenfolge identisch zur Reise (Satz-Grundgerüst zuerst).
export const GRAMMAR_ORDER = ['g2', 'g1', 'g6', 'g3', 'g4', 'g5', 'g7', 'g8', 'g9', 'g10', 'g11']
export const GRAMMAR_SEQ = GRAMMAR_ORDER.map(id => GRAMMAR.find(g => g.id === id))

export const GRAMMAR_GLYPH = Object.fromEntries(GRAMMAR.map(g => [g.id, g.glyph]))
