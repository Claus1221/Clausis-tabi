// ─── Yatra: Wortblöcke ────────────────────────────────────────────────────────
// Gegenstück zu src/data/words.js: sieben thematische Blöcke nw1…nw7 mit je 8–10 Wörtern,
// jedes mit einem kurzen Beispielsatz. Der erste echte Wortschatz des Kurses – wer hier
// ankommt, kann schon alle Zeichen lesen (s1…s14), deshalb darf jedes Zeichen vorkommen.
//
// Schema (Felder bewusst nepalisch benannt, nicht kanji/kana):
//   Block  { id: 'nw1'…, theme: Emoji, title: Deutsch, words: Wort[] }
//   Wort   { dev, roman, de, ex: { dev, roman, de, tokens: { t, r, de }[] } }
//   dev   – Devanagari, NFC; zugleich SRS-Kartenschlüssel, daher über alle Blöcke eindeutig
//   roman – Umschrift nach dem Kurs-Schema (s. script.js): folgt der Schreibung, ā ī ū,
//           ṭ ḍ ṇ, ṃ für ं/ँ, c/ch, sh; व wie gesprochen; stummes End-a fällt weg, ein
//           gesprochenes bleibt (होइन „hoina“, छैन „chaina“, चाहिन्छ „cāhincha“)
//   tokens – der Satz in antippbaren Stücken: t = Stück genau wie im Satz (alle t zusammen
//           = Satz ohne Leerzeichen), r = dessen Umschrift, de = kurze Bedeutung. Ohne de
//           (Satzzeichen) nicht antippbar. Nachgestellte Wörter, die im Nepali mit dem Nomen
//           zusammengeschrieben werden (-मा, -को, -लाई, -बाट), sind eigene Tokens – so kann
//           man „in“/„von“ einzeln antippen.
//
// Sätze: gesprochenes Standard-Nepali (Kathmandu), höflich (तपाईं, Bitten auf -नुहोस्),
// 3–6 Wörter, nur aus Wörtern dieses und früherer Blöcke plus einer Handvoll
// Funktionswörter (हो, छ, छैन, होइन, म, मेरो, यो, त्यो, के, कति, र, -मा, -को, -लाई, -बाट,
// चाहिन्छ, दिनुहोस्, जानुहोस्, जान्छ, हुन्छ …; die Liste steht in src/ne/lib/functionWords.js).
// Der Wort-Audit (npm run audit:ne) meldet den Rest.
//
// Die Zahlen 1–10 sind ein Block für sich (nw2): man lernt sie zusammen, wie die Ziffern
// in s14. Ihre Sätze kommen deshalb ohne Geldwörter aus (Ziffern lesen, kleine Summen).
// Achtung: छ ist zugleich „sechs“ (Wort in nw2) und die Kopula „ist“ (Funktionswort) –
// gleich geschrieben, gleich gesprochen.

import { nfc } from '../lib/deva.js'

// Bauhilfen: Tokens als [t, r, de]-Tupel, damit die Sätze lesbar bleiben; Satzzeichen [t].
const tok = ([t, r, de]) => (de === undefined ? { t } : { t, r, de })
const W = (dev, roman, de, ex) => ({ dev, roman, de, ex })
const X = (dev, roman, de, ...tokens) => ({ dev, roman, de, tokens: tokens.map(tok) })

// Satzzeichen
const DANDA = ['।'], Q = ['?'], COMMA = [',']
// Häufige Funktionswörter – überall gleich erklärt
const HO = ['हो', 'ho', 'ist']
const HO_JA = ['हो', 'ho', 'ja (wörtl. „ist so“)']
const CHA = ['छ', 'cha', 'ist / gibt es']
const CHAINA = ['छैन', 'chaina', 'ist nicht / gibt es nicht']
const HOINA = ['होइन', 'hoina', 'ist nicht / nein']
const CHU = ['छु', 'chu', 'bin']
const MA = ['म', 'ma', 'ich']
const MERO = ['मेरो', 'mero', 'mein']
const TAPAIN = ['तपाईं', 'tapāīṃ', 'Sie (höflich)']
const YO = ['यो', 'yo', 'das, dies(e)']
const TYO = ['त्यो', 'tyo', 'das dort, jene(r)']
const KE = ['के', 'ke', 'was']
const RA = ['र', 'ra', 'und']
const HUNCHA = ['हुन्छ', 'huncha', 'wird, ergibt']
const KATI = ['कति', 'kati', 'wie viel']
const KAHAN = ['कहाँ', 'kahāṃ', 'wo, wohin']
const YAHAN = ['यहाँ', 'yahāṃ', 'hier']
const LAI = ['लाई', 'lāī', 'für, an (nachgestellt) – म/तपाईं + लाई: „mir“/„Ihnen“']
const KO = ['को', 'ko', 'von (nachgestellt, Besitz – wie „-s“ in „Peters“)']
const MAA = ['मा', 'mā', 'in, auf (nachgestellt)']
const BAT = ['बाट', 'bāṭa', 'von, ab (nachgestellt)']
const CAHINCHA = ['चाहिन्छ', 'cāhincha', 'wird gebraucht (→ ich brauche / möchte)']
const DINUHOS = ['दिनुहोस्', 'dinuhos', 'geben Sie (höfliche Bitte)']
const JANUHOS = ['जानुहोस्', 'jānuhos', 'gehen / fahren Sie (höfliche Bitte)']
const JANCHA = ['जान्छ', 'jāncha', 'geht, fährt']
const GARNUHOS = ['गर्नुहोस्', 'garnuhos', 'machen Sie (höfliche Bitte)']
const DHANYABAD = ['धन्यवाद', 'dhanyabād', 'danke']
const THIK = ['ठीक', 'ṭhīk', 'in Ordnung, richtig']
const RUPAIYAN = ['रुपैयाँ', 'rupaiyāṃ', 'Rupien']
const SAY = ['सय', 'say', 'hundert']
const DHERAI = ['धेरै', 'dherai', 'sehr, viel']
const MAHANGO = ['महँगो', 'mahaṃgo', 'teuer']
// Zahlen (nw2)
const N = {
  1: ['एक', 'ek', 'eins'], 2: ['दुई', 'duī', 'zwei'], 3: ['तीन', 'tīn', 'drei'], 4: ['चार', 'cār', 'vier'],
  5: ['पाँच', 'pāṃc', 'fünf'], 6: ['छ', 'cha', 'sechs'], 7: ['सात', 'sāt', 'sieben'], 8: ['आठ', 'āṭh', 'acht'],
  9: ['नौ', 'nau', 'neun'], 10: ['दस', 'das', 'zehn'],
}

export const WORD_BLOCKS = [
  {
    id: 'nw1', theme: '🙏', title: 'Begrüßen und Höflichkeit', words: [
      W('नमस्ते', 'namaste', 'Hallo / Guten Tag (Gruß zu jeder Tageszeit, auch zum Abschied)',
        X('नमस्ते, तपाईंलाई सन्चै छ?', 'namaste, tapāīṃlāī sancai cha?', 'Hallo, geht es Ihnen gut?',
          ['नमस्ते', 'namaste', 'Hallo'], COMMA, TAPAIN, LAI, ['सन्चै', 'sancai', 'wohlauf, gut'], CHA, Q)),
      W('तपाईं', 'tapāīṃ', 'Sie (höfliche Anrede)',
        X('तपाईंलाई ठीक छ?', 'tapāīṃlāī ṭhīk cha?', 'Ist es Ihnen recht? / Geht es Ihnen gut?',
          TAPAIN, LAI, THIK, CHA, Q)),
      W('सन्चै', 'sancai', 'wohlauf, gut (Befinden)',
        X('म सन्चै छु, धन्यवाद।', 'ma sancai chu, dhanyabād.', 'Mir geht es gut, danke.',
          MA, ['सन्चै', 'sancai', 'wohlauf, gut'], CHU, COMMA, DHANYABAD, DANDA)),
      W('धन्यवाद', 'dhanyabād', 'danke',
        X('ठीक छ, धन्यवाद।', 'ṭhīk cha, dhanyabād.', 'In Ordnung, danke.',
          THIK, CHA, COMMA, DHANYABAD, DANDA)),
      W('हजुर', 'hajur', 'ja (höflich) / Wie bitte? (höfliche Antwort und Rückfrage)',
        X('हजुर, ठीक छ।', 'hajur, ṭhīk cha.', 'Ja, in Ordnung. (höflich)',
          ['हजुर', 'hajur', 'ja (höflich)'], COMMA, THIK, CHA, DANDA)),
      W('हो', 'ho', 'ja (wörtl. „ist so“) / ist',
        X('हो, यो तपाईंको हो।', 'ho, yo tapāīṃko ho.', 'Ja, das gehört Ihnen. (wörtl. „ist Ihres“)',
          HO_JA, COMMA, YO, TAPAIN, KO, HO, DANDA)),
      W('होइन', 'hoina', 'nein (wörtl. „ist nicht so“) / ist nicht',
        X('होइन, यो मेरो होइन।', 'hoina, yo mero hoina.', 'Nein, das gehört mir nicht. (wörtl. „ist nicht meins“)',
          ['होइन', 'hoina', 'nein (wörtl. „ist nicht so“)'], COMMA, YO, MERO, HOINA, DANDA)),
      W('ठीक छ', 'ṭhīk cha', 'in Ordnung, okay',
        X('हो, ठीक छ।', 'ho, ṭhīk cha.', 'Ja, in Ordnung.',
          HO_JA, COMMA, THIK, CHA, DANDA)),
      W('बुझिनँ', 'bujhinaṃ', 'ich habe nicht verstanden',
        X('माफ गर्नुहोस्, मैले बुझिनँ।', 'māph garnuhos, maile bujhinaṃ.', 'Entschuldigung, ich habe nicht verstanden.',
          ['माफ', 'māph', 'Verzeihung'], GARNUHOS, COMMA, ['मैले', 'maile', 'ich (Handelnder; म + ले)'], ['बुझिनँ', 'bujhinaṃ', 'habe nicht verstanden'], DANDA)),
      W('माफ गर्नुहोस्', 'māph garnuhos', 'Entschuldigung (wörtl. „machen Sie Verzeihung“)',
        X('माफ गर्नुहोस्, यो के हो?', 'māph garnuhos, yo ke ho?', 'Entschuldigung, was ist das?',
          ['माफ', 'māph', 'Verzeihung'], GARNUHOS, COMMA, YO, KE, HO, Q)),
    ],
  },
  {
    // Nur die zehn Zahlen. Sätze: Ziffern lesen (१/७, ६/९ sehen sich ähnlich) und kleine Summen.
    id: 'nw2', theme: '🔢', title: 'Zahlen 1–10', words: [
      W('एक', 'ek', 'eins',
        X('यो एक हो, सात होइन।', 'yo ek ho, sāt hoina.', 'Das ist eine Eins, keine Sieben.',
          YO, N[1], HO, COMMA, N[7], HOINA, DANDA)),
      W('दुई', 'duī', 'zwei',
        X('एक र एक दुई हुन्छ।', 'ek ra ek duī huncha.', 'Eins und eins macht zwei.',
          N[1], RA, N[1], N[2], HUNCHA, DANDA)),
      W('तीन', 'tīn', 'drei',
        X('यो तीन हो?', 'yo tīn ho?', 'Ist das eine Drei?',
          YO, N[3], HO, Q)),
      W('चार', 'cār', 'vier',
        X('दुई र दुई चार हुन्छ।', 'duī ra duī cār huncha.', 'Zwei und zwei macht vier.',
          N[2], RA, N[2], N[4], HUNCHA, DANDA)),
      W('पाँच', 'pāṃc', 'fünf',
        X('यो पाँच होइन, चार हो।', 'yo pāṃc hoina, cār ho.', 'Das ist keine Fünf, das ist eine Vier.',
          YO, N[5], HOINA, COMMA, N[4], HO, DANDA)),
      W('छ', 'cha', 'sechs (gleich geschrieben wie छ „ist“)',
        X('तीन र तीन छ हुन्छ।', 'tīn ra tīn cha huncha.', 'Drei und drei macht sechs.',
          N[3], RA, N[3], N[6], HUNCHA, DANDA)),
      W('सात', 'sāt', 'sieben',
        X('पाँच र दुई सात हुन्छ।', 'pāṃc ra duī sāt huncha.', 'Fünf und zwei macht sieben.',
          N[5], RA, N[2], N[7], HUNCHA, DANDA)),
      W('आठ', 'āṭh', 'acht',
        X('यो आठ हो, तीन होइन।', 'yo āṭh ho, tīn hoina.', 'Das ist eine Acht, keine Drei.',
          YO, N[8], HO, COMMA, N[3], HOINA, DANDA)),
      W('नौ', 'nau', 'neun',
        X('यो नौ होइन, छ हो।', 'yo nau hoina, cha ho.', 'Das ist keine Neun, das ist eine Sechs.',
          YO, N[9], HOINA, COMMA, N[6], HO, DANDA)),
      W('दस', 'das', 'zehn',
        X('पाँच र पाँच दस हुन्छ।', 'pāṃc ra pāṃc das huncha.', 'Fünf und fünf macht zehn.',
          N[5], RA, N[5], N[10], HUNCHA, DANDA)),
    ],
  },
  {
    id: 'nw3', theme: '💰', title: 'Geld und Preise', words: [
      W('कति', 'kati', 'wie viel',
        X('यो कति हो?', 'yo kati ho?', 'Was kostet das? (wörtl. „Wie viel ist das?“)',
          YO, KATI, HO, Q)),
      W('रुपैयाँ', 'rupaiyāṃ', 'Rupie(n) (Währung)',
        X('कति रुपैयाँ हो?', 'kati rupaiyāṃ ho?', 'Wie viele Rupien sind es?',
          KATI, RUPAIYAN, HO, Q)),
      W('सय', 'say', 'hundert',
        X('यो दुई सय रुपैयाँ हो।', 'yo duī say rupaiyāṃ ho.', 'Das kostet zweihundert Rupien. (wörtl. „Das ist …“)',
          YO, N[2], SAY, RUPAIYAN, HO, DANDA)),
      W('हजार', 'hajār', 'tausend',
        X('यो एक हजार रुपैयाँ हो?', 'yo ek hajār rupaiyāṃ ho?', 'Kostet das tausend Rupien?',
          YO, N[1], ['हजार', 'hajār', 'tausend'], RUPAIYAN, HO, Q)),
      W('धेरै', 'dherai', 'sehr, viel',
        X('तपाईंलाई धेरै धन्यवाद।', 'tapāīṃlāī dherai dhanyabād.', 'Vielen Dank. (wörtl. „Ihnen viel Dank“)',
          TAPAIN, LAI, DHERAI, DHANYABAD, DANDA)),
      W('महँगो', 'mahaṃgo', 'teuer',
        X('यो धेरै महँगो छ।', 'yo dherai mahaṃgo cha.', 'Das ist sehr teuer.',
          YO, DHERAI, MAHANGO, CHA, DANDA)),
      W('सस्तो', 'sasto', 'billig, günstig',
        X('पाँच सय रुपैयाँ सस्तो छ।', 'pāṃc say rupaiyāṃ sasto cha.', 'Fünfhundert Rupien sind billig.',
          N[5], SAY, RUPAIYAN, ['सस्तो', 'sasto', 'billig'], CHA, DANDA)),
      W('कम गर्नुहोस्', 'kam garnuhos', 'machen Sie es billiger (wörtl. „machen Sie weniger“)',
        X('धेरै महँगो छ, कम गर्नुहोस्।', 'dherai mahaṃgo cha, kam garnuhos.', 'Das ist zu teuer, machen Sie es billiger.',
          DHERAI, MAHANGO, CHA, COMMA, ['कम', 'kam', 'weniger'], GARNUHOS, DANDA)),
      W('एउटा', 'euṭā', 'ein(s) – beim Zählen von Dingen (एउटा चिया = ein Tee)',
        X('एउटा कति हो?', 'euṭā kati ho?', 'Was kostet eins? (ein Stück)',
          ['एउटा', 'euṭā', 'ein(s), ein Stück'], KATI, HO, Q)),
      W('चाहिँदैन', 'cāhiṃdaina', 'brauche ich nicht / nein danke (wörtl. „wird nicht gebraucht“)',
        X('धन्यवाद, मलाई चाहिँदैन।', 'dhanyabād, malāī cāhiṃdaina.', 'Danke, ich brauche das nicht.',
          DHANYABAD, COMMA, MA, LAI, ['चाहिँदैन', 'cāhiṃdaina', 'wird nicht gebraucht'], DANDA)),
    ],
  },
  {
    id: 'nw4', theme: '🍛', title: 'Essen und Trinken', words: [
      W('पानी', 'pānī', 'Wasser',
        X('मलाई पानी चाहिन्छ।', 'malāī pānī cāhincha.', 'Ich brauche Wasser.',
          MA, LAI, ['पानी', 'pānī', 'Wasser'], CAHINCHA, DANDA)),
      W('चिया', 'ciyā', 'Tee (meist mit Milch und Zucker)',
        X('चिया कति हो?', 'ciyā kati ho?', 'Was kostet der Tee?',
          ['चिया', 'ciyā', 'Tee'], KATI, HO, Q)),
      W('खाना', 'khānā', 'Essen, Mahlzeit',
        X('खाना मीठो छ।', 'khānā mīṭho cha.', 'Das Essen ist lecker.',
          ['खाना', 'khānā', 'Essen'], ['मीठो', 'mīṭho', 'lecker'], CHA, DANDA)),
      W('भात', 'bhāt', 'Reis (gekocht)',
        X('भात तातो छ।', 'bhāt tāto cha.', 'Der Reis ist heiß.',
          ['भात', 'bhāt', 'Reis (gekocht)'], ['तातो', 'tāto', 'heiß, warm'], CHA, DANDA)),
      W('दाल भात', 'dāl bhāt', 'Dal Bhat (Linsensuppe mit Reis – das Nationalgericht)',
        X('मलाई दाल भात चाहिन्छ।', 'malāī dāl bhāt cāhincha.', 'Ich möchte Dal Bhat.',
          MA, LAI, ['दाल', 'dāl', 'Linsen(suppe)'], ['भात', 'bhāt', 'Reis (gekocht)'], CAHINCHA, DANDA)),
      W('तातो', 'tāto', 'heiß, warm',
        X('तातो पानी छ?', 'tāto pānī cha?', 'Gibt es heißes Wasser?',
          ['तातो', 'tāto', 'heiß, warm'], ['पानी', 'pānī', 'Wasser'], CHA, Q)),
      W('चिसो', 'ciso', 'kalt',
        X('चिया चिसो छ।', 'ciyā ciso cha.', 'Der Tee ist kalt.',
          ['चिया', 'ciyā', 'Tee'], ['चिसो', 'ciso', 'kalt'], CHA, DANDA)),
      W('पिरो', 'piro', 'scharf (gewürzt)',
        X('यो खाना पिरो छ?', 'yo khānā piro cha?', 'Ist dieses Essen scharf?',
          YO, ['खाना', 'khānā', 'Essen'], ['पिरो', 'piro', 'scharf'], CHA, Q)),
      W('मीठो', 'mīṭho', 'lecker, schmackhaft',
        X('चिया मीठो छ, धन्यवाद।', 'ciyā mīṭho cha, dhanyabād.', 'Der Tee ist lecker, danke.',
          ['चिया', 'ciyā', 'Tee'], ['मीठो', 'mīṭho', 'lecker'], CHA, COMMA, DHANYABAD, DANDA)),
      W('दिदी', 'didī', 'ältere Schwester – höfliche Anrede für Frauen (z. B. Bedienung)',
        X('दिदी, एउटा चिया दिनुहोस्।', 'didī, euṭā ciyā dinuhos.', 'Didi, einen Tee bitte.',
          ['दिदी', 'didī', 'ältere Schwester (Anrede)'], COMMA, ['एउटा', 'euṭā', 'ein(s), ein Stück'], ['चिया', 'ciyā', 'Tee'], DINUHOS, DANDA)),
    ],
  },
  {
    id: 'nw5', theme: '🚕', title: 'Unterwegs', words: [
      W('दाइ', 'dāi', 'älterer Bruder – höfliche Anrede für Männer (z. B. Fahrer)',
        X('दाइ, यहाँ रोक्नुहोस्।', 'dāi, yahāṃ roknuhos.', 'Halten Sie bitte hier. (zum Fahrer)',
          ['दाइ', 'dāi', 'älterer Bruder (Anrede)'], COMMA, YAHAN, ['रोक्नुहोस्', 'roknuhos', 'halten Sie (höfliche Bitte)'], DANDA)),
      W('ट्याक्सी', 'ṭyāksī', 'Taxi',
        X('ट्याक्सी कति हो?', 'ṭyāksī kati ho?', 'Was kostet das Taxi?',
          ['ट्याक्सी', 'ṭyāksī', 'Taxi'], KATI, HO, Q)),
      W('बस', 'bas', 'Bus',
        X('यो बस कहाँ जान्छ?', 'yo bas kahāṃ jāncha?', 'Wohin fährt dieser Bus?',
          YO, ['बस', 'bas', 'Bus'], KAHAN, JANCHA, Q)),
      W('टिकट', 'ṭikaṭ', 'Fahrkarte, Ticket',
        X('मलाई टिकट चाहिन्छ।', 'malāī ṭikaṭ cāhincha.', 'Ich brauche eine Fahrkarte.',
          MA, LAI, ['टिकट', 'ṭikaṭ', 'Fahrkarte'], CAHINCHA, DANDA)),
      W('कहाँ', 'kahāṃ', 'wo, wohin',
        X('बस कहाँ छ?', 'bas kahāṃ cha?', 'Wo ist der Bus?',
          ['बस', 'bas', 'Bus'], KAHAN, CHA, Q)),
      W('यहाँ', 'yahāṃ', 'hier',
        X('यहाँ ठीक छ।', 'yahāṃ ṭhīk cha.', 'Hier ist gut. (zum Aussteigen)',
          YAHAN, THIK, CHA, DANDA)),
      W('दायाँ', 'dāyāṃ', 'rechts',
        X('यहाँबाट दायाँ जानुहोस्।', 'yahāṃbāṭa dāyāṃ jānuhos.', 'Fahren Sie hier rechts. (wörtl. „von hier rechts“)',
          YAHAN, BAT, ['दायाँ', 'dāyāṃ', 'rechts'], JANUHOS, DANDA)),
      W('बायाँ', 'bāyāṃ', 'links',
        X('बायाँ होइन, दायाँ।', 'bāyāṃ hoina, dāyāṃ.', 'Nicht links, rechts.',
          ['बायाँ', 'bāyāṃ', 'links'], HOINA, COMMA, ['दायाँ', 'dāyāṃ', 'rechts'], DANDA)),
      W('सिधा', 'sidhā', 'geradeaus',
        X('सिधा जानुहोस्, दाइ।', 'sidhā jānuhos, dāi.', 'Fahren Sie geradeaus. (zum Fahrer)',
          ['सिधा', 'sidhā', 'geradeaus'], JANUHOS, COMMA, ['दाइ', 'dāi', 'älterer Bruder (Anrede)'], DANDA)),
      W('रोक्नुहोस्', 'roknuhos', 'halten Sie an (höfliche Bitte)',
        X('यहाँ रोक्नुहोस्, धन्यवाद।', 'yahāṃ roknuhos, dhanyabād.', 'Halten Sie hier, danke.',
          YAHAN, ['रोक्नुहोस्', 'roknuhos', 'halten Sie (höfliche Bitte)'], COMMA, DHANYABAD, DANDA)),
    ],
  },
  {
    id: 'nw6', theme: '🏨', title: 'Unterkunft und Zeit', words: [
      W('कोठा', 'koṭhā', 'Zimmer',
        X('यहाँ कोठा छ?', 'yahāṃ koṭhā cha?', 'Gibt es hier ein Zimmer?',
          YAHAN, ['कोठा', 'koṭhā', 'Zimmer'], CHA, Q)),
      W('होटल', 'hoṭal', 'Hotel, Gasthaus (auch einfaches Lokal)',
        X('यो होटल राम्रो छ।', 'yo hoṭal rāmro cha.', 'Dieses Hotel ist gut.',
          YO, ['होटल', 'hoṭal', 'Hotel'], ['राम्रो', 'rāmro', 'gut, schön'], CHA, DANDA)),
      W('नाम', 'nām', 'Name',
        X('होटलको नाम के हो?', 'hoṭalko nām ke ho?', 'Wie heißt das Hotel? (wörtl. „des Hotels Name ist was?“)',
          ['होटल', 'hoṭal', 'Hotel'], KO, ['नाम', 'nām', 'Name'], KE, HO, Q)),
      W('राम्रो', 'rāmro', 'gut, schön',
        X('कोठा राम्रो छ, धन्यवाद।', 'koṭhā rāmro cha, dhanyabād.', 'Das Zimmer ist schön, danke.',
          ['कोठा', 'koṭhā', 'Zimmer'], ['राम्रो', 'rāmro', 'gut, schön'], CHA, COMMA, DHANYABAD, DANDA)),
      W('ट्वाइलेट', 'ṭwāileṭ', 'Toilette (auf Schildern: शौचालय „shaucālay“)',
        X('ट्वाइलेट कहाँ छ?', 'ṭwāileṭ kahāṃ cha?', 'Wo ist die Toilette?',
          ['ट्वाइलेट', 'ṭwāileṭ', 'Toilette'], KAHAN, CHA, Q)),
      W('रात', 'rāt', 'Nacht',
        X('एक रातको कति हो?', 'ek rātko kati ho?', 'Was kostet eine Nacht? (wörtl. „einer Nacht wie viel ist?“)',
          N[1], ['रात', 'rāt', 'Nacht'], KO, KATI, HO, Q)),
      W('आज', 'āj', 'heute',
        X('आज तातो पानी छैन।', 'āj tāto pānī chaina.', 'Heute gibt es kein warmes Wasser.',
          ['आज', 'āj', 'heute'], ['तातो', 'tāto', 'heiß, warm'], ['पानी', 'pānī', 'Wasser'], CHAINA, DANDA)),
      W('भोलि', 'bholi', 'morgen',
        X('भोलि कोठा छ?', 'bholi koṭhā cha?', 'Gibt es morgen ein Zimmer?',
          ['भोलि', 'bholi', 'morgen'], ['कोठा', 'koṭhā', 'Zimmer'], CHA, Q)),
      W('बिहान', 'bihān', 'Morgen, morgens (früh am Tag)',
        X('बिहान तातो पानी छ?', 'bihān tāto pānī cha?', 'Gibt es morgens warmes Wasser?',
          ['बिहान', 'bihān', 'morgens'], ['तातो', 'tāto', 'heiß, warm'], ['पानी', 'pānī', 'Wasser'], CHA, Q)),
      W('बजे', 'baje', 'Uhr (bei Uhrzeiten: „um … Uhr“)',
        X('बस सात बजे जान्छ।', 'bas sāt baje jāncha.', 'Der Bus fährt um sieben Uhr.',
          ['बस', 'bas', 'Bus'], N[7], ['बजे', 'baje', 'Uhr (um … Uhr)'], JANCHA, DANDA)),
    ],
  },
  {
    id: 'nw7', theme: '🏔️', title: 'Berge und Wetter', words: [
      W('हिमाल', 'himāl', 'Schneeberg, Himalaya-Gipfel',
        X('त्यो हिमालको नाम के हो?', 'tyo himālko nām ke ho?', 'Wie heißt der Schneeberg dort?',
          TYO, ['हिमाल', 'himāl', 'Schneeberg'], KO, ['नाम', 'nām', 'Name'], KE, HO, Q)),
      W('बाटो', 'bāṭo', 'Weg, Straße',
        X('गाउँको बाटो कहाँ छ?', 'gāuṃko bāṭo kahāṃ cha?', 'Wo ist der Weg zum Dorf? (wörtl. „des Dorfes Weg“)',
          ['गाउँ', 'gāuṃ', 'Dorf'], KO, ['बाटो', 'bāṭo', 'Weg'], KAHAN, CHA, Q)),
      W('उकालो', 'ukālo', 'bergauf; Anstieg',
        X('यो बाटो उकालो छ।', 'yo bāṭo ukālo cha.', 'Dieser Weg geht bergauf.',
          YO, ['बाटो', 'bāṭo', 'Weg'], ['उकालो', 'ukālo', 'bergauf'], CHA, DANDA)),
      W('गाउँ', 'gāuṃ', 'Dorf',
        X('गाउँ कति टाढा छ?', 'gāuṃ kati ṭāḍhā cha?', 'Wie weit ist das Dorf?',
          ['गाउँ', 'gāuṃ', 'Dorf'], KATI, ['टाढा', 'ṭāḍhā', 'weit, fern'], CHA, Q)),
      W('टाढा', 'ṭāḍhā', 'weit, fern',
        X('यहाँबाट टाढा छ?', 'yahāṃbāṭa ṭāḍhā cha?', 'Ist es weit von hier?',
          YAHAN, BAT, ['टाढा', 'ṭāḍhā', 'weit, fern'], CHA, Q)),
      W('पानी पर्छ', 'pānī parcha', 'es regnet (allgemein) / es wird regnen (wörtl. „Wasser fällt“)',
        X('आज पानी पर्छ?', 'āj pānī parcha?', 'Regnet es heute?',
          ['आज', 'āj', 'heute'], ['पानी', 'pānī', 'Wasser (hier: Regen)'], ['पर्छ', 'parcha', 'fällt'], Q)),
      W('हिउँ', 'hiuṃ', 'Schnee',
        X('हिमालमा हिउँ छ।', 'himālmā hiuṃ cha.', 'Auf den Bergen liegt Schnee.',
          ['हिमाल', 'himāl', 'Schneeberg'], MAA, ['हिउँ', 'hiuṃ', 'Schnee'], CHA, DANDA)),
      W('घाम', 'ghām', 'Sonne, Sonnenschein',
        X('आज घाम छ।', 'āj ghām cha.', 'Heute scheint die Sonne. (wörtl. „Heute ist Sonne.“)',
          ['आज', 'āj', 'heute'], ['घाम', 'ghām', 'Sonne(nschein)'], CHA, DANDA)),
      W('जाडो', 'jāḍo', 'kalt (Wetter), Kälte; auch: Winter',
        X('आज जाडो छ।', 'āj jāḍo cha.', 'Heute ist es kalt.',
          ['आज', 'āj', 'heute'], ['जाडो', 'jāḍo', 'kalt (Wetter)'], CHA, DANDA)),
    ],
  },
]

// Karten-Schlüssel (NFC) aller Wörter aus abgeschlossenen Blöcken, in Blockreihenfolge –
// nicht in der Reihenfolge, in der die IDs im Lernstand stehen, damit Stapel und Zähler
// stabil bleiben. Unbekannte IDs (z. B. aus einer neueren Version) wirken nicht.
export function learnedWords(completedWordBlocks) {
  const done = completedWordBlocks || []
  return WORD_BLOCKS.filter(b => done.includes(b.id)).flatMap(b => b.words.map(w => nfc(w.dev)))
}
