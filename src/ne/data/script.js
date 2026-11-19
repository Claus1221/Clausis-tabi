// Devanagari für den Nepali-Kurs: Zeichen, Merkhilfen, 14 Schrift-Lektionen, Laut-Hinweise.
// Reine Daten (kein React). Gegenstück zu src/data/kana.js, aber eigenständig.
//
// Felder je Zeichen:
//   roman – Umschrift nach dem Kurs-Schema (ā ī ū, h für Behauchung, ṭ ḍ ṇ, ṃ, c/ch, sh).
//           Sie spiegelt die SCHREIBUNG (Regel s. bei SCRIPT_DATA). Was man hört, steht
//           nur als ausdrückliche Aussprache-Bemerkung im tip. Konsonanten mit ihrem a („ka“); Vokal- und Zusatzzeichen mit dem
//           Laut, den sie beisteuern („ā“, „ṃ“) – gezeigt werden sie an क (s. shown).
//   kind  – vowel | consonant | matra | conjunct | sign | digit
//   tip   – eine Zeile Deutsch: verbindet die FORM mit dem LAUT (keine Herkunftsbehauptung).
//           Vergleichswörter nur, wenn Hauch, Stimme und Vokalfarbe passen (k wie „Skat“,
//           nicht wie „Kamm“). Verwechslungspaare (भ/म, ध/घ, ब/व, य/थ) grenzen sich ab.
//   say   – Text für die Sprachausgabe. Noch kein Audio: = shown.
//   shown – was die Lektionskarte groß zeigt. Ein Vokalzeichen allein hängt in der Luft;
//           an क sieht man, wo es sitzt (ि links, ु unten …).

const E = (roman, kind, tip, shown) => ({ roman, kind, tip, shown })

const RAW = {
  // ── Vokale ──────────────────────────────────────────────────────────────
  // Nepali kennt bei i und u keinen Längenunterschied: इ/ई und उ/ऊ klingen gleich.
  // Bei a/ā ist der Unterschied die Klangfarbe, nicht die Länge.
  अ: E('a', 'vowel', 'Eine „3“ mit Haken vor dem Stab – dumpfes a, zwischen a und o; steckt in jedem Konsonanten'),
  आ: E('ā', 'vowel', 'Wie अ mit zweitem Stab – ein helles, offenes a wie in „Mann“; anders gefärbt als अ, nicht bloß länger'),
  इ: E('i', 'vowel', 'Ein Kringel mit Schwänzchen nach unten – i wie in „Kino“, kurz gesprochen; klingt genau wie ई'),
  ई: E('ī', 'vowel', 'Wie इ mit Häkchen obendrauf – klingt genauso wie इ (i wie in „Kino“); welches dasteht, ist reine Rechtschreibung'),
  उ: E('u', 'vowel', 'Sieht aus wie eine „3“ unter der Linie – u wie in „Mut“, kurz gesprochen; klingt genau wie ऊ'),
  ऊ: E('ū', 'vowel', 'Die „3“ von उ mit Schwanz nach rechts – klingt genauso wie उ (u wie in „Mut“); nur die Schreibung unterscheidet sie'),
  ए: E('e', 'vowel', 'Ein Haken hängt unter der Linie, kein Stab – „e“ wie in „Esel“'),
  ऐ: E('ai', 'vowel', 'ए mit Strich obendrauf – aus „e“ wird „ai“ wie in „Mai“'),
  ओ: E('o', 'vowel', 'आ mit Häkchen obendrauf – „o“ wie in „Ofen“'),
  औ: E('au', 'vowel', 'आ mit zwei Häkchen obendrauf – „au“ wie in „Haus“ (vgl. ओ mit einem)'),
  ऋ: E('ri', 'vowel', 'Ein Haken mit Schlaufe nach unten – selten, im Nepali gesprochen „ri“'),

  // ── Konsonanten: क-Reihe (hinten im Mund) ───────────────────────────────
  क: E('ka', 'consonant', 'Ein Stab mit Schlaufe links und Kringel rechts – „ka“ ohne Luftstoß, wie das k in „Skat“'),
  ख: E('kha', 'consonant', 'Sieht aus wie र und व nebeneinander, doch in ख sind die beiden Teile unten durch einen Strich verbunden, in रव („ra wa“) nicht – „kha“: k mit Luftstoß wie in „Kamm“'),
  ग: E('ga', 'consonant', 'Ein Galgen: Haken links, Stab rechts, Dach links offen – „ga“, stimmhaft wie in „Wagen“'),
  घ: E('gha', 'consonant', 'Eine Schale am Stab unter DURCHGEHENDEM Dach – „gha“: g mit hauchiger Stimme (Dach mit Lücke: ध)'),
  ङ: E('ṅa', 'consonant', 'Wie ड mit Punkt daneben – der Nasal „ng“ wie in „Gong“'),

  // ── च-Reihe ─────────────────────────────────────────────────────────────
  च: E('ca', 'consonant', 'Ein Arm greift nach links und hängt am Stab – „ca“: zwischen „ts“ und „tsch“, meist näher an „ts“, ohne Luftstoß'),
  छ: E('cha', 'consonant', 'Ein runder Bauch mit Schwänzchen, ohne Stab – „cha“: wie च, aber mit kräftigem Luftstoß'),
  ज: E('ja', 'consonant', 'Ein Haken schwingt nach rechts zum Stab – „ja“: zwischen „ds“ und „dsch“, meist näher an „ds“'),
  झ: E('jha', 'consonant', 'Ein Zickzack am Stab – „jha“: wie ज mit hauchiger Stimme; in Druck und auf Schildern oft in einer zweiten, traditionellen Form'),
  ञ: E('ña', 'consonant', 'Ein Bogen mit Schlinge am Stab – Nasal „ñ“ wie „nj“ in „Champagner“; fast nur in Verbindungen'),

  // ── ट-Reihe (retroflex: Zunge nach hinten geklappt) ────────────────────
  ट: E('ṭa', 'consonant', 'Ein offener Bogen unter der Linie, kein Stab – „ṭa“: wie das t in „Stein“, aber mit nach hinten geklappter Zunge'),
  ठ: E('ṭha', 'consonant', 'Ein runder Bauch wie eine „0“ unter der Linie – „ṭha“: das ṭ mit Luftstoß'),
  ड: E('ḍa', 'consonant', 'Wie ट mit Kringel unten – „ḍa“: d mit nach hinten geklappter Zunge'),
  ढ: E('ḍha', 'consonant', 'Wie ड, mit einem kleinen Haken am unteren Ende – „ḍha“: das ḍ mit hauchiger Stimme'),
  ण: E('ṇa', 'consonant', 'Ein Kreuzchen vor zwei Stäben, Dach links unterbrochen – „ṇa“; klingt im Nepali wie न'),

  // ── त-Reihe (dental: Zunge an den Zähnen) ──────────────────────────────
  त: E('ta', 'consonant', 'Ein Bogen schwingt nach links unten zum Stab – „ta“ ohne Luftstoß wie in „Stein“, Zungenspitze an den Zähnen'),
  थ: E('tha', 'consonant', 'Wie य, aber mit LÜCKE im Dach – „tha“: das t mit Luftstoß'),
  द: E('da', 'consonant', 'Ein Haken mit Schwanz nach unten, kein Stab – „da“ mit der Zunge an den Zähnen'),
  ध: E('dha', 'consonant', 'Eine Schale am Stab, aber das Dach FEHLT über der Schale – „dha“: d mit hauchiger Stimme (Dach durchgehend: घ)'),
  न: E('na', 'consonant', 'Ein kleiner Haken mit Querstrich am Stab – „na“ wie Nase'),

  // ── प-Reihe (Lippen) ────────────────────────────────────────────────────
  प: E('pa', 'consonant', 'Ein „U“ hängt am Stab – „pa“ ohne Luftstoß, wie das p in „Spiel“'),
  फ: E('pha', 'consonant', 'प mit Schwänzchen rechts – „pha“: p mit Luftstoß wie in „Post“, oft fast wie „f“'),
  ब: E('ba', 'consonant', 'Ein Kästchen am Stab MIT Schrägstrich innen – „ba“, stimmhaft wie in „Abend“ (ohne Strich: व)'),
  भ: E('bha', 'consonant', 'Wie म, aber das Dach hat über dem linken Teil eine LÜCKE – „bha“: b mit hauchiger Stimme'),
  म: E('ma', 'consonant', 'Eine Schleife am Stab unter DURCHGEHENDEM Dach – „ma“ wie Mama (Dach mit Lücke: भ)'),

  // ── य bis व (Halbvokale) ───────────────────────────────────────────────
  य: E('ya', 'consonant', 'Ein Haken mit Schlaufe am Stab, Dach DURCHGEHEND – „ya“ wie „ja“ (mit Lücke im Dach: थ)'),
  र: E('ra', 'consonant', 'Nur ein kleiner Haken unter der Linie, kein Stab – „ra“, ein kurz getipptes r'),
  ल: E('la', 'consonant', 'Zwei Bögen übereinander am Stab – „la“ wie Leiter'),
  व: E('wa', 'consonant', 'Ein Kästchen am Stab, innen LEER – meist wie b, auch im Wort (विदेश „bidesh“, धन्यवाद „dhanyabād“), in manchen Wörtern wie engl. w (स्वागत „swāgat“); mit Schrägstrich: ब'),

  // ── श bis ह (Zischlaute und h) ─────────────────────────────────────────
  श: E('sha', 'consonant', 'Ein Kringel mit Querstrich am Stab, Dach unterbrochen – im Alltag meist wie s gesprochen: शान्ति „shānti“ (Frieden) klingt fast wie „sānti“, देश „desh“ fast wie „des“; „sch“ hört man nur in sorgfältiger Rede, etwa in श्री „shrī“ (oft auch „srī“)'),
  ष: E('sha', 'consonant', 'Wie प mit Schrägstrich durch das „U“ – wie श im Alltag meist wie s gesprochen: भाषा „bhāshā“ (Sprache) klingt fast wie „bhāsā“'),
  स: E('sa', 'consonant', 'Ein Haken mit Schlaufe und Querstrich am Stab – „sa“, scharfes s wie in „Bus“'),
  ह: E('ha', 'consonant', 'Ein Bogen mit Haken nach unten, kein Stab – „ha“ wie Haus'),

  // ── Vokalzeichen (Matras) – gezeigt an क ───────────────────────────────
  'ा': E('ā', 'matra', 'Ein Extrastab rechts – macht aus dem dumpfen a ein helles ā: का = „kā“', 'का'),
  'ि': E('i', 'matra', 'Stab VOR dem Konsonanten, der Bogen wölbt sich über ihn – steht vorn, klingt danach: कि = „ki“; klingt wie ी', 'कि'),
  'ी': E('ī', 'matra', 'Stab HINTER dem Konsonanten, der Bogen wölbt sich zurück über ihn – की = „kī“ – klingt genau wie कि', 'की'),
  'ु': E('u', 'matra', 'Ein kleines Häkchen, meist unten (bei र rechts: रु „ru“) – „u“: कु = „ku“; klingt wie ू', 'कु'),
  'ू': E('ū', 'matra', 'Ein Häkchen, andersherum geschwungen als ु, meist unten (bei र rechts: रू „rū“) – कू = „kū“ – klingt genau wie कु', 'कू'),
  'े': E('e', 'matra', 'Ein schräger Strich oben auf dem Dach – „e“: के = „ke“', 'के'),
  'ै': E('ai', 'matra', 'Zwei schräge Striche oben – „ai“: कै = „kai“', 'कै'),
  'ो': E('o', 'matra', 'Extrastab ा plus Strich oben – „o“: को = „ko“', 'को'),
  'ौ': E('au', 'matra', 'Extrastab ा plus zwei Striche oben – „au“: कौ = „kau“', 'कौ'),
  'ृ': E('ri', 'matra', 'Ein Häkchen unten nach links – selten, „ri“: कृ = „kri“', 'कृ'),
  // Sonderfall र: das u-Zeichen sitzt rechts statt unten. Wichtig für Preise (रु. = Rupien).
  'रु': E('ru', 'matra', 'Bei र sitzt das u-Zeichen RECHTS, nicht unten – रु = „ru“; रु. ist die Abkürzung für Rupien'),
  'रू': E('rū', 'matra', 'Auch ū sitzt bei र rechts, anders geschwungen als bei रु – रू = „rū“ – klingt genau wie रु'),

  // ── Zusatzzeichen – gezeigt an क ────────────────────────────────────────
  'ं': E('ṃ', 'sign', 'Ein Punkt oben – ein n/m klingt mit: कं = „kaṃ“', 'कं'),
  'ँ': E('ṃ', 'sign', 'Mondsichel mit Punkt oben – der Vokal klingt durch die Nase: कँ = „kaṃ“', 'कँ'),
  'ः': E('ḥ', 'sign', 'Zwei Punkte rechts wie ein Doppelpunkt – ein kurzer Hauch „h“; selten', 'कः'),
  '।': E('(Satzende)', 'sign', 'Ein senkrechter Strich am Satzende – der Punkt des Devanagari: यो पानी हो। („yo pānī ho.“ = Das ist Wasser.)'),
  '्': E('(ohne a)', 'sign', 'Ein Strichlein schräg unten – nimmt dem Konsonanten sein a: क् = „k“; daraus entstehen die Halbformen', 'क्'),

  // ── Halbformen (nach dem Halant gelernt) ────────────────────────────────
  'स्त': E('sta', 'conjunct', 'Halbes स (der Stab fehlt) direkt vor त – „sta“ wie in नमस्ते („namaste“); der Halant steckt im fehlenden Stab'),
  'न्य': E('nya', 'conjunct', 'Halbes न (der Stab fehlt) direkt vor य – „nya“ wie in धन्यवाद („dhanyabād“ = danke)'),

  // ── Verbindungen ────────────────────────────────────────────────────────
  'क्ष': E('ksha', 'conjunct', 'क und ष zu einer eigenen Form verschmolzen – gesprochen „kch“, oft nur „ch“: क्षेत्री „kshetrī“ klingt fast wie „chetrī“ (der Name wird auf Englisch meist „Chhetri“ geschrieben)'),
  'ज्ञ': E('gya', 'conjunct', 'ज und ञ verschmolzen – im Nepali gesprochen „gya“, nicht „jña“'),
  'प्र': E('pra', 'conjunct', 'Ein Schrägstrich unten am Stab ist ein r NACH dem Konsonanten – „pra“ wie in प्रवेश („prabesh“ = Eingang), प्रहरी („praharī“ = Polizei)'),
  'त्र': E('tra', 'conjunct', 'Sonderform der r-Strich-Regel: त mit Schrägstrich unten – „tra“, das t ohne Luftstoß'),
  'श्र': E('shra', 'conjunct', 'Eigene Form: der linke Teil von श wird zum Bogen, darunter der r-Strich – „shra“, wie in श्री („shrī“)'),
  'र्म': E('rma', 'conjunct', 'र vor einem Konsonanten wird zum Häkchen OBEN auf dem nächsten Zeichen – र्म = „rma“, das r klingt zuerst (धर्म „dharma“ = Religion, मार्ग „mārga“ = Straße, in Straßennamen)'),

  // ── Ziffern ─────────────────────────────────────────────────────────────
  '०': E('0', 'digit', 'Ein Kreis wie unsere Null – शून्य „shūnya“'),
  '१': E('1', 'digit', 'Ein Kringel mit Schwanz nach unten – एक „ek“'),
  '२': E('2', 'digit', 'Fast wie unsere 2 – दुई „duī“'),
  '३': E('3', 'digit', 'Wie unsere 3 mit Schwänzchen unten – तीन „tīn“'),
  '४': E('4', 'digit', 'Eine Brezel, oben offen – चार „cār“'),
  '५': E('5', 'digit', 'Ein Bogen mit Fähnchen oben – पाँच „pāṃc“'),
  '६': E('6', 'digit', 'Wie eine gespiegelte 3 mit Schwanz – छ „cha“'),
  '७': E('7', 'digit', 'Ein Haken mit Schwung nach unten – सात „sāt“'),
  '८': E('8', 'digit', 'Ein liegender Haken wie ein Dach – आठ „āṭh“'),
  '९': E('9', 'digit', 'Wie unsere 9 mit Schleife – नौ „nau“'),
}

// say = shown, solange es kein Audio gibt (s. Kopfkommentar).
// Umschrift-Regel (roman UND Beispielwörter in tips): folgt der Schreibung – श/ष = sh, ā ī ū wie
// geschrieben, stummes End-a fällt weg; feste Ausnahmen: व wie gesprochen (meist b, sonst w), ज्ञ = gya, ऋ/ृ = ri.
// Aussprache steht getrennt davon („klingt fast wie …“). Jedes Beispielwort trägt seine Umschrift.
// Achtung: roman ist NICHT eindeutig (श/ष = „sha“, ं/ँ = „ṃ“) – ein Quiz darf nie zwei
// Antwortoptionen mit gleichem roman anbieten.
export const SCRIPT_DATA = Object.fromEntries(
  Object.entries(RAW).map(([ch, d]) => {
    const shown = d.shown || ch
    return [ch, { roman: d.roman, kind: d.kind, tip: d.tip, say: shown, shown }]
  }),
)

// 14 Lektionen, je eine Sitzung (4–7 Zeichen; nur die Ziffern sind 10, weil sie
// zusammen gelernt werden). Vokale → Konsonanten nach Lautgruppen → Vokalzeichen →
// Zusatzzeichen mit Halant und den ersten Halbformen → Verbindungen → Ziffern.
// Der Halant kommt vor den Verbindungen, weil sich Halbformen über ihn erklären;
// रु/रू stehen bei den u-Zeichen, weil sie deren Sonderfall sind.
export const SCRIPT_LESSONS = [
  { id: 's1', title: 'Vokale I', sub: 'a ā i ī u ū – i/ī und u/ū klingen gleich', chars: ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ'] },
  { id: 's2', title: 'Vokale II', sub: 'e ai o au – und das seltene ri', chars: ['ए', 'ऐ', 'ओ', 'औ', 'ऋ'] },
  { id: 's3', title: 'क-Reihe', sub: 'hinten im Mund: k kh g gh ṅ', chars: ['क', 'ख', 'ग', 'घ', 'ङ'] },
  { id: 's4', title: 'च-Reihe', sub: 'zwischen ts und tsch: c ch j jh ñ', chars: ['च', 'छ', 'ज', 'झ', 'ञ'] },
  { id: 's5', title: 'ट-Reihe', sub: 'Zunge zurück: ṭ ṭh ḍ ḍh ṇ', chars: ['ट', 'ठ', 'ड', 'ढ', 'ण'] },
  { id: 's6', title: 'त-Reihe', sub: 'Zunge an den Zähnen: t th d dh n', chars: ['त', 'थ', 'द', 'ध', 'न'] },
  { id: 's7', title: 'प-Reihe', sub: 'mit den Lippen: p ph b bh m', chars: ['प', 'फ', 'ब', 'भ', 'म'] },
  { id: 's8', title: 'य bis व', sub: 'y r l w', chars: ['य', 'र', 'ल', 'व'] },
  { id: 's9', title: 'श bis ह', sub: 'Zischlaute und h: sh sh s h', chars: ['श', 'ष', 'स', 'ह'] },
  { id: 's10', title: 'Vokalzeichen I', sub: 'ā i ī u ū am Konsonanten, dazu रु रू', chars: ['ा', 'ि', 'ी', 'ु', 'ू', 'रु', 'रू'] },
  { id: 's11', title: 'Vokalzeichen II', sub: 'e ai o au ri am Konsonanten', chars: ['े', 'ै', 'ो', 'ौ', 'ृ'] },
  { id: 's12', title: 'Zusatzzeichen', sub: 'Nasal, Hauch, Satzende, Halant – und erste Halbformen', chars: ['ं', 'ँ', 'ः', '।', '्', 'स्त', 'न्य'] },
  { id: 's13', title: 'Verbindungen', sub: 'क्ष ज्ञ, r unten und r oben', chars: ['क्ष', 'ज्ञ', 'प्र', 'त्र', 'श्र', 'र्म'] },
  { id: 's14', title: 'Ziffern', sub: '० bis ९', chars: ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'] },
]

// Laut-Hinweise, die das Deutsche nicht kennt: ein Paar = gleiche Mundstellung, ein Unterschied.
export const SCRIPT_NOTES = [
  {
    id: 'aspiration',
    title: 'Behaucht oder unbehaucht',
    text: 'Fast jeder Verschlusslaut hat einen Zwilling mit h in der Umschrift. Bei den stimmlosen (k/kh, c/ch, ṭ/ṭh, t/th, p/ph) ist es ein Luftstoß: unbehaucht klingt wie das p in „Spiel“, behaucht wie das p in „Post“ – halt eine Hand vor den Mund, beim behauchten spürst du die Luft. Bei घ झ ढ ध भ gibt es keinen Luftstoß, sondern die Stimme läuft weiter und wird hauchig – wie ein stimmhaftes g, an das ein Seufzer gehängt ist. Diesen Laut gibt es im Deutschen nicht. Der Unterschied ändert die Bedeutung.',
    pairs: [['क', 'ख'], ['ग', 'घ'], ['च', 'छ'], ['ज', 'झ'], ['ट', 'ठ'], ['ड', 'ढ'], ['त', 'थ'], ['द', 'ध'], ['प', 'फ'], ['ब', 'भ']],
  },
  {
    id: 'retroflex',
    title: 'Dental oder retroflex',
    text: 'Dental (त-Reihe): die Zungenspitze liegt an den oberen Schneidezähnen. Retroflex (ट-Reihe): die Zungenspitze klappt nach hinten an den Gaumen – das klingt dumpfer und härter. Im Deutschen gibt es den Unterschied nicht, im Nepali trennt er Wörter. Ausnahme: ण klingt im Nepali wie न – die Schreibung unterscheidet sie, die Aussprache nicht.',
    pairs: [['त', 'ट'], ['थ', 'ठ'], ['द', 'ड'], ['ध', 'ढ']],
  },
]
