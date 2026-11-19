// ─── Yatra: Gesprächs-Szenen ──────────────────────────────────────────────────
// Gegenstück zu src/data/dialogs.js: sechs kleine Rollenspiele nd1…nd6. Ein Nepali spricht
// (Fahrer, Bedienung, Händler, Passantin, Wirt, Teehaus-Wirtin), du tippst die passende
// Antwort an – Spracherkennung gibt es nicht. Jede Szene ist ein ganzes kleines Gespräch:
// Begrüßung → Anliegen → Dank/Abschied, und am Ende ist etwas erledigt (Fahrt, Essen,
// Kauf, Weg, Zimmer, Übernachtung). Die Antwortsätze übt der Spieler VOR der Szene im
// Aufwärmen (wie phrasesFromTurns im japanischen Teil) – deshalb sind sie kurz (2–6 Wörter)
// und genau das, was man auf der Reise sagt.
//
// Schema:
//   Szene { id, title, emoji, place, sceneDe, role, turns: Zug[], newPhrases?: { dev, roman, de }[] }
//     title/place/sceneDe/role Deutsch; sceneDe = zwei Sätze: wo, mit wem, was du willst.
//   Zug   { npc, npcRoman, de, npcTokens, options, answer, answerRoman, answerDe, answerTokens, optionsMeta }
//     npc     – was der Nepali sagt; de = dessen Bedeutung. npc === '' heißt: du fängst an,
//               de ist dann die Regieanweisung („Du möchtest zahlen …“) – nur einmal (nd3).
//     options – drei Nepali-Antworten, genau EINE (answer) passt höflich in diesen Moment;
//               die zwei anderen sind richtiges Nepali aus Gelerntem, aber eindeutig fehl am
//               Platz (falsche Frage beantwortet, falsche Situation, falsche Rolle). Die
//               Reihenfolge mischt die Oberfläche; hier steht answer an wechselnden Stellen.
//     optionsMeta – { [option]: { roman, de } } für die Auflösung nach dem Antippen.
//     npcTokens/answerTokens – antippbare Stücke wie in words.js: { t, r, de }, Satzzeichen nur
//               { t }; angehängte Wörter (‑लाई, ‑मा, ‑को, ‑बाट, ‑वटा, ‑ले) sind eigene Tokens.
//   newPhrases – höchstens drei Wörter/Wendungen, die der Kurs bis zur Szene nicht lehrt; das
//               Aufwärmen stellt sie vor.
//
// Wortschatz: nur Blöcke und Grammatik-Themen, die im Pfad (path-order.md) VOR der Szene liegen,
// plus Funktionswörter (lib/functionWords.js) und newPhrases – Kapitel zählen nicht. Der Test
// prüft das Wort für Wort, auch für die falschen Optionen.
//
// Reihenfolge des Arrays = Reihenfolge im Lernpfad (nd1, nd3, nd4, nd5, nd2, nd6), nicht die
// Nummerierung – die IDs stammen aus dem Plan (Taxi · Unterkunft · Essen · Einkaufen · Weg · Teehaus).

import { nfc } from '../lib/deva.js'

// ── Lexikon für die Tokens ──────────────────────────────────────────────────
// Die Sätze stehen unten als ganzer Text (lesbar fürs Gegenlesen); die Tokens entstehen daraus
// über dieses Lexikon. Ein Wort, das hier fehlt, bricht schon beim Laden ab – so kann kein
// Satz mit untippbarem Wort durchrutschen. Bedeutungen wie in words.js/grammar.js.
const LEX = {
  // Funktionswörter
  'म': ['ma', 'ich'],
  'मैले': ['maile', 'ich (Handelnder; म + ले)'],
  'मेरो': ['mero', 'mein'],
  'तपाईं': ['tapāīṃ', 'Sie (höflich)'],
  'हामी': ['hāmī', 'wir'],
  'यो': ['yo', 'das, dies(e)'],
  'त्यो': ['tyo', 'das dort, jene(r)'],
  'हो': ['ho', 'ist'],
  'हुँ': ['huṃ', 'bin (Gleichsetzung)'],
  'होइन': ['hoina', 'ist nicht / nein'],
  'होइनँ': ['hoinaṃ', 'bin nicht (Gleichsetzung)'],
  'छ': ['cha', 'ist / gibt es'],
  'छु': ['chu', 'bin'],
  'छौँ': ['chauṃ', 'sind (wir)'],
  'छैन': ['chaina', 'ist nicht / gibt es nicht'],
  'हुनुहुन्छ': ['hunuhuncha', 'sind (höflich, zu तपाईं)'],
  'हुन्छ': ['huncha', 'geht, in Ordnung (wörtl. „wird“)'],
  'के': ['ke', 'was'],
  'कति': ['kati', 'wie viel'],
  'कहाँ': ['kahāṃ', 'wo, wohin'],
  'कसरी': ['kasarī', 'wie (auf welche Weise)'],
  'कस्तो': ['kasto', 'wie (beschaffen)'],
  'कहिले': ['kahile', 'wann'],
  'र': ['ra', 'und'],
  'लाई': ['lāī', 'für, an (nachgestellt) – म/तपाईं + लाई: „mir“/„Ihnen“'],
  'को': ['ko', 'von (nachgestellt, Besitz – wie „-s“ in „Peters“)'],
  'मा': ['mā', 'in, auf; für (nachgestellt)'],
  'बाट': ['bāṭa', 'von, ab (nachgestellt)'],
  'ले': ['le', '(Handelnder, nachgestellt – Verben mit Objekt in der Vergangenheit)'],
  'वटा': ['waṭā', 'Stück (Zählwort für Dinge)'],
  'जना': ['janā', 'Person(en) (Zählwort für Menschen)'],
  'चाहिन्छ': ['cāhincha', 'wird gebraucht (→ ich brauche / möchte)'],
  'चाहिँदैन': ['cāhiṃdaina', 'wird nicht gebraucht'],
  'दिनुहोस्': ['dinuhos', 'geben Sie (höfliche Bitte)'],
  'जानुहोस्': ['jānuhos', 'gehen / fahren Sie (höfliche Bitte)'],
  'जाने': ['jāne', '(zu) gehen'],
  'जान्छ': ['jāncha', 'geht, fährt'],
  'गर्नुहोस्': ['garnuhos', 'machen Sie (höfliche Bitte)'],
  'रोक्नुहोस्': ['roknuhos', 'halten Sie (höfliche Bitte)'],
  'नरोक्नुहोस्': ['naroknuhos', 'halten Sie nicht an (höfliche Bitte)'],
  'बोल्नुहोस्': ['bolnuhos', 'sprechen Sie (höfliche Bitte)'],
  'मन': ['man', 'Herz, Gemüt'],
  'पर्छ': ['parcha', 'fällt (मन पर्छ: gefällt; पानी पर्छ: es regnet)'],
  'पर्दैन': ['pardaina', 'fällt nicht (मन पर्दैन: gefällt nicht; hier auch: regnet nicht)'],
  'आएँ': ['āeṃ', 'bin gekommen'],
  'गएँ': ['gaeṃ', 'bin gegangen'],
  'खाएँ': ['khāeṃ', 'habe gegessen'],
  'खानुभयो': ['khānubhayo', 'haben gegessen (höflich)'],
  'आउनुभयो': ['āunubhayo', 'sind gekommen (höflich)'],
  // Wörter aus Blöcken und Themen
  'नमस्ते': ['namaste', 'Hallo / auf Wiedersehen (Gruß)'],
  'सन्चै': ['sancai', 'wohlauf, gut'],
  'धन्यवाद': ['dhanyabād', 'danke'],
  'हजुर': ['hajur', 'ja (höflich)'],
  'ठीक': ['ṭhīk', 'in Ordnung, richtig'],
  'माफ': ['māph', 'Verzeihung'],
  'जर्मन': ['jarman', 'Deutsche(r), deutsch'],
  'नेपाली': ['nepālī', 'nepalesisch; Nepalese/Nepalesin'],
  'झोला': ['jholā', 'Tasche, Beutel'],
  'पासपोर्ट': ['pāsporṭ', 'Reisepass'],
  'ठूलो': ['ṭhūlo', 'groß'],
  'एक': ['ek', 'eins'], 'दुई': ['duī', 'zwei'], 'तीन': ['tīn', 'drei'], 'पाँच': ['pāṃc', 'fünf'],
  'सात': ['sāt', 'sieben'], 'आठ': ['āṭh', 'acht'],
  'रुपैयाँ': ['rupaiyāṃ', 'Rupien'],
  'सय': ['say', 'hundert'],
  'हजार': ['hajār', 'tausend'],
  'धेरै': ['dherai', 'sehr, viel'],
  'महँगो': ['mahaṃgo', 'teuer'],
  'सस्तो': ['sasto', 'billig'],
  'कम': ['kam', 'weniger'],
  'एउटा': ['euṭā', 'ein(s), ein Stück'],
  'थमेल': ['thamel', 'Thamel (Viertel in Kathmandu)'],
  'पानी': ['pānī', 'Wasser (पानी पर्छ: Regen)'],
  'चिया': ['ciyā', 'Tee'],
  'खाना': ['khānā', 'Essen'],
  'दाल': ['dāl', 'Linsen(suppe)'],
  'भात': ['bhāt', 'Reis (gekocht)'],
  'तातो': ['tāto', 'heiß, warm'],
  'चिसो': ['ciso', 'kalt'],
  'पिरो': ['piro', 'scharf'],
  'मीठो': ['mīṭho', 'lecker'],
  'दिदी': ['didī', 'ältere Schwester (Anrede)'],
  'यहाँ': ['yahāṃ', 'hier'],
  'टिकट': ['ṭikaṭ', 'Fahrkarte'],
  'बस': ['bas', 'Bus'],
  'दायाँ': ['dāyāṃ', 'rechts'],
  'सिधा': ['sidhā', 'geradeaus'],
  'बिस्तारै': ['bistārai', 'langsam'],
  'कोठा': ['koṭhā', 'Zimmer'],
  'राम्रो': ['rāmro', 'gut, schön'],
  'रात': ['rāt', 'Nacht'],
  'आज': ['āj', 'heute'],
  'भोलि': ['bholi', 'morgen'],
  'बिहान': ['bihān', 'morgens'],
  'बजे': ['baje', 'Uhr (um … Uhr)'],
  'हिजो': ['hijo', 'gestern'],
  'पोखरा': ['pokharā', 'Pokhara (Stadt am Phewa-See)'],
  'हिमाल': ['himāl', 'Schneeberg'],
  'हिउँ': ['hiuṃ', 'Schnee'],
  'बाटो': ['bāṭo', 'Weg'],
  'उकालो': ['ukālo', 'bergauf'],
  'गाउँ': ['gāuṃ', 'Dorf'],
  'टाढा': ['ṭāḍhā', 'weit, fern'],
  'जाडो': ['jāḍo', 'kalt (Wetter)'],
  'घाम': ['ghām', 'Sonne(nschein)'],
  // newPhrases der Szenen
  'भयो': ['bhayo', 'ist geworden (कति भयो: „was macht das?“)'],
  'पुग्यो': ['pugyo', 'es reicht, genug'],
  'अनि': ['ani', 'dann, und dann'],
  'खाइनँ': ['khāinaṃ', 'habe nicht gegessen'],
  'लाग्छ': ['lāgcha', 'scheint (घाम लाग्छ: die Sonne scheint)'],
}
// Zwei Wörter mit zweiter Bedeutung – entschieden nach dem Nachbarn im Satz.
const SIX = ['cha', 'sechs']                // छ vor सय: „sechshundert“, nicht „ist“
const HO_JA = ['ho', 'ja (wörtl. „ist so“)'] // हो am Satzanfang vor Komma: „ja“
const SUFFIXES = ['लाई', 'बाट', 'वटा', 'मा', 'को', 'ले']
const PUNCT = /^[,।?]$/

const tok = (t, [r, de]) => ({ t, r, de })
// Satz → Tokens: an Leerzeichen und Satzzeichen trennen, angehängte Wörter abspalten.
function toks(dev) {
  const parts = dev.split(/(\s+|[,।?])/).filter(p => p && !/^\s+$/.test(p))
  const out = []
  parts.forEach((p, i) => {
    if (PUNCT.test(p)) return out.push({ t: p })
    if (p === 'छ' && parts[i + 1] === 'सय') return out.push(tok(p, SIX))
    if (p === 'हो' && i === 0 && parts[1] === ',') return out.push(tok(p, HO_JA))
    if (LEX[p]) return out.push(tok(p, LEX[p]))
    const s = SUFFIXES.find(x => p.endsWith(x) && LEX[p.slice(0, -x.length)])
    if (!s) throw new Error(`dialogs.js: „${p}“ (in „${dev}“) fehlt im Lexikon`)
    const stem = p.slice(0, -s.length)
    out.push(tok(stem, LEX[stem]), tok(s, LEX[s]))
  })
  return out
}

// Zug bauen: npc = [dev, roman, de] (dev '' = du fängst an), options = [dev, roman, de][],
// a = Index der richtigen Option.
function T([npc, npcRoman, de], options, a) {
  const [answer, answerRoman, answerDe] = options[a]
  return {
    npc: nfc(npc), npcRoman, de, npcTokens: npc ? toks(nfc(npc)) : [],
    options: options.map(o => nfc(o[0])),
    answer: nfc(answer), answerRoman, answerDe, answerTokens: toks(nfc(answer)),
    optionsMeta: Object.fromEntries(options.map(([d, roman, oDe]) => [nfc(d), { roman, de: oDe }])),
  }
}
const P = (dev, roman, de) => ({ dev, roman, de })

export const DIALOGS = [
  {
    id: 'nd1', title: 'Taxi', emoji: '🚕', place: 'Kathmandu, am Straßenrand', role: 'Taxifahrer',
    sceneDe: 'Du stehst in Kathmandu an der Straße und hältst ein Taxi an. Du willst nach Thamel und vorher einen fairen Preis aushandeln.',
    turns: [
      T(['नमस्ते, कहाँ जाने?', 'namaste, kahāṃ jāne?', 'Hallo, wohin soll es gehen?'], [
        ['म सन्चै छु, धन्यवाद।', 'ma sancai chu, dhanyabād.', 'Mir geht es gut, danke.'],
        ['नमस्ते, थमेल जानुहोस्।', 'namaste, thamel jānuhos.', 'Hallo, nach Thamel bitte. (wörtl. „fahren Sie nach Thamel“)'],
        ['यो मेरो झोला होइन।', 'yo mero jholā hoina.', 'Das ist nicht meine Tasche.'],
      ], 1),
      T(['थमेल? हुन्छ।', 'thamel? huncha.', 'Thamel? In Ordnung.'], [
        ['कति रुपैयाँ हो?', 'kati rupaiyāṃ ho?', 'Wie viele Rupien kostet es?'],
        ['यो मेरो पासपोर्ट हो।', 'yo mero pāsporṭ ho.', 'Das ist mein Pass.'],
        ['म जर्मन हुँ।', 'ma jarman huṃ.', 'Ich bin Deutsche(r).'],
      ], 0),
      T(['एक हजार रुपैयाँ।', 'ek hajār rupaiyāṃ.', 'Tausend Rupien.'], [
        ['तपाईं कस्तो हुनुहुन्छ?', 'tapāīṃ kasto hunuhuncha?', 'Wie geht es Ihnen?'],
        ['झोलामा पासपोर्ट छ।', 'jholāmā pāsporṭ cha.', 'In der Tasche ist der Pass.'],
        ['धेरै महँगो छ, कम गर्नुहोस्।', 'dherai mahaṃgo cha, kam garnuhos.', 'Das ist zu teuer, machen Sie es billiger.'],
      ], 2),
      T(['हुन्छ, आठ सय रुपैयाँ।', 'huncha, āṭh say rupaiyāṃ.', 'Na gut, achthundert Rupien.'], [
        ['पाँच सयमा हुन्छ?', 'pāṃc saymā huncha?', 'Geht es für fünfhundert?'],
        ['थमेल कसरी जाने?', 'thamel kasarī jāne?', 'Wie komme ich nach Thamel?'],
        ['मेरो झोला ठूलो छ।', 'mero jholā ṭhūlo cha.', 'Meine Tasche ist groß.'],
      ], 0),
      T(['छ सय, ठीक छ?', 'cha say, ṭhīk cha?', 'Sechshundert, einverstanden?'], [
        ['म नेपाली होइनँ।', 'ma nepālī hoinaṃ.', 'Ich bin kein Nepalese.'],
        ['हजुर, ठीक छ।', 'hajur, ṭhīk cha.', 'Ja, einverstanden. (höflich)'],
        ['यो मेरो होइन।', 'yo mero hoina.', 'Das gehört mir nicht.'],
      ], 1),
      T(['यो थमेल हो।', 'yo thamel ho.', 'Das hier ist Thamel. (Du bist angekommen.)'], [
        ['थमेल कहाँ छ?', 'thamel kahāṃ cha?', 'Wo ist Thamel?'],
        ['तपाईं जर्मन हुनुहुन्छ?', 'tapāīṃ jarman hunuhuncha?', 'Sind Sie Deutsche(r)?'],
        ['धेरै धन्यवाद, नमस्ते।', 'dherai dhanyabād, namaste.', 'Vielen Dank, auf Wiedersehen.'],
      ], 2),
    ],
  },
  {
    id: 'nd3', title: 'Essen bestellen', emoji: '🍛', place: 'Kathmandu, kleines Lokal', role: 'Bedienung (eine Frau – du sprichst sie mit „Didi“ an)',
    sceneDe: 'Du gehst mit einer Freundin in ein kleines Lokal in Kathmandu. Ihr wollt Dal Bhat essen, etwas trinken und am Ende bezahlen.',
    newPhrases: [
      P('पुग्यो', 'pugyo', 'es reicht, genug – so lehnt man Nachschlag ab'),
      P('कति भयो', 'kati bhayo', 'was macht das? (beim Bezahlen; wörtl. „wie viel ist es geworden?“)'),
    ],
    turns: [
      T(['नमस्ते, कति जना हुनुहुन्छ?', 'namaste, kati janā hunuhuncha?', 'Hallo, wie viele Personen sind Sie?'], [
        ['यो धेरै महँगो छ।', 'yo dherai mahaṃgo cha.', 'Das ist sehr teuer.'],
        ['हामी दुई जना छौँ।', 'hāmī duī janā chauṃ.', 'Wir sind zu zweit.'],
        ['म सन्चै छु, धन्यवाद।', 'ma sancai chu, dhanyabād.', 'Mir geht es gut, danke.'],
      ], 1),
      T(['तपाईंलाई के चाहिन्छ?', 'tapāīṃlāī ke cāhincha?', 'Was möchten Sie?'], [
        ['दुईवटा दाल भात दिनुहोस्।', 'duīwaṭā dāl bhāt dinuhos.', 'Zweimal Dal Bhat, bitte.'],
        ['मेरो पासपोर्ट कहाँ छ?', 'mero pāsporṭ kahāṃ cha?', 'Wo ist mein Pass?'],
        ['म नेपाली होइनँ।', 'ma nepālī hoinaṃ.', 'Ich bin kein Nepalese.'],
      ], 0),
      T(['तपाईंलाई पिरो मन पर्छ?', 'tapāīṃlāī piro man parcha?', 'Mögen Sie es scharf?'], [
        ['यो मेरो झोला होइन।', 'yo mero jholā hoina.', 'Das ist nicht meine Tasche.'],
        ['पाँच सय रुपैयाँ सस्तो छ।', 'pāṃc say rupaiyāṃ sasto cha.', 'Fünfhundert Rupien sind billig.'],
        ['मलाई पिरो मन पर्दैन।', 'malāī piro man pardaina.', 'Ich mag es nicht scharf.'],
      ], 2),
      T(['चिया चाहिन्छ?', 'ciyā cāhincha?', 'Möchten Sie Tee?'], [
        ['थमेल कहाँ छ?', 'thamel kahāṃ cha?', 'Wo ist Thamel?'],
        ['चिया चाहिँदैन, पानी दिनुहोस्।', 'ciyā cāhiṃdaina, pānī dinuhos.', 'Keinen Tee, bitte Wasser.'],
        ['यो मेरो पासपोर्ट हो।', 'yo mero pāsporṭ ho.', 'Das ist mein Pass.'],
      ], 1),
      T(['खाना कस्तो छ?', 'khānā kasto cha?', 'Wie schmeckt das Essen? (wörtl. „Wie ist das Essen?“)'], [
        ['म जर्मन हुँ।', 'ma jarman huṃ.', 'Ich bin Deutsche(r).'],
        ['थमेल कसरी जाने?', 'thamel kasarī jāne?', 'Wie komme ich nach Thamel?'],
        ['खाना धेरै मीठो छ।', 'khānā dherai mīṭho cha.', 'Das Essen ist sehr lecker.'],
      ], 2),
      T(['भात चाहिन्छ?', 'bhāt cāhincha?', 'Möchten Sie noch Reis? (Beim Dal Bhat wird nachgeschöpft.)'], [
        ['पुग्यो, धन्यवाद।', 'pugyo, dhanyabād.', 'Es reicht, danke.'],
        ['खाना कहाँ छ?', 'khānā kahāṃ cha?', 'Wo ist das Essen?'],
        ['झोलामा पासपोर्ट छ।', 'jholāmā pāsporṭ cha.', 'In der Tasche ist der Pass.'],
      ], 0),
      T(['', '', 'Ihr seid satt und möchtet bezahlen. Du rufst die Bedienung.'], [
        ['दिदी, एउटा चिया दिनुहोस्।', 'didī, euṭā ciyā dinuhos.', 'Didi, einen Tee bitte.'],
        ['दिदी, कति भयो?', 'didī, kati bhayo?', 'Didi, was macht das?'],
        ['यो मेरो होइन।', 'yo mero hoina.', 'Das gehört mir nicht.'],
      ], 1),
      T(['आठ सय रुपैयाँ।', 'āṭh say rupaiyāṃ.', 'Achthundert Rupien.'], [
        ['तपाईंलाई के चाहिन्छ?', 'tapāīṃlāī ke cāhincha?', 'Was möchten Sie?'],
        ['मलाई दाल भात मन पर्दैन।', 'malāī dāl bhāt man pardaina.', 'Ich mag kein Dal Bhat.'],
        ['हुन्छ, धन्यवाद।', 'huncha, dhanyabād.', 'In Ordnung, danke.'],
      ], 2),
    ],
  },
  {
    id: 'nd4', title: 'Einkaufen und Handeln', emoji: '🛍️', place: 'Thamel, kleiner Laden', role: 'Ladenbesitzer',
    sceneDe: 'Du stehst in einem kleinen Laden in Thamel und suchst eine Tasche. Der Händler nennt einen hohen Preis, du handelst ihn herunter und kaufst.',
    turns: [
      T(['नमस्ते, तपाईंलाई के चाहिन्छ?', 'namaste, tapāīṃlāī ke cāhincha?', 'Hallo, was möchten Sie?'], [
        ['हामी दुई जना छौँ।', 'hāmī duī janā chauṃ.', 'Wir sind zu zweit.'],
        ['खाना धेरै मीठो छ।', 'khānā dherai mīṭho cha.', 'Das Essen ist sehr lecker.'],
        ['नमस्ते, मलाई झोला चाहिन्छ।', 'namaste, malāī jholā cāhincha.', 'Hallo, ich hätte gern eine Tasche.'],
      ], 2),
      T(['यो नेपाली झोला हो।', 'yo nepālī jholā ho.', 'Das ist eine nepalesische Tasche.'], [
        ['यो कति हो?', 'yo kati ho?', 'Was kostet die? (wörtl. „Wie viel ist das?“)'],
        ['मलाई पिरो मन पर्दैन।', 'malāī piro man pardaina.', 'Ich mag es nicht scharf.'],
        ['तपाईं कस्तो हुनुहुन्छ?', 'tapāīṃ kasto hunuhuncha?', 'Wie geht es Ihnen?'],
      ], 0),
      T(['दुई हजार रुपैयाँ।', 'duī hajār rupaiyāṃ.', 'Zweitausend Rupien.'], [
        ['दुईवटा चिया दिनुहोस्।', 'duīwaṭā ciyā dinuhos.', 'Zwei Tee, bitte.'],
        ['धेरै महँगो छ, कम गर्नुहोस्।', 'dherai mahaṃgo cha, kam garnuhos.', 'Das ist zu teuer, machen Sie es billiger.'],
        ['म सन्चै छु, धन्यवाद।', 'ma sancai chu, dhanyabād.', 'Mir geht es gut, danke.'],
      ], 1),
      T(['हुन्छ, एक हजार आठ सय।', 'huncha, ek hajār āṭh say.', 'Na gut, tausendachthundert. (gesprochen meist अठार सय)'], [
        ['खाना कस्तो छ?', 'khānā kasto cha?', 'Wie ist das Essen?'],
        ['कति जना हुनुहुन्छ?', 'kati janā hunuhuncha?', 'Wie viele Personen sind Sie?'],
        ['एक हजारमा हुन्छ?', 'ek hajārmā huncha?', 'Geht es für tausend?'],
      ], 2),
      T(['एक हजार दुई सय, ठीक छ?', 'ek hajār duī say, ṭhīk cha?', 'Tausendzweihundert, einverstanden? (gesprochen meist बाह्र सय)'], [
        ['मलाई चिया मन पर्छ।', 'malāī ciyā man parcha.', 'Ich mag Tee.'],
        ['हुन्छ, यो दिनुहोस्।', 'huncha, yo dinuhos.', 'Gut, ich nehme sie. (wörtl. „geben Sie mir die“)'],
        ['यो मेरो पासपोर्ट हो।', 'yo mero pāsporṭ ho.', 'Das ist mein Pass.'],
      ], 1),
      T(['दुईवटा चाहिन्छ?', 'duīwaṭā cāhincha?', 'Möchten Sie zwei? (Der Händler versucht es noch einmal.)'], [
        ['धन्यवाद, मलाई चाहिँदैन।', 'dhanyabād, malāī cāhiṃdaina.', 'Danke, das brauche ich nicht.'],
        ['थमेल कहाँ छ?', 'thamel kahāṃ cha?', 'Wo ist Thamel?'],
        ['दाल भात मीठो छ।', 'dāl bhāt mīṭho cha.', 'Das Dal Bhat ist lecker.'],
      ], 0),
      T(['धेरै धन्यवाद, नमस्ते।', 'dherai dhanyabād, namaste.', 'Vielen Dank, auf Wiedersehen.'], [
        ['कति जना हुनुहुन्छ?', 'kati janā hunuhuncha?', 'Wie viele Personen sind Sie?'],
        ['धन्यवाद, नमस्ते।', 'dhanyabād, namaste.', 'Danke, auf Wiedersehen.'],
        ['चिया चिसो छ।', 'ciyā ciso cha.', 'Der Tee ist kalt.'],
      ], 1),
    ],
  },
  {
    id: 'nd5', title: 'Nach dem Weg fragen', emoji: '🧭', place: 'Kathmandu, Gasse mit kleinem Verkaufsstand', role: 'Verkäuferin an einem Straßenstand',
    sceneDe: 'Du hast dich in den Gassen von Kathmandu verlaufen und willst zurück nach Thamel. Du fragst eine Frau an einem kleinen Stand nach dem Weg.',
    newPhrases: [
      P('अनि', 'ani', 'dann, und dann'),
    ],
    turns: [
      T(['नमस्ते, के चाहिन्छ?', 'namaste, ke cāhincha?', 'Hallo, was brauchen Sie?'], [
        ['यो मेरो टिकट हो।', 'yo mero ṭikaṭ ho.', 'Das ist meine Fahrkarte.'],
        ['नमस्ते, थमेल कसरी जाने?', 'namaste, thamel kasarī jāne?', 'Hallo, wie komme ich nach Thamel?'],
        ['मलाई पिरो मन पर्दैन।', 'malāī piro man pardaina.', 'Ich mag es nicht scharf.'],
      ], 1),
      T(['थमेल? यहाँबाट सिधा जानुहोस्, अनि दायाँ जानुहोस्।', 'thamel? yahāṃbāṭa sidhā jānuhos, ani dāyāṃ jānuhos.', 'Thamel? Gehen Sie von hier geradeaus, dann rechts. (sehr schnell gesprochen)'], [
        ['यहाँ नरोक्नुहोस्।', 'yahāṃ naroknuhos.', 'Halten Sie hier nicht an.'],
        ['दुईवटा दाल भात दिनुहोस्।', 'duīwaṭā dāl bhāt dinuhos.', 'Zweimal Dal Bhat, bitte.'],
        ['माफ गर्नुहोस्, बिस्तारै बोल्नुहोस्।', 'māph garnuhos, bistārai bolnuhos.', 'Entschuldigung, sprechen Sie bitte langsam.'],
      ], 2),
      T(['सिधा जानुहोस्, अनि दायाँ।', 'sidhā jānuhos, ani dāyāṃ.', 'Geradeaus gehen, dann rechts.'], [
        ['सिधा, अनि दायाँ?', 'sidhā, ani dāyāṃ?', 'Geradeaus, dann rechts?'],
        ['मलाई टिकट चाहिन्छ।', 'malāī ṭikaṭ cāhincha.', 'Ich brauche eine Fahrkarte.'],
        ['यहाँ रोक्नुहोस्।', 'yahāṃ roknuhos.', 'Halten Sie hier an.'],
      ], 0),
      T(['हो, दायाँ। तपाईं जर्मन हुनुहुन्छ?', 'ho, dāyāṃ. tapāīṃ jarman hunuhuncha?', 'Ja, rechts. Sind Sie Deutsche(r)?'], [
        ['यहाँबाट सिधा जानुहोस्।', 'yahāṃbāṭa sidhā jānuhos.', 'Gehen Sie von hier geradeaus.'],
        ['हजुर, म जर्मन हुँ।', 'hajur, ma jarman huṃ.', 'Ja, ich bin Deutsche(r).'],
        ['मेरो झोला ठूलो छ।', 'mero jholā ṭhūlo cha.', 'Meine Tasche ist groß.'],
      ], 1),
      T(['तपाईंलाई नेपाली खाना मन पर्छ?', 'tapāīṃlāī nepālī khānā man parcha?', 'Mögen Sie nepalesisches Essen?'], [
        ['हजुर, धेरै मन पर्छ।', 'hajur, dherai man parcha.', 'Ja, sehr. (wörtl. „gefällt sehr“)'],
        ['दिदी, एउटा चिया दिनुहोस्।', 'didī, euṭā ciyā dinuhos.', 'Didi, einen Tee bitte.'],
        ['बस कहाँबाट जान्छ?', 'bas kahāṃbāṭa jāncha?', 'Wo fährt der Bus ab?'],
      ], 0),
      T(['ठीक छ, नमस्ते।', 'ṭhīk cha, namaste.', 'Also dann, auf Wiedersehen.'], [
        ['तपाईं कस्तो हुनुहुन्छ?', 'tapāīṃ kasto hunuhuncha?', 'Wie geht es Ihnen?'],
        ['एक हजारमा हुन्छ?', 'ek hajārmā huncha?', 'Geht es für tausend?'],
        ['धेरै धन्यवाद, नमस्ते।', 'dherai dhanyabād, namaste.', 'Vielen Dank, auf Wiedersehen.'],
      ], 2),
    ],
  },
  {
    id: 'nd2', title: 'Unterkunft', emoji: '🏨', place: 'Pokhara, Gästehaus am Phewa-See', role: 'Wirt des Gästehauses',
    sceneDe: 'Du kommst in Pokhara bei einem kleinen Gästehaus am See an. Du willst für dich und deine Freundin ein Zimmer für zwei Nächte.',
    turns: [
      T(['नमस्ते, के चाहिन्छ?', 'namaste, ke cāhincha?', 'Hallo, was brauchen Sie?'], [
        ['बस सात बजे जान्छ।', 'bas sāt baje jāncha.', 'Der Bus fährt um sieben Uhr.'],
        ['नमस्ते, मलाई एउटा कोठा चाहिन्छ।', 'namaste, malāī euṭā koṭhā cāhincha.', 'Hallo, ich hätte gern ein Zimmer.'],
        ['यो धेरै सस्तो छ।', 'yo dherai sasto cha.', 'Das ist sehr billig.'],
      ], 1),
      T(['कति जना हुनुहुन्छ?', 'kati janā hunuhuncha?', 'Wie viele Personen sind Sie?'], [
        ['यो मेरो झोला हो।', 'yo mero jholā ho.', 'Das ist meine Tasche.'],
        ['मलाई चिया मन पर्छ।', 'malāī ciyā man parcha.', 'Ich mag Tee.'],
        ['हामी दुई जना छौँ।', 'hāmī duī janā chauṃ.', 'Wir sind zu zweit.'],
      ], 2),
      T(['कति रात?', 'kati rāt?', 'Wie viele Nächte?'], [
        ['आज र भोलि, दुई रात।', 'āj ra bholi, duī rāt.', 'Heute und morgen, zwei Nächte.'],
        ['बिहान सात बजे।', 'bihān sāt baje.', 'Um sieben Uhr morgens.'],
        ['मलाई पिरो मन पर्दैन।', 'malāī piro man pardaina.', 'Ich mag es nicht scharf.'],
      ], 0),
      T(['हुन्छ, कोठा छ।', 'huncha, koṭhā cha.', 'Gut, ein Zimmer ist frei.'], [
        ['यो बस कहाँ जान्छ?', 'yo bas kahāṃ jāncha?', 'Wohin fährt dieser Bus?'],
        ['एक रातको कति हो?', 'ek rātko kati ho?', 'Was kostet eine Nacht?'],
        ['तपाईंले खाना खानुभयो?', 'tapāīṃle khānā khānubhayo?', 'Haben Sie schon gegessen?'],
      ], 1),
      T(['एक रातको दुई हजार रुपैयाँ।', 'ek rātko duī hajār rupaiyāṃ.', 'Zweitausend Rupien pro Nacht.'], [
        ['यहाँ नरोक्नुहोस्।', 'yahāṃ naroknuhos.', 'Halten Sie hier nicht an.'],
        ['मलाई टिकट चाहिन्छ।', 'malāī ṭikaṭ cāhincha.', 'Ich brauche eine Fahrkarte.'],
        ['तातो पानी छ?', 'tāto pānī cha?', 'Gibt es warmes Wasser?'],
      ], 2),
      T(['छ। तपाईंको पासपोर्ट दिनुहोस्।', 'cha. tapāīṃko pāsporṭ dinuhos.', 'Ja, gibt es. Ihren Pass, bitte.'], [
        ['हजुर, यो मेरो पासपोर्ट हो।', 'hajur, yo mero pāsporṭ ho.', 'Ja, hier ist mein Pass. (wörtl. „das ist mein Pass“)'],
        ['सिधा जानुहोस्।', 'sidhā jānuhos.', 'Gehen Sie geradeaus.'],
        ['मलाई दाल भात मन पर्छ।', 'malāī dāl bhāt man parcha.', 'Ich mag Dal Bhat.'],
      ], 0),
      T(['तपाईं पोखरा कहिले आउनुभयो?', 'tapāīṃ pokharā kahile āunubhayo?', 'Wann sind Sie nach Pokhara gekommen?'], [
        ['मैले दाल भात खाएँ।', 'maile dāl bhāt khāeṃ.', 'Ich habe Dal Bhat gegessen.'],
        ['म आज बिहान आएँ।', 'ma āj bihān āeṃ.', 'Ich bin heute Morgen gekommen.'],
        ['म जर्मन हुँ।', 'ma jarman huṃ.', 'Ich bin Deutsche(r).'],
      ], 1),
      T(['ठीक छ। यो तपाईंको कोठा हो।', 'ṭhīk cha. yo tapāīṃko koṭhā ho.', 'Gut. Das ist Ihr Zimmer.'], [
        ['म हिजो थमेल गएँ।', 'ma hijo thamel gaeṃ.', 'Ich bin gestern nach Thamel gegangen.'],
        ['यहाँबाट दायाँ जानुहोस्।', 'yahāṃbāṭa dāyāṃ jānuhos.', 'Gehen Sie hier rechts.'],
        ['कोठा राम्रो छ, धन्यवाद।', 'koṭhā rāmro cha, dhanyabād.', 'Das Zimmer ist schön, danke.'],
      ], 2),
    ],
  },
  {
    id: 'nd6', title: 'Im Teehaus', emoji: '🏔️', place: 'Teehaus an einem Trekkingweg', role: 'Wirtin des Teehauses',
    sceneDe: 'Nach einem langen Tag auf dem Trek erreichst du ein Teehaus in den Bergen. Du willst essen, hier übernachten und wissen, wie es morgen weitergeht.',
    newPhrases: [
      P('खाइनँ', 'khāinaṃ', 'habe nicht gegessen (wie बुझिनँ „habe nicht verstanden“)'),
      P('घाम लाग्छ', 'ghām lāgcha', 'die Sonne scheint (wörtl. „Sonne trifft“)'),
    ],
    turns: [
      T(['नमस्ते, आज धेरै जाडो छ। तातो चिया चाहिन्छ?', 'namaste, āj dherai jāḍo cha. tāto ciyā cāhincha?', 'Hallo, heute ist es sehr kalt. Möchten Sie heißen Tee?'], [
        ['मलाई टिकट चाहिन्छ।', 'malāī ṭikaṭ cāhincha.', 'Ich brauche eine Fahrkarte.'],
        ['यो बस कहाँ जान्छ?', 'yo bas kahāṃ jāncha?', 'Wohin fährt dieser Bus?'],
        ['हजुर, एउटा तातो चिया दिनुहोस्।', 'hajur, euṭā tāto ciyā dinuhos.', 'Ja, einen heißen Tee bitte.'],
      ], 2),
      T(['तपाईंले खाना खानुभयो?', 'tapāīṃle khānā khānubhayo?', 'Haben Sie schon gegessen?'], [
        ['खाइनँ, मलाई दाल भात चाहिन्छ।', 'khāinaṃ, malāī dāl bhāt cāhincha.', 'Noch nicht, ich hätte gern Dal Bhat.'],
        ['बस सात बजे जान्छ।', 'bas sāt baje jāncha.', 'Der Bus fährt um sieben Uhr.'],
        ['त्यो हिमालमा हिउँ छ।', 'tyo himālmā hiuṃ cha.', 'Auf dem Berg dort liegt Schnee.'],
      ], 0),
      T(['हुन्छ। आज यहाँ कोठा चाहिन्छ?', 'huncha. āj yahāṃ koṭhā cāhincha?', 'Gut. Brauchen Sie heute hier ein Zimmer?'], [
        ['यो बाटो उकालो छ।', 'yo bāṭo ukālo cha.', 'Dieser Weg geht bergauf.'],
        ['हजुर, एक रातको कति हो?', 'hajur, ek rātko kati ho?', 'Ja – was kostet eine Nacht?'],
        ['म हिजो पोखरा आएँ।', 'ma hijo pokharā āeṃ.', 'Ich bin gestern nach Pokhara gekommen.'],
      ], 1),
      T(['एक रातको पाँच सय रुपैयाँ।', 'ek rātko pāṃc say rupaiyāṃ.', 'Fünfhundert Rupien pro Nacht.'], [
        ['हुन्छ, ठीक छ।', 'huncha, ṭhīk cha.', 'Gut, einverstanden.'],
        ['कति जना हुनुहुन्छ?', 'kati janā hunuhuncha?', 'Wie viele Personen sind Sie?'],
        ['यो मेरो होइन।', 'yo mero hoina.', 'Das gehört mir nicht.'],
      ], 0),
      T(['भोलि गाउँ जाने?', 'bholi gāuṃ jāne?', 'Gehen Sie morgen weiter ins nächste Dorf?'], [
        ['मलाई पिरो मन पर्दैन।', 'malāī piro man pardaina.', 'Ich mag es nicht scharf.'],
        ['हजुर, गाउँ कति टाढा छ?', 'hajur, gāuṃ kati ṭāḍhā cha?', 'Ja. Wie weit ist das Dorf?'],
        ['एक हजारमा हुन्छ?', 'ek hajārmā huncha?', 'Geht es für tausend?'],
      ], 1),
      T(['धेरै टाढा छैन। बाटो उकालो छ।', 'dherai ṭāḍhā chaina. bāṭo ukālo cha.', 'Nicht sehr weit. Der Weg geht bergauf.'], [
        ['यो मेरो टिकट हो।', 'yo mero ṭikaṭ ho.', 'Das ist meine Fahrkarte.'],
        ['तपाईं जर्मन हुनुहुन्छ?', 'tapāīṃ jarman hunuhuncha?', 'Sind Sie Deutsche(r)?'],
        ['भोलि पानी पर्छ?', 'bholi pānī parcha?', 'Regnet es morgen?'],
      ], 2),
      T(['पर्दैन। भोलि घाम लाग्छ।', 'pardaina. bholi ghām lāgcha.', 'Nein. Morgen scheint die Sonne.'], [
        ['यहाँबाट दायाँ जानुहोस्।', 'yahāṃbāṭa dāyāṃ jānuhos.', 'Gehen Sie hier rechts.'],
        ['धेरै राम्रो, धन्यवाद।', 'dherai rāmro, dhanyabād.', 'Sehr schön, danke.'],
        ['हामी तीन जना छौँ।', 'hāmī tīn janā chauṃ.', 'Wir sind zu dritt.'],
      ], 1),
    ],
  },
]

export const DIALOG_BY_ID = Object.fromEntries(DIALOGS.map(d => [d.id, d]))

// Alle antippbaren Wörter einer Szene (NPC-Zeilen und Antwortsätze), NFC, ohne Doppelte, in
// Spielreihenfolge – Grundlage für Freischaltung und Aufwärmen (lib/dialog.js).
export function dialogVocab(dialog) {
  const seen = new Set()
  for (const t of dialog.turns) for (const k of [...t.npcTokens, ...t.answerTokens]) if (k.de) seen.add(nfc(k.t))
  return [...seen]
}
