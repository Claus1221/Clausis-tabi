# Mehr Nutzer und ein Nepali-Zweig – Konzept

Stand: 19.11.2026 · Status: freigegeben am 19.11.2026

## 1. Worum es geht und warum

Tabi ist heute eine Japanisch-App für zwei fest im Code eingetragene Google-Konten.
Zwei Dinge sollen dazukommen:

1. **Weitere Nutzer freischalten** – ohne Code-Änderung und Deploy. Jede Person hat
   ihren eigenen Lernstand.
2. **Nepali als zweite Sprache** – ein eigener Zweig der App, den man statt
   Japanisch wählen kann. Anlass: Ein Freund plant eine Reise nach Nepal. Der Zweig
   führt von null (Schrift) bis zu einfachen Reise-Gesprächen und erzählt wieder
   eine durchgehende Geschichte. Jede Person wählt ihre Sprache selbst.

## 2. Ziele, Nicht-Ziele, No-Gos

**Ziele**
- Der Admin (Claus) trägt in den Einstellungen eine E-Mail-Adresse ein, und die
  Person kann sich sofort mit ihrem Google-Konto anmelden.
- Die Freigabe wird auch von der Datenbank durchgesetzt, nicht nur von der App.
- Jede Person hat pro Sprache einen getrennten Lernstand und kann jederzeit die
  Sprache wechseln, ohne etwas zu verlieren.
- Nepali: Devanagari lesen, Grundwortschatz, Grundgrammatik, Geschichte,
  Rollenspiel-Szenen und freie KI-Gespräche – derselbe Lernbogen wie bei Japanisch.

**Nicht-Ziele**
- Kein Umbau der Japanisch-App zu einem allgemeinen „Sprachmotor“.
- Keine animierte Strichreihenfolge für Devanagari (es gibt keine freie Datenquelle
  wie KanjiVG). Nachmalen über einer blassen Vorlage reicht.
- Keine Einladungscodes, keine Rollen außer „Admin“ und „freigeschaltet“.
- Keine weiteren Sprachen. Der Aufbau soll eine dritte nicht verbauen, aber es wird
  nichts dafür vorbereitet.
- Kein Vergleich zwischen Nutzern (Ranglisten o. Ä.).

**No-Gos** (wäre ein Fehlschlag, selbst wenn alles „funktioniert“)
- Ein vorhandener Japanisch-Lernstand geht verloren oder wird verändert.
- Die Japanisch-App verhält sich nach dem Umbau anders als vorher.
- Die App bringt falsches oder unnatürliches Nepali bei.
- Die bereits freigeschaltete zweite Person wird beim Umstellen ausgesperrt.

## 3. Ausgangslage (was der Code heute tut)

- `src/firebase.js`: `ALLOWED_EMAILS` mit zwei Adressen. `src/AuthGate.jsx` prüft
  die Liste nur in der App.
- `firestore.rules`: Jeder angemeldete Nutzer darf `users/{uid}` lesen/schreiben.
  Die Freigabeliste wird dort nicht geprüft.
- `src/useProgress.js`: ein Dokument `users/{uid}` mit dem gesamten Lernstand, ohne
  Sprachkennung. `reset()` überschreibt das ganze Dokument.
- Inhalte und Logik sind durchgehend japanisch: `data/kana.js`, `kanaStrokes.js`,
  `kanjiOrigin.js`, Furigana, `lib/speech.js`/`listen.js`/`ttsCloud.js` (`ja-JP`),
  `scripts/generate-audio.mjs` (Google-Stimme `ja-JP-Neural2-B`), `lib/scene.jsx`
  (Torii, japanische Kulissen), Prompts in `lib/claude.js` und `lib/talk.js`.
- Umfang Japanisch heute: 20 Schrift-Lektionen, 10 Wortblöcke, 31 Grammatik-Themen,
  28 Kapitel, 11 Szenen.
- Firestore-Regeln spielt Claus von Hand in der Firebase-Console ein; es gibt keine
  Anbindung per CLI.

## 4. Wege, die zur Wahl standen

### Nutzer freischalten
| Weg | Bewertung |
|---|---|
| **A1 Freigabeliste in Firestore + Verwaltung in der App** | **Gewählt.** Kein Deploy pro Person, Durchsetzung auf dem Server. Einmalig neue Regeln einspielen. |
| A2 Liste bleibt im Code, zusätzlich in den Regeln | Wenig Arbeit, aber jede neue Person = Commit + Deploy + Regel-Update. |
| A3 Einladungscodes | Für eine Handvoll Freunde zu viel Aufwand. |

### Nepali in den Code bringen
| Weg | Bewertung |
|---|---|
| **B1 Eigener Zweig `src/ne/` mit gemeinsamem Kern** | **Gewählt.** Japanisch bleibt fast unberührt; etwas doppelter Code wird in Kauf genommen. |
| B2 Ein Motor mit Sprachpaketen | Sauberer, aber Umbau von ~10.000 Zeilen mit hohem Risiko für Japanisch. |
| B3 Getrennte App | Keine Sprachwahl in einer App – widerspricht dem Wunsch. |

## 5. Teil 1: Nutzer freischalten

### Datenmodell
- Sammlung `allowed`, ein Dokument je Person. **Dokument-ID = E-Mail in
  Kleinbuchstaben.** Felder: `name` (frei, optional), `addedAt`.
- Admin ist fest: `clausalbers@gmail.com`. Die Adresse steht in den Regeln und als
  `ADMIN_EMAILS` in `src/firebase.js` (ersetzt `ALLOWED_EMAILS`). Der Admin braucht
  keinen Eintrag in `allowed`.

### Regeln (`firestore.rules`)
- Grundbedingung für alle: Anmeldung über Google
  (`request.auth.token.firebase.sign_in_provider == 'google.com'`). Das verhindert,
  dass sich jemand über einen anderen Anmeldeweg mit einer freigeschalteten Adresse
  einschleicht. Bewusst **nicht** `email_verified`, weil ungeprüft ist, ob das beim
  Google-Konto mit web.de-Adresse gesetzt ist (Aussperr-Gefahr).
- `isAdmin()`: Grundbedingung und `request.auth.token.email.lower()` ist die
  Admin-Adresse.
- `isAllowed()`: Admin **oder** Grundbedingung und
  `exists(.../allowed/$(email.lower()))`.
- `allowed/{email}`: lesen darf der Admin und die Person selbst (nur ihr eigenes
  Dokument); schreiben nur der Admin.
- `users/{uid}/{document=**}` (Wurzeldokument und alles darunter): nur bei
  `auth.uid == uid` **und** `isAllowed()`.

### App
- `AuthGate`: Nach dem Login per `getDoc` das eigene `allowed`-Dokument lesen.
  Vorhanden oder Admin → rein. Sonst „Kein Zugang“ mit der angezeigten Adresse
  (gibt es schon), damit die Person weiß, welche Adresse sie Claus nennen muss.
  Ohne Netz und ohne Cache: eigener Hinweis „Keine Verbindung“ statt „Kein Zugang“.
- Einstellungen: Abschnitt **„Nutzer verwalten“**, nur für den Admin sichtbar.
  Liste der Adressen mit Namen, Feld zum Hinzufügen, Entfernen mit Rückfrage.
  Entfernen sperrt den Zugang, löscht aber keinen Lernstand.

```
Nutzer verwalten
┌──────────────────────────────────────┐
│ balkonien4ever@web.de        [Entf.] │
│ freund@gmail.com  · Jonas    [Entf.] │
├──────────────────────────────────────┤
│ E-Mail [______________] Name [_____] │
│                       [Freischalten] │
└──────────────────────────────────────┘
```

### Umstellung ohne Aussperren (Reihenfolge ist Pflicht)
0. Claus vergleicht die Regeln in der Console mit `firestore.rules` im Repo. Sie
   werden von Hand eingespielt; weichen sie ab, wird das zuerst geklärt.
1. Claus legt in der Firebase-Console von Hand `allowed/balkonien4ever@web.de` an.
2. Claus prüft die neuen Regeln im **Regel-Playground** der Console, bevor er sie
   veröffentlicht. Feste Prüfliste (kommt in `FIREBASE-SETUP.md`): Admin liest und
   schreibt `users/{uid}` · zweite Person ebenso · fremdes Google-Konto wird
   abgewiesen · `users/{uid}/langs/ne` und `meta/profile` gehen · `allowed` darf
   nur der Admin schreiben und auflisten. Kein Emulator, keine neue Abhängigkeit.
3. Claus veröffentlicht die neuen Regeln. Die alte App läuft damit weiter.
4. Die neue App wird deployt.

Hinnehmbar: Startet die zweite Person die neue App zum ersten Mal ohne Netz, sieht
sie „Keine Verbindung“, bis sie einmal online war.

Wird jemand entfernt, während die App offen ist, meldet Firestore
`permission-denied`. Die App prüft dann den Zugang neu und zeigt „Kein Zugang“,
statt einen leeren Lernstand anzuzeigen.

`FIREBASE-SETUP.md` bekommt diese Schritte und den neuen Regeltext.

## 6. Teil 2: Sprachwahl und Lernstand je Sprache

### Datenmodell
- `users/{uid}` bleibt unverändert der **Japanisch**-Lernstand. Kein Umzug.
- `users/{uid}/langs/ne` ist der Nepali-Lernstand, gleiches Feldschema wie heute
  (`completedLessons`, `completedWordBlocks`, `completedGrammar`,
  `completedChapters`, `completedDialogs`, `completedTalks`, `extraPhrases`,
  `chapterStars`, `xpByDate`, `history`, `srs`, `settings`).
- `users/{uid}/meta/profile` hält `{ lang: 'ja' | 'ne' }`. Eigenes Dokument, damit
  `reset()` die Sprachwahl nicht mitlöscht.
- XP, Level, Streak und Einstellungen gelten je Sprache. Die API-Keys bleiben wie
  heute gerätelokal und gelten für beide Sprachen.

### Ablauf
- Neue Komponente `LangGate` zwischen `AuthGate` und den Apps: lädt das Profil und
  lädt dann per `React.lazy` entweder `TabiApp` (Japanisch) oder `ne/NepaliApp`.
- Kein Profil vorhanden:
  - Es gibt schon ein `users/{uid}`-Dokument → stillschweigend `ja` (Bestandsnutzer
    sehen keine neue Frage).
  - Sonst → Auswahlbildschirm.
- Wechsel jederzeit in den Einstellungen („Sprache wechseln“). Beide Lernstände
  bleiben erhalten.
- `useProgress(uid)` bekommt einen zweiten Parameter für die Sprache und wählt
  daraus den Dokumentpfad. Für `ja` ändert sich nichts.

```
Was möchtest du lernen?
┌────────────────┐  ┌────────────────┐
│      旅        │  │     यात्रा      │
│   Japanisch    │  │     Nepali     │
│ Tabi · Japan-  │  │ Yatra · Nepal- │
│ Reise          │  │ Reise          │
└────────────────┘  └────────────────┘
```

- Solange der Nepali-Zweig nicht fertig ist, sieht nur der Admin die Kachel
  „Nepali“. Freigeschaltet wird sie über eine Konstante im Code.

## 7. Teil 3: Der Nepali-Zweig („Yatra“ यात्रा)

### Code-Aufbau
- Alles Nepalesische liegt unter `src/ne/` mit denselben Schichten wie heute:
  `ne/data`, `ne/lib`, `ne/components`, `ne/screens`, dazu `ne/NepaliApp.jsx`.
- Japanische Dateien bleiben, wo sie sind (kein Verschieben nach `src/ja/`).
- **Regel fürs Teilen:** Eine bestehende Datei wird nur dann von beiden Zweigen
  benutzt, wenn sie keine japanische Annahme enthält oder sich mit einem
  Sprach-Parameter sauber öffnen lässt, ohne ihr Verhalten für Japanisch zu ändern.
  Sonst bekommt Nepali ein eigenes Modul. Im Zweifel: eigenes Modul.
- Sicher gemeinsam: `AuthGate`, `firebase.js`, `useProgress.js` (inkl. `sm2`,
  `computeStats`), `theme.js`, `components/ui.jsx`, `components/ueben.jsx`,
  `lib/xp.js`, `lib/progress.js`, `lib/apiKey.js`, der Transport in `lib/claude.js`
  (`chatTurn`, `parseJson`, `pingApiKey`).
- Sicher eigen: alle Inhalte, Schrift-Lektionen, Sprachausgabe und -erkennung,
  Audio-Skript, Kulissen (`scene`), Prompts für Bewertung und Gespräche,
  antippbare Texte mit Umschrift.
- `ne/` darf aus dem gemeinsamen Kern importieren, nie aus japanischen Inhalts-
  oder Logik-Dateien. Japanische Dateien importieren nie aus `ne/`.

### Schrift
- Devanagari in Lektionen nach Lautgruppen (wie die Gojūon-Zeilen):
  Vokale → Konsonanten-Gruppen → Vokalzeichen (Matras) → häufige Verbindungen
  (क्ष, त्र, ज्ञ, Halbformen) → Zusatzzeichen (Anusvara, Chandrabindu, Halant) →
  Ziffern ०–९ (wichtig für Preise und Busnummern).
- Je Zeichen: groß zeigen, anhören, Merkhilfe, Nachmalen über blasser Vorlage
  (Schriftglyphe als Hintergrund im vorhandenen Mal-Canvas), danach Quiz.
- Eigene Hinweise zu Lauten, die Deutschsprachigen schwerfallen: behaucht /
  unbehaucht (क/ख), dental / retroflex (त/ट).
- **Umschrift** unter dem Devanagari, abschaltbar. Ein festes, dokumentiertes
  Schema (lange Vokale ā ī ū, Behauchung kh/gh, Retroflexe ṭ ḍ). Schema-Details
  legt der Umsetzer fest.
- Schriftart: Noto Sans Devanagari, geladen wie heute Noto Sans JP.

### Inhalte
- **Zielperson:** Reisende ohne Vorkenntnisse; höfliche Anrede (तपाईं) als Standard.
- **Geschichte:** eine Reise durch Nepal als roter Faden, z. B. Ankunft in
  Kathmandu (Flughafen, Taxi nach Thamel) → Altstadt und Stupa → Bus nach Pokhara →
  Trek mit Teehäusern → Aussichtspunkt als Ziel-Station. Genaue Handlung und
  Figuren legt der Umsetzer fest.
- **Grammatik:** u. a. Satzbau (Verb am Ende), हो / छ, Postpositionen (‑मा, ‑को,
  ‑लाई, ‑बाट), Verneinung, Fragen, Zahlen und Zählwörter (वटा / जना), „ich möchte /
  brauche / mag“ (चाहिन्छ, मन पर्छ), höfliche Bitte (‑नुहोस्), Vergangenheit.
- **Szenen und freie Gespräche:** Taxi, Unterkunft, Essen bestellen (Dal Bhat),
  Einkaufen und Handeln, nach dem Weg fragen, Teehaus, Hilfe holen.
- **Umfang der ersten vollständigen Fassung** (Richtwert): ca. 14 Schrift-Lektionen,
  6 Wortblöcke, 12 Grammatik-Themen, 10 Kapitel, 6 Szenen, 6 freie Gespräche.
  Schemata wie in `ARCHITECTURE.md` §5, soweit sie passen.
- Kulissen: eigenes `ne/lib/scene.jsx` (Stupa, Gebetsfahnen, Terrassenfelder, See,
  Himalaya) im Stil der vorhandenen Szenen.
- Kopfzeile im Nepali-Zweig: „Yatra · यात्रा · Nepali für Reisende“. Der Name der
  installierten App (PWA) bleibt „Tabi“.

### Sprachausgabe
- Google Cloud TTS hat **keine** Nepali-Stimme (Stimmenliste und Chirp 3 HD
  geprüft am 19.11.2026). Phase 0 schaut noch einmal nach, auch bei Gemini-TTS:
  Gibt es dort inzwischen `ne-NP`, entfallen Azure-Konto und zweiter Schlüssel.
  Azure Speech hat `ne-NP-HemkalaNeural` (w) und `ne-NP-SagarNeural` (m).
- Vorab erzeugte MP3s: neues Skript `scripts/generate-audio-ne.mjs` nach dem Muster
  des vorhandenen, Ziel `public/audio-ne/` mit eigenem Manifest. Schlüssel
  `AZURE_SPEECH_KEY` und `AZURE_SPEECH_REGION` in `.env.local`. Dafür braucht Claus
  eine Azure-Speech-Ressource (Gratis-Stufe prüfen).
- Der Pre-Commit-Hook und `--check` decken auch Nepali ab.
- Zur Laufzeit erzeugte Sätze (freie Gespräche): Azure mit eigenem, gerätelokalem
  Key – sonst Gerätestimme, falls das Gerät eine Nepali-Stimme hat. Ohne beides
  gibt es das Gespräch nur als Text.
- Service-Worker-Regeln für `audio-ne/` wie für `audio/` (Manifest NetworkFirst,
  MP3s CacheFirst).

### Spracherkennung
- Web Speech API mit `ne-NP`. **Ob Chrome das zuverlässig kann, ist ungeprüft.**
  Der Probelauf (Phase 0) entscheidet. Fällt er durch: Antworten antippen statt
  sprechen; freie Gespräche laufen dann über Antwort-Vorschläge.

### Qualität der Inhalte (größtes Risiko)
Weder Claus noch sein Freund können Nepali prüfen, und die Inhalte werden von einer
KI geschrieben. Deshalb:
- Nur gut belegtes Reise-Nepali auf Sprachführer-Niveau, keine ausgefallenen Formen.
- Jeder Inhaltsblock wird vor dem Einbau von einem zweiten, unabhängigen KI-Durchgang
  gegengelesen (Rechtschreibung in Devanagari, Umschrift passt zum Devanagari,
  Höflichkeitsstufe einheitlich, Übersetzung stimmt).
- Automatische Tests: jede Pfad-Station existiert, jedes Wort einer Geschichte ist
  vorher eingeführt, Umschrift passt silbenweise (Akshara) zum Devanagari – mit
  Ausnahmeliste, weil Nepali den mitgesprochenen Vokal oft weglässt –, jede
  Sprechstelle hat Audio.
- Wenn sich eine Person mit Nepali-Kenntnissen findet: einmal gegenlesen lassen,
  bevor die Kachel für alle freigeschaltet wird.

## 8. Reihenfolge

Jede Phase ist für sich deploybar und lässt Japanisch unverändert.

| Phase | Inhalt | Ergebnis |
|---|---|---|
| 0 | Probeläufe: Azure-Stimme anhören, `ne-NP`-Erkennung in Chrome, Devanagari-Darstellung | Entscheidung Stimme/Erkennung |
| 1 | Nutzer freischalten (Teil 1) | Claus kann den Freund eintragen |
| 2 | Sprachwahl, Lernstand je Sprache, leere Nepali-Hülle (nur Admin sieht sie) | Gerüst steht |
| 3 | Schrift-Lektionen, Audio-Skript, Wiederholen | Devanagari lernbar |
| 4 | Wörter, Grammatik, erste Kapitel (Kathmandu) | Geschichte beginnt |
| 5 | Szenen, freie Gespräche, restliche Kapitel; Freischalten für alle | Vollständige erste Fassung |

`ARCHITECTURE.md` wird in jeder Phase mitgepflegt.

## 9. Dem Umsetzer überlassen
- Genaue Handlung, Figuren, Wortlisten und Reihenfolge der Pfad-Stationen.
- Umschrift-Schema im Detail; Aufteilung der Schrift-Lektionen.
- Farbgebung des Nepali-Zweigs (eigener Akzent erlaubt, gleiche Bausteine).
- Welche Dateien im Einzelnen geteilt und welche gespiegelt werden (Regel in §7).
- Ob `LangGate` das Profil zusätzlich in `localStorage` puffert, um schneller zu starten.

## 10. Entschieden von Claus (19.11.2026)
1. Azure-Konto für die Nepali-Stimme: **ja**.
2. Der Freund nutzt **Android**. Probeläufe für Gerätestimme und Spracherkennung
   laufen auf Android/Chrome; iPhone wird nicht eigens abgesichert.
3. Der Freund braucht **keinen eigenen Anthropic-Key**. Die festen Szenen müssen
   für sich vollständig sein; freie KI-Gespräche sind der letzte, optionale Schritt.
