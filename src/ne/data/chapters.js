// ─── Yatra: Geschichts-Kapitel ────────────────────────────────────────────────
// Gegenstück zu src/data/chapters.js: EINE durchgehende Geschichte über zehn Kapitel (hier
// nc1…nc4, Kathmandu). Du – die reisende Person, nie mit Namen genannt – kommst allein in
// Nepal an; ab nc1 begleitet dich Asha, deren Familie in Thamel ein kleines Gästehaus führt.
// Deutsch trägt die Handlung, das Nepali wächst von Kapitel zu Kapitel; nc4 endet offen
// (Pokhara kommt in nc5).
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
//   build   { kind, tiles, answer, dev, de, roman } – answer = Stücke in Reihenfolge; mit
//           Leerzeichen verbunden ergeben sie dev ohne Satzzeichen. tiles = answer + 1–2 Ablenker.
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
const build = (dev, roman, de, answer, tiles) => ({ kind: 'build', tiles, answer, dev, de, roman })

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
const BAHIR = ['बाहिर', 'bāhir', 'draußen']
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
      intro('पहिलो पटक', 'pahilo paṭak', 'das erste Mal', 'पहिलो heißt „erste(r)“, पटक „Mal“. Reisende werden das ständig gefragt.'),
      dialog(['पहिलो पटक हो?', 'pahilo paṭak ho?', 'Ist es das erste Mal (in Nepal)?'], [
        ['म सन्चै छु, धन्यवाद।', 'ma sancai chu, dhanyabād.', 'Mir geht es gut, danke.'],
        ['हजुर, पहिलो पटक हो।', 'hajur, pahilo paṭak ho.', 'Ja, es ist das erste Mal.'],
        ['यो मेरो झोला हो।', 'yo mero jholā ho.', 'Das ist meine Tasche.'],
      ], 1),
      story('Ein Stempel, ein kurzes Lächeln: „In Ordnung, danke.“ Du bist in Nepal.',
        L('ठीक छ, धन्यवाद।', 'ṭhīk cha, dhanyabād.', THIK, CHA, COMMA, DHANYABAD, DANDA)),
      tf('पासपोर्ट र भिसा दिनुहोस्।', 'pāsporṭ ra bhisā dinuhos.', 'Pass und Visum, bitte.',
        'Mit diesem Satz hat der Beamte nach deinem Rückflugticket gefragt.', false),
      story('Hinter der Gepäckausgabe hält eine junge Frau ein Schild mit deinem Namen hoch. Ihre Familie führt das kleine Gästehaus in Thamel, in dem du ein Zimmer gebucht hast. Sie strahlt: „Hallo, ich bin Asha.“ Und dann kommt die Frage, die du schon kennst.',
        L('नमस्ते, म आशा हुँ।', 'namaste, ma āshā huṃ.', NAMASTE, COMMA, MA, ASHA, HUN, DANDA)),
      audio('पहिलो पटक हो?', 'pahilo paṭak ho?', 'Ist es das erste Mal?', 'Ist es das erste Mal?',
        ['Sind Sie Tourist(in)?', 'Ist es das erste Mal?', 'Ist das Ihre Tasche?']),
      dialog(['यो तपाईंको झोला हो?', 'yo tapāīṃko jholā ho?', 'Ist das Ihre Tasche?'], [
        ['तपाईंलाई सन्चै छ?', 'tapāīṃlāī sancai cha?', 'Geht es Ihnen gut?'],
        ['हजुर, म पर्यटक हुँ।', 'hajur, ma paryaṭak huṃ.', 'Ja, ich bin Tourist(in).'],
        ['हो, यो मेरो झोला हो।', 'ho, yo mero jholā ho.', 'Ja, das ist meine Tasche.'],
      ], 2),
      build('म जर्मन पर्यटक हुँ।', 'ma jarman paryaṭak huṃ.', 'Ich bin deutsche Touristin / deutscher Tourist.',
        ['म', 'जर्मन', 'पर्यटक', 'हुँ'], ['पर्यटक', 'हुँ', 'म', 'भिसा', 'जर्मन', 'हो']),
      intro('बाहिर', 'bāhir', 'draußen, hinaus', 'बाहिर छ – „ist draußen“.'),
      story('Du fragst Asha nach einem Taxi. Sie zeigt zur Glastür: „Draußen.“ (wörtl. „ist draußen“)',
        L('बाहिर छ।', 'bāhir cha.', BAHIR, CHA, DANDA)),
      tf('बाहिर छ।', 'bāhir cha.', 'Draußen. (wörtl. „ist draußen“)',
        'Asha sagt, die Taxis warten drinnen in der Halle.', false),
      story('Die Tür geht auf: warme Luft, Hupen, Stimmen. Vor dem Gebäude wartet eine Reihe kleiner Taxis – und Asha winkt schon einem Fahrer.'),
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
        ['भाडा', 'सात', 'सय', 'रुपैयाँ', 'हो'], ['सय', 'हो', 'भाडा', 'हजार', 'रुपैयाँ', 'सात', 'छु']),
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
        ['मलाई', 'दाल', 'भात', 'चाहिन्छ'], ['भात', 'म', 'चाहिन्छ', 'मलाई', 'छ', 'दाल']),
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
      story('Du greifst nach deinem Geldbeutel, aber Asha ist schneller.'),
      tf('मसँग पैसा छ।', 'masaṃga paisā cha.', 'Ich habe Geld (dabei).',
        'Mit diesem Satz sagt Asha, dass sie kein Geld dabeihat.', false),
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
        ['दाइ', 'बौद्धमा', 'रोक्नुहोस्'], ['रोक्नुहोस्', 'बौद्धबाट', 'दाइ', 'नरोक्नुहोस्', 'बौद्धमा']),
      intro('स्तूप', 'stūp', 'Stupa (buddhistischer Kuppelbau)', 'Die Stupa von Boudha gehört zu den größten Nepals; vom Turm über der Kuppel blicken gemalte Augen in alle vier Richtungen.'),
      story('Ein Tor, ein paar Schritte – und vor dir öffnet sich ein runder Platz. In der Mitte die weiße Kuppel, ringsum Läden und Cafés. Viele Leute gehen langsam im Uhrzeigersinn um die Stupa; du gehst mit und staunst: „Die Stupa ist sehr groß.“ Da tippt dir jemand auf die Schulter – Asha.',
        L('स्तूप धेरै ठूलो छ।', 'stūp dherai ṭhūlo cha.', STUP, DHERAI, THULO, CHA, DANDA)),
      dialog(['नमस्ते, बौद्ध कस्तो छ?', 'namaste, bauddha kasto cha?', 'Hallo, wie ist Boudha? (Wie gefällt es dir?)'], [
        ['स्तूप कहाँ छ?', 'stūp kahāṃ cha?', 'Wo ist die Stupa?'],
        ['मलाई धेरै मन पर्छ, स्तूप धेरै ठूलो छ।', 'malāī dherai man parcha, stūp dherai ṭhūlo cha.', 'Es gefällt mir sehr, die Stupa ist riesig.'],
        ['बस बायाँमा छ।', 'bas bāyāṃmā cha.', 'Der Bus steht links.'],
      ], 1),
      intro('माथि', 'māthi', 'oben, hinauf', 'Für Stockwerke, Dachterrassen und Berghänge.'),
      story('Asha zeigt auf eine Dachterrasse über einem der Cafés: „Gehen wir hinauf?“',
        L('माथि जाने?', 'māthi jāne?', MATHI, JANE, Q)),
      tf('यहाँ माथि चिया मीठो छ।', 'yahāṃ māthi ciyā mīṭho cha.', 'Hier oben ist der Tee gut.',
        'Asha sagt, hier oben ist der Tee kalt.', false),
      story('Von oben siehst du die ganze Kuppel, die Augen auf dem Turm, dahinter die Hügel des Tals. Asha zieht dich auf: „Zu Fuß zurück nach Thamel?“ Du lachst – lieber den Bus. Dann erzählt sie von Pokhara, eine lange Busfahrt weiter westlich, und von den Bergen dahinter. Du rührst in deinem Tee und überlegst.',
        L('थमेल हिँडेर जाने?', 'thamel hiṃḍer jāne?', THAMEL, HINDER, JANE, Q)),
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
