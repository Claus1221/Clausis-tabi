// ─── Yatra: Wortblöcke ────────────────────────────────────────────────────────
// Gegenstück zu src/data/words.js: sechs thematische Blöcke nw1…nw6 mit je 8–10 Wörtern,
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
// 3–6 Wörter, möglichst nur aus Wörtern dieses und früherer Blöcke plus einer Handvoll
// Funktionswörter (हो, छ, छैन, होइन, म, यो, त्यो, के, कति, -मा, -को, -लाई, -बाट, चाहिन्छ,
// दिनुहोस्, जानुहोस्, जान्छ …). Der Wort-Audit (scripts/audit-ne.mjs) meldet den Rest.
//
// Zahlen: 1–5, 10 und 100 stehen bei „Zahlen und Geld“; 6, 7, 9 bei den Uhrzeiten
// (Unterkunft und Zeit), 8 und 1000 bei den Bergen – sonst würde ein Block zu voll.
// Achtung: छ ist zugleich „sechs“ (Wort in nw5) und die Kopula „ist“ (Funktionswort) –
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
const KATI = ['कति', 'kati', 'wie viel']
const KAHAN = ['कहाँ', 'kahāṃ', 'wo, wohin']
const YAHAN = ['यहाँ', 'yahāṃ', 'hier']
const LAI = ['लाई', 'lāī', 'für, an (nachgestellt) – म/तपाईं + लाई: „mir“/„Ihnen“']
const KO = ['को', 'ko', 'von (nachgestellt, Besitz – wie „-s“ in „Peters“)']
const MAA = ['मा', 'mā', 'in, auf (nachgestellt)']
const BAT = ['बाट', 'bāṭ', 'von, ab (nachgestellt)']
const CAHINCHA = ['चाहिन्छ', 'cāhincha', 'wird gebraucht (→ ich brauche / möchte)']
const DINUHOS = ['दिनुहोस्', 'dinuhos', 'geben Sie (höfliche Bitte)']
const JANUHOS = ['जानुहोस्', 'jānuhos', 'gehen / fahren Sie (höfliche Bitte)']
const JANCHA = ['जान्छ', 'jāncha', 'geht, fährt']
const DHANYABAD = ['धन्यवाद', 'dhanyabād', 'danke']
const THIK = ['ठीक', 'ṭhīk', 'in Ordnung, richtig']
const RUPAIYAN = ['रुपैयाँ', 'rupaiyāṃ', 'Rupien']
const SAY = ['सय', 'say', 'hundert']

export const WORD_BLOCKS = [
  {
    id: 'nw1', theme: '🙏', title: 'Begrüßen und Höflichkeit', words: [
      W('नमस्ते', 'namaste', 'Hallo / Guten Tag (Gruß zu jeder Tageszeit, auch zum Abschied)',
        X('नमस्ते, तपाईंलाई सन्चै छ?', 'namaste, tapāīṃlāī sancai cha?', 'Hallo, geht es Ihnen gut?',
          ['नमस्ते', 'namaste', 'Hallo'], COMMA, TAPAIN, LAI, ['सन्चै', 'sancai', 'wohlauf, gut'], CHA, Q)),
      W('तपाईं', 'tapāīṃ', 'Sie (höfliche Anrede)',
        X('तपाईंलाई ठीक छ?', 'tapāīṃlāī ṭhīk cha?', 'Passt es Ihnen? (wörtl. „Ist es für Sie in Ordnung?“)',
          TAPAIN, LAI, THIK, CHA, Q)),
      W('सन्चै', 'sancai', 'wohlauf, gut (Befinden)',
        X('म सन्चै छु, धन्यवाद।', 'ma sancai chu, dhanyabād.', 'Mir geht es gut, danke.',
          MA, ['सन्चै', 'sancai', 'wohlauf, gut'], CHU, COMMA, DHANYABAD, DANDA)),
      W('धन्यवाद', 'dhanyabād', 'danke',
        X('ठीक छ, धन्यवाद।', 'ṭhīk cha, dhanyabād.', 'In Ordnung, danke.',
          THIK, CHA, COMMA, DHANYABAD, DANDA)),
      W('हो', 'ho', 'ja (wörtl. „ist so“) / ist',
        X('हो, यो राम्रो छ।', 'ho, yo rāmro cha.', 'Ja, das ist gut.',
          HO_JA, COMMA, YO, ['राम्रो', 'rāmro', 'gut, schön'], CHA, DANDA)),
      W('होइन', 'hoina', 'nein (wörtl. „ist nicht so“) / ist nicht',
        X('होइन, त्यो मेरो नाम होइन।', 'hoina, tyo mero nām hoina.', 'Nein, das ist nicht mein Name.',
          ['होइन', 'hoina', 'nein (wörtl. „ist nicht so“)'], COMMA, TYO, MERO, ['नाम', 'nām', 'Name'], HOINA, DANDA)),
      W('ठीक छ', 'ṭhīk cha', 'in Ordnung, okay',
        X('हो, ठीक छ।', 'ho, ṭhīk cha.', 'Ja, in Ordnung.',
          HO_JA, COMMA, THIK, CHA, DANDA)),
      W('नाम', 'nām', 'Name',
        X('तपाईंको नाम के हो?', 'tapāīṃko nām ke ho?', 'Wie heißen Sie? (wörtl. „Ihr Name ist was?“)',
          TAPAIN, KO, ['नाम', 'nām', 'Name'], KE, HO, Q)),
      W('राम्रो', 'rāmro', 'gut, schön',
        X('तपाईंको नाम राम्रो छ।', 'tapāīṃko nām rāmro cha.', 'Sie haben einen schönen Namen.',
          TAPAIN, KO, ['नाम', 'nām', 'Name'], ['राम्रो', 'rāmro', 'gut, schön'], CHA, DANDA)),
      W('माफ गर्नुहोस्', 'māph garnuhos', 'Entschuldigung (wörtl. „machen Sie Verzeihung“)',
        X('माफ गर्नुहोस्, यो के हो?', 'māph garnuhos, yo ke ho?', 'Entschuldigung, was ist das?',
          ['माफ', 'māph', 'Verzeihung'], ['गर्नुहोस्', 'garnuhos', 'machen Sie (höfliche Bitte)'], COMMA, YO, KE, HO, Q)),
    ],
  },
  {
    id: 'nw2', theme: '💰', title: 'Zahlen und Geld', words: [
      W('एक', 'ek', 'eins',
        X('एक सय रुपैयाँ, ठीक छ?', 'ek say rupaiyāṃ, ṭhīk cha?', 'Hundert Rupien, in Ordnung?',
          ['एक', 'ek', 'eins'], SAY, RUPAIYAN, COMMA, THIK, CHA, Q)),
      W('दुई', 'duī', 'zwei',
        X('यो दुई सय रुपैयाँ हो।', 'yo duī say rupaiyāṃ ho.', 'Das kostet zweihundert Rupien. (wörtl. „Das ist …“)',
          YO, ['दुई', 'duī', 'zwei'], SAY, RUPAIYAN, HO, DANDA)),
      W('तीन', 'tīn', 'drei',
        X('तीन सय रुपैयाँ महँगो छ।', 'tīn say rupaiyāṃ mahaṃgo cha.', 'Dreihundert Rupien sind teuer.',
          ['तीन', 'tīn', 'drei'], SAY, RUPAIYAN, ['महँगो', 'mahaṃgo', 'teuer'], CHA, DANDA)),
      W('चार', 'cār', 'vier',
        X('चार सय होइन, तीन सय।', 'cār say hoina, tīn say.', 'Nicht vierhundert, dreihundert.',
          ['चार', 'cār', 'vier'], SAY, HOINA, COMMA, ['तीन', 'tīn', 'drei'], SAY, DANDA)),
      W('पाँच', 'pāṃc', 'fünf',
        X('यो पाँच सय रुपैयाँ हो?', 'yo pāṃc say rupaiyāṃ ho?', 'Kostet das fünfhundert Rupien?',
          YO, ['पाँच', 'pāṃc', 'fünf'], SAY, RUPAIYAN, HO, Q)),
      W('दस', 'das', 'zehn',
        X('दस रुपैयाँ ठीक छ।', 'das rupaiyāṃ ṭhīk cha.', 'Zehn Rupien sind in Ordnung.',
          ['दस', 'das', 'zehn'], RUPAIYAN, THIK, CHA, DANDA)),
      W('सय', 'say', 'hundert',
        X('सय रुपैयाँ महँगो छैन।', 'say rupaiyāṃ mahaṃgo chaina.', 'Hundert Rupien sind nicht teuer.',
          SAY, RUPAIYAN, ['महँगो', 'mahaṃgo', 'teuer'], CHAINA, DANDA)),
      W('कति', 'kati', 'wie viel',
        X('यो कति हो?', 'yo kati ho?', 'Was kostet das? (wörtl. „Wie viel ist das?“)',
          YO, KATI, HO, Q)),
      W('रुपैयाँ', 'rupaiyāṃ', 'Rupie(n) (Währung)',
        X('कति रुपैयाँ हो?', 'kati rupaiyāṃ ho?', 'Wie viele Rupien sind es?',
          KATI, RUPAIYAN, HO, Q)),
      W('महँगो', 'mahaṃgo', 'teuer',
        X('यो महँगो छ।', 'yo mahaṃgo cha.', 'Das ist teuer.',
          YO, ['महँगो', 'mahaṃgo', 'teuer'], CHA, DANDA)),
    ],
  },
  {
    id: 'nw3', theme: '🍛', title: 'Essen und Trinken', words: [
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
      W('मीठो', 'mīṭho', 'lecker, süß',
        X('चिया मीठो छ, धन्यवाद।', 'ciyā mīṭho cha, dhanyabād.', 'Der Tee ist lecker, danke.',
          ['चिया', 'ciyā', 'Tee'], ['मीठो', 'mīṭho', 'lecker'], CHA, COMMA, DHANYABAD, DANDA)),
      W('दिदी', 'didī', 'ältere Schwester – höfliche Anrede für Frauen (z. B. Bedienung)',
        X('दिदी, चिया दिनुहोस्।', 'didī, ciyā dinuhos.', 'Didi, einen Tee bitte.',
          ['दिदी', 'didī', 'ältere Schwester (Anrede)'], COMMA, ['चिया', 'ciyā', 'Tee'], DINUHOS, DANDA)),
    ],
  },
  {
    id: 'nw4', theme: '🚕', title: 'Unterwegs', words: [
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
        X('यहाँबाट दायाँ जानुहोस्।', 'yahāṃbāṭ dāyāṃ jānuhos.', 'Fahren Sie hier rechts. (wörtl. „von hier rechts“)',
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
    id: 'nw5', theme: '🏨', title: 'Unterkunft und Zeit', words: [
      W('कोठा', 'koṭhā', 'Zimmer',
        X('यहाँ कोठा छ?', 'yahāṃ koṭhā cha?', 'Gibt es hier ein Zimmer?',
          YAHAN, ['कोठा', 'koṭhā', 'Zimmer'], CHA, Q)),
      W('होटल', 'hoṭal', 'Hotel, Gasthaus (auch einfaches Lokal)',
        X('यो होटल राम्रो छ।', 'yo hoṭal rāmro cha.', 'Dieses Hotel ist gut.',
          YO, ['होटल', 'hoṭal', 'Hotel'], ['राम्रो', 'rāmro', 'gut, schön'], CHA, DANDA)),
      W('शौचालय', 'shaucālay', 'Toilette',
        X('शौचालय कहाँ छ?', 'shaucālay kahāṃ cha?', 'Wo ist die Toilette?',
          ['शौचालय', 'shaucālay', 'Toilette'], KAHAN, CHA, Q)),
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
        X('बस कति बजे जान्छ?', 'bas kati baje jāncha?', 'Um wie viel Uhr fährt der Bus?',
          ['बस', 'bas', 'Bus'], KATI, ['बजे', 'baje', 'Uhr (um … Uhr)'], JANCHA, Q)),
      W('छ', 'cha', 'sechs (gleich geschrieben wie छ „ist“)',
        X('कोठा छ सय रुपैयाँ हो।', 'koṭhā cha say rupaiyāṃ ho.', 'Das Zimmer kostet sechshundert Rupien.',
          ['कोठा', 'koṭhā', 'Zimmer'], ['छ', 'cha', 'sechs'], SAY, RUPAIYAN, HO, DANDA)),
      W('सात', 'sāt', 'sieben',
        X('बस सात बजे जान्छ।', 'bas sāt baje jāncha.', 'Der Bus fährt um sieben Uhr.',
          ['बस', 'bas', 'Bus'], ['सात', 'sāt', 'sieben'], ['बजे', 'baje', 'Uhr (um … Uhr)'], JANCHA, DANDA)),
      W('नौ', 'nau', 'neun',
        X('नौ सय रुपैयाँ महँगो छ।', 'nau say rupaiyāṃ mahaṃgo cha.', 'Neunhundert Rupien sind teuer.',
          ['नौ', 'nau', 'neun'], SAY, RUPAIYAN, ['महँगो', 'mahaṃgo', 'teuer'], CHA, DANDA)),
    ],
  },
  {
    id: 'nw6', theme: '🏔️', title: 'Berge und Wetter', words: [
      W('हिमाल', 'himāl', 'Schneeberg, Himalaya-Gipfel',
        X('त्यो हिमालको नाम के हो?', 'tyo himālko nām ke ho?', 'Wie heißt der Schneeberg dort?',
          TYO, ['हिमाल', 'himāl', 'Schneeberg'], KO, ['नाम', 'nām', 'Name'], KE, HO, Q)),
      W('बाटो', 'bāṭo', 'Weg, Straße',
        X('गाउँको बाटो कहाँ छ?', 'gāuṃko bāṭo kahāṃ cha?', 'Wo ist der Weg zum Dorf? (wörtl. „des Dorfes Weg“)',
          ['गाउँ', 'gāuṃ', 'Dorf'], KO, ['बाटो', 'bāṭo', 'Weg'], KAHAN, CHA, Q)),
      W('गाउँ', 'gāuṃ', 'Dorf',
        X('गाउँ कति टाढा छ?', 'gāuṃ kati ṭāḍhā cha?', 'Wie weit ist das Dorf?',
          ['गाउँ', 'gāuṃ', 'Dorf'], KATI, ['टाढा', 'ṭāḍhā', 'weit, fern'], CHA, Q)),
      W('टाढा', 'ṭāḍhā', 'weit, fern',
        X('यहाँबाट टाढा छ?', 'yahāṃbāṭ ṭāḍhā cha?', 'Ist es weit von hier?',
          YAHAN, BAT, ['टाढा', 'ṭāḍhā', 'weit, fern'], CHA, Q)),
      W('पानी पर्छ', 'pānī parcha', 'es regnet (wörtl. „Wasser fällt“)',
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
      W('आठ', 'āṭh', 'acht',
        X('बस आठ बजे जान्छ?', 'bas āṭh baje jāncha?', 'Fährt der Bus um acht Uhr?',
          ['बस', 'bas', 'Bus'], ['आठ', 'āṭh', 'acht'], ['बजे', 'baje', 'Uhr (um … Uhr)'], JANCHA, Q)),
      W('हजार', 'hajār', 'tausend',
        X('कोठा एक हजार रुपैयाँ हो।', 'koṭhā ek hajār rupaiyāṃ ho.', 'Das Zimmer kostet tausend Rupien.',
          ['कोठा', 'koṭhā', 'Zimmer'], ['एक', 'ek', 'eins'], ['हजार', 'hajār', 'tausend'], RUPAIYAN, HO, DANDA)),
    ],
  },
]

const ALL_WORDS = WORD_BLOCKS.flatMap(b => b.words)
export const WORD_BY_DEV = Object.fromEntries(ALL_WORDS.map(w => [w.dev, w]))

// Karten-Schlüssel (NFC) aller Wörter aus abgeschlossenen Blöcken, in Blockreihenfolge –
// nicht in der Reihenfolge, in der die IDs im Lernstand stehen, damit Stapel und Zähler
// stabil bleiben. Unbekannte IDs (z. B. aus einer neueren Version) wirken nicht.
export function learnedWords(completedWordBlocks) {
  const done = completedWordBlocks || []
  return WORD_BLOCKS.filter(b => done.includes(b.id)).flatMap(b => b.words.map(w => nfc(w.dev)))
}
