// ─── Yatra: Grammatik-Themen ──────────────────────────────────────────────────
// Gegenstück zu src/data/grammar.js: zwölf Themen ng1…ng12, je Erklärung (body), Beispiele
// mit antippbaren Tokens und Lückensätze zum Antippen. Reihenfolge im Kurs: GRAMMAR_ORDER
// (wie der Lernpfad) – nicht die Nummerierung.
//
// Schema (Felder nepalisch benannt wie in words.js, nicht jp/kana):
//   Thema   { id, glyph, title, summary, body: { h?, text }[], examples: Beispiel[], exercises: Übung[] }
//   Beispiel { dev, roman, de, tokens: { t, r, de }[] } – Token-Regeln wie in words.js:
//            alle t zusammen = Satz ohne Leerzeichen; Satzzeichen ohne de (nicht antippbar);
//            angehängte Wörter (‑मा, ‑को, ‑लाई, ‑बाट, ‑ले, ‑वटा) sind eigene Tokens.
//   Übung   { q, a, options, hint, de, roman }
//            q      – Nepali-Satz mit genau einer Lücke ＿＿ (zwei breite Unterstriche); steht
//                     die Lücke direkt am Wort (म＿＿), wird die Lösung angehängt (मलाई)
//            a      – die richtige Füllung; options – ≥ 3 Füllungen, nur EINE ergibt einen
//                     richtigen, sinnvollen Satz (Ablenker sind falsche Person, falsches „ist“,
//                     falsche Nachstellung – nie eine zweite vertretbare Lösung)
//            hint   – kurze deutsche Erklärung, warum a stimmt
//            de     – Übersetzung des GELÖSTEN Satzes; roman – dessen Umschrift. Beides gibt es,
//                     weil der Kurs ohne Ton auskommen muss: nach dem Antippen steht der ganze
//                     Satz lesbar da. (Das japanische Vorbild hat dafür kein Feld.)
//
// Wortschatz: ein Thema benutzt nur Wörter aus Blöcken, die im Pfad VOR ihm liegen, dazu die
// Funktionswörter des Audits (scripts/audit-ne.mjs), die Formen, die es selbst lehrt
// (GRAMMAR_FORMS), und höchstens drei ausdrücklich vorgestellte neue Wörter
// (GRAMMAR_NEW_WORDS, im body als „Neue Wörter“ erklärt). Der Test prüft das Satz für Satz.

// Bauhilfen wie in words.js: Tokens als [t, r, de]-Tupel; Satzzeichen [t].
const tok = ([t, r, de]) => (de === undefined ? { t } : { t, r, de })
const X = (dev, roman, de, ...tokens) => ({ dev, roman, de, tokens: tokens.map(tok) })
const E = (q, a, options, hint, de, roman) => ({ q, a, options, hint, de, roman })

// Satzzeichen
const DANDA = ['।'], Q = ['?'], COMMA = [',']
// Funktionswörter – Bedeutungen wie in words.js, damit dasselbe Wort überall gleich erklärt ist
const MA = ['म', 'ma', 'ich']
const MAILE = ['मैले', 'maile', 'ich (Handelnder; म + ले)']
const MERO = ['मेरो', 'mero', 'mein']
const TAPAIN = ['तपाईं', 'tapāīṃ', 'Sie (höflich)']
const UHAN = ['उहाँ', 'uhāṃ', 'er / sie (höflich)']
const HAMI = ['हामी', 'hāmī', 'wir']
const YO = ['यो', 'yo', 'das, dies(e)']
const HO = ['हो', 'ho', 'ist']
const HO_JA = ['हो', 'ho', 'ja (wörtl. „ist so“)']
const HUN = ['हुँ', 'huṃ', 'bin (Gleichsetzung)']
const HOINA = ['होइन', 'hoina', 'ist nicht / nein']
const HOINAN = ['होइनँ', 'hoinaṃ', 'bin nicht (Gleichsetzung)']
const CHA = ['छ', 'cha', 'ist / gibt es']
const CHU = ['छु', 'chu', 'bin']
const CHAUN = ['छौं', 'chauṃ', 'sind (wir)']
const CHAINA = ['छैन', 'chaina', 'ist nicht / gibt es nicht']
const HUNUHUNCHA = ['हुनुहुन्छ', 'hunuhuncha', 'sind (höflich, zu तपाईं)']
const KE = ['के', 'ke', 'was']
const KATI = ['कति', 'kati', 'wie viel']
const KAHAN = ['कहाँ', 'kahāṃ', 'wo, wohin']
const KASARI = ['कसरी', 'kasarī', 'wie (auf welche Weise)']
const KAHILE = ['कहिले', 'kahile', 'wann']
const LAI = ['लाई', 'lāī', 'für, an (nachgestellt) – म/तपाईं + लाई: „mir“/„Ihnen“']
const KO = ['को', 'ko', 'von (nachgestellt, Besitz – wie „-s“ in „Peters“)']
const MAA = ['मा', 'mā', 'in, auf (nachgestellt)']
const BAT = ['बाट', 'bāṭ', 'von, ab (nachgestellt)']
const LE = ['ले', 'le', '(Handelnder, nachgestellt – Verben mit Objekt in der Vergangenheit)']
const WATA = ['वटा', 'waṭā', 'Stück (Zählwort für Dinge)']
const JANA = ['जना', 'janā', 'Person(en) (Zählwort für Menschen)']
const CAHINCHA = ['चाहिन्छ', 'cāhincha', 'wird gebraucht (→ ich brauche / möchte)']
const CAHINDAINA = ['चाहिँदैन', 'cāhiṃdaina', 'wird nicht gebraucht']
const DINUHOS = ['दिनुहोस्', 'dinuhos', 'geben Sie (höfliche Bitte)']
const JANUHOS = ['जानुहोस्', 'jānuhos', 'gehen / fahren Sie (höfliche Bitte)']
const NAJANUHOS = ['नजानुहोस्', 'najānuhos', 'gehen / fahren Sie nicht (höfliche Bitte)']
const JANCHA = ['जान्छ', 'jāncha', 'geht, fährt']
const GARNUHOS = ['गर्नुहोस्', 'garnuhos', 'machen Sie (höfliche Bitte)']
const ROKNUHOS = ['रोक्नुहोस्', 'roknuhos', 'halten Sie (höfliche Bitte)']
const NAROKNUHOS = ['नरोक्नुहोस्', 'naroknuhos', 'halten Sie nicht an (höfliche Bitte)']
// Wörter aus den Blöcken nw1…nw6
const MAPH = ['माफ', 'māph', 'Verzeihung']
const HAJUR = ['हजुर', 'hajur', 'ja (höflich)']
const SANCAI = ['सन्चै', 'sancai', 'wohlauf, gut']
const THIK = ['ठीक', 'ṭhīk', 'in Ordnung, richtig']
const DHANYABAD = ['धन्यवाद', 'dhanyabād', 'danke']
const N1 = ['एक', 'ek', 'eins'], N2 = ['दुई', 'duī', 'zwei'], N3 = ['तीन', 'tīn', 'drei']
const SAY = ['सय', 'say', 'hundert']
const HAJAR = ['हजार', 'hajār', 'tausend']
const DHERAI = ['धेरै', 'dherai', 'sehr, viel']
const MAHANGO = ['महँगो', 'mahaṃgo', 'teuer']
const SASTO = ['सस्तो', 'sasto', 'billig']
const EUTA = ['एउटा', 'euṭā', 'ein(s), ein Stück']
const PANI = ['पानी', 'pānī', 'Wasser']
const CIYA = ['चिया', 'ciyā', 'Tee']
const KHANA = ['खाना', 'khānā', 'Essen']
const DAL = ['दाल', 'dāl', 'Linsen(suppe)']
const BHAT = ['भात', 'bhāt', 'Reis (gekocht)']
const TATO = ['तातो', 'tāto', 'heiß, warm']
const PIRO = ['पिरो', 'piro', 'scharf']
const MITHO = ['मीठो', 'mīṭho', 'lecker']
const DIDI = ['दिदी', 'didī', 'ältere Schwester (Anrede)']
const DAI = ['दाइ', 'dāi', 'älterer Bruder (Anrede)']
const TAXI = ['ट्याक्सी', 'ṭyāksī', 'Taxi']
const BAS = ['बस', 'bas', 'Bus']
const TIKAT = ['टिकट', 'ṭikaṭ', 'Fahrkarte']
const YAHAN = ['यहाँ', 'yahāṃ', 'hier']
const BAYAN = ['बायाँ', 'bāyāṃ', 'links']
const SIDHA = ['सिधा', 'sidhā', 'geradeaus']
const AAJ = ['आज', 'āj', 'heute']
const BIHAN = ['बिहान', 'bihān', 'morgens']
// Neue Wörter und Formen der Themen selbst (s. GRAMMAR_NEW_WORDS / GRAMMAR_FORMS)
const JARMAN = ['जर्मन', 'jarman', 'Deutsche(r), deutsch']
const NEPALI = ['नेपाली', 'nepālī', 'Nepalese/Nepalesin, nepalesisch']
const JHOLA = ['झोला', 'jholā', 'Tasche, Beutel']
const PASPORT = ['पासपोर्ट', 'pāsporṭ', 'Reisepass']
const THULO = ['ठूलो', 'ṭhūlo', 'groß']
const THAMEL = ['थमेल', 'thamel', 'Thamel (Viertel in Kathmandu)']
const JANE = ['जाने', 'jāne', '(zu) gehen']
const MAN = ['मन', 'man', 'Herz, Gemüt']
const PARCHA = ['पर्छ', 'parcha', 'fällt (मन पर्छ: gefällt)']
const PARDAINA = ['पर्दैन', 'pardaina', 'fällt nicht (मन पर्दैन: gefällt nicht)']
const BISTARAI = ['बिस्तारै', 'bistārai', 'langsam']
const BOLNUHOS = ['बोल्नुहोस्', 'bolnuhos', 'sprechen Sie (höfliche Bitte)']
const HIJO = ['हिजो', 'hijo', 'gestern']
const POKHARA = ['पोखरा', 'pokharā', 'Pokhara (Stadt am Phewa-See)']
const AAEN = ['आएँ', 'āeṃ', 'bin gekommen']
const GAEN = ['गएँ', 'gaeṃ', 'bin gegangen']
const KHAEN = ['खाएँ', 'khāeṃ', 'habe gegessen']
const BUJHEN = ['बुझेँ', 'bujheṃ', 'habe verstanden']
const KHANUBHAYO = ['खानुभयो', 'khānubhayo', 'haben gegessen (höflich)']
const AUNUBHAYO = ['आउनुभयो', 'āunubhayo', 'sind gekommen (höflich)']

export const GRAMMAR = [
  {
    id: 'ng1', glyph: 'छु', title: 'Satzbau: das Verb steht am Ende',
    summary: 'Wer – was – Verb: wie im deutschen Nebensatz',
    body: [
      { text: 'Im Nepali steht das Verb am Satzende – immer. Das kennen Sie aus dem deutschen Nebensatz: „…, weil es mir gut geht“. म सन्चै छु heißt wörtlich „ich wohlauf bin“. Meist kommt zuerst, wer oder was (म „ich“), dann der Rest, zuletzt das Verb.' },
      { h: 'Kein „der“, kein „ein“', text: 'Artikel gibt es nicht. यो मेरो हो – „das meins ist“, also „Das gehört mir“. Was aus dem Zusammenhang klar ist, lässt man oft weg, auch „ich“: सन्चै छु allein genügt.' },
      { h: 'Kleine Wörter hinten', text: 'Was im Deutschen VOR dem Nomen steht („in“, „von“, „für“), steht im Nepali dahinter und wird angehängt: तपाईंलाई = तपाईं + लाई, „Ihnen“. Dazu gibt es eigene Lektionen.' },
      { h: 'Fragen', text: 'Eine Frage hat dieselbe Wortfolge wie die Aussage – nur die Stimme geht am Ende hoch, geschrieben steht ein Fragezeichen. Das Verb richtet sich nach der Person: zu म gehört छु, sonst steht hier छ. Mehr dazu in den nächsten Lektionen.' },
    ],
    examples: [
      X('म सन्चै छु।', 'ma sancai chu.', 'Mir geht es gut. (wörtl. „Ich wohlauf bin.“)', MA, SANCAI, CHU, DANDA),
      X('यो मेरो हो।', 'yo mero ho.', 'Das gehört mir. (wörtl. „Das meins ist.“)', YO, MERO, HO, DANDA),
      X('तपाईंलाई सन्चै छ?', 'tapāīṃlāī sancai cha?', 'Geht es Ihnen gut? (wörtl. „Ihnen wohlauf ist?“)', TAPAIN, LAI, SANCAI, CHA, Q),
      X('माफ गर्नुहोस्, यो तपाईंको हो?', 'māph garnuhos, yo tapāīṃko ho?', 'Entschuldigung, gehört das Ihnen?', MAPH, GARNUHOS, COMMA, YO, TAPAIN, KO, HO, Q),
      X('हजुर, म ठीक छु।', 'hajur, ma ṭhīk chu.', 'Ja, mir geht es gut. (höflich)', HAJUR, COMMA, MA, THIK, CHU, DANDA),
    ],
    exercises: [
      E('म सन्चै ＿＿।', 'छु', ['छु', 'म', 'यो'], 'Das Verb steht am Ende – nach म „ich“ heißt es छु.', 'Mir geht es gut.', 'ma sancai chu.'),
      E('यो मेरो ＿＿।', 'हो', ['हो', 'यो', 'म'], 'Am Satzende fehlt noch das Verb: हो „ist“.', 'Das gehört mir.', 'yo mero ho.'),
      E('＿＿ ठीक छु।', 'म', ['म', 'यो', 'तपाईं'], 'Wer steht vorn? छु passt nur zu म „ich“.', 'Mir geht es gut.', 'ma ṭhīk chu.'),
      E('तपाईंलाई सन्चै ＿＿?', 'छ', ['छ', 'छु', 'म'], 'Auch die Frage endet mit dem Verb. छु gehört zu म, hier steht छ.', 'Geht es Ihnen gut?', 'tapāīṃlāī sancai cha?'),
      E('माफ ＿＿।', 'गर्नुहोस्', ['गर्नुहोस्', 'यो', 'मेरो'], '„Verzeihung machen Sie“ – das Verb kommt zuletzt.', 'Entschuldigung.', 'māph garnuhos.'),
    ],
  },
  {
    id: 'ng2', glyph: 'हो', title: 'हो – „ist“ (Gleichsetzung)',
    summary: 'Sagt, WAS oder WER etwas ist: A ist B',
    body: [
      { text: 'हो verbindet zwei Dinge, die dasselbe sind: „Das ist meins“, „Ich bin Deutsche“. Es steht am Satzende. Die wichtigste Frage auf jedem Markt: यो के हो? – „Was ist das?“' },
      { h: 'Die Form richtet sich nach der Person', text: 'Mit म „ich“ heißt es हुँ: म जर्मन हुँ. Zu तपाईं sagt man die höfliche Form हुनुहुन्छ: तपाईं नेपाली हुनुहुन्छ? Für „das“, „dies“ und Dinge bleibt es bei हो. (Es gibt weitere Formen, etwa für „wir“ – für den Anfang reichen diese drei.)' },
      { h: 'हो heißt auch „ja“', text: 'Auf eine Frage mit हो antwortet man einfach हो – „ist so“, also „ja“. Etwas höflicher ist हजुर.' },
      { h: 'Neue Wörter', text: 'जर्मन „Deutsche(r), deutsch“ · नेपाली „Nepalese/Nepalesin, nepalesisch“ (auch die Sprache Nepali).' },
    ],
    examples: [
      X('यो के हो?', 'yo ke ho?', 'Was ist das?', YO, KE, HO, Q),
      X('म जर्मन हुँ।', 'ma jarman huṃ.', 'Ich bin Deutsche(r).', MA, JARMAN, HUN, DANDA),
      X('तपाईं जर्मन हुनुहुन्छ?', 'tapāīṃ jarman hunuhuncha?', 'Sind Sie Deutsche(r)?', TAPAIN, JARMAN, HUNUHUNCHA, Q),
      X('हो, म जर्मन हुँ।', 'ho, ma jarman huṃ.', 'Ja, ich bin Deutsche(r).', HO_JA, COMMA, MA, JARMAN, HUN, DANDA),
      X('तपाईं नेपाली हुनुहुन्छ?', 'tapāīṃ nepālī hunuhuncha?', 'Sind Sie Nepalese / Nepalesin?', TAPAIN, NEPALI, HUNUHUNCHA, Q),
      X('यो तपाईंको हो।', 'yo tapāīṃko ho.', 'Das gehört Ihnen. (wörtl. „Das ist Ihres.“)', YO, TAPAIN, KO, HO, DANDA),
    ],
    exercises: [
      E('म जर्मन ＿＿।', 'हुँ', ['हुँ', 'हो', 'हुनुहुन्छ'], 'Mit म „ich“ wird हो zu हुँ.', 'Ich bin Deutsche(r).', 'ma jarman huṃ.'),
      E('यो के ＿＿?', 'हो', ['हो', 'हुँ', 'हुनुहुन्छ'], 'Für „das, dies“ bleibt es bei हो.', 'Was ist das?', 'yo ke ho?'),
      E('तपाईं नेपाली ＿＿?', 'हुनुहुन्छ', ['हुनुहुन्छ', 'हुँ', 'छु'], 'Zu तपाईं gehört die höfliche Form हुनुहुन्छ.', 'Sind Sie Nepalese / Nepalesin?', 'tapāīṃ nepālī hunuhuncha?'),
      E('यो मेरो ＿＿।', 'हो', ['हो', 'हुँ', 'हुनुहुन्छ'], 'Es geht um यो „das“ – also हो, auch wenn मेरो „mein“ davorsteht.', 'Das gehört mir.', 'yo mero ho.'),
      E('＿＿ जर्मन हुँ।', 'म', ['म', 'तपाईं', 'यो'], 'हुँ verrät die Person: Es ist म „ich“.', 'Ich bin Deutsche(r).', 'ma jarman huṃ.'),
    ],
  },
  {
    id: 'ng3', glyph: 'छ', title: 'छ – „es gibt / ist da“',
    summary: 'Wo etwas ist, ob es da ist, wie es ist – im Unterschied zu हो',
    body: [
      { text: 'छ sagt, dass etwas DA ist oder WO es ist: झोलामा पासपोर्ट छ – „In der Tasche ist der Pass“ (oder: „gibt es einen Pass“). मेरो झोला कहाँ छ? – „Wo ist meine Tasche?“ Auch Zustände und Eigenschaften drückt छ aus: मेरो झोला ठूलो छ – „Meine Tasche ist groß“.' },
      { h: 'छ oder हो? – der wichtigste Unterschied', text: 'Deutsch hat ein „ist“, Nepali zwei. Sagt der Satz, WAS etwas ist (danach kommt ein Nomen: „meine Tasche“, „ein Pass“), steht हो: यो मेरो झोला हो. Geht es darum, WO etwas ist, OB es das gibt oder WIE etwas ist (groß, teuer, gut), steht छ. Probe: Könnte statt „ist“ ein Gleichheitszeichen stehen (das = meine Tasche)? Dann हो, sonst छ. (हो mit einer Eigenschaft gibt es auch – dann klingt es nach allgemeiner Feststellung. Für den Anfang gilt: Eigenschaft → छ.)' },
      { h: 'Mit „ich“ und „Sie“', text: 'Mit म heißt es छु: म सन्चै छु. Zu तपाईं sagt man wieder हुनुहुन्छ – dieselbe höfliche Form wie bei हो: तपाईं सन्चै हुनुहुन्छ? Statt „ja“ wiederholt man oft einfach das Verb: छ? – छ।' },
      { h: 'Neue Wörter', text: 'झोला „Tasche, Beutel“ · पासपोर्ट „Reisepass“ · ठूलो „groß“.' },
    ],
    examples: [
      X('मेरो झोला कहाँ छ?', 'mero jholā kahāṃ cha?', 'Wo ist meine Tasche?', MERO, JHOLA, KAHAN, CHA, Q),
      X('झोलामा पासपोर्ट छ।', 'jholāmā pāsporṭ cha.', 'In der Tasche ist der Pass.', JHOLA, MAA, PASPORT, CHA, DANDA),
      X('यो मेरो झोला हो।', 'yo mero jholā ho.', 'Das ist meine Tasche. (WAS es ist → हो)', YO, MERO, JHOLA, HO, DANDA),
      X('मेरो झोला ठूलो छ।', 'mero jholā ṭhūlo cha.', 'Meine Tasche ist groß. (WIE sie ist → छ)', MERO, JHOLA, THULO, CHA, DANDA),
      X('तपाईं सन्चै हुनुहुन्छ?', 'tapāīṃ sancai hunuhuncha?', 'Geht es Ihnen gut?', TAPAIN, SANCAI, HUNUHUNCHA, Q),
    ],
    exercises: [
      E('झोलामा पासपोर्ट ＿＿।', 'छ', ['छ', 'हो', 'छु'], 'Es geht darum, was wo DA ist → छ.', 'In der Tasche ist der Pass.', 'jholāmā pāsporṭ cha.'),
      E('यो मेरो झोला ＿＿।', 'हो', ['हो', 'छ', 'छु'], 'Der Satz sagt, WAS das ist: meine Tasche → हो.', 'Das ist meine Tasche.', 'yo mero jholā ho.'),
      E('मेरो झोला ठूलो ＿＿।', 'छ', ['छ', 'हुँ', 'छु'], 'Eine Eigenschaft der Tasche → छ. हुँ und छु gehören zu म.', 'Meine Tasche ist groß.', 'mero jholā ṭhūlo cha.'),
      E('म सन्चै ＿＿।', 'छु', ['छु', 'हुँ', 'छ'], 'Befinden ist ein Zustand → छ, mit म also छु. हुँ hieße „ich bin (ein) …“.', 'Mir geht es gut.', 'ma sancai chu.'),
      E('मेरो पासपोर्ट कहाँ ＿＿?', 'छ', ['छ', 'हुँ', 'हुनुहुन्छ'], 'Wo etwas ist → छ.', 'Wo ist mein Pass?', 'mero pāsporṭ kahāṃ cha?'),
      E('तपाईं सन्चै ＿＿?', 'हुनुहुन्छ', ['हुनुहुन्छ', 'छु', 'हुँ'], 'Zu तपाईं: हुनुहुन्छ – für हो und छ dieselbe höfliche Form.', 'Geht es Ihnen gut?', 'tapāīṃ sancai hunuhuncha?'),
    ],
  },
  {
    id: 'ng4', glyph: 'छैन', title: 'Verneinung – होइन und छैन',
    summary: 'Jedes „ist“ hat sein eigenes „ist nicht“',
    body: [
      { text: 'Weil Nepali zwei Wörter für „ist“ hat, gibt es auch zwei für „ist nicht“: हो → होइन, छ → छैन. Das Paar bleibt zusammen: यो मेरो झोला होइन – „Das ist nicht meine Tasche“; झोलामा पासपोर्ट छैन – „In der Tasche ist kein Pass“; यो महँगो छैन – „Das ist nicht teuer“.' },
      { h: 'Die Verneinung steckt im Verb', text: 'Ein frei stehendes „nicht“ oder „kein“ wie im Deutschen gibt es kaum – verneint wird das Verb am Satzende. Andere Verben bekommen dafür eine Endung: चाहिन्छ „wird gebraucht“ → चाहिँदैन „wird nicht gebraucht“. Allein gesagt heißt होइन auch „nein“.' },
      { h: 'Mit „ich“ und „Sie“', text: 'Mit म hängt ँ an: म नेपाली होइनँ – „Ich bin kein Nepalese“, म ठीक छैनँ – „Mir geht es nicht gut“ (im schnellen Sprechen hört man das ँ kaum). Zu तपाईं heißt beides हुनुहुन्न.' },
    ],
    examples: [
      X('यो मेरो झोला होइन।', 'yo mero jholā hoina.', 'Das ist nicht meine Tasche.', YO, MERO, JHOLA, HOINA, DANDA),
      X('झोलामा पासपोर्ट छैन।', 'jholāmā pāsporṭ chaina.', 'In der Tasche ist kein Pass.', JHOLA, MAA, PASPORT, CHAINA, DANDA),
      X('यो महँगो छैन।', 'yo mahaṃgo chaina.', 'Das ist nicht teuer.', YO, MAHANGO, CHAINA, DANDA),
      X('म नेपाली होइनँ, जर्मन हुँ।', 'ma nepālī hoinaṃ, jarman huṃ.', 'Ich bin kein Nepalese, ich bin Deutscher.', MA, NEPALI, HOINAN, COMMA, JARMAN, HUN, DANDA),
      X('धन्यवाद, मलाई झोला चाहिँदैन।', 'dhanyabād, malāī jholā cāhiṃdaina.', 'Danke, ich brauche keine Tasche.', DHANYABAD, COMMA, MA, LAI, JHOLA, CAHINDAINA, DANDA),
    ],
    exercises: [
      E('यो एक सय ＿＿, एक हजार हो।', 'होइन', ['होइन', 'छैन', 'हो'], 'Der Preis IST eine Zahl → हो, verneint होइन.', 'Das ist nicht hundert, das ist tausend.', 'yo ek say hoina, ek hajār ho.'),
      E('झोलामा पासपोर्ट ＿＿।', 'छैन', ['छैन', 'होइन', 'हो'], 'Ob etwas da ist → छ, verneint छैन.', 'In der Tasche ist kein Pass.', 'jholāmā pāsporṭ chaina.'),
      E('यो मेरो झोला ＿＿।', 'होइन', ['होइन', 'छैन', 'छु'], 'WAS das ist → हो, verneint होइन.', 'Das ist nicht meine Tasche.', 'yo mero jholā hoina.'),
      E('यो सस्तो ＿＿, महँगो छ।', 'छैन', ['छैन', 'छ', 'हो'], 'Eigenschaft → छ, verneint छैन. Der zweite Teil sagt das Gegenteil.', 'Das ist nicht billig, das ist teuer.', 'yo sasto chaina, mahaṃgo cha.'),
      E('म नेपाली ＿＿, जर्मन हुँ।', 'होइनँ', ['होइनँ', 'छैनँ', 'हुँ'], 'हुँ verneint man mit होइनँ (mit म hängt ँ an).', 'Ich bin kein Nepalese, ich bin Deutscher.', 'ma nepālī hoinaṃ, jarman huṃ.'),
    ],
  },
  {
    id: 'ng5', glyph: 'के', title: 'Fragen – के, कहाँ, कति, कसरी',
    summary: 'Das Fragewort steht dort, wo die Antwort stünde',
    body: [
      { text: 'Für eine Ja/Nein-Frage ändert man nichts – nur die Stimme geht am Ende hoch: यो महँगो छ। „Das ist teuer.“ → यो महँगो छ? „Ist das teuer?“ Geantwortet wird mit dem Verb: छ / छैन, हो / होइन.' },
      { h: 'Fragewörter', text: 'के „was“ · कहाँ „wo, wohin“ · कति „wie viel“ · कसरी „wie, auf welche Weise“. Das Fragewort steht dort, wo in der Antwort die Auskunft stünde – meist direkt vor dem Verb. Das Verb bleibt am Ende, wie immer: थमेल कहाँ छ? – „Wo ist Thamel?“' },
      { h: 'Zwei Sätze für jeden Tag', text: 'यो कति हो? – „Was kostet das?“ und थमेल कसरी जाने? – „Wie komme ich nach Thamel?“ (wörtl. „Thamel wie gehen?“). Mit … कसरी जाने? fragen Sie nach jedem Weg: einfach das Ziel davorsetzen.' },
      { h: 'Neue Wörter', text: 'थमेल – das Touristenviertel von Kathmandu · जाने „(zu) gehen“ – die Form, die nach कसरी steht.' },
    ],
    examples: [
      X('यो महँगो छ?', 'yo mahaṃgo cha?', 'Ist das teuer?', YO, MAHANGO, CHA, Q),
      X('यो झोला कति हो?', 'yo jholā kati ho?', 'Was kostet diese Tasche? (wörtl. „Diese Tasche wie viel ist?“)', YO, JHOLA, KATI, HO, Q),
      X('थमेल कहाँ छ?', 'thamel kahāṃ cha?', 'Wo ist Thamel?', THAMEL, KAHAN, CHA, Q),
      X('थमेल कसरी जाने?', 'thamel kasarī jāne?', 'Wie komme ich nach Thamel? (wörtl. „Thamel wie gehen?“)', THAMEL, KASARI, JANE, Q),
    ],
    exercises: [
      E('थमेल ＿＿ छ?', 'कहाँ', ['कहाँ', 'कसरी', 'कति'], 'Gefragt ist der Ort → कहाँ „wo“.', 'Wo ist Thamel?', 'thamel kahāṃ cha?'),
      E('थमेल ＿＿ जाने?', 'कसरी', ['कसरी', 'कति', 'के'], 'Gefragt ist der Weg → कसरी „wie“.', 'Wie komme ich nach Thamel?', 'thamel kasarī jāne?'),
      E('यो ＿＿ रुपैयाँ हो?', 'कति', ['कति', 'कहाँ', 'कसरी'], 'Gefragt ist eine Menge → कति „wie viel“.', 'Wie viele Rupien kostet das?', 'yo kati rupaiyāṃ ho?'),
      E('यो ＿＿ हो? यो पासपोर्ट हो।', 'के', ['के', 'कहाँ', 'कति'], 'Die Antwort nennt ein Ding → gefragt war के „was“.', 'Was ist das? – Das ist ein Pass.', 'yo ke ho? yo pāsporṭ ho.'),
      E('यो ＿＿ हो? एक सय रुपैयाँ।', 'कति', ['कति', 'कहाँ', 'कसरी'], 'Die Antwort ist ein Preis → gefragt war कति.', 'Was kostet das? – Hundert Rupien.', 'yo kati ho? ek say rupaiyāṃ.'),
    ],
  },
  {
    id: 'ng6', glyph: '‑मा', title: '‑मा und ‑बाट – „in“ und „von“',
    summary: 'Nachgestellt und angehängt: झोलामा, यहाँबाट',
    body: [
      { text: 'Wo das Deutsche eine Präposition VOR das Nomen stellt, hängt Nepali ein Wort HINTEN an – nachgestellte Präpositionen: झोला + मा = झोलामा „in der Tasche“. ‑मा heißt „in, auf, an, bei“ – überall dort, wo etwas ist oder geschieht.' },
      { h: '‑बाट: von, ab, aus', text: 'यहाँबाट – „von hier“, कहाँबाट – „von wo“. Auch das Verkehrsmittel kann ‑बाट bekommen: बसबाट „mit dem Bus“ (बसमा „im Bus“ sagt man ebenso).' },
      { h: 'Wohin? – meist ohne Anhängsel', text: 'Das Ziel braucht in der Regel nichts: थमेल जानुहोस् – „Fahren Sie nach Thamel“. ‑मा steht, wo man IST oder anhält: थमेलमा रोक्नुहोस् – „Halten Sie in Thamel“.' },
    ],
    examples: [
      X('मेरो पासपोर्ट झोलामा छ।', 'mero pāsporṭ jholāmā cha.', 'Mein Pass ist in der Tasche.', MERO, PASPORT, JHOLA, MAA, CHA, DANDA),
      X('मेरो झोला ट्याक्सीमा छ।', 'mero jholā ṭyāksīmā cha.', 'Meine Tasche ist im Taxi.', MERO, JHOLA, TAXI, MAA, CHA, DANDA),
      X('यहाँबाट सिधा जानुहोस्।', 'yahāṃbāṭ sidhā jānuhos.', 'Fahren Sie von hier geradeaus.', YAHAN, BAT, SIDHA, JANUHOS, DANDA),
      X('बस कहाँबाट जान्छ?', 'bas kahāṃbāṭ jāncha?', 'Wo fährt der Bus ab? (wörtl. „Von wo fährt der Bus?“)', BAS, KAHAN, BAT, JANCHA, Q),
      X('दाइ, थमेलमा रोक्नुहोस्।', 'dāi, thamelmā roknuhos.', 'Halten Sie bitte in Thamel. (zum Fahrer)', DAI, COMMA, THAMEL, MAA, ROKNUHOS, DANDA),
      X('दाइ, थमेल जानुहोस्।', 'dāi, thamel jānuhos.', 'Fahren Sie bitte nach Thamel. (zum Fahrer; Ziel ohne ‑मा)', DAI, COMMA, THAMEL, JANUHOS, DANDA),
    ],
    exercises: [
      E('पासपोर्ट झोला＿＿ छ।', 'मा', ['मा', 'बाट', 'लाई'], 'Wo etwas ist → ‑मा „in“.', 'Der Pass ist in der Tasche.', 'pāsporṭ jholāmā cha.'),
      E('यहाँ＿＿ सिधा जानुहोस्।', 'बाट', ['बाट', 'मा', 'को'], '„von hier“ → यहाँबाट.', 'Fahren Sie von hier geradeaus.', 'yahāṃbāṭ sidhā jānuhos.'),
      E('मेरो झोला ट्याक्सी＿＿ छ।', 'मा', ['मा', 'बाट', 'को'], 'Wo die Tasche ist → ‑मा.', 'Meine Tasche ist im Taxi.', 'mero jholā ṭyāksīmā cha.'),
      E('दाइ, थमेल＿＿ रोक्नुहोस्।', 'मा', ['मा', 'बाट', 'लाई'], 'Wo angehalten wird → ‑मा.', 'Halten Sie bitte in Thamel.', 'dāi, thamelmā roknuhos.'),
      E('बस कहाँ＿＿ जान्छ?', 'बाट', ['बाट', 'मा', 'को'], '„von wo“ → कहाँबाट.', 'Wo fährt der Bus ab?', 'bas kahāṃbāṭ jāncha?'),
    ],
  },
  {
    id: 'ng7', glyph: '‑को', title: '‑को – Besitz',
    summary: 'मेरो, तपाईंको: wem etwas gehört',
    body: [
      { text: '‑को verbindet Besitzer und Besitz – in derselben Reihenfolge wie das deutsche „Peters Tasche“: erst wem, dann was. दिदी + को = दिदीको चिया – „Didis Tee“.' },
      { h: 'Mein, Ihr, sein', text: 'Bei म verschmilzt es: म → मेरो „mein“. तपाईं bekommt einfach ‑को: तपाईंको „Ihr“. उहाँ „er / sie“ (höflich) → उहाँको „sein / ihr“. Am Satzende heißt es „gehört“: यो मेरो हो – „Das gehört mir“.' },
      { h: 'Mehr gibt es, aber nicht jetzt', text: 'Im geschriebenen Nepali wird ‑को manchmal zu ‑का oder ‑की (Mehrzahl, weiblich), ebenso मेरो zu मेरा / मेरी. Im Alltag kommen Sie mit ‑को und मेरो aus.' },
    ],
    examples: [
      X('यो तपाईंको टिकट हो?', 'yo tapāīṃko ṭikaṭ ho?', 'Ist das Ihre Fahrkarte?', YO, TAPAIN, KO, TIKAT, HO, Q),
      X('मेरो टिकट झोलामा छ।', 'mero ṭikaṭ jholāmā cha.', 'Meine Fahrkarte ist in der Tasche.', MERO, TIKAT, JHOLA, MAA, CHA, DANDA),
      X('यो उहाँको झोला हो।', 'yo uhāṃko jholā ho.', 'Das ist seine / ihre Tasche.', YO, UHAN, KO, JHOLA, HO, DANDA),
      X('तपाईंको पासपोर्ट दिनुहोस्।', 'tapāīṃko pāsporṭ dinuhos.', 'Ihren Pass, bitte.', TAPAIN, KO, PASPORT, DINUHOS, DANDA),
      X('दिदीको चिया मीठो छ।', 'didīko ciyā mīṭho cha.', 'Didis Tee ist lecker.', DIDI, KO, CIYA, MITHO, CHA, DANDA),
    ],
    exercises: [
      E('यो तपाईं＿＿ टिकट हो?', 'को', ['को', 'मा', 'बाट'], 'Wessen Fahrkarte? → तपाईंको „Ihr(e)“.', 'Ist das Ihre Fahrkarte?', 'yo tapāīṃko ṭikaṭ ho?'),
      E('यो ＿＿ झोला हो।', 'मेरो', ['मेरो', 'म', 'मलाई'], '„mein“ = मेरो – die Besitzform von म (nicht मको).', 'Das ist meine Tasche.', 'yo mero jholā ho.'),
      E('＿＿ पासपोर्ट दिनुहोस्।', 'तपाईंको', ['तपाईंको', 'तपाईंमा', 'तपाईंबाट'], 'Wessen Pass? → तपाईंको „Ihren“.', 'Ihren Pass, bitte.', 'tapāīṃko pāsporṭ dinuhos.'),
      E('यो उहाँ＿＿ झोला हो।', 'को', ['को', 'मा', 'बाट'], 'Wem gehört die Tasche? → उहाँको.', 'Das ist seine / ihre Tasche.', 'yo uhāṃko jholā ho.'),
      E('दिदी＿＿ चिया मीठो छ।', 'को', ['को', 'मा', 'बाट'], 'Wessen Tee? → दिदीको.', 'Didis Tee ist lecker.', 'didīko ciyā mīṭho cha.'),
    ],
  },
  {
    id: 'ng8', glyph: '‑लाई', title: '‑लाई und चाहिन्छ – „ich brauche“',
    summary: 'मलाई … चाहिन्छ: „Mir wird … gebraucht“',
    body: [
      { text: 'Nepali sagt nicht „ich brauche Wasser“, sondern „mir wird Wasser gebraucht“: मलाई पानी चाहिन्छ. Wer etwas braucht, bekommt ‑लाई – wie das deutsche „mir“, „Ihnen“: म + लाई = मलाई, तपाईं + लाई = तपाईंलाई. चाहिन्छ selbst bleibt für jede Person gleich.' },
      { h: 'Brauchen, möchten, ablehnen', text: 'चाहिन्छ ist zugleich die übliche Art zu bestellen: मलाई दाल भात चाहिन्छ – „Ich hätte gern Dal Bhat“. Beim Bestellen hört man auch चाहियो – gleiche Bedeutung. Verneint: चाहिँदैन – „brauche ich nicht“, das höfliche „Nein danke“ für Händler.' },
      { h: 'Fragen und mehr', text: 'तपाईंलाई के चाहिन्छ? – „Was brauchen / möchten Sie?“ hören Sie in jedem Laden. ‑लाई hat noch weitere Aufgaben („an“, „für“: तपाईंलाई धन्यवाद – „Ihnen Dank“); für den Anfang reicht: Wer braucht, bekommt ‑लाई.' },
    ],
    examples: [
      X('मलाई तातो पानी चाहिन्छ।', 'malāī tāto pānī cāhincha.', 'Ich brauche heißes Wasser.', MA, LAI, TATO, PANI, CAHINCHA, DANDA),
      X('तपाईंलाई के चाहिन्छ?', 'tapāīṃlāī ke cāhincha?', 'Was brauchen Sie? / Was möchten Sie?', TAPAIN, LAI, KE, CAHINCHA, Q),
      X('दिदी, मलाई एउटा चिया चाहिन्छ।', 'didī, malāī euṭā ciyā cāhincha.', 'Didi, ich hätte gern einen Tee.', DIDI, COMMA, MA, LAI, EUTA, CIYA, CAHINCHA, DANDA),
      X('मलाई चिया चाहिँदैन, पानी चाहिन्छ।', 'malāī ciyā cāhiṃdaina, pānī cāhincha.', 'Ich möchte keinen Tee, sondern Wasser.', MA, LAI, CIYA, CAHINDAINA, COMMA, PANI, CAHINCHA, DANDA),
      X('मलाई पिरो चाहिँदैन।', 'malāī piro cāhiṃdaina.', 'Ich möchte es nicht scharf.', MA, LAI, PIRO, CAHINDAINA, DANDA),
    ],
    exercises: [
      E('म＿＿ पानी चाहिन्छ।', 'लाई', ['लाई', 'को', 'मा'], 'Wer etwas braucht, bekommt ‑लाई: मलाई „mir“.', 'Ich brauche Wasser.', 'malāī pānī cāhincha.'),
      E('मलाई तातो पानी ＿＿।', 'चाहिन्छ', ['चाहिन्छ', 'छ', 'हो'], 'मलाई … चाहिन्छ = „ich brauche …“.', 'Ich brauche heißes Wasser.', 'malāī tāto pānī cāhincha.'),
      E('＿＿ चिया चाहिँदैन।', 'मलाई', ['मलाई', 'म', 'मैले'], 'Bei चाहिन्छ / चाहिँदैन steht nie म, sondern मलाई.', 'Ich möchte keinen Tee.', 'malāī ciyā cāhiṃdaina.'),
      E('तपाईं＿＿ के चाहिन्छ?', 'लाई', ['लाई', 'को', 'मा'], 'तपाईं + लाई = „Ihnen“.', 'Was brauchen Sie?', 'tapāīṃlāī ke cāhincha?'),
      E('धन्यवाद, मलाई पिरो ＿＿।', 'चाहिँदैन', ['चाहिँदैन', 'होइन', 'हुँ'], 'Höflich ablehnen: चाहिँदैन – „wird nicht gebraucht“.', 'Danke, ich möchte es nicht scharf.', 'dhanyabād, malāī piro cāhiṃdaina.'),
    ],
  },
  {
    id: 'ng9', glyph: 'मन', title: 'मन पर्छ – „ich mag“',
    summary: 'मलाई … मन पर्छ: „Mir gefällt …“',
    body: [
      { text: 'Mögen funktioniert wie das deutsche „gefallen“: nicht „ich mag Tee“, sondern „mir gefällt Tee“ – मलाई चिया मन पर्छ. Die Person bekommt wieder ‑लाई, wie bei चाहिन्छ.' },
      { h: 'Wörtlich', text: 'मन heißt „Herz, Gemüt“, पर्छ „fällt“: Der Tee „fällt mir ins Herz“. मन पर्छ gehört immer zusammen – am besten als ein Ausdruck lernen.' },
      { h: 'Verneinung und Frage', text: 'मन पर्दैन – „gefällt nicht“: मलाई पिरो खाना मन पर्दैन. Gefragt wird mit derselben Wortfolge: तपाईंलाई नेपाली खाना मन पर्छ? Das werden Sie oft gefragt – मन पर्छ ist die freundlichste Antwort.' },
      { h: 'Neues Wort', text: 'मन „Herz, Gemüt“ – hier nur im Ausdruck मन पर्छ.' },
    ],
    examples: [
      X('मलाई दाल भात मन पर्छ।', 'malāī dāl bhāt man parcha.', 'Ich mag Dal Bhat. (wörtl. „Mir gefällt Dal Bhat.“)', MA, LAI, DAL, BHAT, MAN, PARCHA, DANDA),
      X('तपाईंलाई नेपाली खाना मन पर्छ?', 'tapāīṃlāī nepālī khānā man parcha?', 'Mögen Sie nepalesisches Essen?', TAPAIN, LAI, NEPALI, KHANA, MAN, PARCHA, Q),
      X('मलाई पिरो खाना मन पर्दैन।', 'malāī piro khānā man pardaina.', 'Ich mag kein scharfes Essen.', MA, LAI, PIRO, KHANA, MAN, PARDAINA, DANDA),
      X('मलाई चिया धेरै मन पर्छ।', 'malāī ciyā dherai man parcha.', 'Ich mag Tee sehr.', MA, LAI, CIYA, DHERAI, MAN, PARCHA, DANDA),
      X('खाना मीठो छ, मलाई धेरै मन पर्छ।', 'khānā mīṭho cha, malāī dherai man parcha.', 'Das Essen ist lecker, es schmeckt mir sehr.', KHANA, MITHO, CHA, COMMA, MA, LAI, DHERAI, MAN, PARCHA, DANDA),
    ],
    exercises: [
      E('म＿＿ चिया मन पर्छ।', 'लाई', ['लाई', 'को', 'मा'], 'Wie bei चाहिन्छ: Die Person bekommt ‑लाई.', 'Ich mag Tee.', 'malāī ciyā man parcha.'),
      E('मलाई दाल भात मन ＿＿।', 'पर्छ', ['पर्छ', 'चाहिन्छ', 'हुँ'], 'मन पर्छ gehört zusammen: „gefällt“.', 'Ich mag Dal Bhat.', 'malāī dāl bhāt man parcha.'),
      E('मलाई पिरो खाना मन ＿＿।', 'पर्दैन', ['पर्दैन', 'चाहिँदैन', 'होइन'], 'Verneint: मन पर्दैन – „gefällt nicht“.', 'Ich mag kein scharfes Essen.', 'malāī piro khānā man pardaina.'),
      E('तपाईंलाई नेपाली खाना ＿＿ पर्छ?', 'मन', ['मन', 'म', 'यो'], '„gefallen“ = मन पर्छ, wörtl. „fällt ins Herz“.', 'Mögen Sie nepalesisches Essen?', 'tapāīṃlāī nepālī khānā man parcha?'),
      E('खाना मीठो छ, मलाई धेरै मन ＿＿।', 'पर्छ', ['पर्छ', 'हो', 'चाहिन्छ'], 'Es schmeckt → मन पर्छ.', 'Das Essen ist lecker, es schmeckt mir sehr.', 'khānā mīṭho cha, malāī dherai man parcha.'),
    ],
  },
  {
    id: 'ng10', glyph: 'वटा', title: 'Zählen mit वटा und जना',
    summary: 'Zwischen Zahl und Ding steht ein Zählwort',
    body: [
      { text: 'Wer Dinge zählt, hängt an die Zahl ein Zählwort: दुईवटा चिया – „zwei Tee“, तीनवटा पानी – „drei (Flaschen) Wasser“. Ähnlich wie „zwei Tassen Tee“, nur passt वटा zu jedem Ding. Das Nomen bekommt dabei meist keine Mehrzahl-Endung.' },
      { h: 'Eins ist besonders', text: 'Für „ein Stück“ sagt man nicht एकवटा, sondern एउटा: एउटा चिया दिनुहोस् – „Einen Tee, bitte“. Gesprochen wird वटा oft verkürzt (दुइटा) – geschrieben bleibt वटा.' },
      { h: 'Menschen zählt man mit जना', text: 'Für Personen steht जना, als eigenes Wort: दुई जना – „zwei Personen“. Im Restaurant hören Sie कति जना? – „Wie viele Personen?“ Antwort: हामी दुई जना छौं – „Wir sind zu zweit“ (छौं ist छ für „wir“).' },
      { h: 'Neues Wort', text: 'हामी „wir“.' },
    ],
    examples: [
      X('एउटा दाल भात दिनुहोस्।', 'euṭā dāl bhāt dinuhos.', 'Einmal Dal Bhat, bitte.', EUTA, DAL, BHAT, DINUHOS, DANDA),
      X('दुईवटा चिया दिनुहोस्।', 'duīwaṭā ciyā dinuhos.', 'Zwei Tee, bitte.', N2, WATA, CIYA, DINUHOS, DANDA),
      X('हामी दुई जना छौं।', 'hāmī duī janā chauṃ.', 'Wir sind zu zweit.', HAMI, N2, JANA, CHAUN, DANDA),
      X('मलाई तीनवटा पानी चाहिन्छ।', 'malāī tīnwaṭā pānī cāhincha.', 'Ich brauche drei Flaschen Wasser. (wörtl. „drei Stück Wasser“)', MA, LAI, N3, WATA, PANI, CAHINCHA, DANDA),
      X('कतिवटा चाहिन्छ?', 'katiwaṭā cāhincha?', 'Wie viele brauchen Sie?', KATI, WATA, CAHINCHA, Q),
    ],
    exercises: [
      E('दुई＿＿ चिया दिनुहोस्।', 'वटा', ['वटा', 'जना', 'को'], 'Dinge zählt man mit ‑वटा.', 'Zwei Tee, bitte.', 'duīwaṭā ciyā dinuhos.'),
      E('हामी तीन ＿＿ छौं।', 'जना', ['जना', 'वटा', 'को'], 'Menschen zählt man mit जना.', 'Wir sind zu dritt.', 'hāmī tīn janā chauṃ.'),
      E('दिदी, ＿＿ चिया दिनुहोस्।', 'एउटा', ['एउटा', 'एक जना', 'दुई जना'], '„Ein Stück“ heißt एउटा; जना passt nur zu Menschen.', 'Didi, einen Tee bitte.', 'didī, euṭā ciyā dinuhos.'),
      E('कति ＿＿ हुनुहुन्छ?', 'जना', ['जना', 'वटा', 'को'], 'Nach Personen fragt man mit कति जना.', 'Wie viele Personen sind Sie?', 'kati janā hunuhuncha?'),
      E('मलाई चार＿＿ पानी चाहिन्छ।', 'वटा', ['वटा', 'जना', 'मा'], 'Flaschen sind Dinge → ‑वटा.', 'Ich brauche vier Flaschen Wasser.', 'malāī cārwaṭā pānī cāhincha.'),
    ],
  },
  {
    id: 'ng11', glyph: 'होस्', title: 'Höfliche Bitte – ‑नुहोस्',
    summary: 'जानुहोस्, दिनुहोस्: „… Sie bitte“',
    body: [
      { text: 'Bitten bildet man mit ‑नुहोस् am Verbstamm: जा‑ → जानुहोस् „gehen / fahren Sie“, दि‑ → दिनुहोस् „geben Sie“, रोक्‑ → रोक्नुहोस् „halten Sie an“. Das ist die Form zu तपाईं – höflich und ganz normal, für Fahrer, Bedienung, Fremde. Ein eigenes „bitte“ braucht es nicht: Die Höflichkeit steckt in der Endung.' },
      { h: 'Bitte nicht …', text: 'Verneint wird mit न‑ vorn: नजानुहोस् „fahren Sie nicht“, नरोक्नुहोस् „halten Sie nicht an“. Hier steht die Verneinung ausnahmsweise am Anfang des Verbs.' },
      { h: 'Und कृपया?', text: 'Auf Schildern steht oft कृपया „bitte“ (kripayā). Im Gespräch klingt es förmlich – ‑नुहोस् genügt.' },
      { h: 'Neue Wörter', text: 'बिस्तारै „langsam“ · बोल्नुहोस् „sprechen Sie“ – zusammen vielleicht der nützlichste Satz der Reise: बिस्तारै बोल्नुहोस्.' },
    ],
    examples: [
      X('बिस्तारै बोल्नुहोस्।', 'bistārai bolnuhos.', 'Sprechen Sie bitte langsam.', BISTARAI, BOLNUHOS, DANDA),
      X('मलाई एउटा टिकट दिनुहोस्।', 'malāī euṭā ṭikaṭ dinuhos.', 'Geben Sie mir bitte eine Fahrkarte.', MA, LAI, EUTA, TIKAT, DINUHOS, DANDA),
      X('दाइ, बायाँ नजानुहोस्, सिधा जानुहोस्।', 'dāi, bāyāṃ najānuhos, sidhā jānuhos.', 'Fahren Sie nicht links, fahren Sie geradeaus. (zum Fahrer)', DAI, COMMA, BAYAN, NAJANUHOS, COMMA, SIDHA, JANUHOS, DANDA),
      X('यहाँ नरोक्नुहोस्।', 'yahāṃ naroknuhos.', 'Halten Sie hier bitte nicht an.', YAHAN, NAROKNUHOS, DANDA),
      X('माफ गर्नुहोस्, बिस्तारै बोल्नुहोस्।', 'māph garnuhos, bistārai bolnuhos.', 'Entschuldigung, sprechen Sie bitte langsam.', MAPH, GARNUHOS, COMMA, BISTARAI, BOLNUHOS, DANDA),
    ],
    exercises: [
      E('दाइ, बायाँ ＿＿, दायाँ जानुहोस्।', 'नजानुहोस्', ['नजानुहोस्', 'जानुहोस्', 'जान्छ'], 'Bitte „nicht …“: न‑ vorn – नजानुहोस्.', 'Fahren Sie nicht links, fahren Sie rechts.', 'dāi, bāyāṃ najānuhos, dāyāṃ jānuhos.'),
      E('दाइ, यहाँ ＿＿, सिधा जानुहोस्।', 'नरोक्नुहोस्', ['नरोक्नुहोस्', 'रोक्नुहोस्', 'जान्छ'], 'Weiterfahren heißt: hier NICHT anhalten – नरोक्नुहोस्.', 'Halten Sie hier nicht an, fahren Sie geradeaus.', 'dāi, yahāṃ naroknuhos, sidhā jānuhos.'),
      E('माफ गर्नुहोस्, बिस्तारै ＿＿।', 'बोल्नुहोस्', ['बोल्नुहोस्', 'नबोल्नुहोस्', 'दिनुहोस्'], 'Die Bitte ums langsame Sprechen: बिस्तारै बोल्नुहोस्.', 'Entschuldigung, sprechen Sie bitte langsam.', 'māph garnuhos, bistārai bolnuhos.'),
      E('मलाई एउटा टिकट ＿＿।', 'दिनुहोस्', ['दिनुहोस्', 'जानुहोस्', 'बोल्नुहोस्'], 'Etwas haben wollen → दिनुहोस् „geben Sie“.', 'Geben Sie mir bitte eine Fahrkarte.', 'malāī euṭā ṭikaṭ dinuhos.'),
    ],
  },
  {
    id: 'ng12', glyph: 'एँ', title: 'Vergangenheit – गएँ, आएँ, खाएँ',
    summary: 'Was ich getan habe – und warum es dann मैले heißt',
    body: [
      { text: 'Für „ich bin gegangen / ich ging“ hängt man ‑एँ an den Verbstamm: आ‑ → आएँ „ich bin gekommen“, खा‑ → खाएँ „ich habe gegessen“, बुझ्‑ → बुझेँ „ich habe verstanden“. „Gehen“ ist unregelmäßig: गएँ „ich bin gegangen“. Den Unterschied „ging / bin gegangen“ macht diese Form nicht. (Es gibt weitere Vergangenheitsformen – die müssen Sie zunächst nur wiedererkennen.)' },
      { h: 'मैले statt म', text: 'Bei Verben mit Objekt (essen, verstehen …) bekommt der Handelnde in der Vergangenheit ‑ले: म + ले = मैले. मैले दाल भात खाएँ – „Ich habe Dal Bhat gegessen“. Bei gehen und kommen bleibt es bei म: म हिजो पोखरा आएँ. Daher auch मैले बुझिनँ – „ich habe nicht verstanden“ (‑इनँ ist die verneinte Form).' },
      { h: 'Zu तपाईं', text: 'Die höfliche Form endet auf ‑नुभयो: तपाईं पोखरा कहिले आउनुभयो? – „Wann sind Sie nach Pokhara gekommen?“ तपाईंले खाना खानुभयो? – „Haben Sie schon gegessen?“ ist eine typische freundliche Begrüßung.' },
      { h: 'Neue Wörter', text: 'हिजो „gestern“ · पोखरा – die Stadt am Phewa-See.' },
    ],
    examples: [
      X('म हिजो पोखरा आएँ।', 'ma hijo pokharā āeṃ.', 'Ich bin gestern nach Pokhara gekommen.', MA, HIJO, POKHARA, AAEN, DANDA),
      X('मैले दाल भात खाएँ।', 'maile dāl bhāt khāeṃ.', 'Ich habe Dal Bhat gegessen.', MAILE, DAL, BHAT, KHAEN, DANDA),
      X('तपाईंले खाना खानुभयो?', 'tapāīṃle khānā khānubhayo?', 'Haben Sie schon gegessen? (freundliche Begrüßung)', TAPAIN, LE, KHANA, KHANUBHAYO, Q),
      X('म आज बिहान थमेल गएँ।', 'ma āj bihān thamel gaeṃ.', 'Ich bin heute Morgen nach Thamel gegangen.', MA, AAJ, BIHAN, THAMEL, GAEN, DANDA),
      X('तपाईं पोखरा कहिले आउनुभयो?', 'tapāīṃ pokharā kahile āunubhayo?', 'Wann sind Sie nach Pokhara gekommen?', TAPAIN, POKHARA, KAHILE, AUNUBHAYO, Q),
      X('मैले बुझेँ, धन्यवाद।', 'maile bujheṃ, dhanyabād.', 'Ich habe verstanden, danke.', MAILE, BUJHEN, COMMA, DHANYABAD, DANDA),
    ],
    exercises: [
      E('＿＿ दाल भात खाएँ।', 'मैले', ['मैले', 'म', 'मलाई'], 'Essen hat ein Objekt → in der Vergangenheit मैले.', 'Ich habe Dal Bhat gegessen.', 'maile dāl bhāt khāeṃ.'),
      E('म हिजो पोखरा ＿＿।', 'आएँ', ['आएँ', 'आउनुभयो', 'आउनुहोस्'], 'Mit म endet die Vergangenheit auf ‑एँ.', 'Ich bin gestern nach Pokhara gekommen.', 'ma hijo pokharā āeṃ.'),
      E('तपाईंले खाना ＿＿?', 'खानुभयो', ['खानुभयो', 'खाएँ', 'खानुहोस्'], 'Zu तपाईं: ‑नुभयो.', 'Haben Sie schon gegessen?', 'tapāīṃle khānā khānubhayo?'),
      E('म आज बिहान थमेल ＿＿।', 'गएँ', ['गएँ', 'जानुभयो', 'जानुहोस्'], '„ich bin gegangen“ = गएँ (unregelmäßig).', 'Ich bin heute Morgen nach Thamel gegangen.', 'ma āj bihān thamel gaeṃ.'),
      E('मैले ＿＿, धन्यवाद।', 'बुझेँ', ['बुझेँ', 'गएँ', 'आएँ'], 'मैले passt nur zu Verben mit Objekt: verstehen ja, gehen und kommen nicht.', 'Ich habe verstanden, danke.', 'maile bujheṃ, dhanyabād.'),
    ],
  },
]

// Reihenfolge der Freischaltung = Reihenfolge im Lernpfad (path-order.md): ‑लाई/चाहिन्छ,
// मन पर्छ und Zählwörter kommen mit dem Essen (Welt 6), die Postpositionen mit „Unterwegs“.
export const GRAMMAR_ORDER = ['ng1', 'ng2', 'ng3', 'ng4', 'ng5', 'ng8', 'ng9', 'ng10', 'ng6', 'ng7', 'ng11', 'ng12']

export const GRAMMAR_BY_ID = Object.fromEntries(GRAMMAR.map(g => [g.id, g]))

// SRS-Karten-Schlüssel eines Themas (Grammatik wird als Lückensatz wiederholt).
export const grammarKey = id => 'g:' + id

// Der gelöste Lückensatz – für Anzeige nach dem Antippen und (später) für die Sprachausgabe.
export const solved = ex => ex.q.replace('＿＿', ex.a)

// Wörter, die ein Thema braucht, bevor ein Wortblock sie bringt – im body unter „Neue Wörter“
// erklärt, höchstens drei je Thema. Der Wort-Audit zählt sie ab diesem Thema als eingeführt.
const NW = (dev, roman, de) => ({ dev, roman, de })
export const GRAMMAR_NEW_WORDS = {
  ng2: [NW('जर्मन', 'jarman', 'Deutsche(r), deutsch'), NW('नेपाली', 'nepālī', 'Nepalese/Nepalesin, nepalesisch; Nepali (Sprache)')],
  ng3: [NW('झोला', 'jholā', 'Tasche, Beutel'), NW('पासपोर्ट', 'pāsporṭ', 'Reisepass'), NW('ठूलो', 'ṭhūlo', 'groß')],
  ng5: [NW('थमेल', 'thamel', 'Thamel (Touristenviertel in Kathmandu)'), NW('जाने', 'jāne', '(zu) gehen – nach कसरी')],
  ng9: [NW('मन', 'man', 'Herz, Gemüt (in मन पर्छ „gefällt“)')],
  ng10: [NW('हामी', 'hāmī', 'wir')],
  ng11: [NW('बिस्तारै', 'bistārai', 'langsam'), NW('बोल्नुहोस्', 'bolnuhos', 'sprechen Sie (höfliche Bitte)')],
  ng12: [NW('हिजो', 'hijo', 'gestern'), NW('पोखरा', 'pokharā', 'Pokhara (Stadt am Phewa-See)')],
}

// Formen und kleine Wörter, die ein Thema selbst lehrt (Kopula-Formen, Fragewörter, Zählwörter,
// Verbformen) – keine Inhaltswörter. Ab diesem Thema gelten sie als bekannt, wie die
// Funktionswörter des Audits.
export const GRAMMAR_FORMS = {
  ng2: ['हुँ', 'हुनुहुन्छ'],
  ng4: ['होइनँ', 'छैनँ', 'हुनुहुन्न'],
  ng5: ['कसरी'],
  ng7: ['उहाँ'],
  ng9: ['पर्छ', 'पर्दैन'],
  ng10: ['वटा', 'जना', 'छौं'],
  ng11: ['नजानुहोस्', 'नरोक्नुहोस्', 'नबोल्नुहोस्'],
  ng12: ['मैले', 'ले', 'गएँ', 'आएँ', 'खाएँ', 'बुझेँ', 'खानुभयो', 'आउनुभयो', 'कहिले'],
}
