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
export const DIALOGS = [
  { section: '到着', sub: 'Ankunft in Japan' },
  { id: 'd1', title: 'Begrüßung', goal: 'Begrüße jemanden und stell dich vor.', emoji: 'hello', scaffold: 'voll', turns: [
    { npc: 'こんにちは！', de: 'Guten Tag!', options: ['こんにちは。', 'さようなら。', 'すみません。'], answer: 'こんにちは。' },
    { npc: 'おなまえは？', de: 'Wie heißen Sie?', options: ['クラウスです。', 'いくらですか？', 'みぎです。'], answer: 'クラウスです。' },
    { npc: 'どちらから？', de: 'Woher kommen Sie?', options: ['ドイツからです。', 'たべます。', 'たかいです。'], answer: 'ドイツからです。' },
  ] },
  { id: 'd2', title: 'Mit dem Taxi', goal: 'Lass dich zum Hotel fahren.', emoji: 'taxi', scaffold: 'voll', turns: [
    { npc: 'どちらまで？', de: 'Wohin?', options: ['ホテルまで おねがいします。', 'いただきます。', 'おやすみなさい。'], answer: 'ホテルまで おねがいします。' },
    { npc: 'わかりました。', de: 'Verstanden.', options: ['ありがとうございます。', 'たすけて！', 'たかいです。'], answer: 'ありがとうございます。' },
    { npc: 'つきましたよ。', de: 'Wir sind da.', options: ['いくらですか？', 'おはよう。', 'さかなです。'], answer: 'いくらですか？' },
  ] },
  { section: 'ホテル', sub: 'Im Hotel' },
  { id: 'd3', title: 'Check-in', goal: 'Checke im Hotel ein.', emoji: 'hotel', scaffold: 'voll', turns: [
    { npc: 'いらっしゃいませ。', de: 'Willkommen.', options: ['チェックイン おねがいします。', 'メニューを ください。', 'みぎです。'], answer: 'チェックイン おねがいします。' },
    { npc: 'おなまえを おねがいします。', de: 'Ihren Namen, bitte.', options: ['クラウスです。', 'みずです。', 'やすいです。'], answer: 'クラウスです。' },
    { npc: 'パスポートを おねがいします。', de: 'Ihren Pass, bitte.', options: ['はい、どうぞ。', 'いいえ、けっこうです。', 'たべません。'], answer: 'はい、どうぞ。' },
  ] },
  { id: 'dr1', review: true, title: 'Wiederholung 1', goal: 'Gemischte Wechsel aus Ankunft & Hotel.', emoji: 'star', from: ['d1', 'd2', 'd3'] },
  { section: '食事', sub: 'Essen & Trinken' },
  { id: 'd4', title: 'Im Restaurant', goal: 'Bestelle Essen und bitte um die Rechnung.', emoji: 'food', scaffold: 'mittel', turns: [
    { npc: 'いらっしゃいませ！', de: 'Willkommen!', options: ['こんにちは。', 'さようなら。', 'いくらですか？'], answer: 'こんにちは。' },
    { npc: 'ごちゅうもんは？', de: 'Ihre Bestellung?', options: ['メニューを ください。', 'たすけて！', 'みぎです。'], answer: 'メニューを ください。' },
    { npc: 'おのみものは？', de: 'Etwas zu trinken?', options: ['おみずを ください。', 'さようなら。', 'わかりません。'], answer: 'おみずを ください。' },
    { npc: 'はい、なんでしょう？', de: 'Ja, bitte?', options: ['おかいけい おねがいします。', 'こんばんは。', 'たかいです。'], answer: 'おかいけい おねがいします。' },
  ] },
  { id: 'd5', title: 'Im Café', goal: 'Bestelle einen Kaffee.', emoji: 'coffee', scaffold: 'mittel', turns: [
    { npc: 'いらっしゃいませ。', de: 'Willkommen.', options: ['コーヒーを ください。', 'えきは どこですか？', 'たすけて！'], answer: 'コーヒーを ください。' },
    { npc: 'ホットですか、アイスですか？', de: 'Heiß oder kalt?', options: ['ホットで おねがいします。', 'みぎです。', 'さようなら。'], answer: 'ホットで おねがいします。' },
    { npc: 'いじょうで よろしいですか？', de: 'Ist das alles?', options: ['はい、いじょうです。', 'いくらですか？', 'たべません。'], answer: 'はい、いじょうです。' },
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

// ─── Wort-Lexikon fürs Rollenspiel ───────────────────────────────────────────
// Jede Dialog-Zeile wird per Längsten-Treffer in einzelne Wörter zerlegt; tippt
// man eines an, zeigt TappableJp Bedeutung (de) + Aufbau/Wortart (b) und – wo
// hilfreich – die Lesung (r). Längere Einträge gewinnen, damit feste Wendungen
// (おねがいします, ありがとうございます) zusammenbleiben, Partikeln aber einzeln
// erklärbar sind (ホテル + まで). Was nicht im Lexikon steht, bleibt untippbar.
export const DIALOG_LEX = {
  // Begrüßung & Floskeln
  'こんにちは': { de: 'Guten Tag / Hallo', b: 'Begrüßung' },
  'こんばんは': { de: 'Guten Abend', b: 'Begrüßung' },
  'おはよう': { de: 'Guten Morgen (locker)', b: 'Begrüßung' },
  'さようなら': { de: 'Auf Wiedersehen', b: 'Verabschiedung' },
  'おやすみなさい': { de: 'Gute Nacht', b: 'Verabschiedung' },
  'すみません': { de: 'Entschuldigung / Verzeihung', b: 'Höflichkeitsformel' },
  'ありがとうございます': { de: 'Vielen Dank', b: 'Dankesformel (höflich)' },
  'ありがとうございました': { de: 'Vielen Dank (für Geschehenes)', b: 'Dankesformel, Vergangenheit' },
  'どうも': { de: 'Danke / Hallo (kurz)', b: 'lockere Floskel' },
  'おねがいします': { de: 'Bitte (eine Bitte äußern)', b: 'höfliche Bitte', r: 'onegai shimasu' },
  'いらっしゃいませ': { de: 'Herzlich willkommen', b: 'Begrüßung im Geschäft' },
  'いただきます': { de: 'Ich fange an zu essen', b: 'Floskel vor dem Essen' },
  'どうぞ': { de: 'Bitte (etwas anbieten/reichen)', b: 'Höflichkeitsfloskel' },
  'はい': { de: 'Ja', b: 'Antwortpartikel' },
  'いいえ': { de: 'Nein', b: 'Antwortpartikel' },
  'けっこう': { de: 'genug / danke, nein (Ablehnung)', b: 'な-Adjektiv (結構)' },
  'だいじょうぶ': { de: 'in Ordnung / alles gut', b: 'な-Adjektiv (大丈夫)' },
  'たすけて': { de: 'Hilfe!', b: 'Verb 助ける, て-Form (Ruf/Bitte)' },
  'たすかります': { de: 'das hilft mir sehr', b: 'Verb 助かる, höflich' },
  'じゃあ': { de: 'also / dann', b: 'Konjunktion (locker)' },
  'それから': { de: 'und dann / danach', b: 'Konjunktion' },
  'まっすぐ': { de: 'geradeaus', b: 'Adverb (真っ直ぐ)' },
  'いっしょに': { de: 'zusammen', b: 'Adverb (一緒に)' },
  'よろしい': { de: 'in Ordnung / gut (höflich)', b: 'い-Adjektiv (höflich)' },
  'なんでしょう': { de: 'Was darf es sein? / Ja, bitte?', b: 'höfliche Frage' },
  'きを': { de: 'auf (sich) achten – き=Achtsamkeit + を', b: 'aus 気をつけて' },
  'つけて': { de: 'achte / pass auf', b: 'Verb つける, て-Form' },
  // Nomen
  'おなまえ': { de: '(Ihr) Name', b: 'Nomen, höflich (お＋名前)', r: 'o-namae' },
  'クラウス': { de: 'Klaus (Name)', b: 'Eigenname', r: 'kurausu' },
  'ドイツ': { de: 'Deutschland', b: 'Ländername', r: 'doitsu' },
  'ホテル': { de: 'Hotel', b: 'Nomen', r: 'hoteru' },
  'えき': { de: 'Bahnhof', b: 'Nomen (駅)' },
  'おみず': { de: 'Wasser', b: 'Nomen, höflich (お＋水)' },
  'みず': { de: 'Wasser', b: 'Nomen (水)' },
  'さかな': { de: 'Fisch', b: 'Nomen (魚)' },
  'メニュー': { de: 'Speisekarte', b: 'Nomen', r: 'menyuu' },
  'コーヒー': { de: 'Kaffee', b: 'Nomen', r: 'koohii' },
  'パスポート': { de: 'Reisepass', b: 'Nomen', r: 'pasupooto' },
  'カード': { de: 'Karte (Kreditkarte)', b: 'Nomen', r: 'kaado' },
  'チェックイン': { de: 'Check-in', b: 'Nomen', r: 'chekku-in' },
  'ごちゅうもん': { de: 'Bestellung', b: 'Nomen, höflich (ご＋注文)' },
  'おのみもの': { de: 'Getränk', b: 'Nomen, höflich (お＋飲み物)' },
  'おかいけい': { de: 'Rechnung', b: 'Nomen, höflich (お＋会計)' },
  'ホット': { de: 'heiß (Getränk)', b: 'Nomen (engl. hot)', r: 'hotto' },
  'アイス': { de: 'kalt / Eis (Getränk)', b: 'Nomen (engl. ice)', r: 'aisu' },
  'いじょう': { de: 'das ist alles / Ende', b: 'Nomen (以上)' },
  'とうきょう': { de: 'Tokyo', b: 'Ortsname (東京)' },
  'かたみち': { de: 'einfache Fahrt', b: 'Nomen (片道)' },
  'おうふく': { de: 'Hin- und Rückfahrt', b: 'Nomen (往復)' },
  'みち': { de: 'Weg', b: 'Nomen (道)' },
  'みぎ': { de: 'rechts', b: 'Richtung (右)' },
  'にせん': { de: 'zweitausend', b: 'Zahl (二千)' },
  'せん': { de: 'tausend', b: 'Zahl (千)' },
  'えん': { de: 'Yen', b: 'Währung (円)' },
  // Frage- & Demonstrativwörter
  'いくら': { de: 'wie viel (Preis)', b: 'Fragewort' },
  'どこ': { de: 'wo', b: 'Fragewort' },
  'どちら': { de: 'wohin / woher / welches (höflich)', b: 'Fragewort (höflich)' },
  'これ': { de: 'das / dies (hier)', b: 'Demonstrativpronomen' },
  // Adjektive
  'たかい': { de: 'teuer / hoch', b: 'い-Adjektiv (高い)' },
  'やすい': { de: 'günstig / billig', b: 'い-Adjektiv (安い)' },
  'おいしい': { de: 'lecker', b: 'い-Adjektiv (美味しい)' },
  // Verben
  'たべます': { de: '(ich) esse', b: 'Verb 食べる, höflich' },
  'たべません': { de: '(ich) esse nicht', b: 'Verb 食べる, höflich verneint' },
  'わかりました': { de: 'verstanden', b: 'Verb 分かる, höflich Vergangenheit' },
  'わかりません': { de: '(ich) verstehe nicht / weiß nicht', b: 'Verb 分かる, höflich verneint' },
  'いきましょう': { de: 'gehen wir', b: 'Verb 行く, Vorschlagsform (～ましょう)' },
  'まよいました': { de: 'habe mich verirrt', b: 'Verb 迷う, höflich Vergangenheit' },
  'つきました': { de: '(wir) sind angekommen', b: 'Verb 着く, höflich Vergangenheit' },
  'ください': { de: 'bitte geben Sie mir …', b: 'höfliche Bitte (ください)' },
  'どうしました': { de: 'Was ist passiert?', b: 'Verb する, höflich Vergangenheit' },
  // Kopula & Partikeln
  'です': { de: 'ist / sind', b: 'höfliche Kopula' },
  'は': { de: '(Thema: „was … betrifft")', b: 'Themenpartikel', r: 'wa' },
  'を': { de: '(Objekt)', b: 'Objektpartikel', r: 'o' },
  'が': { de: '(Subjekt)', b: 'Subjektpartikel' },
  'に': { de: '(Ziel / Ort / Richtung)', b: 'Partikel' },
  'で': { de: '(Mittel / Art / Ort)', b: 'Partikel' },
  'から': { de: 'von / aus', b: 'Partikel' },
  'まで': { de: 'bis (zu)', b: 'Partikel' },
  'か': { de: '(macht zur Frage)', b: 'Fragepartikel' },
  'よ': { de: '(Betonung / Hinweis)', b: 'Satzendpartikel' },
}
export const LEX_MAXLEN = Math.max(...Object.keys(DIALOG_LEX).map(k => k.length))
