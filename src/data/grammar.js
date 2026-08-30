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
      { jp: 'これはお茶です。', kana: 'これはおちゃです。', de: 'Das ist Tee.', tokens: [
        { t: 'これ', r: 'これ', de: 'das / dies', b: 'Demonstrativpronomen' }, { t: 'は', r: 'wa', de: '(Thema)', b: 'Themenpartikel' }, { t: 'お茶', r: 'おちゃ', de: 'Tee', b: 'Nomen' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' } ] },
      { jp: '山は高いです。', kana: 'やまはたかいです。', de: 'Der Berg ist hoch.', tokens: [
        { t: '山', r: 'やま', de: 'Berg', b: 'Nomen' }, { t: 'は', r: 'wa', de: '(Thema)', b: 'Themenpartikel' }, { t: '高い', r: 'たかい', de: 'hoch', b: 'い-Adjektiv' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '山＿高いです。', a: 'は', options: ['は', 'を', 'に'], hint: 'は markiert das Thema: „Was den Berg betrifft – hoch."' },
      { q: 'これ＿お茶です。', a: 'は', options: ['は', 'が', 'で'], hint: 'A は B です = „A ist B".' },
          { q: 'これ＿山です。', a: 'は', options: ['は', 'が', 'を'], hint: '„Was das hier angeht: ein Berg." – は stellt das Thema voran.' },
      { q: 'Wie wird die Themen-Partikel は gelesen?', a: 'wa', options: ['wa', 'ha', 'wo'], hint: 'Als Partikel „wa", als normale Silbe „ha".' },
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
      { jp: '山です。', kana: 'やまです。', de: 'Es ist ein Berg.', tokens: [
        { t: '山', r: 'やま', de: 'Berg', b: 'Nomen' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' } ] },
      { jp: 'お茶ではありません。', kana: 'おちゃではありません。', de: 'Es ist kein Tee.', tokens: [
        { t: 'お茶', r: 'おちゃ', de: 'Tee', b: 'Nomen' }, { t: 'ではありません', de: 'ist nicht', b: 'Verneinung von です' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '山＿。 (Es ist ein Berg.)', a: 'です', options: ['です', 'ます', 'を'], hint: 'Nomen + です = „ist".' },
      { q: 'お茶＿。 (Es ist kein Tee.)', a: 'ではありません', options: ['ではありません', 'です', 'でした'], hint: 'Verneinung von です = ではありません.' },
          { q: 'これはお茶＿。 (Das ist Tee.)', a: 'です', options: ['です', 'ます', 'でした'], hint: 'ます gehört an Verben, です an Nomen und Adjektive.' },
      { q: '山＿。 (Es war ein Berg.)', a: 'でした', options: ['でした', 'です', 'ではありません'], hint: 'Nomen in der Vergangenheit: です → でした.' },
    ],
  },
  {
    id: 'g3', glyph: 'が', title: 'が – das Subjekt', summary: 'Wer/was etwas tut oder ist',
    body: [
      { text: 'が markiert das Subjekt – wer oder was etwas tut oder ist. Oft bei neuer Information sowie mit 好き, ある/いる und Adjektiven.' },
      { h: 'は vs が', text: 'は hebt das Thema hervor („was X betrifft …"), が betont das Subjekt selbst („gerade DIESES").' },
    ],
    examples: [
      { jp: '電車が来ます。', kana: 'でんしゃがきます。', de: 'Der Zug kommt.', tokens: [
        { t: '電車', r: 'でんしゃ', de: 'Zug', b: 'Nomen' }, { t: 'が', de: '(Subjekt)', b: 'Subjektpartikel' }, { t: '来ます', r: 'きます', de: 'kommen', b: 'Verb, höflich' }, { t: '。' } ] },
      { jp: 'お茶が好きです。', kana: 'おちゃがすきです。', de: 'Ich mag Tee.', tokens: [
        { t: 'お茶', r: 'おちゃ', de: 'Tee', b: 'Nomen' }, { t: 'が', de: '(Subjekt)', b: 'Partikel bei 好き' }, { t: '好き', r: 'すき', de: 'mögen', b: 'な-Adjektiv' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '電車＿来ます。', a: 'が', options: ['が', 'を', 'は'], hint: 'Das Subjekt (der Zug) wird mit が markiert.' },
      { q: 'お茶＿好きです。', a: 'が', options: ['が', 'を', 'に'], hint: 'Bei 好き steht das Gemochte mit が.' },
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
      { jp: 'お茶を飲みます。', kana: 'おちゃをのみます。', de: 'Ich trinke Tee.', tokens: [
        { t: 'お茶', r: 'おちゃ', de: 'Tee', b: 'Nomen' }, { t: 'を', r: 'o', de: '(Objekt)', b: 'Objektpartikel' }, { t: '飲みます', r: 'のみます', de: 'trinken', b: 'Verb, höflich' }, { t: '。' } ] },
      { jp: '山を見ます。', kana: 'やまをみます。', de: 'Ich schaue den Berg an.', tokens: [
        { t: '山', r: 'やま', de: 'Berg', b: 'Nomen' }, { t: 'を', r: 'o', de: '(Objekt)', b: 'Objektpartikel' }, { t: '見ます', r: 'みます', de: 'sehen / anschauen', b: 'Verb, höflich' }, { t: '。' } ] },
    ],
    exercises: [
      { q: 'お茶＿飲みます。', a: 'を', options: ['を', 'が', 'は'], hint: 'Das Objekt vor dem Verb → を.' },
      { q: '山＿見ます。', a: 'を', options: ['を', 'に', 'で'], hint: 'Was angeschaut wird, ist das Objekt → を.' },
          { q: 'これ＿見ます。', a: 'を', options: ['を', 'が', 'に'], hint: 'Was angeschaut wird, ist das direkte Objekt → を.' },
      { q: 'Wie wird die Objekt-Partikel を gesprochen?', a: 'o', options: ['o', 'wo', 'e'], hint: 'Geschrieben „wo", gesprochen „o".' },
    ],
  },
  {
    id: 'g5', glyph: 'に', title: 'に & で – Ort, Ziel, Mittel', summary: 'Wohin/wann (に) und wo/womit (で)',
    body: [
      { h: 'に', text: 'に zeigt Ziel/Richtung („wohin"), Zeitpunkt („wann") oder den Ort, an dem etwas existiert.' },
      { h: 'で', text: 'で zeigt den Ort einer Handlung („wo") oder das Mittel („womit").' },
    ],
    examples: [
      { jp: '駅に行きます。', kana: 'えきにいきます。', de: 'Ich gehe zum Bahnhof. (Ziel)', tokens: [
        { t: '駅', r: 'えき', de: 'Bahnhof', b: 'Nomen' }, { t: 'に', de: '(Richtung)', b: 'Richtungspartikel (wohin)' }, { t: '行きます', r: 'いきます', de: 'gehen / fahren', b: 'Verb, höflich' }, { t: '。' } ] },
      { jp: '電車で行きます。', kana: 'でんしゃでいきます。', de: 'Ich fahre mit dem Zug. (Mittel)', tokens: [
        { t: '電車', r: 'でんしゃ', de: 'Zug', b: 'Nomen' }, { t: 'で', de: '(Mittel)', b: 'Partikel: womit' }, { t: '行きます', r: 'いきます', de: 'gehen / fahren', b: 'Verb, höflich' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '駅＿行きます。', a: 'に', options: ['に', 'で', 'を'], hint: 'Ziel/Richtung („wohin") → に.' },
      { q: '電車＿行きます。', a: 'で', options: ['で', 'に', 'を'], hint: 'Mittel („womit") → で.' },
          { q: '山＿行きます。', a: 'に', options: ['に', 'で', 'を'], hint: 'Wohin es geht → に (oder へ).' },
      { q: '駅＿お茶を飲みます。', a: 'で', options: ['で', 'に', 'へ'], hint: 'Ort, an dem etwas PASSIERT → で.' },
      { q: 'Welche Partikel steht beim Ort, an dem etwas passiert?', a: 'で', options: ['で', 'に', 'へ'], hint: '駅で = am Bahnhof (dort geschieht es). 駅に = zum Bahnhof (dorthin).' },
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
          { q: '飲み＿。 (Ich trinke.)', a: 'ます', options: ['ます', 'ません', 'ました'], hint: 'Höfliche Gegenwart: die ます-Form selbst.' },
      { q: '行き＿。 (Ich ging nicht.)', a: 'ませんでした', options: ['ませんでした', 'ません', 'ました'], hint: 'Verneinte Vergangenheit = ません + でした.' },
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
          { q: '＿山です。 (ein hoher Berg)', a: '高い', options: ['高い', '高いな', '高く'], hint: 'い-Adjektive stehen unverändert vor dem Nomen.' },
      { q: '＿星です。 (ein schöner Stern)', a: 'きれいな', options: ['きれいな', 'きれい', 'きれいの'], hint: 'な-Adjektive brauchen な vor dem Nomen – daher der Name.' },
      { q: 'Welcher Adjektiv-Typ braucht な vor dem Nomen?', a: 'な-Adjektiv', options: ['な-Adjektiv', 'い-Adjektiv', 'beide'], hint: 'きれいな星, aber 高い山 – daher die Namen der beiden Typen.' },
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
          { q: '水です＿。 (Ist das Wasser?)', a: 'か', options: ['か', 'ね', 'よ'], hint: 'か macht aus jeder Aussage eine Frage.' },
      { q: 'Was ändert sich, wenn aus einer Aussage eine Frage wird?', a: 'か kommt ans Ende', options: ['か kommt ans Ende', 'Die Wortstellung dreht sich', 'Das Verb wandert nach vorn'], hint: 'Die Wortstellung bleibt gleich – nur か kommt dazu.' },
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
          { q: '猫＿犬。 (der Hund der Katze)', a: 'の', options: ['の', 'は', 'を'], hint: 'A の B – das Erste bestimmt das Zweite.' },
      { q: 'In A の B – was gehört wem?', a: 'B gehört zu A', options: ['B gehört zu A', 'A gehört zu B', 'beides gleich'], hint: 'Wie im Deutschen „As B": 私の犬 = mein Hund.' },
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
          { q: '„Ich trinke Tee." – Welcher Satz ist korrekt?', a: '私はお茶を飲みます。', options: ['私はお茶を飲みます。', '私は飲みますお茶を。', 'お茶は私を飲みます。'], hint: 'Subjekt – Objekt – Verb. Das Verb steht immer am Ende.' },
      { q: 'Was steht in 猫が魚を見ます ganz am Ende?', a: 'das Verb', options: ['das Verb', 'das Objekt', 'das Subjekt'], hint: 'Japanisch ist SOV – deshalb hört man das Verb zuletzt.' },
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
          { q: 'Wie lautet die て-Form von 食べます (essen)?', a: '食べて', options: ['食べて', '食べって', '食べんで'], hint: 'Bei 食べます wird ます einfach durch て ersetzt.' },
      { q: 'Wie lautet die て-Form von 見ます (sehen)?', a: '見て', options: ['見て', '見って', '見んで'], hint: 'Auch hier: ます → て.' },
      { q: '„Bitte trinken Sie Wasser." 水を飲んで＿。', a: 'ください', options: ['ください', 'です', 'ましょう'], hint: 'て-Form + ください = höfliche Bitte.' },
    ],
  },
  {
    id: 'g12', glyph: 'も', title: 'も – „auch"', summary: 'Ersetzt は/が: 私も = ich auch',
    body: [
      { text: 'も bedeutet „auch" und steht direkt nach dem Nomen. Wichtig: も ERSETZT die Partikel は oder が – sie fallen weg.' },
      { h: 'Muster', text: '私は学生です。友達も学生です。 = „Ich bin Student. Mein Freund ist auch Student."' },
    ],
    examples: [
      { jp: '私も学生です。', kana: 'わたしもがくせいです。', de: 'Ich bin auch Student.', tokens: [
        { t: '私', r: 'わたし', de: 'ich', b: 'Nomen' }, { t: 'も', de: 'auch', b: 'Partikel: ersetzt は/が' }, { t: '学生', r: 'がくせい', de: 'Student', b: 'Nomen' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' } ] },
      { jp: 'お茶も飲みます。', kana: 'おちゃものみます。', de: 'Ich trinke auch Tee.', tokens: [
        { t: 'お茶', r: 'おちゃ', de: 'Tee', b: 'Nomen' }, { t: 'も', de: 'auch', b: 'Partikel: ersetzt hier を' }, { t: '飲みます', r: 'のみます', de: 'trinken', b: 'Verb, höflich' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '友達＿学生です。 (Auch mein Freund ist Student.)', a: 'も', options: ['も', 'は', 'を'], hint: 'も ersetzt は: „auch mein Freund".' },
      { q: 'お茶＿飲みます。 (Ich trinke auch Tee.)', a: 'も', options: ['も', 'が', 'に'], hint: 'も ersetzt hier を.' },
          { q: '友達＿行きます。 (Auch mein Freund geht.)', a: 'も', options: ['も', 'は', 'が'], hint: 'も tritt an die Stelle von は/が.' },
      { q: 'Was passiert mit は, wenn も dazukommt?', a: 'は fällt weg', options: ['は fällt weg', 'は bleibt stehen', 'は wird zu が'], hint: 'Nie 私はも – nur 私も.' },
    ],
  },
  {
    id: 'g13', glyph: 'と', title: 'と & や – „und"', summary: 'Nomen verbinden: alle (と) oder Beispiele (や)',
    body: [
      { h: 'と', text: 'verbindet Nomen VOLLSTÄNDIG: 父と母 = „Vater und Mutter" (genau diese beiden, sonst niemand).' },
      { h: 'や', text: 'nennt nur BEISPIELE: りんごやバナナ = „Äpfel, Bananen und so weiter". Die Liste ist offen.' },
      { text: 'Beide verbinden nur Nomen – ganze Sätze verbindet man anders.' },
    ],
    examples: [
      { jp: '父と母がいます。', kana: 'ちちとははがいます。', de: 'Ich habe Vater und Mutter.', tokens: [
        { t: '父', r: 'ちち', de: '(mein) Vater', b: 'Nomen' }, { t: 'と', de: 'und (vollständig)', b: 'Partikel' }, { t: '母', r: 'はは', de: '(meine) Mutter', b: 'Nomen' }, { t: 'が', de: '(Subjekt)', b: 'Subjektpartikel' }, { t: 'います', de: 'da sein (Lebewesen)', b: 'Verb, höflich' }, { t: '。' } ] },
      { jp: 'りんごやバナナを買います。', kana: 'りんごやバナナをかいます。', de: 'Ich kaufe Äpfel, Bananen und so weiter.', tokens: [
        { t: 'りんご', de: 'Apfel', b: 'Nomen' }, { t: 'や', de: 'und (zum Beispiel)', b: 'Partikel: offene Aufzählung' }, { t: 'バナナ', de: 'Banane', b: 'Nomen' }, { t: 'を', de: '(Objekt)', b: 'Objektpartikel' }, { t: '買います', r: 'かいます', de: 'kaufen', b: 'Verb, höflich' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '父＿母がいます。 (genau die beiden)', a: 'と', options: ['と', 'や', 'を'], hint: 'Vollständige Aufzählung → と.' },
      { q: 'りんご＿バナナを買います。 (…und noch mehr)', a: 'や', options: ['や', 'と', 'に'], hint: 'Offene Aufzählung mit Beispielen → や.' },
          { q: '猫＿犬がいます。 (genau diese beiden)', a: 'と', options: ['と', 'や', 'も'], hint: 'と zählt vollständig auf.' },
      { q: 'Welche Partikel heißt „…und so weiter"?', a: 'や', options: ['や', 'と', 'も'], hint: 'や nennt Beispiele, と nennt alle.' },
    ],
  },
  {
    id: 'g14', glyph: 'へ', title: 'へ – die Richtung', summary: 'Wohin es geht (gesprochen „e")',
    body: [
      { text: 'へ markiert die Richtung („nach / zu"). Als Partikel wird へ „e" gesprochen – wie は→wa und を→o.' },
      { h: 'へ vs に', text: 'Bei „gehen/fahren nach X" sind beide richtig: へ betont den Weg dorthin, に das Ziel selbst.' },
    ],
    examples: [
      { jp: '公園へ行きます。', kana: 'こうえんへいきます。', de: 'Ich gehe zum Park.', tokens: [
        { t: '公園', r: 'こうえん', de: 'Park', b: 'Nomen' }, { t: 'へ', r: 'e', de: '(Richtung)', b: 'Richtungspartikel' }, { t: '行きます', r: 'いきます', de: 'gehen / fahren', b: 'Verb, höflich' }, { t: '。' } ] },
      { jp: '東京へ行きましょう。', kana: 'とうきょうへいきましょう。', de: 'Lass uns nach Tokyo fahren.', tokens: [
        { t: '東京', r: 'とうきょう', de: 'Tokyo', b: 'Nomen' }, { t: 'へ', r: 'e', de: '(Richtung)', b: 'Richtungspartikel' }, { t: '行きましょう', r: 'いきましょう', de: 'lass uns fahren', b: 'Vorschlagsform (〜ましょう)' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '公園＿行きます。 (Richtung, gesprochen „e")', a: 'へ', options: ['へ', 'を', 'が'], hint: 'Richtung → へ (に wäre auch möglich).' },
      { q: '„Lass uns nach Tokyo fahren!" 東京＿行きましょう。', a: 'へ', options: ['へ', 'を', 'の'], hint: 'Richtung → へ.' },
          { q: 'Wie wird die Richtungs-Partikel へ gelesen?', a: 'e', options: ['e', 'he', 'we'], hint: 'Als Partikel „e" – wie は als „wa".' },
      { q: '駅＿行きます。 (Richtung Bahnhof)', a: 'へ', options: ['へ', 'を', 'が'], hint: 'へ betont die Richtung, に das Ziel.' },
    ],
  },
  {
    id: 'g15', glyph: '時', title: '何時ですか – die Uhrzeit', summary: 'Zahl + 時, halb = 半, Zeitpunkt + に',
    body: [
      { text: 'Zahl + 時(じ) = Uhrzeit: 一時 (1 Uhr), 三時 (3 Uhr) … Achtung: 9 Uhr = 九時(くじ), nicht きゅうじ. „Wie viel Uhr?" = 何時(なんじ)ですか。' },
      { h: '半', text: '半(はん) nach der Uhrzeit = „halb NACH": 九時半 = 9:30 (deutsch: halb zehn!).' },
      { h: 'に', text: 'Der Zeitpunkt einer Handlung bekommt に: 九時に行きます = „Ich gehe um 9 Uhr."' },
    ],
    examples: [
      { jp: '今、三時です。', kana: 'いま、さんじです。', de: 'Es ist jetzt 3 Uhr.', tokens: [
        { t: '今', r: 'いま', de: 'jetzt', b: 'Zeitwort' }, { t: '、' }, { t: '三時', r: 'さんじ', de: '3 Uhr', b: 'Zahl + 時' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' } ] },
      { jp: '九時半に行きます。', kana: 'くじはんにいきます。', de: 'Ich gehe um 9:30.', tokens: [
        { t: '九時', r: 'くじ', de: '9 Uhr', b: 'Zahl + 時 (Sonderlesung くじ)' }, { t: '半', r: 'はん', de: 'halb (nach)', b: 'Nomen' }, { t: 'に', de: '(Zeitpunkt)', b: 'Partikel: um ~' }, { t: '行きます', r: 'いきます', de: 'gehen', b: 'Verb, höflich' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '今、何＿ですか。 (Wie viel Uhr ist es?)', a: '時', options: ['時', '円', '番'], hint: '何時(なんじ) = „wie viel Uhr".' },
      { q: '九時＿行きます。 (Ich gehe um 9.)', a: 'に', options: ['に', 'を', 'は'], hint: 'Zeitpunkt + に.' },
      { q: '9:30 = 九時＿', a: '半', options: ['半', '分', '中'], hint: '〜時半 = halb nach ~.' },
          { q: '七時 – wie liest man das?', a: 'しちじ', options: ['しちじ', 'ななじ', 'しちとき'], hint: 'Bei Uhrzeiten heißt 7 immer しち, nicht なな.' },
    ],
  },
  {
    id: 'g16', glyph: 'た', title: 'Vergangenheit: でした & かった', summary: 'Nomen + でした · い-Adjektiv → 〜かったです',
    body: [
      { h: 'Nomen & な-Adjektive', text: 'です → でした: 雨でした = „es war Regen". きれいでした = „es war schön".' },
      { h: 'い-Adjektive', text: 'Das い fällt weg, dann 〜かったです: 高い → 高かったです = „war hoch/teuer". Achtung: NICHT 高いでした!' },
      { text: 'Verben kennst du schon: 〜ました (飲みました = trank).' },
    ],
    examples: [
      { jp: '昨日は雨でした。', kana: 'きのうはあめでした。', de: 'Gestern war Regen.', tokens: [
        { t: '昨日', r: 'きのう', de: 'gestern', b: 'Zeitwort' }, { t: 'は', r: 'wa', de: '(Thema)', b: 'Themenpartikel' }, { t: '雨', r: 'あめ', de: 'Regen', b: 'Nomen' }, { t: 'でした', de: 'war', b: 'Vergangenheit von です' }, { t: '。' } ] },
      { jp: '山は高かったです。', kana: 'やまはたかかったです。', de: 'Der Berg war hoch.', tokens: [
        { t: '山', r: 'やま', de: 'Berg', b: 'Nomen' }, { t: 'は', r: 'wa', de: '(Thema)', b: 'Themenpartikel' }, { t: '高かった', r: 'たかかった', de: 'war hoch', b: 'い-Adjektiv, Vergangenheit' }, { t: 'です', de: '(höflich)', b: 'höfliche Kopula' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '昨日は暑＿です。 (Gestern war es heiß.)', a: 'かった', options: ['かった', 'い', 'でした'], hint: 'い-Adjektiv: い weg → 〜かったです.' },
      { q: '花火はきれい＿。 (Das Feuerwerk war schön.)', a: 'でした', options: ['でした', 'かったです', 'です'], hint: 'きれい ist ein な-Adjektiv → でした.' },
          { q: '山は高＿です。 (Der Berg war hoch.)', a: 'かった', options: ['かった', 'い', 'でした'], hint: 'い-Adjektiv in der Vergangenheit: 〜い → 〜かったです.' },
      { q: 'お茶＿。 (Es war Tee.)', a: 'でした', options: ['でした', 'かったです', 'です'], hint: 'Nomen: です → でした. Nie 学生かったです.' },
    ],
  },
  {
    id: 'g17', glyph: 'ね', title: 'ね & よ – Satzgefühl', summary: 'ね sucht Zustimmung, よ gibt Neues',
    body: [
      { h: 'ね', text: 'am Satzende = „nicht wahr?" – man teilt einen Eindruck: いい天気ですね。 Zustimmen: そうですね = „ja, stimmt".' },
      { h: 'よ', text: 'am Satzende betont eine Info, die der andere noch nicht weiß: おいしいですよ = „(glaub mir,) das ist lecker!"' },
    ],
    examples: [
      { jp: 'いい天気ですね。', kana: 'いいてんきですね。', de: 'Schönes Wetter, nicht wahr?', tokens: [
        { t: 'いい', de: 'gut', b: 'Adjektiv (Sonderform)' }, { t: '天気', r: 'てんき', de: 'Wetter', b: 'Nomen' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: 'ね', de: 'nicht wahr?', b: 'Satzendpartikel: Zustimmung suchen' }, { t: '。' } ] },
      { jp: 'お茶はおいしいですよ。', kana: 'おちゃはおいしいですよ。', de: 'Der Tee ist (wirklich) lecker!', tokens: [
        { t: 'お茶', r: 'おちゃ', de: 'Tee', b: 'Nomen' }, { t: 'は', r: 'wa', de: '(Thema)', b: 'Themenpartikel' }, { t: 'おいしい', de: 'lecker', b: 'い-Adjektiv' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: 'よ', de: '(neue Info!)', b: 'Satzendpartikel: Hinweis geben' }, { t: '。' } ] },
    ],
    exercises: [
      { q: 'Ihr schaut beide in den blauen Himmel: いい天気です＿。', a: 'ね', options: ['ね', 'よ', 'か'], hint: 'Gemeinsamer Eindruck → ね.' },
      { q: 'Du empfiehlst deinem Freund den Tee: おいしいです＿。', a: 'よ', options: ['よ', 'ね', 'か'], hint: 'Neue Info für den anderen → よ.' },
          { q: 'Dein Freund weiß es noch nicht, du sagst es ihm: 電車が来ます＿。', a: 'よ', options: ['よ', 'ね', 'か'], hint: 'よ bringt neue Information.' },
      { q: 'Ihr esst beide dasselbe und es schmeckt: おいしいです＿。', a: 'ね', options: ['ね', 'よ', 'か'], hint: 'ね sucht Zustimmung zu etwas, das beide erleben.' },
    ],
  },
  {
    id: 'g18', glyph: '好', title: '好きです – mögen', summary: '〜が好きです · auch 分かります & 上手 mit が',
    body: [
      { text: '„X mögen" = Xが好き(すき)です. Das Gemochte steht mit が, nicht mit を!' },
      { h: 'Gleiches Muster', text: 'が steht auch bei 分かります (verstehen) und 上手(じょうず)です (gut können): 日本語が分かります。歌が上手です。' },
    ],
    examples: [
      { jp: '猫が好きです。', kana: 'ねこがすきです。', de: 'Ich mag Katzen.', tokens: [
        { t: '猫', r: 'ねこ', de: 'Katze', b: 'Nomen' }, { t: 'が', de: '(das Gemochte)', b: 'Partikel bei 好き' }, { t: '好き', r: 'すき', de: 'mögen', b: 'な-Adjektiv' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' } ] },
      { jp: '日本語が分かります。', kana: 'にほんごがわかります。', de: 'Ich verstehe Japanisch.', tokens: [
        { t: '日本語', r: 'にほんご', de: 'Japanisch', b: 'Nomen' }, { t: 'が', de: '(das Verstandene)', b: 'Partikel bei 分かる' }, { t: '分かります', r: 'わかります', de: 'verstehen', b: 'Verb, höflich' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '猫＿好きです。', a: 'が', options: ['が', 'を', 'は'], hint: 'Das Gemochte steht mit が.' },
      { q: '日本語＿分かります。', a: 'が', options: ['が', 'を', 'に'], hint: 'Wie bei 好き: mit が.' },
          { q: '魚＿好きですか。', a: 'が', options: ['が', 'を', 'は'], hint: 'Bei 好きです steht das Gemochte mit が – nicht mit を.' },
      { q: 'Welche Partikel steht vor 好きです?', a: 'が', options: ['が', 'を', 'に'], hint: 'Wörtlich: „X ist mir angenehm" – deshalb が.' },
    ],
  },
  {
    id: 'g19', glyph: '何', title: 'Fragewörter', summary: '何・だれ・いつ・どこ + か am Ende',
    body: [
      { text: '何(なに/なん) = was · だれ = wer · いつ = wann · どこ = wo (kennst du schon) · 何時(なんじ) = wie viel Uhr · 何色(なにいろ) = welche Farbe.' },
      { h: 'Muster', text: 'Fragewort an die Stelle der Antwort setzen, か ans Ende: これは何ですか。 = „Was ist das?"' },
    ],
    examples: [
      { jp: 'これは何ですか。', kana: 'これはなんですか。', de: 'Was ist das?', tokens: [
        { t: 'これ', de: 'das / dies', b: 'Demonstrativpronomen' }, { t: 'は', r: 'wa', de: '(Thema)', b: 'Themenpartikel' }, { t: '何', r: 'なん', de: 'was', b: 'Fragewort' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: 'か', de: '(Frage)', b: 'Fragepartikel' }, { t: '。' } ] },
      { jp: 'あの人はだれですか。', kana: 'あのひとはだれですか。', de: 'Wer ist diese Person (dort)?', tokens: [
        { t: 'あの', de: 'jene(r) dort', b: 'Demonstrativwort (weiter weg)' }, { t: '人', r: 'ひと', de: 'Mensch / Person', b: 'Nomen' }, { t: 'は', r: 'wa', de: '(Thema)', b: 'Themenpartikel' }, { t: 'だれ', de: 'wer', b: 'Fragewort' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: 'か', de: '(Frage)', b: 'Fragepartikel' }, { t: '。' } ] },
    ],
    exercises: [
      { q: 'これは＿ですか。 (Was ist das?)', a: '何', options: ['何', 'だれ', 'いつ'], hint: '何 = was.' },
      { q: '＿行きますか。 (Wann gehst du?)', a: 'いつ', options: ['いつ', 'どこ', 'だれ'], hint: 'いつ = wann.' },
          { q: '＿行きますか。 (Wohin gehst du?)', a: 'どこ', options: ['どこ', 'いつ', '何'], hint: 'どこ fragt nach dem Ort.' },
      { q: 'これは＿の犬ですか。 (Wessen Hund ist das?)', a: 'だれ', options: ['だれ', '何', 'いつ'], hint: 'だれの = wessen.' },
      { q: 'Was steht bei einer Frage mit Fragewort am Satzende?', a: 'か', options: ['か', 'ね', 'よ'], hint: 'Auch mit Fragewort braucht es das か.' },
    ],
  },
  {
    id: 'g20', glyph: 'ませ', title: '〜ませんか – Einladungen', summary: '„Wollen wir nicht ~?" · Zusage: ましょう',
    body: [
      { text: '〜ませんか lädt höflich ein: 行きませんか = „Wollen wir nicht hingehen?" Wörtlich eine verneinte Frage – wie im Deutschen: „Wollen wir nicht …?"' },
      { h: 'Zusage', text: 'Mit 〜ましょう (kennst du vom Tempel): はい、行きましょう！ = „Ja, gehen wir!"' },
    ],
    examples: [
      { jp: 'いっしょに歌いませんか。', kana: 'いっしょにうたいませんか。', de: 'Wollen wir nicht zusammen singen?', tokens: [
        { t: 'いっしょに', de: 'zusammen', b: 'Adverb (一緒に)' }, { t: '歌いません', r: 'うたいません', de: 'nicht singen', b: 'verneinte ます-Form' }, { t: 'か', de: '(Frage)', b: 'Fragepartikel → Einladung' }, { t: '。' } ] },
      { jp: 'お茶を飲みませんか。', kana: 'おちゃをのみませんか。', de: 'Wollen wir nicht einen Tee trinken?', tokens: [
        { t: 'お茶', r: 'おちゃ', de: 'Tee', b: 'Nomen' }, { t: 'を', de: '(Objekt)', b: 'Objektpartikel' }, { t: '飲みません', r: 'のみません', de: 'nicht trinken', b: 'verneinte ます-Form' }, { t: 'か', de: '(Frage)', b: 'Fragepartikel → Einladung' }, { t: '。' } ] },
    ],
    exercises: [
      { q: 'いっしょに行き＿か。 (Wollen wir nicht zusammen gehen?)', a: 'ません', options: ['ません', 'ます', 'ました'], hint: 'Einladung: 〜ませんか.' },
      { q: 'Die Zusage: はい、行き＿！', a: 'ましょう', options: ['ましょう', 'ません', 'ますか'], hint: 'Zusagen mit 〜ましょう.' },
          { q: 'お茶を飲み＿か。 (Wollen wir nicht Tee trinken?)', a: 'ません', options: ['ません', 'ます', 'ましょう'], hint: 'Die verneinte Frage ist im Japanischen die höfliche Einladung.' },
      { q: '„Ja, lass uns essen!" 食べ＿！', a: 'ましょう', options: ['ましょう', 'ません', 'ました'], hint: 'ましょう = „lass uns ~".' },
    ],
  },
  {
    id: 'g21', glyph: 'てい', title: '〜ています – gerade dabei', summary: 'て-Form + います = Verlaufsform',
    body: [
      { text: 'て-Form (aus „Bitten") + います = etwas passiert GERADE: 食べています = „isst gerade", 見ています = „schaut gerade".' },
      { h: 'Bildung', text: '食べます → 食べて + います。 飲みます → 飲んで + います。 Die て-Form trägt keine Zeit – います macht daraus „jetzt gerade".' },
    ],
    examples: [
      { jp: '花火を見ています。', kana: 'はなびをみています。', de: 'Ich schaue gerade das Feuerwerk.', tokens: [
        { t: '花火', r: 'はなび', de: 'Feuerwerk', b: 'Nomen' }, { t: 'を', de: '(Objekt)', b: 'Objektpartikel' }, { t: '見て', r: 'みて', de: 'schauen (て-Form)', b: 'て-Form von 見ます' }, { t: 'います', de: '(gerade dabei)', b: 'Verlaufsform: て + います' }, { t: '。' } ] },
      { jp: 'ご飯を食べています。', kana: 'ごはんをたべています。', de: 'Ich esse gerade.', tokens: [
        { t: 'ご飯', r: 'ごはん', de: 'Essen / Reis', b: 'Nomen' }, { t: 'を', de: '(Objekt)', b: 'Objektpartikel' }, { t: '食べて', r: 'たべて', de: 'essen (て-Form)', b: 'て-Form von 食べます' }, { t: 'います', de: '(gerade dabei)', b: 'Verlaufsform: て + います' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '花火を見＿います。 (Ich schaue gerade.)', a: 'て', options: ['て', 'に', 'を'], hint: 'て-Form + います.' },
      { q: '„Ich trinke gerade." 飲ん＿います。', a: 'で', options: ['で', 'て', 'に'], hint: '飲みます → 飲んで (んで-Muster).' },
          { q: '食べ＿います。 (Ich esse gerade.)', a: 'て', options: ['て', 'で', 'に'], hint: '食べます → 食べて + います.' },
      { q: '水を飲ん＿います。 (Ich trinke gerade Wasser.)', a: 'で', options: ['で', 'て', 'に'], hint: '飲みます wird zu 飲んで – daher で, nicht て.' },
    ],
  },
  {
    id: 'g22', glyph: 'より', title: 'より – Vergleiche', summary: 'AはBより〜 = „A ist ~er als B"',
    body: [
      { text: 'AはBより高いです = „A ist höher als B". より steht nach dem VERGLICHENEN (dem „als B").' },
      { h: 'Favorit', text: '„~ mag ich lieber" = 〜のほうが好きです: 山のほうが好きです = „Die Berge mag ich lieber."' },
    ],
    examples: [
      { jp: '電車はバスより速いです。', kana: 'でんしゃはバスよりはやいです。', de: 'Der Zug ist schneller als der Bus.', tokens: [
        { t: '電車', r: 'でんしゃ', de: 'Zug', b: 'Nomen' }, { t: 'は', r: 'wa', de: '(Thema)', b: 'Themenpartikel' }, { t: 'バス', de: 'Bus', b: 'Nomen' }, { t: 'より', de: 'als ~', b: 'Partikel: Vergleichspunkt' }, { t: '速い', r: 'はやい', de: 'schnell', b: 'い-Adjektiv' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' } ] },
      { jp: '山のほうが好きです。', kana: 'やまのほうがすきです。', de: 'Die Berge mag ich lieber.', tokens: [
        { t: '山', r: 'やま', de: 'Berg', b: 'Nomen' }, { t: 'のほうが', de: 'eher ~ / lieber ~', b: 'Favorit hervorheben' }, { t: '好き', r: 'すき', de: 'mögen', b: 'な-Adjektiv' }, { t: 'です', de: 'ist', b: 'höfliche Kopula' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '電車はバス＿速いです。 (schneller als der Bus)', a: 'より', options: ['より', 'まで', 'から'], hint: 'より nach dem Vergleichspunkt.' },
      { q: '電車はタクシー＿速いです。 (schneller als das Taxi)', a: 'より', options: ['より', 'へ', 'で'], hint: 'B より = „als B".' },
          { q: 'タクシーはバス＿高いです。 (teurer als der Bus)', a: 'より', options: ['より', 'から', 'まで'], hint: 'より steht hinter dem Verglichenen.' },
      { q: 'In „AはBより〜" – wer ist „mehr"?', a: 'A', options: ['A', 'B', 'beide gleich'], hint: 'Das Thema (A) gewinnt den Vergleich.' },
    ],
  },
  {
    id: 'g23', glyph: '枚', title: '助数詞 – Zähleinheiten', summary: 'Zahl + Zählwort statt nackter Zahl',
    body: [
      { text: 'Auf Japanisch reicht eine nackte Zahl vor einem Nomen nicht – dazwischen steht ein Zählwort (助数詞), das von der FORM des Gezählten abhängt: Personen, flache Dinge, lange Dinge, Tassen … Ohne das passende Zählwort klingt ein Satz unvollständig, egal wie gut sonst der Rest sitzt.' },
      { h: 'Der Alleskönner: つ', text: 'Kennst du das passende Zählwort nicht, hilft fast immer die つ-Reihe (außer bei Menschen, Tieren und langen dünnen Dingen): ひとつ・ふたつ・みっつ・よっつ・いつつ・むっつ・ななつ・やっつ・ここのつ・とお (1–10). Komplett unregelmäßig – am besten als feste Reihe auswendig lernen.' },
      { h: 'Die wichtigsten Zählwörter', text: '人/名 für Personen (名 ist die höfliche Variante, z. B. im Restaurant) · 枚 für flache Dinge (Tickets, Hemden, Blätter) · 本 für lange, dünne Dinge (Flaschen, Stifte – kennst du schon als 本 „Buch") · 杯 für Getränke in Tassen/Gläsern · 階 für Stockwerke · 個 für kleine, generische Dinge.' },
      { h: 'Achtung: unregelmäßige Lesungen', text: 'Zahl und Zählwort verschmelzen oft lautlich, besonders bei 1, 3, 6, 8, 10: aus ほん (本) wird bei 1 いっぽん, bei 3 さんぼん, bei 6 ろっぽん. Dasselbe Muster gilt für 杯 (はい → いっぱい, さんばい, ろっぱい) und für 階 nur bei 3 (かい → さんがい). Am Anfang reicht es, die Zahlen 1–3 pro Zählwort mitzulernen – der Rest kommt mit der Zeit.' },
    ],
    examples: [
      { jp: 'きっぷを2枚ください。', kana: 'きっぷをにまいください。', de: 'Zwei Fahrkarten, bitte.', tokens: [
        { t: 'きっぷ', de: 'Fahrkarte', b: 'Nomen' }, { t: 'を', de: '(Objekt)', b: 'Objektpartikel' }, { t: '2枚', r: 'にまい', de: 'zwei Stück (flach)', b: 'Zahl + Zählwort 枚 (regelmäßig)' }, { t: 'ください', de: 'bitte geben Sie mir', b: 'höfliche Bitte' }, { t: '。' } ] },
      { jp: 'ビールを3本お願いします。', kana: 'ビールをさんぼんおねがいします。', de: 'Drei Bier(-flaschen), bitte.', tokens: [
        { t: 'ビール', de: 'Bier', b: 'Nomen' }, { t: 'を', de: '(Objekt)', b: 'Objektpartikel' }, { t: '3本', r: 'さんぼん', de: 'drei Stück (lang/dünn)', b: 'Zahl + Zählwort 本 – unregelmäßig: ほん→ぼん bei 3' }, { t: 'お願いします', r: 'おねがいします', de: 'bitte', b: 'höfliche Bitte' }, { t: '。' } ] },
    ],
    exercises: [
      { q: 'きっぷを2＿ください。 (Zwei Fahrkarten)', a: '枚', options: ['枚', '本', '人'], hint: 'Flache Dinge (Tickets, Karten, Hemden) → 枚.' },
      { q: 'コーヒーを1＿ください。 (Welches Zählwort für eine Tasse?)', a: '杯', options: ['杯', '個', '枚'], hint: 'Getränke in Tassen/Gläsern → 杯.' },
      { q: '一本 (eine Flasche) – wie liest man das?', a: 'いっぽん', options: ['いっぽん', 'いちほん', 'いちぼん'], hint: 'ほん wird nach 1 zu っぽん (unregelmäßig).' },
      { q: '三本 (drei Flaschen) – wie liest man das?', a: 'さんぼん', options: ['さんぼん', 'さんほん', 'さんぽん'], hint: 'ほん wird nach 3 stimmhaft zu ぼん.' },
    ],
  },
  {
    id: 'g24', glyph: '在', title: 'あります & います – „es gibt"', summary: 'あります für Dinge, います für Lebewesen',
    body: [
      { text: 'Für „es gibt / ist vorhanden" hat das Japanische zwei Verben – je nachdem, ob etwas lebt oder nicht.' },
      { h: 'Die Regel', text: 'あります für Dinge, Pflanzen und Abstraktes. います für Menschen und Tiere. Beides mit が: トイレが あります。' },
      { h: 'Wo?', text: 'Der Ort steht mit に davor: ここに トイレが あります。 – „Hier gibt es eine Toilette." Genau der Satz, den man auf Reisen am häufigsten braucht.' },
    ],
    examples: [
      { jp: 'ここにトイレがあります。', kana: 'ここにトイレがあります。', de: 'Hier gibt es eine Toilette.', tokens: [
        { t: 'ここ', de: 'hier', b: 'Ortswort' }, { t: 'に', de: 'an/in', b: 'Partikel – Ort' }, { t: 'トイレ', de: 'Toilette', b: 'Nomen' }, { t: 'が', de: '(Subjekt)', b: 'Partikel – Subjekt' }, { t: 'あります', de: 'gibt es', b: 'Verb – für Dinge' }, { t: '。' } ] },
      { jp: 'あそこに猫がいます。', kana: 'あそこにねこがいます。', de: 'Dort ist eine Katze.', tokens: [
        { t: 'あそこ', de: 'dort (weiter weg)', b: 'Ortswort' }, { t: 'に', de: 'an/in', b: 'Partikel – Ort' }, { t: '猫', r: 'ねこ', de: 'Katze', b: 'Nomen' }, { t: 'が', de: '(Subjekt)', b: 'Partikel – Subjekt' }, { t: 'います', de: 'ist da', b: 'Verb – für Lebewesen' }, { t: '。' } ] },
    ],
    exercises: [
      { q: 'ここにトイレが＿。 (Hier gibt es eine Toilette.)', a: 'あります', options: ['あります', 'います', 'です'], hint: 'Eine Toilette lebt nicht → あります.' },
      { q: 'ここに猫が＿。 (Hier ist eine Katze.)', a: 'います', options: ['います', 'あります', 'です'], hint: 'Tiere leben → います.' },
      { q: 'Welches Verb gilt für Menschen?', a: 'います', options: ['います', 'あります', 'beide'], hint: 'Menschen und Tiere: います.' },
      { q: 'ここ＿トイレがあります。 (Ortsangabe)', a: 'に', options: ['に', 'を', 'で'], hint: 'Der Ort der Existenz steht mit に.' },
      { q: 'トイレ＿あります。 (Welche Partikel vor あります?)', a: 'が', options: ['が', 'を', 'は'], hint: 'Was existiert, steht mit が.' },
    ],
  },
  {
    id: 'g25', glyph: '欲', title: '〜たいです – „ich möchte"', summary: 'ます weg, たいです dran: 食べたいです',
    body: [
      { text: 'Um zu sagen, was man möchte, hängt man an den Verbstamm 〜たいです. Der Verbstamm ist die ます-Form ohne ます.' },
      { h: 'Bildung', text: '食べます → 食べ + たいです = 食べたいです („ich möchte essen"). 行きます → 行きたいです. 見ます → 見たいです.' },
      { h: 'Achtung', text: '〜たい verhält sich wie ein い-Adjektiv: verneint 食べたくないです, in der Vergangenheit 食べたかったです. Und: Man sagt es nur über SICH SELBST – bei anderen wäre es anmaßend.' },
    ],
    examples: [
      { jp: 'お茶が飲みたいです。', kana: 'おちゃがのみたいです。', de: 'Ich möchte Tee trinken.', tokens: [
        { t: 'お茶', r: 'おちゃ', de: 'Tee', b: 'Nomen' }, { t: 'が', de: '(Objekt bei たい)', b: 'Partikel – bei 〜たい oft が statt を' }, { t: '飲みたい', r: 'のみたい', de: 'möchte trinken', b: '飲みます + たい' }, { t: 'です', de: '(höflich)', b: 'Kopula' }, { t: '。' } ] },
      { jp: '東京へ行きたいです。', kana: 'とうきょうへいきたいです。', de: 'Ich möchte nach Tokyo fahren.', tokens: [
        { t: '東京', r: 'とうきょう', de: 'Tokyo', b: 'Ortsname' }, { t: 'へ', r: 'え', de: 'nach', b: 'Partikel – Richtung' }, { t: '行きたい', r: 'いきたい', de: 'möchte gehen/fahren', b: '行きます + たい' }, { t: 'です', de: '(höflich)', b: 'Kopula' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '食べ＿です。 (Ich möchte essen.)', a: 'たい', options: ['たい', 'ます', 'ました'], hint: 'Verbstamm + たいです.' },
      { q: '行きます → „ich möchte gehen" =', a: '行きたいです', options: ['行きたいです', '行くたいです', '行きますたい'], hint: 'ます weg, たいです dran.' },
      { q: '„Ich möchte nicht essen." 食べ＿です。', a: 'たくない', options: ['たくない', 'たいない', 'たくありません'], hint: '〜たい ist ein い-Adjektiv: たい → たくない.' },
      { q: 'Über wen sagt man 〜たいです?', a: 'über sich selbst', options: ['über sich selbst', 'über andere', 'über beide'], hint: 'Fremde Wünsche kann man nicht kennen – dafür gibt es andere Formen.' },
    ],
  },
  {
    id: 'g26', glyph: '可', title: '〜てもいいですか – „darf ich?"', summary: 'て-Form + もいいですか = um Erlaubnis fragen',
    body: [
      { text: 'Die höfliche Art, um Erlaubnis zu bitten: て-Form + もいいですか。 Wörtlich „ist es auch gut, wenn ich ~?".' },
      { h: 'Bildung', text: '見ます → 見て → 見てもいいですか。 („Darf ich schauen?") 入ります → 入って → 入ってもいいですか。' },
      { h: 'Die Antwort', text: 'Ja: はい、どうぞ。 („Ja, bitte.") Nein: すみません、ちょっと… – ein direktes „nein" gilt als unhöflich; das ちょっと reicht völlig.' },
    ],
    examples: [
      { jp: '写真を撮ってもいいですか。', kana: 'しゃしんをとってもいいですか。', de: 'Darf ich ein Foto machen?', tokens: [
        { t: '写真', r: 'しゃしん', de: 'Foto', b: 'Nomen' }, { t: 'を', r: 'お', de: '(Objekt)', b: 'Partikel – Objekt' }, { t: '撮って', r: 'とって', de: 'machen (て-Form)', b: 'て-Form von 撮ります' }, { t: 'もいいですか', de: 'darf ich?', b: 'Erlaubnis-Frage' }, { t: '。' } ] },
      { jp: 'ここに座ってもいいですか。', kana: 'ここにすわってもいいですか。', de: 'Darf ich mich hierher setzen?', tokens: [
        { t: 'ここ', de: 'hier', b: 'Ortswort' }, { t: 'に', de: 'auf/an', b: 'Partikel – Ziel' }, { t: '座って', r: 'すわって', de: 'setzen (て-Form)', b: 'て-Form von 座ります' }, { t: 'もいいですか', de: 'darf ich?', b: 'Erlaubnis-Frage' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '見＿もいいですか。 (Darf ich schauen?)', a: 'て', options: ['て', 'ます', 'た'], hint: 'Erlaubnis fragt man mit der て-Form.' },
      { q: 'Was heißt 食べてもいいですか?', a: 'Darf ich essen?', options: ['Darf ich essen?', 'Ich möchte essen.', 'Bitte iss.'], hint: '〜てもいいですか = um Erlaubnis bitten.' },
      { q: 'Die freundliche Zusage lautet:', a: 'はい、どうぞ。', options: ['はい、どうぞ。', 'いいえ、だめです。', 'そうですか。'], hint: 'どうぞ = „bitte sehr, nur zu".' },
      { q: 'Wie lehnt man höflich ab?', a: 'すみません、ちょっと…', options: ['すみません、ちょっと…', 'いいえ。', 'だめ！'], hint: 'Ein direktes Nein gilt als unhöflich – ちょっと… genügt.' },
    ],
  },
  {
    id: 'g27', glyph: '禁', title: '〜てはいけません – „man darf nicht"', summary: 'て-Form + はいけません = Verbot (auf Schildern häufig)',
    body: [
      { text: 'Das Gegenstück zur Erlaubnis: て-Form + はいけません = „das darf man nicht". Auf Schildern steht oft die kürzere Form 〜ないでください („bitte nicht ~").' },
      { h: 'Bildung', text: '入ります → 入って → 入ってはいけません。 („Eintritt verboten.") 撮ります → 撮ってはいけません。 („Fotografieren verboten.")' },
      { h: 'Auf Reisen', text: 'Diese Formen liest man selten selbst laut – aber man muss sie ERKENNEN: in Tempeln, Museen und Zügen hängen sie überall.' },
    ],
    examples: [
      { jp: 'ここで写真を撮ってはいけません。', kana: 'ここでしゃしんをとってはいけません。', de: 'Hier darf man nicht fotografieren.', tokens: [
        { t: 'ここ', de: 'hier', b: 'Ortswort' }, { t: 'で', de: 'an/in', b: 'Partikel – Ort der Handlung' }, { t: '写真', r: 'しゃしん', de: 'Foto', b: 'Nomen' }, { t: 'を', r: 'お', de: '(Objekt)', b: 'Partikel – Objekt' }, { t: '撮って', r: 'とって', de: 'machen (て-Form)', b: 'て-Form von 撮ります' }, { t: 'はいけません', de: 'darf man nicht', b: 'Verbot' }, { t: '。' } ] },
      { jp: 'ここに入ってはいけません。', kana: 'ここにはいってはいけません。', de: 'Hier darf man nicht hinein.', tokens: [
        { t: 'ここ', de: 'hier', b: 'Ortswort' }, { t: 'に', de: 'hinein', b: 'Partikel – Ziel' }, { t: '入って', r: 'はいって', de: 'hineingehen (て-Form)', b: 'て-Form von 入ります' }, { t: 'はいけません', de: 'darf man nicht', b: 'Verbot' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '入っ＿いけません。 (Man darf nicht hinein.)', a: 'ては', options: ['ては', 'ても', 'てから'], hint: '〜てはいけません = Verbot, 〜てもいいです = Erlaubnis.' },
      { q: 'Was heißt 撮ってはいけません?', a: 'Fotografieren verboten', options: ['Fotografieren verboten', 'Bitte fotografieren', 'Darf ich fotografieren?'], hint: 'いけません = „geht nicht / darf nicht".' },
      { q: 'Welche Endung erlaubt, welche verbietet?', a: 'てもいい = erlaubt, てはいけない = verboten', options: ['てもいい = erlaubt, てはいけない = verboten', 'beide erlauben', 'beide verbieten'], hint: 'も = auch/schon in Ordnung, は + いけません = so nicht.' },
      { q: 'Auf einem Schild steht 入らないでください。 Das heißt:', a: 'Bitte nicht hineingehen.', options: ['Bitte nicht hineingehen.', 'Bitte hineingehen.', 'Hier ist der Eingang.'], hint: '〜ないでください = höfliche Bitte, etwas NICHT zu tun.' },
    ],
  },
  {
    id: 'g28', glyph: '故', title: '〜から – „weil"', summary: 'Grund + から, dann die Folge',
    body: [
      { text: 'から nach einem vollständigen Satz heißt „weil". Anders als im Deutschen steht der GRUND zuerst, die Folge danach.' },
      { h: 'Bildung', text: '暑いですから、水を飲みます。 – „Weil es heiß ist, trinke ich Wasser." Wörtlich: „Es ist heiß, deshalb trinke ich Wasser."' },
      { h: 'Kurzantwort', text: 'から kann auch allein am Ende stehen, als Begründung auf eine Frage: どうして？ – 高いですから。 („Warum?" – „Weil es teuer ist.")' },
    ],
    examples: [
      { jp: '暑いですから、水を飲みます。', kana: 'あついですから、みずをのみます。', de: 'Weil es heiß ist, trinke ich Wasser.', tokens: [
        { t: '暑い', r: 'あつい', de: 'heiß', b: 'い-Adjektiv' }, { t: 'です', de: '(höflich)', b: 'Kopula' }, { t: 'から', de: 'weil', b: 'Partikel – Grund' }, { t: '、' }, { t: '水', r: 'みず', de: 'Wasser', b: 'Nomen' }, { t: 'を', r: 'お', de: '(Objekt)', b: 'Partikel – Objekt' }, { t: '飲みます', r: 'のみます', de: 'trinke', b: 'Verb – ます-Form' }, { t: '。' } ] },
      { jp: '安いですから、買います。', kana: 'やすいですから、かいます。', de: 'Weil es billig ist, kaufe ich es.', tokens: [
        { t: '安い', r: 'やすい', de: 'billig', b: 'い-Adjektiv' }, { t: 'です', de: '(höflich)', b: 'Kopula' }, { t: 'から', de: 'weil', b: 'Partikel – Grund' }, { t: '、' }, { t: '買います', r: 'かいます', de: 'kaufe', b: 'Verb – ます-Form' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '暑いです＿、水を飲みます。 (weil)', a: 'から', options: ['から', 'まで', 'より'], hint: 'から nach dem Grund.' },
      { q: 'Was steht im Japanischen ZUERST?', a: 'der Grund', options: ['der Grund', 'die Folge', 'egal'], hint: 'Grund + から, dann die Folge – umgekehrt zum deutschen „weil"-Satz am Ende.' },
      { q: 'どうしてですか。 – 高いです＿。 (Weil es teuer ist.)', a: 'から', options: ['から', 'ので', 'ね'], hint: 'から kann als Kurzantwort allein stehen.' },
      { q: 'Was heißt 高いですから、買いません。?', a: 'Weil es teuer ist, kaufe ich es nicht.', options: ['Weil es teuer ist, kaufe ich es nicht.', 'Es ist teuer, aber ich kaufe es.', 'Ist es teuer? Ich kaufe es nicht.'], hint: 'から = weil; 買いません = kaufe nicht.' },
    ],
  },
  {
    id: 'g29', glyph: '申', title: '〜ましょうか – „soll ich?"', summary: 'Hilfe anbieten: 持ちましょうか',
    body: [
      { text: 'ましょう kennst du schon als „lass uns ~". Mit か daran wird daraus ein Angebot: „Soll ich ~?"' },
      { h: 'Der Unterschied', text: '行きましょう。 = „Lass uns gehen." · 行きましょうか。 = „Sollen wir gehen?" / „Soll ich gehen?" Das か macht aus dem Vorschlag eine Frage.' },
      { h: 'Auf Reisen', text: 'Sehr nützlich, um Hilfe anzubieten – oder um zu verstehen, wenn jemand SIE dir anbietet: 手伝いましょうか。 („Soll ich helfen?")' },
    ],
    examples: [
      { jp: '手伝いましょうか。', kana: 'てつだいましょうか。', de: 'Soll ich helfen?', tokens: [
        { t: '手伝い', r: 'てつだい', de: 'helfen', b: 'Verbstamm von 手伝います' }, { t: 'ましょう', de: 'lass uns / soll ich', b: 'Vorschlagsform' }, { t: 'か', de: '(Frage)', b: 'Partikel – Frage' }, { t: '。' } ] },
      { jp: '窓を開けましょうか。', kana: 'まどをあけましょうか。', de: 'Soll ich das Fenster öffnen?', tokens: [
        { t: '窓', r: 'まど', de: 'Fenster', b: 'Nomen' }, { t: 'を', r: 'お', de: '(Objekt)', b: 'Partikel – Objekt' }, { t: '開け', r: 'あけ', de: 'öffnen', b: 'Verbstamm von 開けます' }, { t: 'ましょう', de: 'soll ich', b: 'Vorschlagsform' }, { t: 'か', de: '(Frage)', b: 'Partikel – Frage' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '手伝いましょう＿。 (Soll ich helfen?)', a: 'か', options: ['か', 'ね', 'よ'], hint: 'Erst das か macht aus dem Vorschlag ein Angebot.' },
      { q: 'Was ist der Unterschied zwischen 行きましょう und 行きましょうか?', a: 'か fragt statt vorzuschlagen', options: ['か fragt statt vorzuschlagen', 'kein Unterschied', 'か verneint'], hint: 'ましょう = lass uns; ましょうか = sollen wir / soll ich?' },
      { q: '„Soll ich das Fenster öffnen?" 窓を開け＿か。', a: 'ましょう', options: ['ましょう', 'ません', 'ました'], hint: 'Verbstamm + ましょうか.' },
      { q: 'Jemand sagt zu dir 手伝いましょうか。 Was passiert?', a: 'Er bietet dir Hilfe an', options: ['Er bietet dir Hilfe an', 'Er bittet dich um Hilfe', 'Er hat schon geholfen'], hint: 'Ein Angebot – die passende Antwort wäre はい、おねがいします。' },
    ],
  },
  {
    id: 'g30', glyph: '辞', title: 'Die Wörterbuchform', summary: 'Die Grundform des Verbs – Basis für vieles',
    body: [
      { text: 'Bisher kennst du Verben nur in der höflichen ます-Form. Im Wörterbuch stehen sie aber in ihrer Grundform – der Wörterbuchform (じしょけい).' },
      { h: 'Die zwei Gruppen', text: 'Verben auf 〜えます/〜います mit einer Silbe davor (食べます, 見ます) → ます wird zu る: 食べる, 見る. Alle anderen (飲みます, 行きます) → das い der ます-Silbe wird zu う: 飲む, 行く.' },
      { h: 'Wozu?', text: 'Die Wörterbuchform ist unhöflich unter Fremden – aber sie ist der Baustein für „können", „wenn" und vieles mehr. Und ohne sie findet man ein Verb im Wörterbuch nicht.' },
    ],
    examples: [
      { jp: '食べます。食べる。', kana: 'たべます。たべる。', de: 'essen (höflich / Grundform)', tokens: [
        { t: '食べます', r: 'たべます', de: 'esse (höflich)', b: 'ます-Form' }, { t: '。' }, { t: '食べる', r: 'たべる', de: 'essen', b: 'Wörterbuchform' }, { t: '。' } ] },
      { jp: '飲みます。飲む。', kana: 'のみます。のむ。', de: 'trinken (höflich / Grundform)', tokens: [
        { t: '飲みます', r: 'のみます', de: 'trinke (höflich)', b: 'ます-Form' }, { t: '。' }, { t: '飲む', r: 'のむ', de: 'trinken', b: 'Wörterbuchform' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '食べます → Wörterbuchform =', a: '食べる', options: ['食べる', '食べう', '食べく'], hint: 'ます → る bei 食べます.' },
      { q: '飲みます → Wörterbuchform =', a: '飲む', options: ['飲む', '飲る', '飲みる'], hint: 'み → む: das い wird zu う.' },
      { q: '行きます → Wörterbuchform =', a: '行く', options: ['行く', '行る', '行きる'], hint: 'き → く.' },
      { q: 'Wann benutzt man die Wörterbuchform NICHT?', a: 'als höfliche Anrede an Fremde', options: ['als höfliche Anrede an Fremde', 'im Wörterbuch', 'unter Freunden'], hint: 'Fremden gegenüber bleibt es bei der ます-Form.' },
    ],
  },
  {
    id: 'g31', glyph: '能', title: '〜ことができます – „können"', summary: 'Wörterbuchform + ことができます',
    body: [
      { text: 'Um zu sagen, dass man etwas kann, hängt man an die Wörterbuchform ことができます.' },
      { h: 'Bildung', text: '食べる → 食べることができます („ich kann essen"). 話す → 話すことができます. Verneint: 〜ことができません.' },
      { h: 'Kurzform', text: 'Bei Nomen geht es kürzer: 日本語ができます。 – „Ich kann Japanisch." Das braucht man auf Reisen ständig.' },
    ],
    examples: [
      { jp: '日本語を話すことができます。', kana: 'にほんごをはなすことができます。', de: 'Ich kann Japanisch sprechen.', tokens: [
        { t: '日本語', r: 'にほんご', de: 'Japanisch', b: 'Nomen' }, { t: 'を', r: 'お', de: '(Objekt)', b: 'Partikel – Objekt' }, { t: '話す', r: 'はなす', de: 'sprechen', b: 'Wörterbuchform' }, { t: 'ことができます', de: 'kann', b: 'Fähigkeit' }, { t: '。' } ] },
      { jp: '英語ができません。', kana: 'えいごができません。', de: 'Ich kann kein Englisch.', tokens: [
        { t: '英語', r: 'えいご', de: 'Englisch', b: 'Nomen' }, { t: 'が', de: '(Subjekt)', b: 'Partikel – bei できます' }, { t: 'できません', de: 'kann nicht', b: 'Verneinung von できます' }, { t: '。' } ] },
    ],
    exercises: [
      { q: '食べる＿ができます。 (Ich kann essen.)', a: 'こと', options: ['こと', 'もの', 'とき'], hint: 'Wörterbuchform + ことができます.' },
      { q: 'Welche Verbform steht vor ことができます?', a: 'die Wörterbuchform', options: ['die Wörterbuchform', 'die ます-Form', 'die て-Form'], hint: 'Darum lohnt sich die Wörterbuchform.' },
      { q: '„Ich kann kein Japanisch." 日本語が＿。', a: 'できません', options: ['できません', 'できます', 'ありません'], hint: 'Kurzform bei Nomen: 〜ができます / できません.' },
      { q: '日本語ができますか。 heißt:', a: 'Können Sie Japanisch?', options: ['Können Sie Japanisch?', 'Sprechen Sie bitte Japanisch.', 'Ich lerne Japanisch.'], hint: 'Genau die Frage, die einem auf Reisen gestellt wird.' },
    ],
  },
]

// Grammatik-Reihenfolge identisch zur Reise (Satz-Grundgerüst zuerst).
export const GRAMMAR_ORDER = ['g2', 'g1', 'g6', 'g3', 'g4', 'g5', 'g7', 'g8', 'g9', 'g10', 'g23', 'g12', 'g13', 'g14', 'g15', 'g16', 'g17', 'g18', 'g19', 'g20', 'g11', 'g21', 'g22', 'g24', 'g25', 'g26', 'g27', 'g28', 'g29', 'g30', 'g31']
export const GRAMMAR_SEQ = GRAMMAR_ORDER.map(id => GRAMMAR.find(g => g.id === id))

export const GRAMMAR_GLYPH = Object.fromEntries(GRAMMAR.map(g => [g.id, g.glyph]))
