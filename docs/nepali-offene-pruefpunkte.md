# Nepali – offene Prüfpunkte

Diese Liste sammelt Aussagen des Nepali-Kurses (Yatra), die eine automatische Durchsicht
verbessert hat, die aber noch niemand geprüft hat, der Nepali spricht. Sie ist für eine
spätere Durchsicht durch eine solche Person gedacht. Je Punkt: was der Kurs jetzt sagt und
was daran zweifelhaft war. Fundstelle ist, wo nicht anders genannt, `src/ne/data/script.js`
(Feld `tip` bzw. Lektionsuntertitel `sub`).

## Festgelegte Umschrift-Regel

- **Bewusst so entschieden, kein Fehler:** Jede Umschrift neben Devanagari (Feld `roman` und
  Beispielwörter in Merkhilfen) folgt der Schreibung nach dem Kurs-Schema: श/ष = `sh` (देश „desh“,
  शान्ति „shānti“, शून्य „shūnya“), ā ī ū wie geschrieben, stummes End-a fällt weg. Drei
  feste Ausnahmen, wie in jeder praktischen Nepali-Umschrift: (1) व wie gesprochen – `b` in den meisten
  Wörtern (विदेश „bidesh“, धन्यवाद „dhanyabād“, प्रवेश „prabesh“), `w`, wo w gesprochen wird (स्वागत „swāgat“);
  der Einzelbuchstabe व behält `wa`; (2) ज्ञ = `gya` (ज्ञान „gyān“, nicht `jña`); (3) ऋ/ृ = `ri` (nicht `r̥`). Die Aussprache steht getrennt davon, als ausdrückliche
  Bemerkung („देश „desh“ – klingt fast wie „des““), nie als Umschrift ausgegeben.

## Schrift (Task 1)

- **अ** – Kurs: „dumpfes a, zwischen a und o“. Zweifel: zuerst „kurzes, dumpfes a“, dann „wie das
  o in „Gott“, nur ungerundet“; der zweite Prüfer hielt den Vergleich mit „Gott“ für irreführend.
  Offen, ob „zwischen a und o“ deutschen Lernenden genügt.
- **च / ज, Untertitel s4** – Kurs: च „zwischen ts und tsch, meist näher an ts“, ज „zwischen ds
  und dsch, meist näher an ds“. Zweifel: vorher „wie tsch“ bzw. „dsch wie in Dschungel“; die
  Aussprache schwankt je nach Sprecher und Region.
- **व** – Kurs: „meist wie b, auch im Wort (विदेश „bidesh“, धन्यवाद „dhanyabād“), in manchen Wörtern
  wie engl. w (स्वागत „swāgat“)“; Umschrift bleibt `wa`. Zweifel: zuerst „zwischen w und b“, dann
  „am Wortanfang b, sonst w“ – der zweite Prüfer widersprach: b gilt auch im Wortinneren.
- **व im Wortinneren** – offen, in welchen Wörtern व als w gesprochen wird (स्वागत, Verbindungen mit
  व nach Konsonant?) und ob es dafür eine Faustregel gibt, die der Kurs nennen könnte.
- **ख** – Kurs: „sieht aus wie र und व nebeneinander, doch in ख sind die beiden Teile unten durch
  einen Strich verbunden, in रव nicht“. Zweifel: die beiden Prüfer waren uneins, ob die Kopflinie
  über ख unterbrochen ist (gängige Hindi-Lehrlisten sagen ja, der erste Prüfer schrieb „unter
  EINEM Dach“). Der Kurs sagt dazu jetzt nichts mehr.
- **शहर / सहर** – die Standardschreibung ist सहर; als Beispiel für „श klingt wie s“ taugt das Wort
  daher nicht. Der Kurs nutzt jetzt शान्ति (Umschrift „shānti“, klingt fast wie „sānti“) und देश (Umschrift „desh“, klingt fast wie „des“) und vermeidet शहर.
- **य / थ** – Kurs: य „Dach durchgehend; mit Lücke im Dach: थ“, थ „wie य, aber mit Lücke im Dach“.
  Zweifel: vorher eine andere Formbeschreibung für थ; ob die Abgrenzung in gängigen Schriften
  sichtbar ist.
- **श्र** – Kurs: „eigene Form: der linke Teil von श wird zum Bogen, darunter der r-Strich“.
  Zweifel: vorher „श mit Schrägstrich unten“.
- **Formbeschreibungen त्र und श्र** – Kurs: त्र „त mit Schrägstrich unten“, श्र wie oben. Gegen die
  tatsächlich verwendete Schrift (Noto Sans Devanagari) prüfen; je nach Schrift sehen beide
  Ligaturen deutlich anders aus.
- **ढ** – Kurs: „wie ड, mit einem kleinen Haken am unteren Ende“. Zweifel: vorher „wie ड mit Haken
  in der Mitte“.
- **झ** – Kurs: „in Druck und auf Schildern oft in einer zweiten, traditionellen Form“. Zweifel:
  ob Lernende die zweite Form auch gezeigt bekommen sollten (bisher nur erwähnt).
- **Offene bzw. unterbrochene Kopflinie bei ग, श und ण** – Kurs: die Tipps nennen „Dach links offen“
  (ग), „Dach unterbrochen“ (श) und „Dach links unterbrochen“ (ण). Zweifel: in gängigen Schriften
  sieht die Kopflinie von ग und श meist durchgehend aus. Gegen die tatsächlich verwendete Schrift
  (Noto Sans Devanagari) prüfen; die Bemerkung dort streichen, wo keine Lücke sichtbar ist.

## Wörter (Task 6, `src/ne/data/words.js` und Oberfläche)

- **पढाइ / सिकाइ** – für „Lernen“ in der Oberfläche. Zweifel: welches Wort ein Nepali-Sprecher für
  „Lernen“ (als Menüpunkt) natürlicher findet.
- **काठमाडौं / काठमाडौँ** – der Kurs schreibt eine Form durchgehend. Zweifel: Anusvāra oder
  Chandrabindu am Wortende; beide sind in Gebrauch.
- **तपाईंलाई ठीक छ?** – „Geht es Ihnen gut?“. Zweifel: ob das so gefragt wird oder eher
  तपाईंलाई कस्तो छ? / सन्चै हुनुहुन्छ?.
- **पानी पर्छ** – gelehrt als „es regnet (allgemein) / es wird regnen“. Für Regen, der gerade
  fällt, sagt man पानी परिरहेको छ; der Kurs benutzt deshalb पर्छ nur für Vorhersagen.
- **ट्याक्सी कति हो?** – „Was kostet das Taxi?“. Zweifel: ob man eher भाडा कति हो? fragt.

## Grammatik (Task 7, `src/ne/data/grammar.js`)

- **‑सँग = `saṃga`, ‑बाट = `bāṭa`** – der Kurs schreibt den Endvokal, weil er gesprochen wird.
  Zweifel: viele Umschriften schreiben `sang`/`bāṭ`; bitte bestätigen, dass man ihn hört.
- **ng10: वटा bei Menschen** – Zählwort वटा auch für Personen ist umgangssprachlich verbreitet,
  gilt aber als salopp (जना ist das höfliche Zählwort). Offen, ob der Kurs das erwähnen soll.
- **ng3: हो / हुन्छ bei Eigenschaften** – der Kurs erklärt den Unterschied jetzt vorsichtiger.
  Offen, ob die Erklärung die Nuance trifft.
- **Umschrift von fünf Antwort-Optionen** – vom Kurs nach Schema gesetzt, ohne Prüfung durch
  einen Sprecher: छैनँ `chainaṃ`, नबोल्नुहोस् `nabolnuhos`, आउनुहोस् `āunuhos`, खानुहोस् `khānuhos`,
  जानुभयो `jānubhayo`.

## Geschichte (Tasks 8/9, `src/ne/data/chapters.js`)

- **nc1 नेपाल पहिलो पटक हो?** – „Sind Sie zum ersten Mal in Nepal?“. Richtig, aber locker
  gesprochen; natürlicher wäre नेपाल पहिलो पटक आउनुभएको हो? (die Form lehrt der Kurs nicht).
- **nc3 मसँग पैसा छ** – Asha besteht darauf zu zahlen. Richtig, aber man sagt dafür eher
  म तिर्छु („ich zahle“), das der Kurs nicht lehrt; der deutsche Erzähltext trägt die Absicht.
- **जाने als Vorschlag** (nc4, nc7, nc9, nc10: बिस्तारै जाने, माथि जाने?) – umgangssprachlich
  „gehen wir …“; die übliche Form wäre जाऔँ, die der Kurs nicht lehrt. Im Kurs als
  umgangssprachlich markiert.
- **nc7 परमिट** – Schreibung परमिट (häufiger als पर्मिट), Umschrift `parmiṭ` wie gesprochen.
- **nc9 यहाँ बस्नुहोस् र पर्खनुहोस्** – zwei Bitten mit र klingen etwas schriftlich; natürlicher
  wäre यहाँ बसेर पर्खनुहोस्, aber die ‑एर-Form lehrt der Kurs nicht.
- **nc10 बिस्तारै उज्यालो हुन्छ** – „Bald wird es langsam hell“, gesagt vor der Dämmerung.
  Während es hell wird, sagte man eher उज्यालो हुँदैछ.
