// Devanagari für den Nepali-Kurs: Zeichen, Merkhilfen, 14 Schrift-Lektionen, Laut-Hinweise.
// Reine Daten (kein React). Gegenstück zu src/data/kana.js, aber eigenständig.
//
// Felder je Zeichen:
//   roman – Umschrift nach dem Kurs-Schema (ā ī ū, h für Behauchung, ṭ ḍ ṇ, ṃ, c/ch, sh).
//           Konsonanten mit ihrem a („ka“); Vokalzeichen und Zusatzzeichen mit dem Laut,
//           den sie beisteuern („ā“, „ṃ“) – gezeigt werden sie aber an क (s. shown).
//   kind  – vowel | consonant | matra | conjunct | sign | digit
//   tip   – eine Zeile Deutsch: verbindet die FORM mit dem LAUT (keine Herkunftsbehauptung).
//           Verwechslungspaare (भ/म, ध/घ, ब/व) grenzen sich gegenseitig ab.
//   say   – Text für die Sprachausgabe. Noch kein Audio: das Zeichen selbst bzw. das
//           Vokal-/Zusatzzeichen an क, damit es überhaupt eine Silbe ergibt.
//   shown – was die Lektionskarte groß zeigt. Ein Vokalzeichen allein hängt in der Luft;
//           an क sieht man, wo es sitzt (ि links, ु unten …).

const E = (roman, kind, tip, shown) => ({ roman, kind, tip, shown })

const RAW = {
  // ── Vokale ──────────────────────────────────────────────────────────────
  अ: E('a', 'vowel', 'Eine „3“ mit Haken vor dem Stab – das kurze, dumpfe „a“, das in jedem Konsonanten steckt'),
  आ: E('ā', 'vowel', 'Wie अ mit einem zweiten Stab – der Extrastab zieht das „a“ lang: „ā“ wie in „Vater“'),
  इ: E('i', 'vowel', 'Ein Kringel mit Schwänzchen nach unten – kurzes „i“ wie in „Insel“'),
  ई: E('ī', 'vowel', 'Wie इ mit Häkchen obendrauf – das Häkchen macht das „i“ lang: „ī“ wie in „Biene“'),
  उ: E('u', 'vowel', 'Sieht aus wie eine „3“ unter der Linie – kurzes „u“ wie in „und“'),
  ऊ: E('ū', 'vowel', 'Die „3“ von उ mit Schwanz nach rechts – das Schwänzchen macht das „u“ lang: „ū“ wie in „Uhr“'),
  ए: E('e', 'vowel', 'Ein Haken hängt unter der Linie, kein Stab – „e“ wie in „Esel“'),
  ऐ: E('ai', 'vowel', 'ए mit Strich obendrauf – aus „e“ wird „ai“ wie in „Mai“'),
  ओ: E('o', 'vowel', 'आ mit Häkchen obendrauf – „o“ wie in „Ofen“'),
  औ: E('au', 'vowel', 'आ mit zwei Häkchen obendrauf – „au“ wie in „Haus“ (vgl. ओ mit einem)'),
  ऋ: E('ri', 'vowel', 'Ein Haken mit Schlaufe nach unten – selten, im Nepali gesprochen „ri“'),

  // ── Konsonanten: क-Reihe (hinten im Mund) ───────────────────────────────
  क: E('ka', 'consonant', 'Ein Stab mit Schlaufe links und Kringel rechts wie ein Knoten – „ka“ wie Knoten'),
  ख: E('kha', 'consonant', 'Zwei Teile, Dach links unterbrochen – „kha“: ein k mit kräftigem Hauch'),
  ग: E('ga', 'consonant', 'Ein Galgen: Haken links, Stab rechts, Dach links offen – „ga“ wie Galgen'),
  घ: E('gha', 'consonant', 'Eine Schale am Stab unter DURCHGEHENDEM Dach – „gha“, g mit Hauch (Dach mit Lücke: ध)'),
  ङ: E('ṅa', 'consonant', 'Wie ड mit Punkt daneben – der Nasal „ng“ wie in „Gong“'),

  // ── च-Reihe ─────────────────────────────────────────────────────────────
  च: E('ca', 'consonant', 'Ein Arm greift nach links und hängt am Stab – „ca“: wie „tsch“, oft fast „ts“'),
  छ: E('cha', 'consonant', 'Ein runder Bauch mit Schwänzchen, ohne Stab – „cha“: das tsch mit Hauch'),
  ज: E('ja', 'consonant', 'Ein Haken schwingt nach rechts zum Stab – „ja“ wie „dsch“ in „Dschungel“'),
  झ: E('jha', 'consonant', 'Ein Zickzack am Stab – „jha“: das dsch mit Hauch'),
  ञ: E('ña', 'consonant', 'Ein Bogen mit Schlinge am Stab – Nasal „ñ“ wie „nj“ in „Champagner“; fast nur in Verbindungen'),

  // ── ट-Reihe (retroflex: Zunge nach hinten geklappt) ────────────────────
  ट: E('ṭa', 'consonant', 'Ein offener Bogen unter der Linie, kein Stab – „ṭa“: t mit nach hinten geklappter Zunge'),
  ठ: E('ṭha', 'consonant', 'Ein runder Bauch wie eine „0“ unter der Linie – „ṭha“: das ṭ mit Hauch'),
  ड: E('ḍa', 'consonant', 'Wie ट mit Kringel unten – „ḍa“: d mit nach hinten geklappter Zunge'),
  ढ: E('ḍha', 'consonant', 'Wie ड mit Haken in der Mitte – „ḍha“: das ḍ mit Hauch'),
  ण: E('ṇa', 'consonant', 'Ein Kreuzchen vor zwei Stäben, Dach links unterbrochen – „ṇa“; klingt im Nepali meist wie n'),

  // ── त-Reihe (dental: Zunge an den Zähnen) ──────────────────────────────
  त: E('ta', 'consonant', 'Ein Bogen schwingt nach links unten zum Stab – „ta“ mit der Zunge an den Zähnen'),
  थ: E('tha', 'consonant', 'Ein Kringel unten links am Stab, Dach links unterbrochen – „tha“: das t mit Hauch'),
  द: E('da', 'consonant', 'Ein Haken mit Schwanz nach unten, kein Stab – „da“ mit der Zunge an den Zähnen'),
  ध: E('dha', 'consonant', 'Eine Schale am Stab, aber das Dach FEHLT über der Schale – „dha“, d mit Hauch (Dach durchgehend: घ)'),
  न: E('na', 'consonant', 'Ein kleiner Haken mit Querstrich am Stab – „na“ wie Nase'),

  // ── प-Reihe (Lippen) ────────────────────────────────────────────────────
  प: E('pa', 'consonant', 'Ein „U“ hängt am Stab – „pa“ wie Pott'),
  फ: E('pha', 'consonant', 'प mit Schwänzchen rechts – „pha“: p mit Hauch, oft fast wie „f“'),
  ब: E('ba', 'consonant', 'Ein Kästchen am Stab MIT Schrägstrich innen – „ba“ wie Ball (ohne Strich: व)'),
  भ: E('bha', 'consonant', 'Wie म, aber das Dach hat über dem linken Teil eine LÜCKE – „bha“, b mit Hauch'),
  म: E('ma', 'consonant', 'Eine Schleife am Stab unter DURCHGEHENDEM Dach – „ma“ wie Mama (Dach mit Lücke: भ)'),

  // ── य bis व (Halbvokale) ───────────────────────────────────────────────
  य: E('ya', 'consonant', 'Ein Haken mit Schlaufe unten am Stab – „ya“ wie „ja“'),
  र: E('ra', 'consonant', 'Nur ein kleiner Haken unter der Linie, kein Stab – „ra“, ein kurz getipptes r'),
  ल: E('la', 'consonant', 'Zwei Bögen übereinander am Stab – „la“ wie Leiter'),
  व: E('wa', 'consonant', 'Ein Kästchen am Stab, innen LEER – „wa“, zwischen w und b (mit Schrägstrich: ब)'),

  // ── श bis ह (Zischlaute und h) ─────────────────────────────────────────
  श: E('sha', 'consonant', 'Ein Kringel mit Querstrich am Stab, Dach unterbrochen – „sha“ wie „sch“ in „Schal“'),
  ष: E('sha', 'consonant', 'Wie प mit Schrägstrich durch das „U“ – ebenfalls „sha“, im Nepali wie श gesprochen'),
  स: E('sa', 'consonant', 'Ein Haken mit Schlaufe und Querstrich am Stab – „sa“, scharfes s wie in „Bus“'),
  ह: E('ha', 'consonant', 'Ein Bogen mit Haken nach unten, kein Stab – „ha“ wie Haus'),

  // ── Vokalzeichen (Matras) – gezeigt an क ───────────────────────────────
  'ा': E('ā', 'matra', 'Ein Extrastab rechts – macht das a lang: का = „kā“', 'का'),
  'ि': E('i', 'matra', 'Stab VOR dem Konsonanten, der Bogen wölbt sich über ihn – steht vorn, klingt aber danach: कि = „ki“', 'कि'),
  'ी': E('ī', 'matra', 'Stab HINTER dem Konsonanten, der Bogen wölbt sich zurück über ihn – langes „ī“: की = „kī“', 'की'),
  'ु': E('u', 'matra', 'Ein kleines Häkchen unten – kurzes „u“: कु = „ku“', 'कु'),
  'ू': E('ū', 'matra', 'Ein Häkchen unten, andersherum geschwungen als ु – langes „ū“: कू = „kū“', 'कू'),
  'े': E('e', 'matra', 'Ein schräger Strich oben auf dem Dach – „e“: के = „ke“', 'के'),
  'ै': E('ai', 'matra', 'Zwei schräge Striche oben – „ai“: कै = „kai“', 'कै'),
  'ो': E('o', 'matra', 'Extrastab ा plus Strich oben – „o“: को = „ko“', 'को'),
  'ौ': E('au', 'matra', 'Extrastab ा plus zwei Striche oben – „au“: कौ = „kau“', 'कौ'),
  'ृ': E('ri', 'matra', 'Ein Häkchen unten nach links – selten, „ri“: कृ = „kri“', 'कृ'),

  // ── Verbindungen ────────────────────────────────────────────────────────
  'क्ष': E('ksha', 'conjunct', 'क und ष zu einer eigenen Form verschmolzen – „ksha“: k mit angehängtem sch'),
  'त्र': E('tra', 'conjunct', 'त mit Schrägstrich unten – der Strich ist das r: „tra“ wie in „Tram“'),
  'ज्ञ': E('gya', 'conjunct', 'ज und ञ verschmolzen – im Nepali gesprochen „gya“, nicht „jña“'),
  'श्र': E('shra', 'conjunct', 'श mit Schrägstrich unten – „shra“; steckt in श्री, der Ehrenanrede'),
  'स्त': E('sta', 'conjunct', 'Halbes स (der Stab fehlt) direkt vor त – „sta“ wie in नमस्ते'),
  'न्य': E('nya', 'conjunct', 'Halbes न (der Stab fehlt) direkt vor य – „nya“ wie in धन्यवाद (danke)'),

  // ── Zusatzzeichen – gezeigt an क ────────────────────────────────────────
  'ं': E('ṃ', 'sign', 'Ein Punkt oben – ein n/m klingt mit: कं = „kaṃ“', 'कं'),
  'ँ': E('ṃ', 'sign', 'Mondsichel mit Punkt oben – der Vokal klingt durch die Nase: कँ = „kaṃ“', 'कँ'),
  '्': E('(ohne a)', 'sign', 'Ein Strichlein schräg unten – nimmt dem Konsonanten sein a: क् = „k“', 'क्'),
  'ः': E('ḥ', 'sign', 'Zwei Punkte rechts wie ein Doppelpunkt – ein kurzer Hauch „h“; selten', 'कः'),

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
export const SCRIPT_DATA = Object.fromEntries(
  Object.entries(RAW).map(([ch, d]) => {
    const shown = d.shown || ch
    return [ch, { roman: d.roman, kind: d.kind, tip: d.tip, say: shown, shown }]
  }),
)

// 14 Lektionen, je eine Sitzung (4–6 Zeichen; nur die Ziffern sind 10, weil sie
// zusammen gelernt werden). Vokale → Konsonanten nach Lautgruppen → Vokalzeichen →
// Verbindungen → Zusatzzeichen → Ziffern. So kann jede Lektion nur Bekanntes kombinieren.
export const SCRIPT_LESSONS = [
  { id: 's1', title: 'Vokale I', sub: 'kurz und lang: a ā i ī u ū', chars: ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ'] },
  { id: 's2', title: 'Vokale II', sub: 'e ai o au – und das seltene ri', chars: ['ए', 'ऐ', 'ओ', 'औ', 'ऋ'] },
  { id: 's3', title: 'क-Reihe', sub: 'hinten im Mund: k kh g gh ṅ', chars: ['क', 'ख', 'ग', 'घ', 'ङ'] },
  { id: 's4', title: 'च-Reihe', sub: 'tsch-Laute: c ch j jh ñ', chars: ['च', 'छ', 'ज', 'झ', 'ञ'] },
  { id: 's5', title: 'ट-Reihe', sub: 'Zunge zurück: ṭ ṭh ḍ ḍh ṇ', chars: ['ट', 'ठ', 'ड', 'ढ', 'ण'] },
  { id: 's6', title: 'त-Reihe', sub: 'Zunge an den Zähnen: t th d dh n', chars: ['त', 'थ', 'द', 'ध', 'न'] },
  { id: 's7', title: 'प-Reihe', sub: 'mit den Lippen: p ph b bh m', chars: ['प', 'फ', 'ब', 'भ', 'म'] },
  { id: 's8', title: 'य bis व', sub: 'y r l w', chars: ['य', 'र', 'ल', 'व'] },
  { id: 's9', title: 'श bis ह', sub: 'Zischlaute und h: sh sh s h', chars: ['श', 'ष', 'स', 'ह'] },
  { id: 's10', title: 'Vokalzeichen I', sub: 'ā i ī u ū am Konsonanten', chars: ['ा', 'ि', 'ी', 'ु', 'ू'] },
  { id: 's11', title: 'Vokalzeichen II', sub: 'e ai o au ri am Konsonanten', chars: ['े', 'ै', 'ो', 'ौ', 'ृ'] },
  { id: 's12', title: 'Verbindungen', sub: 'क्ष त्र ज्ञ und Halbformen', chars: ['क्ष', 'त्र', 'ज्ञ', 'श्र', 'स्त', 'न्य'] },
  { id: 's13', title: 'Zusatzzeichen', sub: 'Nasal, Halant und Hauch', chars: ['ं', 'ँ', '्', 'ः'] },
  { id: 's14', title: 'Ziffern', sub: '० bis ९', chars: ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'] },
]

// Laut-Hinweise, die das Deutsche nicht kennt: ein Paar = gleiche Mundstellung, ein Unterschied.
export const SCRIPT_NOTES = [
  {
    id: 'aspiration',
    title: 'Behaucht oder unbehaucht',
    text: 'Fast jeder Verschlusslaut hat einen Zwilling mit Hauch (h in der Umschrift). Unbehaucht: ganz ohne Luftstoß, wie das p in „Spiel“. Behaucht: mit deutlichem Luftstoß, wie ein betontes „P!“. Halt eine Hand vor den Mund – beim behauchten spürst du die Luft. Der Unterschied ändert die Bedeutung.',
    pairs: [['क', 'ख'], ['ग', 'घ'], ['च', 'छ'], ['ज', 'झ'], ['ट', 'ठ'], ['ड', 'ढ'], ['त', 'थ'], ['द', 'ध'], ['प', 'फ'], ['ब', 'भ']],
  },
  {
    id: 'retroflex',
    title: 'Dental oder retroflex',
    text: 'Dental (त-Reihe): die Zungenspitze liegt an den oberen Schneidezähnen – weicher als das deutsche t. Retroflex (ट-Reihe): die Zungenspitze klappt nach hinten an den Gaumen – das klingt dumpfer und härter. Im Deutschen gibt es den Unterschied nicht, im Nepali trennt er Wörter.',
    pairs: [['त', 'ट'], ['थ', 'ठ'], ['द', 'ड'], ['ध', 'ढ'], ['न', 'ण']],
  },
]
