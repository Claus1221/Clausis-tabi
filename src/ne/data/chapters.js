// ─── Yatra: Geschichts-Kapitel ────────────────────────────────────────────────
// Gegenstück zu src/data/chapters.js: EINE durchgehende Geschichte über zehn Kapitel (hier
// nc1…nc10). Du – die reisende Person, nie mit Namen genannt – kommst allein in Nepal an;
// ab nc1 begleitet dich Asha, deren Familie in Thamel ein kleines Gästehaus führt. nc1–nc4
// spielen in Kathmandu, nc5/nc6 in Pokhara, nc7–nc10 auf einem kurzen Trek – Ashas erstem
// als Guide. Deutsch trägt die Handlung, das Nepali wächst von Kapitel zu Kapitel; nc10
// schließt die Reise und Ashas Weg ab.
//
// Schema:
//   Kapitel { id: 'nc1'…, title, place, summary (Deutsch), steps: Schritt[] }
//   story   { kind, de, dev?, roman?, tokens? } – Erzählung; spricht jemand Nepali, steht der
//           Satz in dev/roman/tokens und seine Bedeutung in de. Tokens wie in words.js:
//           alle t zusammen = Satz ohne Leerzeichen, Satzzeichen ohne de (nicht antippbar),
//           -मा/-को/-लाई/-बाट/-सँग als eigene Tokens.
//   intro   { kind, dev, roman, de, note? } – neues Wort DIESES Kapitels (→ CHAPTER_WORD, SRS)
//   audio   { kind, say, sayRoman, options, answer, de } – „Was wurde gesagt?“; options und
//           answer Deutsch. Ohne Ton zeigt die App say geschrieben – dann ist es eine Leseaufgabe.
//   dialog  { kind, line, lineRoman, lineDe, options, answer, answerRoman, answerDe, optionsMeta }
//           – jemand sagt line, du wählst die passende Nepali-Antwort; optionsMeta[option] =
//           { roman, de } für jede Option, damit nach dem Antippen alles lesbar ist.
//   gap     { kind, before, after, options, answer, de, roman } – Satz = before + answer + after
//   tf      { kind, dev, roman, de, claimDe, answer } – stimmt die deutsche Aussage?
//   build   { kind, tiles, answer, alsoAccept?, dev, de, roman } – answer = Stücke in Reihenfolge;
//           mit Leerzeichen verbunden ergeben sie dev ohne Satzzeichen. tiles = answer + 1–2
//           Ablenker. alsoAccept = weitere richtige Reihenfolgen derselben Stücke (string[][]).
//
// Deutsch: Die Erzählung spricht dich mit „du“ an; was Nepali-Figuren sagen, steht auf Deutsch
// mit „Sie“ – sie sprechen höfliches Nepali (तपाईं).
//
// Wortschatz (verbindlich, path-order.md): ein Kapitel benutzt nur Wörter aus Wortblöcken und
// Grammatik-Themen, die im Pfad VOR ihm liegen, die Funktionswörter (lib/functionWords.js),
// die intro-Wörter früherer Kapitel und die eigenen – jedes erst nach seinem intro. Keine
// Grammatik vorweg: Nachstellungen vor ng6/ng7 nur als schon gelernte Brocken (तपाईंलाई,
// तपाईंको), keine Vergangenheit, ‑नुहोस् vor ng11 nur mit gelernten Verben.
// Der Test (chapters.test.js) prüft das Schritt für Schritt.

import { nfc } from '../lib/deva.js'

// Bauhilfen: Tokens als [t, r, de]-Tupel wie in words.js; Satzzeichen [t].
const tok = ([t, r, de]) => (de === undefined ? { t } : { t, r, de })
const L = (dev, roman, ...tokens) => ({ dev, roman, tokens: tokens.map(tok) })
const story = (de, line) => (line ? { kind: 'story', de, ...line } : { kind: 'story', de })
const intro = (dev, roman, de, note) => (note ? { kind: 'intro', dev, roman, de, note } : { kind: 'intro', dev, roman, de })
const audio = (say, sayRoman, de, answer, options) => ({ kind: 'audio', say, sayRoman, options, answer, de })
// opts: [[dev, roman, de], …]; die richtige Antwort ist die mit dem Index `right`.
const dialog = ([line, lineRoman, lineDe], opts, right) => ({
  kind: 'dialog', line, lineRoman, lineDe,
  options: opts.map(o => o[0]),
  answer: opts[right][0], answerRoman: opts[right][1], answerDe: opts[right][2],
  optionsMeta: Object.fromEntries(opts.map(([dev, roman, de]) => [dev, { roman, de }])),
})
const gap = (before, answer, after, options, de, roman) => ({ kind: 'gap', before, after, options, answer, de, roman })
const tf = (dev, roman, de, claimDe, answer) => ({ kind: 'tf', dev, roman, de, claimDe, answer })
// alsoAccept: weitere richtige Reihenfolgen DERSELBEN Stücke (Nepali stellt um: Anrede am
// Ende, betontes Wort vorn) – sonst würde eine richtige Antwort als falsch gewertet.
const build = (dev, roman, de, answer, tiles, alsoAccept) =>
  (alsoAccept ? { kind: 'build', tiles, answer, alsoAccept, dev, de, roman } : { kind: 'build', tiles, answer, dev, de, roman })

// Satzzeichen
const DANDA = ['।'], Q = ['?'], COMMA = [',']
// Funktionswörter und Wörter aus Blöcken/Grammatik – Bedeutungen wie in words.js / grammar.js
const MA = ['म', 'ma', 'ich']
const TAPAIN = ['तपाईं', 'tapāīṃ', 'Sie (höflich)']
const YO = ['यो', 'yo', 'das, dies(e)']
const KE = ['के', 'ke', 'was']
const KATI = ['कति', 'kati', 'wie viel']
const RA = ['र', 'ra', 'und']
const HO = ['हो', 'ho', 'ist']
const HUN = ['हुँ', 'huṃ', 'bin (Gleichsetzung)']
const HUNUHUNCHA = ['हुनुहुन्छ', 'hunuhuncha', 'sind (höflich, zu तपाईं)']
const CHA = ['छ', 'cha', 'ist / gibt es']
const CHAINA = ['छैन', 'chaina', 'ist nicht / gibt es nicht']
const LAI = ['लाई', 'lāī', 'für, an (nachgestellt) – म/तपाईं + लाई: „mir“/„Ihnen“']
const MAA = ['मा', 'mā', 'in, auf (nachgestellt)']
const CAHINCHA = ['चाहिन्छ', 'cāhincha', 'wird gebraucht (→ ich brauche / möchte)']
const CAHINDAINA = ['चाहिँदैन', 'cāhiṃdaina', 'wird nicht gebraucht']
const DINUHOS = ['दिनुहोस्', 'dinuhos', 'geben Sie (höfliche Bitte)']
const JANUHOS = ['जानुहोस्', 'jānuhos', 'gehen / fahren Sie (höfliche Bitte)']
const JANCHA = ['जान्छ', 'jāncha', 'geht, fährt']
const HUNCHA_OK = ['हुन्छ', 'huncha', 'geht klar, okay (wörtl. „wird“)']
const NAMASTE = ['नमस्ते', 'namaste', 'Hallo']
const DHANYABAD = ['धन्यवाद', 'dhanyabād', 'danke']
const THIK = ['ठीक', 'ṭhīk', 'in Ordnung, richtig']
const PASPORT = ['पासपोर्ट', 'pāsporṭ', 'Reisepass']
const THULO = ['ठूलो', 'ṭhūlo', 'groß']
const N7 = ['सात', 'sāt', 'sieben']
const SAY = ['सय', 'say', 'hundert']
const KAM = ['कम', 'kam', 'wenig, weniger']
const DHERAI = ['धेरै', 'dherai', 'sehr, viel']
const THAMEL = ['थमेल', 'thamel', 'Thamel (Viertel in Kathmandu)']
const KASARI = ['कसरी', 'kasarī', 'wie (auf welche Weise)']
const JANE = ['जाने', 'jāne', '(zu) gehen']
const JANE_WIR = ['जाने', 'jāne', '(zu) gehen – umgangssprachlich: „gehen wir …“']
const DAL = ['दाल', 'dāl', 'Linsen(suppe)']
const BHAT = ['भात', 'bhāt', 'Reis (gekocht)']
const MITHO = ['मीठो', 'mīṭho', 'lecker']
const PIRO = ['पिरो', 'piro', 'scharf']
const DIDI = ['दिदी', 'didī', 'ältere Schwester (Anrede)']
const DAI = ['दाइ', 'dāi', 'älterer Bruder (Anrede)']
const BAS = ['बस', 'bas', 'Bus']
const SIDHA = ['सिधा', 'sidhā', 'geradeaus']
const BAYAN = ['बायाँ', 'bāyāṃ', 'links']
// Name der Begleiterin (Eigenname, kein Lernwort)
const ASHA = ['आशा', 'āshā', 'Asha (Name)']
// Neue Wörter der Kapitel (intro)
const BHISA = ['भिसा', 'bhisā', 'Visum']
const PARYATAK = ['पर्यटक', 'paryaṭak', 'Tourist(in)']
const TYAHAN = ['त्यहाँ', 'tyahāṃ', 'dort']
const BHADA = ['भाडा', 'bhāḍā', 'Fahrpreis']
const ALI = ['अलि', 'ali', 'ein bisschen, etwas']
const NAJIK = ['नजिक', 'najik', 'nah']
const TARKARI = ['तरकारी', 'tarkārī', 'Gemüse(curry)']
const ACAR = ['अचार', 'acār', 'Achar (würzige Beilage)']
const THAP = ['थप', 'thap', 'mehr, zusätzlich']
const JAMMA = ['जम्मा', 'jammā', 'insgesamt']
const BAUDDHA = ['बौद्ध', 'bauddha', 'Boudha (Stadtteil mit der großen Stupa)']
const HINDER = ['हिँडेर', 'hiṃḍer', 'zu Fuß']
const STUP = ['स्तूप', 'stūp', 'Stupa']
const MATHI = ['माथि', 'māthi', 'oben, hinauf']
// Ab nc5: weitere Wörter aus Blöcken und Grammatik
const MERO = ['मेरो', 'mero', 'mein']
const KO = ['को', 'ko', 'von (nachgestellt, Besitz – wie „-s“ in „Peters“)']
const HO_JA = ['हो', 'ho', 'ja (wörtl. „ist so“)']
const HUNCHA_W = ['हुन्छ', 'huncha', 'wird']
const MAN = ['मन', 'man', 'Herz, Gemüt']
const PARCHA = ['पर्छ', 'parcha', 'fällt (मन पर्छ: gefällt)']
const PARCHA_F = ['पर्छ', 'parcha', 'fällt']
const PANI_W = ['पानी', 'pānī', 'Wasser']
const PANI_RAIN = ['पानी', 'pānī', 'Wasser (hier: Regen)']
const BISTARAI = ['बिस्तारै', 'bistārai', 'langsam']
const MAILE = ['मैले', 'maile', 'ich (Handelnder; म + ले)']
const BUJHEN = ['बुझेँ', 'bujheṃ', 'habe verstanden']
const AUNUBHAYO = ['आउनुभयो', 'āunubhayo', 'sind gekommen (höflich)']
const NEPALI_LANG = ['नेपाली', 'nepālī', 'Nepali (Sprache)']
const HAMI = ['हामी', 'hāmī', 'wir']
const JANA = ['जना', 'janā', 'Person(en) (Zählwort für Menschen)']
const N5 = ['पाँच', 'pāṃc', 'fünf']
const N6 = ['छ', 'cha', 'sechs']
const BAJE = ['बजे', 'baje', 'Uhr (um … Uhr)']
const AAJ = ['आज', 'āj', 'heute']
const BHOLI = ['भोलि', 'bholi', 'morgen']
const BIHAN = ['बिहान', 'bihān', 'morgens']
const RAMRO = ['राम्रो', 'rāmro', 'gut, schön']
const POKHARA = ['पोखरा', 'pokharā', 'Pokhara (Stadt am Phewa-See)']
const DAI_BR = ['दाइ', 'dāi', 'älterer Bruder']
const BATO = ['बाटो', 'bāṭo', 'Weg']
const YAHAN = ['यहाँ', 'yahāṃ', 'hier']
const JADO = ['जाडो', 'jāḍo', 'kalt (Wetter)']
const HIMAL = ['हिमाल', 'himāl', 'Schneeberg(e)']
// Eigennamen
const NEPAL = ['नेपाल', 'nepāl', 'Nepal']
const MACHA = ['माछापुच्छ्रे', 'māchāpucchre', 'Machhapuchhre (Berg bei Pokhara)']
// Neue Wörter nc5–nc10 (intro)
const GAID = ['गाइड', 'gāiḍ', 'Guide, Bergführer(in)']
const PANI = ['पनि', 'pani', 'auch']
const NADI = ['नदी', 'nadī', 'Fluss']
const KHAJA = ['खाजा', 'khājā', 'Imbiss, kleine Mahlzeit']
const TAL = ['ताल', 'tāl', 'See']
const BADAL = ['बादल', 'bādal', 'Wolke(n)']
const DUNGA = ['डुङ्गा', 'ḍuṅgā', 'Boot']
const DEKHINCHA = ['देखिन्छ', 'dekhincha', 'ist zu sehen, man sieht']
const PARMIT = ['परमिट', 'paramiṭ', 'Genehmigung, Permit']
const SHUBH = ['शुभ', 'shubh', 'glücklich, gut (in शुभ यात्रा)']
const YATRA = ['यात्रा', 'yātrā', 'Reise']
const SIMDHI = ['सिँढी', 'siṃḍhī', 'Treppe, Stufen']
const LAJ = ['लज', 'laj', 'Lodge, Teehaus']
const KAMBAL = ['कम्बल', 'kambal', 'Decke (Wolldecke)']
const AGO = ['आगो', 'āgo', 'Feuer']
const BASNUHOS = ['बस्नुहोस्', 'basnuhos', 'setzen Sie sich (höfliche Bitte)']
const KHUTTA = ['खुट्टा', 'khuṭṭā', 'Fuß, Bein']
const DUKHCHA = ['दुख्छ', 'dukhcha', 'tut weh']
const MADDAT = ['मद्दत', 'maddat', 'Hilfe']
const PARKHANUHOS = ['पर्खनुहोस्', 'parkhanuhos', 'warten Sie (höfliche Bitte)']
const ANDHYARO = ['अँध्यारो', 'aṃdhyāro', 'dunkel']
const UJYALO = ['उज्यालो', 'ujyālo', 'hell']
const SUNDAR = ['सुन्दर', 'sundar', 'wunderschön']
const PHERI = ['फेरि', 'pheri', 'wieder']
const AUNUHOS = ['आउनुहोस्', 'āunuhos', 'kommen Sie (höfliche Bitte)']

export const CHAPTERS = [
  {
    id: 'nc1', title: 'Ankunft am Flughafen', place: 'Tribhuvan International Airport, Kathmandu',
    summary: 'Einreise mit Pass und Visum, die erste Begegnung mit Asha und der Weg hinaus zu den Taxis.',
    steps: [
      story('Dein Flugzeug setzt in Kathmandu auf, am Tribhuvan International Airport. Du reist allein und bist zum ersten Mal in Nepal. In der Ankunftshalle reihst du dich in die Schlange vor den Schaltern der Einreise.'),
      intro('भिसा', 'bhisā', 'Visum', 'Ein Touristenvisum für Nepal können Deutsche auch erst bei der Ankunft am Flughafen bekommen.'),
      story('Am Schalter sitzt ein Beamter. Er nickt dir zu: „Hallo. Pass und Visum, bitte.“',
        L('नमस्ते। पासपोर्ट र भिसा दिनुहोस्।', 'namaste. pāsporṭ ra bhisā dinuhos.', NAMASTE, DANDA, PASPORT, RA, BHISA, DINUHOS, DANDA)),
      intro('पर्यटक', 'paryaṭak', 'Tourist(in)', 'Das übliche Wort für Urlaubsreisende – am Schalter, auf Formularen, auf Schildern.'),
      story('Er blättert in deinem Pass und fragt: „Sind Sie Tourist(in)?“',
        L('तपाईं पर्यटक हुनुहुन्छ?', 'tapāīṃ paryaṭak hunuhuncha?', TAPAIN, PARYATAK, HUNUHUNCHA, Q)),
      gap('हजुर, म पर्यटक ', 'हुँ', '।', ['हो', 'हुँ', 'हुनुहुन्छ'], 'Ja, ich bin Tourist(in).', 'hajur, ma paryaṭak huṃ.'),
      intro('नेपाल', 'nepāl', 'Nepal'),
      intro('पहिलो पटक', 'pahilo paṭak', 'das erste Mal', 'पहिलो heißt „erste(r)“, पटक „Mal“. Reisende werden das ständig gefragt.'),
      dialog(['नेपाल पहिलो पटक हो?', 'nepāl pahilo paṭak ho?', 'Sind Sie zum ersten Mal in Nepal? (wörtl. „Nepal – erstes Mal?“)'], [
        ['म सन्चै छु, धन्यवाद।', 'ma sancai chu, dhanyabād.', 'Mir geht es gut, danke.'],
        ['हजुर, पहिलो पटक हो।', 'hajur, pahilo paṭak ho.', 'Ja, es ist das erste Mal.'],
        ['यो मेरो झोला हो।', 'yo mero jholā ho.', 'Das ist meine Tasche.'],
      ], 1),
      story('Ein Stempel, ein kurzes Lächeln: „In Ordnung, danke.“ Du bist in Nepal.',
        L('ठीक छ, धन्यवाद।', 'ṭhīk cha, dhanyabād.', THIK, CHA, COMMA, DHANYABAD, DANDA)),
      tf('पासपोर्ट र भिसा दिनुहोस्।', 'pāsporṭ ra bhisā dinuhos.', 'Pass und Visum, bitte.',
        'Mit diesem Satz hat der Beamte nach deinem Rückflugticket gefragt.', false),
      story('Mit deinem Gepäck gehst du durch den Ausgang hinaus ins Freie. Hinter einer Absperrung warten viele Menschen mit Namensschildern – auf einem steht deiner. Eine junge Frau hält es hoch; ihre Familie führt das kleine Gästehaus in Thamel, in dem du ein Zimmer gebucht hast. Sie strahlt: „Hallo, ich bin Asha.“ Und dann kommt die Frage, die du schon kennst.',
        L('नमस्ते, म आशा हुँ।', 'namaste, ma āshā huṃ.', NAMASTE, COMMA, MA, ASHA, HUN, DANDA)),
      audio('नेपाल पहिलो पटक हो?', 'nepāl pahilo paṭak ho?', 'Sind Sie zum ersten Mal in Nepal?', 'Sind Sie zum ersten Mal in Nepal?',
        ['Sind Sie Tourist(in)?', 'Sind Sie zum ersten Mal in Nepal?', 'Ist das Ihre Tasche?']),
      dialog(['यो तपाईंको झोला हो?', 'yo tapāīṃko jholā ho?', 'Ist das Ihre Tasche?'], [
        ['तपाईंलाई सन्चै छ?', 'tapāīṃlāī sancai cha?', 'Geht es Ihnen gut?'],
        ['हजुर, म पर्यटक हुँ।', 'hajur, ma paryaṭak huṃ.', 'Ja, ich bin Tourist(in).'],
        ['हो, यो मेरो झोला हो।', 'ho, yo mero jholā ho.', 'Ja, das ist meine Tasche.'],
      ], 2),
      build('म जर्मन पर्यटक हुँ।', 'ma jarman paryaṭak huṃ.', 'Ich bin deutsche Touristin / deutscher Tourist.',
        ['म', 'जर्मन', 'पर्यटक', 'हुँ'], ['पर्यटक', 'हुँ', 'म', 'भिसा', 'जर्मन', 'हो']),
      intro('त्यहाँ', 'tyahāṃ', 'dort, dort drüben', 'त्यहाँ छ – „ist dort“.'),
      story('Du fragst Asha nach einem Taxi. Sie zeigt über den Vorplatz zum Parkplatz: „Dort drüben.“ (wörtl. „ist dort“)',
        L('त्यहाँ छ।', 'tyahāṃ cha.', TYAHAN, CHA, DANDA)),
      tf('त्यहाँ छ।', 'tyahāṃ cha.', 'Dort drüben. (wörtl. „ist dort“)',
        'Asha sagt, die Taxis stehen gleich hier neben euch am Ausgang.', false),
      story('Warme Luft, Hupen, Stimmen. Ihr geht über den Vorplatz zum Parkplatz, wo eine Reihe kleiner Taxis wartet – und Asha winkt schon einem Fahrer.'),
    ],
  },
  {
    id: 'nc2', title: 'Taxi nach Thamel', place: 'Vom Flughafen nach Thamel',
    summary: 'Den Fahrpreis aushandeln, unterwegs fragen, wie weit es noch ist, und in Thamel ankommen.',
    steps: [
      story('Am Taxistand. Asha lässt dich verhandeln – sie hilft nur, wenn es klemmt. Leise gibt sie dir einen Richtwert für die Fahrt nach Thamel: „Siebenhundert ist in Ordnung.“',
        L('सात सय ठीक छ।', 'sāt say ṭhīk cha.', N7, SAY, THIK, CHA, DANDA)),
      dialog(['कहाँ जाने?', 'kahāṃ jāne?', 'Wohin soll es gehen?'], [
        ['पहिलो पटक हो।', 'pahilo paṭak ho.', 'Es ist das erste Mal.'],
        ['थमेल।', 'thamel.', 'Nach Thamel.'],
        ['म जर्मन हुँ।', 'ma jarman huṃ.', 'Ich bin Deutsche(r).'],
      ], 1),
      intro('भाडा', 'bhāḍā', 'Fahrpreis (auch: Miete)', 'Bei Taxi und Bus fragt man mit भाडा कति हो? nach dem Preis.'),
      story('Du fragst nach dem Preis: „Wie viel kostet die Fahrt?“',
        L('भाडा कति हो?', 'bhāḍā kati ho?', BHADA, KATI, HO, Q)),
      audio('एक हजार रुपैयाँ।', 'ek hajār rupaiyāṃ.', 'Tausend Rupien.', 'Tausend Rupien.',
        ['Hundert Rupien.', 'Siebenhundert Rupien.', 'Tausend Rupien.']),
      intro('अलि', 'ali', 'ein bisschen, etwas', 'Macht eine Aussage weicher: अलि महँगो – „etwas teuer“.'),
      gap('अलि ', 'महँगो', ' छ, कम गर्नुहोस्।', ['सस्तो', 'महँगो', 'ठूलो'],
        'Das ist etwas teuer, machen Sie es billiger.', 'ali mahaṃgo cha, kam garnuhos.'),
      dialog(['आठ सय, ठीक छ?', 'āṭh say, ṭhīk cha?', 'Achthundert, in Ordnung?'], [
        ['नौ सय, ठीक छ?', 'nau say, ṭhīk cha?', 'Neunhundert, in Ordnung?'],
        ['एक हजार, ठीक छ?', 'ek hajār, ṭhīk cha?', 'Tausend, in Ordnung?'],
        ['सात सय, ठीक छ?', 'sāt say, ṭhīk cha?', 'Siebenhundert, in Ordnung?'],
      ], 2),
      story('Der Fahrer seufzt und lacht dann: „Siebenhundert ist ein bisschen wenig. Na gut, in Ordnung.“',
        L('सात सय अलि कम छ। हुन्छ, ठीक छ।', 'sāt say ali kam cha. huncha, ṭhīk cha.', N7, SAY, ALI, KAM, CHA, DANDA, HUNCHA_OK, COMMA, THIK, CHA, DANDA)),
      tf('भाडा महँगो छैन।', 'bhāḍā mahaṃgo chaina.', 'Der Fahrpreis ist nicht teuer.',
        'Der Satz sagt: Der Fahrpreis ist teuer.', false),
      story('Das Taxi schiebt sich durch den Verkehr: Motorräder, Busse, Hupen an jeder Kreuzung. Du versuchst, die Schilder am Straßenrand zu lesen.'),
      intro('नजिक', 'najik', 'nah, in der Nähe'),
      story('Du fragst den Fahrer: „Ist Thamel nah?“',
        L('थमेल नजिक छ?', 'thamel najik cha?', THAMEL, NAJIK, CHA, Q)),
      tf('हजुर, नजिक छ।', 'hajur, najik cha.', 'Ja, es ist nah.',
        'Mit dieser Antwort sagt der Fahrer: Bis Thamel ist es nicht mehr weit.', true),
      story('Enge Gassen, Läden mit Trekkingjacken, Cafés, Schilder auf Englisch und Nepali. Der Fahrer hält: „Das ist Thamel.“',
        L('यो थमेल हो।', 'yo thamel ho.', YO, THAMEL, HO, DANDA)),
      build('भाडा सात सय रुपैयाँ हो।', 'bhāḍā sāt say rupaiyāṃ ho.', 'Der Fahrpreis ist siebenhundert Rupien.',
        ['भाडा', 'सात', 'सय', 'रुपैयाँ', 'हो'], ['सय', 'हो', 'भाडा', 'हजार', 'रुपैयाँ', 'सात', 'छु'],
        [['सात', 'सय', 'रुपैयाँ', 'भाडा', 'हो']]),
      story('Du zahlst. Asha nimmt deine Tasche und zeigt in eine schmale Gasse: Das Gästehaus ihrer Familie liegt gleich um die Ecke. „Ganz nah.“',
        L('धेरै नजिक छ।', 'dherai najik cha.', DHERAI, NAJIK, CHA, DANDA)),
    ],
  },
  {
    id: 'nc3', title: 'Erstes Dal Bhat', place: 'Ein kleines Lokal in Thamel',
    summary: 'Bestellen, probieren, Nachschlag bekommen – und nach der Rechnung fragen.',
    steps: [
      story('Am Abend nimmt Asha dich mit in ein kleines Lokal ein paar Gassen weiter. Hier essen die Leute aus dem Viertel; die Frau am Herd nennen alle Didi. Asha verspricht: „Das Dal Bhat ist lecker.“',
        L('दाल भात मीठो छ।', 'dāl bhāt mīṭho cha.', DAL, BHAT, MITHO, CHA, DANDA)),
      dialog(['कति जना?', 'kati janā?', 'Wie viele Personen?'], [
        ['हामी दुई जना छौँ।', 'hāmī duī janā chauṃ.', 'Wir sind zu zweit.'],
        ['हामी दुईवटा छौँ।', 'hāmī duīwaṭā chauṃ.', 'Wir sind zwei Stück. (falsch: Menschen zählt man mit जना)'],
        ['दुई सय रुपैयाँ।', 'duī say rupaiyāṃ.', 'Zweihundert Rupien.'],
      ], 0),
      story('Ihr setzt euch an einen Tisch. Didi fragt: „Was möchten Sie?“',
        L('तपाईंलाई के चाहिन्छ?', 'tapāīṃlāī ke cāhincha?', TAPAIN, LAI, KE, CAHINCHA, Q)),
      build('मलाई दाल भात चाहिन्छ।', 'malāī dāl bhāt cāhincha.', 'Ich hätte gern Dal Bhat.',
        ['मलाई', 'दाल', 'भात', 'चाहिन्छ'], ['भात', 'म', 'चाहिन्छ', 'मलाई', 'छ', 'दाल'],
        [['दाल', 'भात', 'मलाई', 'चाहिन्छ']]),
      intro('तरकारी', 'tarkārī', 'Gemüse; Gemüsecurry', 'Gehört zum Dal Bhat wie Linsen und Reis.'),
      intro('अचार', 'acār', 'Achar – würzige Beilage aus eingelegtem oder frisch zerstoßenem Gemüse', 'Kommt als kleines Häufchen auf den Teller und ist oft scharf.'),
      story('Die Teller kommen: ein Berg Reis, Linsensuppe in einer Schale, Gemüsecurry und ein kleines rotes Häufchen Achar. Asha zeigt darauf und sagt etwas.'),
      audio('अचार अलि पिरो छ।', 'acār ali piro cha.', 'Das Achar ist etwas scharf.', 'Das Achar ist etwas scharf.',
        ['Das Achar ist etwas scharf.', 'Das Achar ist kalt.', 'Das Gemüse ist teuer.']),
      story('Du probierst vorsichtig – und bist begeistert: „Das Gemüse ist sehr lecker, das Achar etwas scharf.“',
        L('तरकारी धेरै मीठो छ, अचार अलि पिरो छ।', 'tarkārī dherai mīṭho cha, acār ali piro cha.', TARKARI, DHERAI, MITHO, CHA, COMMA, ACAR, ALI, PIRO, CHA, DANDA)),
      dialog(['तपाईंलाई नेपाली खाना मन पर्छ?', 'tapāīṃlāī nepālī khānā man parcha?', 'Mögen Sie nepalesisches Essen?'], [
        ['हजुर, म धेरै मन पर्छ।', 'hajur, ma dherai man parcha.', 'Ja, ich gefalle sehr … (falsch: bei मन पर्छ heißt es मलाई, nicht म)'],
        ['तपाईंलाई सन्चै छ?', 'tapāīṃlāī sancai cha?', 'Geht es Ihnen gut?'],
        ['हजुर, मलाई धेरै मन पर्छ।', 'hajur, malāī dherai man parcha.', 'Ja, das mag ich sehr.'],
      ], 2),
      intro('थप', 'thap', 'mehr, zusätzlich; Nachschlag', 'Beim Dal Bhat wird meist ohne Aufpreis nachgeschöpft – Reis, Linsen, Gemüse.'),
      story('Didi kommt mit einem Topf an den Tisch: „Brauchen Sie mehr Reis und Gemüse?“',
        L('थप भात र तरकारी चाहिन्छ?', 'thap bhāt ra tarkārī cāhincha?', THAP, BHAT, RA, TARKARI, CAHINCHA, Q)),
      gap('हजुर, अलि ', 'थप', ' दाल दिनुहोस्।', ['महँगो', 'थप', 'सस्तो'],
        'Ja, bitte etwas mehr Dal.', 'hajur, ali thap dāl dinuhos.'),
      story('Beim dritten Mal winkst du lachend ab: „Danke, ich brauche nichts mehr.“',
        L('धन्यवाद, मलाई चाहिँदैन।', 'dhanyabād, malāī cāhiṃdaina.', DHANYABAD, COMMA, MA, LAI, CAHINDAINA, DANDA)),
      intro('जम्मा', 'jammā', 'insgesamt, zusammen', 'Mit जम्मा कति हो? fragt man nach der Gesamtsumme.'),
      story('Satt und zufrieden fragst du nach der Rechnung: „Didi, wie viel macht es insgesamt?“',
        L('दिदी, जम्मा कति हो?', 'didī, jammā kati ho?', DIDI, COMMA, JAMMA, KATI, HO, Q)),
      audio('जम्मा छ सय रुपैयाँ।', 'jammā cha say rupaiyāṃ.', 'Insgesamt sechshundert Rupien. (छ heißt hier „sechs“)', 'Insgesamt sechshundert Rupien.',
        ['Insgesamt neunhundert Rupien.', 'Insgesamt sechshundert Rupien.', 'Insgesamt sechstausend Rupien.']),
      story('Du greifst nach deinem Geldbeutel, aber Asha schiebt ihn lächelnd zurück: „Lassen Sie nur, ich habe Geld dabei.“'),
      tf('मसँग पैसा छ।', 'masaṃga paisā cha.', 'Ich habe Geld (dabei).',
        'Mit diesem Satz sagt Asha, dass sie kein Geld dabeihat und du zahlen sollst.', false),
      story('Asha bezahlt – heute lädt sie dich ein. Auf dem Heimweg erzählt sie von Boudhanath, der großen Stupa im Osten der Stadt. Morgen willst du hin.'),
    ],
  },
  {
    id: 'nc4', title: 'Zur Stupa von Boudhanath', place: 'Boudha, im Osten Kathmandus',
    summary: 'Nach dem Weg fragen, mit dem Bus fahren und Asha an der großen Stupa treffen.',
    steps: [
      story('Am nächsten Morgen muss Asha im Gästehaus helfen. Ihr verabredet euch für den Mittag an der großen Stupa von Boudhanath im Osten der Stadt. Den Weg dorthin findest du allein.'),
      intro('बौद्ध', 'bauddha', 'Boudha – Stadtteil im Osten Kathmandus mit der großen Stupa (Boudhanath)', 'So heißt der Ort; meist ist damit auch die Stupa selbst gemeint.'),
      story('Beim Abschied warnt Asha: „Boudha ist nicht nah.“',
        L('बौद्ध नजिक छैन।', 'bauddha najik chaina.', BAUDDHA, NAJIK, CHAINA, DANDA)),
      story('Vor einem kleinen Laden fragst du den Verkäufer: „Wie komme ich nach Boudha?“',
        L('दाइ, बौद्ध कसरी जाने?', 'dāi, bauddha kasarī jāne?', DAI, COMMA, BAUDDHA, KASARI, JANE, Q)),
      intro('हिँडेर', 'hiṃḍer', 'zu Fuß (wörtl. „gehend“)', 'हिँडेर जाने – zu Fuß gehen.'),
      audio('हिँडेर नजानुहोस्, बसमा जानुहोस्।', 'hiṃḍer najānuhos, basmā jānuhos.', 'Gehen Sie nicht zu Fuß, fahren Sie mit dem Bus.', 'Gehen Sie nicht zu Fuß, nehmen Sie den Bus.',
        ['Gehen Sie nicht zu Fuß, nehmen Sie den Bus.', 'Gehen Sie zu Fuß, der Bus ist teuer.', 'Nehmen Sie ein Taxi, nicht den Bus.']),
      gap('बस कहाँ', 'बाट', ' जान्छ?', ['मा', 'को', 'बाट'], 'Wo fährt der Bus ab?', 'bas kahāṃbāṭa jāncha?'),
      story('Der Verkäufer zeigt die Straße hinunter: „Gehen Sie geradeaus, der Bus steht links.“',
        L('सिधा जानुहोस्, बस बायाँमा छ।', 'sidhā jānuhos, bas bāyāṃmā cha.', SIDHA, JANUHOS, COMMA, BAS, BAYAN, MAA, CHA, DANDA)),
      tf('सिधा जानुहोस्, बस बायाँमा छ।', 'sidhā jānuhos, bas bāyāṃmā cha.', 'Gehen Sie geradeaus, der Bus steht links.',
        'Der Verkäufer sagt, der Bus steht rechts.', false),
      story('An der Straße warten Kleinbusse; ein Schaffner ruft die Ziele aus der offenen Tür. Sicherheitshalber fragst du: „Fährt dieser Bus nach Boudha?“ Er nickt und winkt dich hinein.',
        L('दाइ, यो बस बौद्ध जान्छ?', 'dāi, yo bas bauddha jāncha?', DAI, COMMA, YO, BAS, BAUDDHA, JANCHA, Q)),
      build('दाइ, बौद्धमा रोक्नुहोस्।', 'dāi, bauddhamā roknuhos.', 'Halten Sie bitte in Boudha. (zum Schaffner)',
        ['दाइ', 'बौद्धमा', 'रोक्नुहोस्'], ['रोक्नुहोस्', 'बौद्धबाट', 'दाइ', 'नरोक्नुहोस्', 'बौद्धमा'],
        [['बौद्धमा', 'रोक्नुहोस्', 'दाइ']]),
      intro('स्तूप', 'stūp', 'Stupa (buddhistischer Kuppelbau)', 'Die Stupa von Boudha gehört zu den größten Nepals; vom Turm über der Kuppel blicken gemalte Augen in alle vier Richtungen.'),
      story('Ein Tor, ein paar Schritte – und vor dir öffnet sich ein runder Platz. In der Mitte die weiße Kuppel, ringsum Läden und Cafés. Viele Leute gehen langsam im Uhrzeigersinn um die Stupa; du gehst mit und staunst: „Die Stupa ist sehr groß.“ Da tippt dir jemand auf die Schulter – Asha.',
        L('स्तूप धेरै ठूलो छ।', 'stūp dherai ṭhūlo cha.', STUP, DHERAI, THULO, CHA, DANDA)),
      dialog(['नमस्ते, बौद्ध कस्तो छ?', 'namaste, bauddha kasto cha?', 'Hallo, wie ist Boudha? (Wie gefällt es Ihnen?)'], [
        ['स्तूप कहाँ छ?', 'stūp kahāṃ cha?', 'Wo ist die Stupa?'],
        ['मलाई धेरै मन पर्छ, स्तूप धेरै ठूलो छ।', 'malāī dherai man parcha, stūp dherai ṭhūlo cha.', 'Es gefällt mir sehr, die Stupa ist riesig.'],
        ['बस बायाँमा छ।', 'bas bāyāṃmā cha.', 'Der Bus steht links.'],
      ], 1),
      intro('माथि', 'māthi', 'oben, hinauf', 'Für Stockwerke, Dachterrassen und Berghänge.'),
      story('Asha zeigt auf eine Dachterrasse über einem der Cafés: „Gehen wir hinauf?“',
        L('माथि जाने?', 'māthi jāne?', MATHI, JANE_WIR, Q)),
      tf('यहाँ माथि चिया मीठो छ।', 'yahāṃ māthi ciyā mīṭho cha.', 'Hier oben ist der Tee gut.',
        'Asha sagt, hier oben ist der Tee kalt.', false),
      story('Von oben siehst du die ganze Kuppel, die Augen auf dem Turm, dahinter die Hügel des Tals. Asha zieht dich auf: „Zu Fuß zurück nach Thamel?“ Du lachst – lieber den Bus. Dann erzählt sie von Pokhara, eine lange Busfahrt weiter westlich, und von den Bergen dahinter. Du rührst in deinem Tee und überlegst.',
        L('थमेल हिँडेर जाने?', 'thamel hiṃḍer jāne?', THAMEL, HINDER, JANE_WIR, Q)),
    ],
  },
  {
    id: 'nc5', title: 'Busfahrt nach Pokhara', place: 'Von Kathmandu nach Pokhara',
    summary: 'Ein Tag im Touristenbus: Asha erzählt von ihrem Bruder, unterwegs gibt es einen Imbiss, am Abend Pokhara.',
    steps: [
      story('Ein paar Tage später, früh am Morgen. Am Rand von Thamel stehen die Touristenbusse nach Pokhara. Asha fährt mit – warum, will sie dir unterwegs erzählen. „Der Bus fährt um sieben Uhr.“',
        L('बस सात बजे जान्छ।', 'bas sāt baje jāncha.', BAS, N7, BAJE, JANCHA, DANDA)),
      dialog(['टिकट कहाँ छ?', 'ṭikaṭ kahāṃ cha?', 'Wo ist die Fahrkarte? (der Busbegleiter)'], [
        ['मलाई टिकट मन पर्छ।', 'malāī ṭikaṭ man parcha.', 'Mir gefällt die Fahrkarte.'],
        ['मेरो टिकट झोलामा छ।', 'mero ṭikaṭ jholāmā cha.', 'Meine Fahrkarte ist in der Tasche.'],
        ['टिकट सात बजे हो।', 'ṭikaṭ sāt baje ho.', 'Die Fahrkarte ist um sieben Uhr.'],
      ], 1),
      intro('गाइड', 'gāiḍ', 'Guide, Bergführer(in)', 'Auf den Trekkingwegen Nepals geht man meist mit einem Guide.'),
      story('Der Bus fährt los. Asha erzählt: Ihr älterer Bruder lebt in Pokhara und führt Wandergruppen in die Berge. „Mein Bruder ist Guide in Pokhara.“',
        L('मेरो दाइ पोखरामा गाइड हुनुहुन्छ।', 'mero dāi pokharāmā gāiḍ hunuhuncha.', MERO, DAI_BR, POKHARA, MAA, GAID, HUNUHUNCHA, DANDA)),
      intro('पनि', 'pani', 'auch', 'Steht hinter dem Wort, zu dem es gehört: म पनि – „ich auch“. Nicht verwechseln mit पानी „Wasser“.'),
      story('Du fragst: „Sind Sie auch Guide?“',
        L('तपाईं पनि गाइड हुनुहुन्छ?', 'tapāīṃ pani gāiḍ hunuhuncha?', TAPAIN, PANI, GAID, HUNUHUNCHA, Q)),
      tf('म गाइड होइनँ।', 'ma gāiḍ hoinaṃ.', 'Ich bin kein Guide.',
        'Asha antwortet, sie ist schon Guide.', false),
      story('„Noch nicht“, sagt sie und lacht. Sie will es werden, wie ihr Bruder. Er hat vorgeschlagen, dass sie dich auf einem kurzen Trek in die Berge führt – ihr erster Trek als Guide. Sie ist ein bisschen aufgeregt.'),
      intro('नदी', 'nadī', 'Fluss', 'Die Straße nach Pokhara folgt lange dem Trishuli, einem breiten Fluss.'),
      story('Der Bus schlängelt sich aus dem Kathmandutal hinaus und hinunter ins Flusstal. Du schaust lange aufs Wasser: „Der Fluss ist sehr groß, er gefällt mir.“',
        L('नदी धेरै ठूलो छ, मलाई मन पर्छ।', 'nadī dherai ṭhūlo cha, malāī man parcha.', NADI, DHERAI, THULO, CHA, COMMA, MA, LAI, MAN, PARCHA, DANDA)),
      tf('मलाई पनि नदी मन पर्छ।', 'malāī pani nadī man parcha.', 'Mir gefällt der Fluss auch.',
        'Asha sagt, ihr gefällt der Fluss auch.', true),
      intro('खाजा', 'khājā', 'Imbiss, kleine Mahlzeit', 'Was man zwischen den Hauptmahlzeiten isst – unterwegs oder am Nachmittag.'),
      story('Mittags hält der Bus an einer Raststätte über dem Fluss. Du willst nur eine Kleinigkeit: „Didi, was gibt es als Imbiss?“',
        L('दिदी, खाजा के छ?', 'didī, khājā ke cha?', DIDI, COMMA, KHAJA, KE, CHA, Q)),
      audio('चिया र खाजा छ, दाल भात पनि छ।', 'ciyā ra khājā cha, dāl bhāt pani cha.', 'Es gibt Tee und Imbiss, Dal Bhat gibt es auch.', 'Es gibt Tee und Imbiss, auch Dal Bhat.',
        ['Es gibt nur Tee, kein Essen.', 'Es gibt Tee und Imbiss, auch Dal Bhat.', 'Dal Bhat gibt es erst am Abend.']),
      dialog(['मैले दाल भात खाएँ। तपाईंले खाजा खानुभयो?', 'maile dāl bhāt khāeṃ. tapāīṃle khājā khānubhayo?', 'Ich habe Dal Bhat gegessen. Haben Sie einen Imbiss gegessen?'], [
        ['हजुर, मलाई पनि खाएँ।', 'hajur, malāī pani khāeṃ.', 'Ja, mir auch gegessen. (falsch: zu खाएँ gehört मैले, nicht मलाई)'],
        ['होइन, म नदी हुँ।', 'hoina, ma nadī huṃ.', 'Nein, ich bin ein Fluss.'],
        ['हजुर, मैले पनि खाएँ।', 'hajur, maile pani khāeṃ.', 'Ja, ich habe auch gegessen.'],
      ], 2),
      story('Am späten Nachmittag rollt der Bus in Pokhara ein – fast ein ganzer Tag ist vergangen. Die Wirtin einer kleinen Lodge nahe am See fragt: „Sind Sie mit dem Bus gekommen?“',
        L('बसमा आउनुभयो?', 'basmā āunubhayo?', BAS, MAA, AUNUBHAYO, Q)),
      gap('हजुर, म बसमा ', 'आएँ', '।', ['खाएँ', 'आएँ', 'आउनुभयो'], 'Ja, ich bin mit dem Bus gekommen.', 'hajur, ma basmā āeṃ.'),
      story('Dein Zimmer hat einen kleinen Balkon. Über dem See siehst du nur Wolken – noch. Ashas Bruder ist noch mit einer Gruppe in den Bergen; in zwei Tagen ist er zurück.'),
    ],
  },
  {
    id: 'nc6', title: 'Am Phewa-See', place: 'Pokhara, am Phewa-See',
    summary: 'Wolken über dem See, eine Bootsfahrt, und am nächsten Morgen zeigt sich der Machhapuchhre.',
    steps: [
      story('Pokhara liegt am Ufer des Phewa-Sees. Am ersten Morgen gehst du mit Asha ans Wasser. Über dem See hängen tiefe Wolken.'),
      intro('ताल', 'tāl', 'See', 'Der See von Pokhara heißt फेवा ताल – Phewa-See.'),
      intro('बादल', 'bādal', 'Wolke(n)'),
      story('Asha seufzt: „Heute ist es sehr bewölkt.“ (wörtl. „Heute sind viele Wolken.“)',
        L('आज धेरै बादल छ।', 'āj dherai bādal cha.', AAJ, DHERAI, BADAL, CHA, DANDA)),
      intro('डुङ्गा', 'ḍuṅgā', 'Boot', 'Am Ufer liegen bunte Holzboote, die man mieten kann – mit oder ohne Ruderer.'),
      story('Am Ufer liegen bunte Holzboote. Ein Bootsmann kommt auf euch zu.'),
      dialog(['डुङ्गा चाहिन्छ?', 'ḍuṅgā cāhincha?', 'Möchten Sie ein Boot?'], [
        ['होइन, मलाई डुङ्गा चाहिन्छ।', 'hoina, malāī ḍuṅgā cāhincha.', 'Nein, ich möchte ein Boot. (widersprüchlich)'],
        ['हजुर, एउटा डुङ्गा कति हो?', 'hajur, euṭā ḍuṅgā kati ho?', 'Ja – was kostet ein Boot?'],
        ['आज धेरै बादल छ।', 'āj dherai bādal cha.', 'Heute ist es sehr bewölkt.'],
      ], 1),
      story('Ihr werdet euch schnell einig. Der Bootsmann fragt: „Wie viele Personen sind Sie?“',
        L('कति जना हुनुहुन्छ?', 'kati janā hunuhuncha?', KATI, JANA, HUNUHUNCHA, Q)),
      gap('हामी दुई ', 'जना', ' छौँ।', ['वटा', 'जना', 'लाई'], 'Wir sind zu zweit.', 'hāmī duī janā chauṃ.'),
      story('Der Bootsmann rudert hinaus. Mitten im See liegt eine kleine Insel mit einem Tempel. Asha lässt eine Hand ins Wasser hängen: „Ich mag Boote und den See sehr.“',
        L('मलाई डुङ्गा र ताल धेरै मन पर्छ।', 'malāī ḍuṅgā ra tāl dherai man parcha.', MA, LAI, DUNGA, RA, TAL, DHERAI, MAN, PARCHA, DANDA)),
      tf('आज धेरै बादल छ।', 'āj dherai bādal cha.', 'Heute ist es sehr bewölkt.',
        'Der Satz sagt: Heute ist der Himmel ganz klar.', false),
      story('Am Abend sagt Asha: Wenn morgen früh der Himmel klar ist, sieht man von hier die Berge. „Morgen früh um sechs!“',
        L('भोलि बिहान छ बजे।', 'bholi bihān cha baje.', BHOLI, BIHAN, N6, BAJE, DANDA)),
      intro('देखिन्छ', 'dekhincha', 'ist zu sehen, man sieht', 'Was man sieht, steht davor: ताल देखिन्छ – „man sieht den See“.'),
      story('Am nächsten Morgen ist der Himmel klar. Über dem See stehen weiße Gipfel, die Annapurna-Kette, und davor, spitz wie ein Fischschwanz, der Machhapuchhre. Asha strahlt: „Heute sieht man den Machhapuchhre!“',
        L('आज माछापुच्छ्रे देखिन्छ।', 'āj māchāpucchre dekhincha.', AAJ, MACHA, DEKHINCHA, DANDA)),
      audio('बादल छैन, माछापुच्छ्रे देखिन्छ।', 'bādal chaina, māchāpucchre dekhincha.', 'Keine Wolken – man sieht den Machhapuchhre.', 'Keine Wolken – man sieht den Machhapuchhre.',
        ['Es ist bewölkt, man sieht den Machhapuchhre nicht.', 'Keine Wolken – man sieht den Machhapuchhre.', 'Der Machhapuchhre ist weit weg.']),
      build('तालबाट माछापुच्छ्रे देखिन्छ।', 'tālbāṭa māchāpucchre dekhincha.', 'Vom See aus sieht man den Machhapuchhre.',
        ['तालबाट', 'माछापुच्छ्रे', 'देखिन्छ'], ['देखिन्छ', 'तालको', 'माछापुच्छ्रे', 'छु', 'तालबाट'],
        [['माछापुच्छ्रे', 'तालबाट', 'देखिन्छ']]),
      story('Beim Frühstück kommt Ashas Bruder: ein ruhiger Mann mit wettergegerbtem Gesicht. Er gibt dir die Hand: „Hallo, ich bin Ashas Bruder.“ Dann erklärt er den Weg für euren Trek – und schaut dabei seine Schwester an, nicht dich.',
        L('नमस्ते, म आशाको दाइ हुँ।', 'namaste, ma āshāko dāi huṃ.', NAMASTE, COMMA, MA, ASHA, KO, DAI_BR, HUN, DANDA)),
    ],
  },
  {
    id: 'nc7', title: 'Aufbruch zum Trek', place: 'Im Annapurna-Gebiet',
    summary: 'Genehmigung am Kontrollposten, Steinstufen ohne Ende – und Asha führt zum ersten Mal.',
    steps: [
      story('Zwei Tage später bringt euch ein Jeep aus Pokhara hinaus bis dorthin, wo der Trekkingweg beginnt. Ashas Bruder bleibt in Pokhara, er hat eine eigene Gruppe. Asha schultert ihren Rucksack: „Heute bin ich Ihr Guide.“',
        L('आज म तपाईंको गाइड हुँ।', 'āj ma tapāīṃko gāiḍ huṃ.', AAJ, MA, TAPAIN, KO, GAID, HUN, DANDA)),
      intro('परमिट', 'paramiṭ', 'Genehmigung, Trekking-Permit', 'Aus dem Englischen; gesprochen meist „parmit“. Für das Annapurna-Schutzgebiet braucht man eine Genehmigung; an Kontrollposten unterwegs zeigt man sie vor.'),
      dialog(['परमिट र पासपोर्ट दिनुहोस्।', 'paramiṭ ra pāsporṭ dinuhos.', 'Genehmigung und Pass, bitte. (am Kontrollposten)'], [
        ['हजुर, यो मेरो परमिट हो।', 'hajur, yo mero paramiṭ ho.', 'Ja, das ist meine Genehmigung.'],
        ['मलाई परमिट मन पर्दैन।', 'malāī paramiṭ man pardaina.', 'Ich mag keine Genehmigungen.'],
        ['होइन, म परमिट हुँ।', 'hoina, ma paramiṭ huṃ.', 'Nein, ich bin eine Genehmigung.'],
      ], 0),
      intro('शुभ यात्रा', 'shubh yātrā', 'Gute Reise!', 'शुभ „glücklich, gut“, यात्रा „Reise“ – der feste Wunsch zum Aufbruch.'),
      story('Der Beamte stempelt und gibt alles zurück: „Die Genehmigung ist in Ordnung. Gute Reise!“',
        L('परमिट ठीक छ। शुभ यात्रा।', 'paramiṭ ṭhīk cha. shubh yātrā.', PARMIT, THIK, CHA, DANDA, SHUBH, YATRA, DANDA)),
      tf('शुभ यात्रा।', 'shubh yātrā.', 'Gute Reise!',
        'Der Beamte wünscht dir eine gute Reise.', true),
      story('Der Weg führt an Dörfern und Terrassenfeldern vorbei, über Hängebrücken und durch Wald. Und dann: Stufen. Steinstufen, Hunderte, hinauf und immer weiter hinauf.'),
      intro('सिँढी', 'siṃḍhī', 'Treppe, Stufen', 'Viele Bergwege in Nepal sind lange Treppen aus Steinstufen.'),
      story('Asha lacht über dein Gesicht: „Auf diesem Weg gibt es viele Stufen.“',
        L('यो बाटोमा धेरै सिँढी छ।', 'yo bāṭomā dherai siṃḍhī cha.', YO, BATO, MAA, DHERAI, SIMDHI, CHA, DANDA)),
      gap('बाटो धेरै ', 'उकालो', ' छ।', ['सस्तो', 'उकालो', 'पिरो'], 'Der Weg geht steil bergauf.', 'bāṭo dherai ukālo cha.'),
      intro('थाकेँ', 'thākeṃ', 'ich bin müde (wörtl. „ich bin ermüdet“)', 'Gebildet wie खाएँ oder बुझेँ: थाक्‑ + ‑एँ. Gemeint ist: Ich bin jetzt müde.'),
      dialog(['तपाईं ठीक हुनुहुन्छ?', 'tapāīṃ ṭhīk hunuhuncha?', 'Geht es Ihnen gut?'], [
        ['हजुर, मलाई भात चाहिँदैन।', 'hajur, malāī bhāt cāhiṃdaina.', 'Ja, ich brauche keinen Reis.'],
        ['म अलि थाकेँ। बिस्तारै जानुहोस्।', 'ma ali thākeṃ. bistārai jānuhos.', 'Ich bin etwas müde. Gehen Sie bitte langsam.'],
        ['म अलि थाकेँ। सिँढी मीठो छ।', 'ma ali thākeṃ. siṃḍhī mīṭho cha.', 'Ich bin etwas müde. Die Stufen sind lecker.'],
      ], 1),
      story('Asha nickt sofort: „Gut, wir gehen langsam. Hier gibt es Wasser.“ Sie zeigt auf einen Wasserhahn am Weg.',
        L('हुन्छ, बिस्तारै जाने। यहाँ पानी छ।', 'huncha, bistārai jāne. yahāṃ pānī cha.', HUNCHA_OK, COMMA, BISTARAI, JANE_WIR, DANDA, YAHAN, PANI_W, CHA, DANDA)),
      audio('गाउँ टाढा छैन।', 'gāuṃ ṭāḍhā chaina.', 'Das Dorf ist nicht weit.', 'Das Dorf ist nicht weit.',
        ['Das Dorf ist sehr weit.', 'Das Dorf ist nicht weit.', 'Im Dorf gibt es kein Wasser.']),
      story('Hinter der nächsten Kurve: noch eine Treppe. Asha grinst: „Ja, hier gibt es auch Stufen.“',
        L('हो, यहाँ पनि सिँढी छ।', 'ho, yahāṃ pani siṃḍhī cha.', HO_JA, COMMA, YAHAN, PANI, SIMDHI, CHA, DANDA)),
      tf('म अलि थाकेँ।', 'ma ali thākeṃ.', 'Ich bin etwas müde.',
        'Mit diesem Satz sagst du: Ich bin überhaupt nicht müde.', false),
      build('आज घाम छ, जाडो छैन।', 'āj ghām cha, jāḍo chaina.', 'Heute scheint die Sonne, es ist nicht kalt.',
        ['आज', 'घाम', 'छ', 'जाडो', 'छैन'], ['जाडो', 'आज', 'हिउँ', 'छ', 'घाम', 'हो', 'छैन'],
        [['आज', 'जाडो', 'छैन', 'घाम', 'छ'], ['जाडो', 'छैन', 'आज', 'घाम', 'छ']]),
      story('Am späten Nachmittag erreicht ihr ein Dorf mit ein paar Lodges. Asha telefoniert kurz mit ihrem Bruder und erzählt stolz: Alles läuft gut. Deine Beine sind schwer, aber du lächelst.'),
    ],
  },
  {
    id: 'nc8', title: 'Im Teehaus', place: 'Eine Lodge am Trekkingweg',
    summary: 'Ein Zimmer für die Nacht, eine warme Decke, Dal Bhat am Ofen – und die Wirtin sagt Regen voraus.',
    steps: [
      story('Die Lodge ist ein Steinhaus mit Holzbänken und kleinen Zimmern. Hier schlafen Wanderer, abends wird gekocht, morgens geht es weiter.'),
      intro('लज', 'laj', 'Lodge, Teehaus (Unterkunft am Trekkingweg)', 'Auf den Trekkingrouten schläft und isst man in einfachen Lodges, oft „Teehaus“ genannt.'),
      story('Asha ist zufrieden: „Diese Lodge ist gut.“',
        L('यो लज राम्रो छ।', 'yo laj rāmro cha.', YO, LAJ, RAMRO, CHA, DANDA)),
      dialog(['कोठा चाहिन्छ?', 'koṭhā cāhincha?', 'Brauchen Sie ein Zimmer?'], [
        ['हजुर, हामीलाई दुईवटा कोठा चाहिन्छ।', 'hajur, hāmīlāī duīwaṭā koṭhā cāhincha.', 'Ja, wir brauchen zwei Zimmer.'],
        ['हजुर, हामीलाई दुई जना कोठा चाहिन्छ।', 'hajur, hāmīlāī duī janā koṭhā cāhincha.', '(falsch: Zimmer zählt man mit वटा, nicht mit जना)'],
        ['होइन, मलाई कोठा मन पर्छ।', 'hoina, malāī koṭhā man parcha.', 'Nein, mir gefällt das Zimmer.'],
      ], 0),
      intro('कम्बल', 'kambal', 'Decke (Wolldecke)', 'Nachts wird es in den Bergen kalt; in den Lodges gibt es dicke Decken.'),
      story('Das Zimmer ist einfach: zwei Betten, ein kleines Fenster. Schon am Abend wird es kalt. Du fragst die Wirtin: „Didi, gibt es eine Decke?“',
        L('दिदी, कम्बल छ?', 'didī, kambal cha?', DIDI, COMMA, KAMBAL, CHA, Q)),
      gap('हजुर, कम्बल कोठामा ', 'छ', '।', ['हो', 'छ', 'छु'], 'Ja, die Decke ist im Zimmer.', 'hajur, kambal koṭhāmā cha.'),
      intro('आगो', 'āgo', 'Feuer', 'Abends wärmt in vielen Lodges ein Ofen den Speiseraum.'),
      intro('बस्नुहोस्', 'basnuhos', 'setzen Sie sich (höfliche Bitte)', 'Von बस्‑ „sitzen, bleiben“ – gebildet wie जानुहोस्.'),
      story('Im Speiseraum sitzen alle um den Ofen: Wanderer aus vielen Ländern, Träger, Guides. Asha macht dir Platz: „Setzen Sie sich hier, nah ans Feuer.“',
        L('यहाँ आगो नजिक बस्नुहोस्।', 'yahāṃ āgo najik basnuhos.', YAHAN, AGO, NAJIK, BASNUHOS, DANDA)),
      audio('आगो तातो छ, यहाँ बस्नुहोस्।', 'āgo tāto cha, yahāṃ basnuhos.', 'Das Feuer ist warm, setzen Sie sich hierher.', 'Das Feuer ist warm, setzen Sie sich hierher.',
        ['Das Feuer ist aus, gehen Sie schlafen.', 'Das Feuer ist warm, setzen Sie sich hierher.', 'Hier ist kein Platz.']),
      dialog(['दाल भात कस्तो छ?', 'dāl bhāt kasto cha?', 'Wie ist das Dal Bhat?'], [
        ['आगो मीठो छ।', 'āgo mīṭho cha.', 'Das Feuer ist lecker.'],
        ['मलाई दाल भात चाहिँदैन, थप दिनुहोस्।', 'malāī dāl bhāt cāhiṃdaina, thap dinuhos.', 'Ich möchte kein Dal Bhat – geben Sie mir mehr. (widersprüchlich)'],
        ['धेरै मीठो छ, धन्यवाद।', 'dherai mīṭho cha, dhanyabād.', 'Sehr lecker, danke.'],
      ], 2),
      story('Später schaut die Wirtin aus dem Fenster. Die Wolken hängen tief über dem Tal. „Morgen regnet es.“',
        L('भोलि पानी पर्छ।', 'bholi pānī parcha.', BHOLI, PANI_RAIN, PARCHA_F, DANDA)),
      tf('भोलि पानी पर्छ।', 'bholi pānī parcha.', 'Morgen regnet es.',
        'Die Wirtin sagt, morgen scheint die Sonne.', false),
      build('लजमा तातो पानी छ?', 'lajmā tāto pānī cha?', 'Gibt es in der Lodge heißes Wasser?',
        ['लजमा', 'तातो', 'पानी', 'छ'], ['पानी', 'लजबाट', 'छ', 'तातो', 'हो', 'लजमा'],
        [['तातो', 'पानी', 'लजमा', 'छ']]),
      story('Asha schaut lange auf die Karte. Dann sagt sie ruhig: Morgen gehen wir trotzdem, aber langsam. Du kriechst unter zwei Decken und schläfst sofort ein.'),
    ],
  },
  {
    id: 'nc9', title: 'Schlechtes Wetter, Hilfe holen', place: 'Auf dem Weg, unter Regenwolken',
    summary: 'Nasse Stufen, ein umgeknickter Fuß, Hilfe aus dem Dorf und ein Nachmittag am Ofen.',
    steps: [
      story('Am Morgen ist der Himmel grau, die Wolken hängen tief. Noch ist es trocken, aber Asha packt die Regenjacken obenauf: „Heute wird es regnen. Wir gehen langsam.“',
        L('आज पानी पर्छ। बिस्तारै जाने।', 'āj pānī parcha. bistārai jāne.', AAJ, PANI_RAIN, PARCHA_F, DANDA, BISTARAI, JANE_WIR, DANDA)),
      story('Im Nebel sind die Steinstufen feucht und glatt. Auf dem Weg nach unten rutschst du aus und knickst um. Du setzt dich auf eine Stufe.'),
      intro('खुट्टा', 'khuṭṭā', 'Fuß, Bein'),
      intro('दुख्छ', 'dukhcha', 'tut weh', 'Was weh tut, steht davor: खुट्टा दुख्छ – „der Fuß tut weh“.'),
      story('Du verziehst das Gesicht: „Mein Fuß tut weh.“',
        L('मेरो खुट्टा दुख्छ।', 'mero khuṭṭā dukhcha.', MERO, KHUTTA, DUKHCHA, DANDA)),
      dialog(['कहाँ दुख्छ?', 'kahāṃ dukhcha?', 'Wo tut es weh?'], [
        ['मलाई खुट्टा मन पर्छ।', 'malāī khuṭṭā man parcha.', 'Ich mag Füße.'],
        ['यहाँ, खुट्टामा दुख्छ।', 'yahāṃ, khuṭṭāmā dukhcha.', 'Hier, am Fuß tut es weh.'],
        ['म हिजो पोखरा आएँ।', 'ma hijo pokharā āeṃ.', 'Ich bin gestern nach Pokhara gekommen.'],
      ], 1),
      story('Asha kniet sich hin, ruhig und genau, so wie ihr Bruder es ihr gezeigt hat. Der Knöchel ist etwas geschwollen, aber du kannst auftreten. Nichts gebrochen – nur umgeknickt.'),
      tf('मेरो खुट्टा अलि दुख्छ।', 'mero khuṭṭā ali dukhcha.', 'Mein Fuß tut ein bisschen weh.',
        'Der Satz sagt: Der Schmerz ist leicht, nicht stark.', true),
      intro('मद्दत', 'maddat', 'Hilfe', 'Wie bei चाहिन्छ üblich mit ‑लाई: मलाई मद्दत चाहिन्छ – „ich brauche Hilfe“.'),
      story('Ein Mann aus dem Dorf kommt mit einem Regenschirm den Weg herauf. Asha spricht ihn an: „Wir brauchen Hilfe. Gibt es hier in der Nähe eine Lodge?“',
        L('दाइ, हामीलाई मद्दत चाहिन्छ। यहाँ नजिक लज छ?', 'dāi, hāmīlāī maddat cāhincha. yahāṃ najik laj cha?', DAI, COMMA, HAMI, LAI, MADDAT, CAHINCHA, DANDA, YAHAN, NAJIK, LAJ, CHA, Q)),
      build('हामीलाई मद्दत चाहिन्छ।', 'hāmīlāī maddat cāhincha.', 'Wir brauchen Hilfe.',
        ['हामीलाई', 'मद्दत', 'चाहिन्छ'], ['चाहिन्छ', 'हामी', 'मद्दत', 'छ', 'हामीलाई'],
        [['मद्दत', 'हामीलाई', 'चाहिन्छ']]),
      audio('गाउँमा लज छ, टाढा छैन।', 'gāuṃmā laj cha, ṭāḍhā chaina.', 'Im Dorf gibt es eine Lodge, nicht weit.', 'Im Dorf gibt es eine Lodge, nicht weit.',
        ['Das Dorf ist weit, dort gibt es keine Lodge.', 'Im Dorf gibt es eine Lodge, nicht weit.', 'Im Dorf gibt es keinen Tee.']),
      intro('पर्खनुहोस्', 'parkhanuhos', 'warten Sie (höfliche Bitte)'),
      story('Langsam, auf Asha gestützt, humpelst du bis ins Dorf. In der Lodge setzt sie dich an den Ofen: „Setzen Sie sich hier und warten Sie.“ Dann ruft sie ihren Bruder an.',
        L('यहाँ बस्नुहोस् र पर्खनुहोस्।', 'yahāṃ basnuhos ra parkhanuhos.', YAHAN, BASNUHOS, RA, PARKHANUHOS, DANDA)),
      gap('पानी पर्छ, यहाँ ', 'पर्खनुहोस्', '।', ['बोल्नुहोस्', 'पर्खनुहोस्', 'खाएँ'], 'Es wird regnen, warten Sie hier.', 'pānī parcha, yahāṃ parkhanuhos.'),
      dialog(['तातो चिया चाहिन्छ?', 'tāto ciyā cāhincha?', 'Möchten Sie heißen Tee?'], [
        ['हजुर, एउटा चिया दिनुहोस्, धन्यवाद।', 'hajur, euṭā ciyā dinuhos, dhanyabād.', 'Ja, einen Tee bitte, danke.'],
        ['होइन, मलाई तातो चिया चाहिन्छ।', 'hoina, malāī tāto ciyā cāhincha.', 'Nein, ich möchte heißen Tee. (widersprüchlich)'],
        ['मैले खुट्टा खाएँ।', 'maile khuṭṭā khāeṃ.', 'Ich habe einen Fuß gegessen.'],
      ], 0),
      story('Ashas Bruder bleibt am Telefon ruhig: kühlen, hochlegen, heute ausruhen. Kurz darauf prasselt der Regen aufs Dach – ihr sitzt im Trockenen. Am Nachmittag hört er auf, und dein Fuß fühlt sich schon besser an. Wenn es geht, sagt Asha, steigt ihr morgen vor Sonnenaufgang zum Aussichtspunkt über dem Dorf – langsam. „Morgen früh um fünf.“',
        L('भोलि बिहान पाँच बजे।', 'bholi bihān pāṃc baje.', BHOLI, BIHAN, N5, BAJE, DANDA)),
    ],
  },
  {
    id: 'nc10', title: 'Sonnenaufgang am Aussichtspunkt', place: 'Ein Aussichtspunkt über dem Dorf',
    summary: 'Im Dunkeln hinauf, das erste Licht auf den Gipfeln, ein Dank an Asha – und ein Blick zurück auf die Reise.',
    steps: [
      story('Es ist noch Nacht. Stirnlampen tanzen den Pfad hinauf; viele Wanderer sind schon unterwegs. Dein Fuß hält. Mit Asha an deiner Seite gehst du langsam, Stufe für Stufe.'),
      intro('अँध्यारो', 'aṃdhyāro', 'dunkel; Dunkelheit'),
      story('Asha leuchtet dir den Weg: „Es ist dunkel und kalt. Wir gehen langsam.“',
        L('अँध्यारो र जाडो छ। बिस्तारै जाने।', 'aṃdhyāro ra jāḍo cha. bistārai jāne.', ANDHYARO, RA, JADO, CHA, DANDA, BISTARAI, JANE_WIR, DANDA)),
      dialog(['खुट्टा कस्तो छ?', 'khuṭṭā kasto cha?', 'Wie geht es dem Fuß?'], [
        ['खुट्टा मीठो छ।', 'khuṭṭā mīṭho cha.', 'Der Fuß ist lecker.'],
        ['मलाई कम्बल मन पर्छ।', 'malāī kambal man parcha.', 'Ich mag Decken.'],
        ['खुट्टा ठीक छ, धन्यवाद।', 'khuṭṭā ṭhīk cha, dhanyabād.', 'Dem Fuß geht es gut, danke.'],
      ], 2),
      story('Oben auf dem Aussichtspunkt warten schon viele Menschen, eingepackt in Jacken und Mützen. Noch ist alles dunkel.'),
      intro('उज्यालो', 'ujyālo', 'hell; Licht'),
      story('Asha flüstert: „Bald wird es langsam hell.“',
        L('बिस्तारै उज्यालो हुन्छ।', 'bistārai ujyālo huncha.', BISTARAI, UJYALO, HUNCHA_W, DANDA)),
      intro('सुन्दर', 'sundar', 'schön, wunderschön', 'Etwas feierlicher als राम्रो.'),
      story('Im Osten wird der Himmel grau, dann blassrosa. Dann trifft das erste Sonnenlicht die Gipfel: erst orange, dann golden, dann weiß. Der ganze Kamm leuchtet, und mittendrin ragt der Machhapuchhre auf. Du flüsterst: „Die Berge sind wunderschön.“',
        L('हिमाल धेरै सुन्दर छ।', 'himāl dherai sundar cha.', HIMAL, DHERAI, SUNDAR, CHA, DANDA)),
      audio('हिमालमा घाम छ, धेरै सुन्दर छ।', 'himālmā ghām cha, dherai sundar cha.', 'Auf den Bergen liegt Sonne – wunderschön.', 'Auf den Bergen liegt Sonne – wunderschön.',
        ['Die Berge sind in Wolken, schade.', 'Auf den Bergen liegt Sonne – wunderschön.', 'Auf den Bergen ist es dunkel und kalt.']),
      tf('अँध्यारो छैन, उज्यालो छ।', 'aṃdhyāro chaina, ujyālo cha.', 'Es ist nicht dunkel, es ist hell.',
        'Der Satz sagt: Es ist noch ganz dunkel.', false),
      story('Asha steht still neben dir. Ihr erster Trek als Guide – mit Regen, einem umgeknickten Fuß und allem. Du sagst: „Sie sind ein guter Guide.“ Asha lacht, und diesmal sagt sie nicht „noch nicht“.',
        L('तपाईं राम्रो गाइड हुनुहुन्छ।', 'tapāīṃ rāmro gāiḍ hunuhuncha.', TAPAIN, RAMRO, GAID, HUNUHUNCHA, DANDA)),
      tf('म गाइड हुँ।', 'ma gāiḍ huṃ.', 'Ich bin Guide.',
        'Anders als im Bus nach Pokhara sagt Asha jetzt: Ich bin Guide.', true),
      dialog(['धन्यवाद। तपाईंलाई यो यात्रा मन पर्छ?', 'dhanyabād. tapāīṃlāī yo yātrā man parcha?', 'Danke. Gefällt Ihnen diese Reise?'], [
        ['हजुर, म धेरै मन पर्छ।', 'hajur, ma dherai man parcha.', '(falsch: bei मन पर्छ heißt es मलाई, nicht म)'],
        ['हजुर, मलाई धेरै मन पर्छ।', 'hajur, malāī dherai man parcha.', 'Ja, sie gefällt mir sehr.'],
        ['मलाई कम्बल चाहिन्छ।', 'malāī kambal cāhincha.', 'Ich brauche eine Decke.'],
      ], 1),
      intro('फेरि', 'pheri', 'wieder, noch einmal'),
      intro('आउनुहोस्', 'āunuhos', 'kommen Sie (höfliche Bitte)', 'Von आउ‑ „kommen“. फेरि आउनुहोस् – „Kommen Sie wieder“ – sagt man zum Abschied.'),
      story('Die Sonne steht jetzt über dem Kamm. Asha schaut dich an: „Kommen Sie wieder nach Nepal.“',
        L('फेरि नेपाल आउनुहोस्।', 'pheri nepāl āunuhos.', PHERI, NEPAL, AUNUHOS, DANDA)),
      build('फेरि नेपाल आउनुहोस्।', 'pheri nepāl āunuhos.', 'Kommen Sie wieder nach Nepal.',
        ['फेरि', 'नेपाल', 'आउनुहोस्'], ['आउनुहोस्', 'कम्बल', 'फेरि', 'खाएँ', 'नेपाल'],
        [['नेपाल', 'फेरि', 'आउनुहोस्']]),
      story('Auf dem Weg hinunter denkst du an den ersten Tag zurück: an den Schalter am Flughafen, das Feilschen um den Fahrpreis, Dal Bhat mit Achar, den Bus nach Boudha, den See im Morgenlicht, den Regen und die Stufen. Damals konntest du kaum ein Wort sagen. Heute sagst du zu Asha – und sie lacht, weil es stimmt: „Ich habe viel Nepali verstanden.“',
        L('मैले धेरै नेपाली बुझेँ।', 'maile dherai nepālī bujheṃ.', MAILE, DHERAI, NEPALI_LANG, BUJHEN, DANDA)),
    ],
  },
]

export const CHAPTER_BY_ID = Object.fromEntries(CHAPTERS.map(c => [c.id, c]))

// Die intro-Wörter eines Kapitels (NFC) – reiner Datenzugriff; SRS-Schlüssel bildet lib/chapters.js.
export const chapterWords = chapter => chapter.steps.filter(s => s.kind === 'intro').map(s => nfc(s.dev))

// Alle Kapitelwörter zum Nachschlagen (Bibliothek, Antipp-Kasten), Schlüssel NFC.
export const CHAPTER_WORD = Object.fromEntries(CHAPTERS.flatMap(c => c.steps
  .filter(s => s.kind === 'intro')
  .map(s => [nfc(s.dev), { roman: s.roman, de: s.de, chapter: c.id }])))
