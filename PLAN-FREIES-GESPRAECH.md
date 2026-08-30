# Plan: Natürliche Gesprächsführung – von der Szene zum freien Gespräch

> **Umsetzungsplan** für das Feature „Freies KI-Gespräch mit Avatar".
> Teil A beschreibt die Didaktik (das *Warum* und die Lern-Treppe),
> Teil B den Implementierungsplan in Phasen (das *Wie*, mit Dateien, Schemata
> und Abnahmekriterien) – geschrieben zur Ausführung durch eine KI (Opus 5)
> in diesem Repo. Konventionen aus `ARCHITECTURE.md` §7 gelten durchgehend
> (JSX nur in `.jsx`, Farben über `theme.js`, deutsche Kommentare,
> Schichten-Richtung `screens → components → lib → data`).

---

## Teil A – Didaktische Strategie: die Gesprächs-Treppe

### Leitidee

Jede Reise-Situation (Taxi, Check-in, Restaurant …) wird als **Treppe mit vier
Stufen** gelernt. Die ersten Stufen existieren bereits (geskriptete Szene mit
Scaffold-Stufen), neu sind die oberste Stufe (**freies Gespräch**) und die
**Nachbesprechung**, die den Kreis zum SRS schließt. Kernprinzipien aus
`DIDAKTIK.md` bleiben erhalten: aufgabenorientiert (TBLT), verblassende Hilfen,
Abruf ohne L1-Krücke, Hören-zuerst, Gating.

```
Stufe 1  KENNENLERNEN   geskriptete Szene, Antippen, Scaffold voll/mittel   (existiert)
Stufe 2  SPRECHEN       gleiche Szene, Antworten sprechen statt antippen    (existiert)
Stufe 3  VARIANTE       NPC formuliert anders, Reihenfolge gemischt        (neu, klein)
Stufe 4  FREI           KI-NPC, echtes Ziel + Komplikation, ohne Skript    (neu, Kernstück)
Debrief  NACHBESPRECHUNG Korrekturen + neue Wendungen → SRS-Karten          (neu)
```

### Warum diese Reihenfolge wirkt

1. **Stufe 1–2 bauen das Situations-Skript auf** („script theory": Begrüßung →
   Bestellung → Bezahlen hat eine feste Dramaturgie). Der Lerner kennt danach
   die Züge der Situation und die Musterantworten – das ist das Gerüst.
2. **Stufe 3 verhindert Auswendiglernen.** Wer d2 dreimal gespielt hat, erkennt
   „どちらまで？" am Klangbild, nicht am Inhalt. Varianten („どこに いきますか？",
   „いきさきは？") zwingen zum echten Hörverstehen bei identischer Aufgabe –
   nahe Transferleistung mit minimalem neuen Stoff.
3. **Stufe 4 ist „pushed output" unter Realbedingungen.** Die versteckte
   Komplikation (das Gericht ist aus, das Zimmer erst ab 15 Uhr frei) macht das
   Skript unbrauchbar – der Lerner muss verstehen und reagieren. Genau das ist
   der Sprung vom Phrasen-Wissen zum Sprechen-Können.
4. **Das Debrief verlagert die Korrektur ans Ende.** Im Gespräch unterbricht
   der NPC nicht zum Korrigieren (Flüssigkeit vor Genauigkeit, wie ein echter
   höflicher Gesprächspartner), sondern nutzt **Recasts**: er wiederholt das
   Gemeinte beiläufig in korrekter Form („ああ、ホテルまで ですね。"). Explizite
   Korrekturen und neue Wendungen kommen erst danach – und wandern als
   SRS-Karten ins bestehende Wiederholungssystem.

### Freischalt-Logik (Gating)

- **Stufe 4 einer Situation öffnet erst, wenn die geskriptete Szene
  abgeschlossen ist** (`progress.completedDialogs` enthält die Szenen-ID) –
  damit ist garantiert, dass Situations-Skript und Kernvokabular sitzen.
- Zusätzlich global: nur mit hinterlegtem Anthropic-Key (`hasApiKey()`) und
  vorhandener Spracheingabe (`SPEECH_INPUT_SUPPORTED`) – ohne beides wird die
  Stufe mit Erklärung ausgegraut, nie kaputt angezeigt (Fallback-Philosophie
  wie bisher: kein Key → App verhält sich wie vorher).
- Stufe 3 (Varianten) läuft ohne KI und ohne Key – sie ist Teil der
  geskripteten Szene (zusätzliche `npcAlt`-Zeilen, s. Teil B Phase 1).

### Was das freie Gespräch natürlich macht (Design-Regeln für den NPC)

Diese Regeln werden im System-Prompt kodiert (Phase 3) und sind das
didaktische Herzstück:

1. **Comprehensible Input auf Lerner-Niveau:** Der NPC darf nur Wörter aus dem
   bereits gelernten Wortschatz verwenden (`reiseVocab(...)` aus
   `lib/dialog.js` liefert exakt diese Menge), kurze Sätze, Kana-Orthografie
   wie in den Lerninhalten, **eine** Frage pro Zug. Wenige gezielte neue
   Wörter sind erlaubt (i+1), müssen aber im Debrief auftauchen.
2. **Persona statt Automat:** Jede Situation hat eine benannte Rolle mit
   Mini-Charakter (die geduldige Taxifahrerin, der flotte Café-Kellner). Der
   NPC beginnt mit einem natürlichen Opener, nicht mit einer Prüfungsfrage.
3. **Komplikation als Aufgabe:** Jedes freie Gespräch hat ein Ziel (aus der
   Szene) plus eine dem Lerner unbekannte Wendung, die der NPC im Mittelteil
   ausspielt. Erst wenn das Ziel trotz Komplikation erreicht ist, endet die
   Szene mit einer natürlichen Schlussfloskel.
4. **Fehlertoleranz wie im echten Leben:** Kurze Antworten, fehlende Partikeln,
   Ein-Wort-Antworten → der NPC versteht sie und macht per Recast weiter.
   Nur wenn die Kommunikation wirklich zusammenbricht, fragt er natürlich nach
   („すみません、もう いちど おねがいします。") – das ist selbst Lernstoff
   (Reparatur-Strategien) und kein Fehlversagen der App.
5. **Hilfe ohne Gesichtsverlust:** Ein Hilfe-Knopf („何て言えばいい？") zeigt
   1–2 mögliche Antworten (JP + DE) und liest sie vor. Hilfe zu holen kostet
   nichts außer, dass die Antwort nicht in die „ohne Hilfe"-Statistik zählt.
6. **Der Lerner beendet nie im Nichts:** Abbruch ist jederzeit möglich; auch
   dann gibt es ein Kurz-Debrief über die bereits gespielten Züge.

### Sitzungs-Dramaturgie (ein freies Gespräch, ~3–5 Minuten)

```
1. Szenenkarte: Ort, Rolle, DEIN Ziel (deutsch) – Komplikation wird NICHT verraten.
2. Avatar erscheint, NPC-Opener wird gesprochen (Hören-zuerst; Text je nach Scaffold).
3. Schleife (max. 12 Züge): NPC spricht → Mikro öffnet automatisch → Lerner
   spricht → kurze „denkt nach"-Animation → NPC antwortet.
4. Ziel erreicht → natürliche Verabschiedung durch den NPC.
5. Debrief: Lob konkret, 2–3 Korrekturen (gesagt vs. natürlicher), 1–2 neue
   Wendungen mit „→ als Lernkarte übernehmen"-Knopf. XP-Vergabe.
```

### Scaffolding im freien Gespräch (drei Anzeige-Modi, an Settings gekoppelt)

| Modus | NPC-Text | Übersetzung | Gedacht für |
|---|---|---|---|
| gestützt | sofort sichtbar | auf Antippen | erste freie Gespräche |
| hörend | erst nach eigener Antwort | auf Antippen | Standard |
| immersiv | nie (nur „Zeigen"-Knopf wie `peeked` heute) | nie | Könner |

Standard: „hörend". Der Modus nutzt die bestehenden Settings-Muster
(`audioOnlyDialogs` als Vorbild).

---

## Teil B – Implementierungsplan (Phasen, für Opus 5)

Jede Phase ist eigenständig auslieferbar und endet mit lauffähigem Stand
(`npm test`, `npm run build` grün; bei neuen festen Sprechtexten `npm run
audio`, s. `ARCHITECTURE.md` §4 – der Pre-Commit-Hook erzwingt das).
**`ARCHITECTURE.md` und `DIDAKTIK.md` bei jeder Phase mitpflegen** (lebende
Doku). Neue reine Logik bekommt Vitest-Tests neben der Datei.

### Phase 0 – `lib/claude.js` zum Gesprächs-Client ausbauen

**Ziel:** Mehrzug-Gespräche, strukturierte Antworten, Prompt-Caching.

- `callClaude` erweitern: statt `prompt: string` ein
  `messages: [{role, content}]`-Array akzeptieren (Signatur:
  `callClaude({ key, system, messages, maxTokens })`); `system` als
  **Block-Array mit `cache_control: { type: 'ephemeral' }`** auf dem letzten
  System-Block senden (Preis: gecachte Präfixe kosten ~1/10 – bei ~40 Zügen
  pro Übungstag der Unterschied zwischen ~7 $ und ~2 $ im Monat).
  Bestehende Aufrufer (`judgeAnswer`, `pingApiKey`) auf die neue Signatur heben.
- Neu: `parseJson(text)` – defensiver JSON-Parser (Code-Fences strippen,
  `try/catch`, bei Fehlschlag `null`). Neu: `chatTurn({ system, history,
  maxTokens })` – ein Gesprächszug, gibt geparstes JSON oder `null` zurück.
- `judgeAnswer` liefert statt `boolean` ein Objekt
  `{ ok: boolean, better?: string, note?: string }`:
  Der Prompt verlangt JSON `{"ok":true/false,"better":"натürlichere
  Formulierung, falls die Antwort passt, aber unidiomatisch ist","note":"ein
  kurzer deutscher Satz"}`. `maxTokens` auf 120 erhöhen. Aufrufer in
  `players.jsx` anpassen (Phase 1). Fallback-Verhalten unverändert:
  `null` bei fehlendem Key/Netz/Parse-Fehler.
- Modellwahl: Gesprächszüge und Bewertung `claude-haiku-4-5` (schnell = wichtig
  für Gesprächsfluss), Debrief (Phase 5) ebenfalls Haiku; Modell-Konstante
  pro Funktion, nicht global, damit später einzeln umstellbar.
- **Tests** (`lib/claude.test.js`): `parseJson` (sauberes JSON, Code-Fence,
  Müll, leere Antwort); Prompt-Bau-Helfer, sofern pur.

**Abnahme:** bestehende Szenen funktionieren unverändert; `judgeAnswer` liefert
das neue Objekt; Netz-Mock-Tests grün.

### Phase 1 – Bestehende Szenen aufwerten (Feedback + frei sprechen + Varianten)

**Ziel:** Die geskripteten Szenen nutzen das neue strukturierte Feedback und
tragen die Stufen 2–3 der Treppe.

- **Feedback-Anzeige** in `DialogPlay` (`screens/players.jsx`): Wenn
  `judgeAnswer` `ok:true` mit `better` liefert → grüne Wertung + Hinweiszeile
  „Natürlicher: „…"" (mit `speak(better)`-Knopf 🔊). Bei `ok:false` die
  `note` statt des generischen Texts zeigen.
- **Frei-Modus konsequent:** Bei `scaffold: 'frei'` und aktivem
  `settings.speakDialogs` die Antwort-Optionen zunächst ausblenden;
  Mikro ist der primäre Weg, ein „Antworten zeigen"-Knopf blendet die
  Optionen ein (zählt wie `peeked`). So wird Stufe 2→4 vorbereitet.
- **NPC-Varianten (Stufe 3):** `data/dialogs.js`-Schema um optionales
  `npcAlt: ['…', '…']` je Turn erweitern (Bedeutung identisch zur `npc`-Zeile,
  gleiche `de`-Übersetzung). `DialogPlay` wählt bei bereits gemeisterter Szene
  (`alreadyDone`) zufällig aus `npc`/`npcAlt`. Für die ersten Szenen (d1–d5)
  je 1–2 Varianten schreiben – **nur mit Wörtern, die `DIALOG_LEX` kennt oder
  die dort ergänzt werden** (antippbar bleiben!).
  **Danach `npm run audio`** – der Collector in `scripts/generate-audio.mjs`
  muss `npcAlt`-Zeilen mit einsammeln (Collector erweitern, §4-Regel).
- **Doku:** `DIDAKTIK.md` um die Gesprächs-Treppe ergänzen.

**Abnahme:** Szene d2 zeigt bei frei gesprochener, sinnvoller, aber
abweichender Antwort die „Natürlicher: …"-Zeile; gemeisterte Szenen spielen
Varianten; Audio-Check (`npm run audio -- --check`) grün.

### Phase 2 – Datenmodell & Prompt-Bau fürs freie Gespräch

**Ziel:** Inhalte und reine Logik, noch ohne UI.

- **Neu `data/talks.js`:** `TALKS`-Liste, ein Eintrag pro freiem Gespräch,
  gekoppelt an eine Szene:

  ```js
  export const TALKS = [
    { id: 't-d2', sceneId: 'd2', title: 'Taxi – diesmal echt',
      emoji: 'taxi',
      goalDe: 'Lass dich zum Hotel fahren und bezahle.',
      persona: 'Freundliche Taxifahrerin mittleren Alters in Tokyo, geduldig, spricht langsam.',
      opener: 'こんにちは！どちらまで？',        // fester Text → Studio-MP3 möglich
      complication: 'Die Hauptstraße ist gesperrt; die Fahrerin schlägt einen kleinen Umweg vor und fragt, ob das in Ordnung ist.',
      goalCheck: 'Ziel erreicht, wenn der Fahrgast das Fahrtziel genannt, auf den Umweg reagiert und bezahlt/sich bedankt hat.',
      maxTurns: 12 },
    // … je gemeisterter Szene ein Talk (d1–d9), Komplikationen variieren
  ]
  ```

- **Neu `lib/talk.js`** (reine Logik, importiert `data/talks.js`,
  `lib/dialog.js`):
  - `talkGate(talk, progress)` → `{ open, reason }`: Szene `talk.sceneId` in
    `progress.completedDialogs`? (Key-/Mikro-Prüfung macht die UI, nicht die
    Logik-Schicht.)
  - `learnedVocabList(progress)` → sortierte Wortliste (Kana) aus
    `reiseVocab(progress.completedWordBlocks, progress.completedChapters)`
    plus `DIALOG_LEX`-Schlüssel der abgeschlossenen Szenen.
  - `buildTalkSystem(talk, vocabList)` → System-Prompt (deutsch formuliert,
    japanische Ausgabe verlangt). Muss kodieren: Rolle/Persona, Ziel &
    Komplikation, **Wortschatz-Whitelist** („verwende möglichst nur diese
    Wörter; höchstens 1 neues Wort pro Zug"), Kana-Orthografie mit
    Wortabständen wie die Lerninhalte (`ホテルまで おねがいします。`),
    max. 2 kurze Sätze + genau 1 Frage pro Zug, Recast-Regel, Nachfrage-Regel,
    Abschluss-Regel, und das **Antwort-Format**: nur JSON
    `{"npc":"…","de":"deutsche Übersetzung","done":false}` (`done:true` beim
    natürlichen Abschluss). Wichtig für Caching: Prompt vollständig
    deterministisch bauen (Vokabelliste sortiert, keine Zeitstempel).
  - `buildDebriefPrompt(talk, transcript)` für Phase 5.
- **Tests** (`lib/talk.test.js`): Gating; Vokabelliste deterministisch;
  System-Prompt enthält Whitelist/Format-Regeln; Debrief-Prompt enthält das
  Transkript.
- `ARCHITECTURE.md` §2/§5 um `data/talks.js`, `lib/talk.js` ergänzen.

**Abnahme:** `npm test` grün; noch keine UI-Änderung.

### Phase 3 – `TalkPlay`: der Gesprächs-Screen

**Ziel:** Die spielbare Gesprächsschleife – das Kernstück.

- **Neu `screens/talk.jsx`** (default-Export `TalkPlay({ talk, onComplete,
  onClose })`, lazy geladen wie die anderen Player; Einstieg s. u.).
  Zustandsmaschine (ein `phase`-State):

  ```
  intro → npcSpeaking → listening → thinking → npcSpeaking → … → closing → debrief
  ```

  - **intro:** Szenenkarte (Emoji, `goalDe`, Persona-einzeiler), Start-Knopf.
  - **npcSpeaking:** `speak(npcJp)`; Text-Anzeige je Scaffold-Modus
    (Setting `talkScaffold: 'gestuetzt' | 'hoerend' | 'immersiv'`, Default
    `'hoerend'`, in `SETTINGS_DEFAULTS` ergänzen). Übersetzung per Antippen
    (wie `TappableJp`, wo Lexikon-Treffer existieren; sonst schlichter
    DE-Toggle aus dem `de`-Feld).
  - **listening:** Mikro öffnet **automatisch**, sobald die Sprachausgabe
    endet (s. Phase 4: `speech.js`-Events). `startListening` wie in
    `DialogPlay`; Interim-Text dezent anzeigen. Erkannte Antwort →
    `thinking`. `no-speech` → freundlicher Hinweis + Mikro-Knopf zum erneuten
    Öffnen; zusätzlich immer ein Tipp-Feld als Fallback (Antwort tippen statt
    sprechen – Barrierefreiheit + Firefox).
  - **thinking:** `chatTurn` mit kompletter Historie (User-Turns = erkannter
    Text roh, wie gehört). Timeout/Netzfehler → Zug wiederholbar, Historie
    unversehrt; nach 2 Fehlversuchen Abbruch-Angebot mit Kurz-Debrief.
  - **Zug-Deckel:** nach `maxTurns` ohne `done:true` beendet die App den Zug
    selbst mit einer festen Verabschiedung (kein Endlos-Gespräch, Kostendeckel).
  - **Hilfe-Knopf** („何て言えばいい？"): eigener kleiner `chatTurn`-Aufruf mit
    Zusatz-Instruktion „nenne 1–2 mögliche Antworten des Fahrgasts als JSON
    {"hints":[{"jp":"…","de":"…"}]}" – Anzeige + 🔊. Zug zählt als „mit Hilfe".
  - **closing/debrief:** Phase 5; bis dahin: einfache Abschlusskarte mit
    Zug-Anzahl und XP (`awardXp`, neue Konstante `XP_PER_TALK` in `lib/xp.js`,
    großzügiger als `XP_PER_DIALOG`).
  - Verlassen der Szene → `stopListening()` + laufende Audio stoppen (Muster
    aus `DialogPlay` übernehmen).
- **Persistenz:** `useProgress` um `completedTalks: []` + `completeTalk(id,
  xp)` erweitern (Muster `completedDialogs`/`completeDialog`, `arrayUnion`).
- **Einstieg:** In `DialogHub` (`screens/ueben.jsx`) unter jeder gemeisterten
  Szene eine zweite Zeile „🗣 Frei sprechen" (offen per `talkGate` +
  `hasApiKey()` + `SPEECH_INPUT_SUPPORTED`; sonst ausgegraut mit dem
  `reason`-Text bzw. Hinweis auf Einstellungen/Key). Öffnet `TalkPlay`.
- **Kosten-/Latenz-Leitplanken:** `maxTokens` ~300 pro Zug; Historie wird nie
  gekürzt (bei 12 Zügen unkritisch); System-Prompt mit `cache_control`.

**Abnahme (manuell, Browser-Preview):** Vollständiges Taxi-Gespräch mit
Komplikation spielbar; Mikro öffnet automatisch nach NPC-Zeile; Hilfe-Knopf
liefert brauchbare Vorschläge; Abbruch jederzeit sauber; ohne Key ist die
Zeile ausgegraut, geskriptete Szenen unverändert.

### Phase 4 – Avatar & Bühne (Natürlichkeits-Schicht)

**Ziel:** Das Gespräch fühlt sich wie ein Gegenüber an, nicht wie ein Formular.

- **`lib/speech.js` um Sprech-Events erweitern:** kleines Pub/Sub
  (`onSpeechState(cb)` → `cb('start' | 'end')`), gefeuert in `playFile`
  (Audio `play`/`ended`/`onerror`) und in der System-TTS
  (`utterance.onstart/onend`). `TalkPlay` nutzt es für den Mikro-Autostart,
  der Avatar für die Mund-Animation. (Keine Wort-Synchronisation versuchen –
  `boundary`-Events sind auf Android unzuverlässig; einfacher Takt reicht.)
- **Neu `components/avatar.jsx`:** `Avatar({ mood, role, size })` –
  flaches SVG im Stil von `lib/scene.jsx` (gleiche Farbwelt aus `theme.js`,
  einfache Geometrie): Kopf, Augen, Mund, Oberkörper; `role` steuert
  Accessoire (Taxifahrer-Mütze, Kellner-Schürze, Verkäufer-Schild,
  Passant-Schal) über kleine SVG-Gruppen.
  - `mood='idle'`: sanftes Auf-und-ab (CSS-`@keyframes` in `index.css`),
    Blinzeln per zufälligem Intervall (`setInterval` 3–6 s, Augen 120 ms zu).
  - `mood='speaking'`: Mund wechselt offen/zu im ~120-ms-Takt
    (`setInterval`, nur solange `speaking`), leichtes Kopfnicken.
  - `mood='listening'`: Kopf leicht geneigt, pulsierender Ring ums Mikro-Icon.
  - `mood='thinking'`: Blick zur Seite, „…"-Blase.
  - `mood='happy'` (Ziel erreicht): geschlossene Lach-Augen, Wangen-Punkte.
- **Bühne:** Hinter dem Avatar ein flacher Kulissen-Streifen je Situation
  (Taxi-Innenraum, Rezeptionstresen, Café-Theke) – neue kleine Requisiten-
  Funktionen in `lib/scene.jsx` im Bestandsstil, wiederverwendet aus den
  vorhandenen Motiven wo möglich.
- `TalkPlay` verdrahtet `phase` → `mood`; die Chat-Historie läuft als dezente
  Sprechblasen-Liste unter der Bühne (letzte NPC-Zeile groß, Rest scrollbar).

**Abnahme:** Avatar blinzelt im Leerlauf, Mund bewegt sich exakt solange
gesprochen wird (Studio-MP3 wie System-TTS), Zustandswechsel sichtbar; kein
Layout-Sprung zwischen den Phasen.

### Phase 5 – Debrief & SRS-Anbindung (Lernschleife schließen)

**Ziel:** Aus jedem Gespräch entsteht dauerhafter Lernstoff.

- **Debrief-Aufruf** (`lib/talk.js: buildDebriefPrompt` + `chatTurn`):
  Eingabe = komplettes Transkript (inkl. „mit Hilfe"-Markierungen), Ausgabe-JSON:

  ```json
  { "lobDe": "…", 
    "korrekturen": [{ "gesagt": "…", "besser": "…", "warumDe": "…" }],
    "wendungen": [{ "jp": "…", "kana": "…", "de": "…" }] }
  ```

  Max. 3 Korrekturen, max. 2 Wendungen (Prompt erzwingt Knappheit – Debrief
  soll motivieren, nicht erschlagen).
- **Debrief-UI** in `TalkPlay`: Lob-Karte, Korrektur-Zeilen (gesagt →
  natürlicher, je 🔊), Wendungen mit Knopf „Als Lernkarte übernehmen".
- **SRS-Erweiterung (der invasivste Schritt – klein halten):**
  - `useProgress`: neues Map-Feld `extraPhrases: { [jp]: { kana, de, addedAt } }`
    + Schreibfunktion `addPhrase(jp, kana, de)` (merge-`setDoc`, Muster
    `bumpChapterStars`). Karten-Key = `jp`-String (konsistent zum bestehenden
    Schlüssel-Modell „Karte = japanischer Text").
  - `lib/srs.js: srsItemInfo` um einen Lookup in `extraPhrases` ergänzen
    (Anzeige: jp/kana vorne, de hinten, Typ-Label „Aus Gespräch"); die Karte
    nimmt damit automatisch am bestehenden `sm2`-/Fällig-Mechanismus teil.
  - **Test:** `srs.test.js`-Fall für eine `extraPhrases`-Karte.
- Dynamische Debrief-/NPC-Texte haben **keine** Studio-MP3s – `speak()` fällt
  automatisch auf System-TTS zurück (gewollt; Verbesserung s. Phase 6).

**Abnahme:** Nach einem Gespräch erscheinen Korrekturen + Wendungen; eine
übernommene Wendung taucht am Folgetag als fällige SRS-Karte auf.

### Phase 6 (optional) – Laufzeit-TTS mit Studio-Stimme

**Ziel:** Dynamische NPC-Zeilen klingen wie der Rest der App
(`ja-JP-Neural2-B` statt Geräte-Stimme).

- **Neu `lib/ttsCloud.js`:** Google-Cloud-TTS-REST (`text:synthesize`) per
  BYOK-Key (`GOOGLE_TTS_API_KEY`-Pendant im `localStorage`, Settings-Feld im
  Stil von `ApiKeySetting`); Stimme/Rate identisch zu
  `scripts/generate-audio.mjs` (Sätze Rate 1). Antwort-MP3 als Blob abspielen
  und im Cache-API-Bucket `tabi-audio-dyn` unter dem Text-Hash ablegen
  (Wiederholung = offline). Fehler/kein Key → System-TTS (bestehender Weg).
- `speak()` bekommt eine dritte Stufe: Manifest-MP3 → **Cloud-TTS (nur wenn
  Key & online)** → System-TTS. Innerhalb eines freien Gesprächs dadurch
  durchgehend dieselbe Stimme.
- Kosten: NPC-Text eines Übungsmonats (~36 k Zeichen) liegt im
  Gratis-Kontingent (1 Mio. Zeichen/Monat).

**Abnahme:** Mit Google-Key klingt der freie NPC wie die Studio-Audios; ohne
Key unverändert System-TTS; wiederholte Zeilen kommen aus dem Cache.

### Phase 7 – Feinschliff & Verzahnung

- **Settings** (`screens/settings.jsx`): `talkScaffold`-Wahl (3 Modi),
  Hinweistexte zu Key/Mikro-Voraussetzungen an der ausgegrauten Stufe.
- **Reise-Integration:** `data/path.js` um `{ type:'talk', id }`-Stationen
  hinter den zugehörigen Szenen erweitern (+ `lib/path.js: isNodeDone` /
  `pathNodeMeta`-Fälle), damit die Treppe auch im roten Faden auftaucht –
  erst wenn TalkPlay stabil ist.
- **Fortschritt:** `fortschritt.jsx` um Zähler „Freie Gespräche" ergänzen.
- **Doku-Schlusspflege:** `ARCHITECTURE.md` (§1 Schichten, §2 Karte, §3
  Mechaniken, §4 Sprech-Events/Cloud-TTS, §5 Talk-Schema), `DIDAKTIK.md`
  (Gesprächs-Treppe, NPC-Regeln, Debrief), `TODO.md` aufräumen.

---

## Risiken & Gegenmittel

| Risiko | Gegenmittel |
|---|---|
| Spracherkennung versteht Anfänger-Aussprache schlecht | Erkanntes immer anzeigen („Verstanden: …"), NPC-Nachfragen als natürlichen Teil des Gesprächs framen, Tipp-Feld als Fallback, nie stumm scheitern |
| Modell bricht Wortschatz-Whitelist / JSON-Format | Defensiver Parser (Phase 0), Format-Fehler → ein stiller Retry, dann Roh-Text als NPC-Zeile behandeln; Whitelist ist „möglichst", kein Hard-Fail |
| Latenz zerstört Gesprächsgefühl | Haiku (schnell), `thinking`-Avatar überbrückt, `maxTokens` klein, Caching hält Input klein |
| Kosten laufen weg | Zug-Deckel (12), `maxTokens` 300, Caching; grobe Erwartung ~2 $/Monat bei 20 min/Tag |
| Stimmen-Bruch (Studio-MP3 ↔ Geräte-TTS) im selben Gespräch | Opener trotzdem dynamisch sprechen lassen ODER Phase 6 vorziehen; innerhalb eines Gesprächs immer nur EINE Quelle verwenden |
| `extraPhrases` kollidiert mit bestehenden Karten-Keys | `addPhrase` prüft, ob der Key schon als Wort/Kana/Kapitel-Karte existiert → dann nicht doppelt anlegen, nur Hinweis „kennst du schon" |

## Reihenfolge & Aufwand (grob)

| Phase | Inhalt | Aufwand |
|---|---|---|
| 0 | Claude-Client: Historie, JSON, Caching, judgeAnswer-Upgrade | klein |
| 1 | Szenen-Upgrade: Feedback, Frei-Modus, Varianten (+Audio) | klein–mittel |
| 2 | Datenmodell + Prompt-Bau + Tests | mittel |
| 3 | TalkPlay-Gesprächsschleife | groß (Kern) |
| 4 | Avatar + Bühne + Sprech-Events | mittel |
| 5 | Debrief + SRS-Anbindung | mittel |
| 6 | Laufzeit-TTS (optional) | klein–mittel |
| 7 | Settings, Pfad-Integration, Doku | klein |

Empfohlene Schnitte für Releases: nach Phase 1 (sofort spürbar), nach
Phase 4 (erstes vollwertiges freies Gespräch mit Avatar), nach Phase 5
(komplette Lernschleife).

---

## Umsetzungs-Notiz (was beim Bauen anders entschieden wurde)

Alle Phasen sind umgesetzt. An vier Stellen weicht der Bau bewusst vom Plan ab –
jeweils, weil die geplante Lösung ein Problem gehabt hätte:

1. **Keine `npcAlt`-Varianten (Stufe 3) – stattdessen mitwachsende Hilfe-Stufe.**
   Varianten wären neue FESTE Sprechtexte gewesen und hätten Studio-MP3s
   gebraucht (`npm run audio`, Google-Key). Ohne Generierung hätten ausgerechnet
   die Varianten mit der Geräte-Stimme geklungen – mitten in einer Szene, in der
   alles andere Studio-Audio ist. Stufe 3 kommt jetzt ohne neues Audio aus:
   Eine bereits gemeisterte Szene läuft automatisch eine Hilfe-Stufe schwerer
   (`HARDER_SCAFFOLD`), und auf der freien Stufe sind die Antwortmöglichkeiten
   zunächst verdeckt. Gegen das Auswendiglernen wirkt vor allem Stufe 4.

2. **Der Opener des freien Gesprächs wird ebenfalls von der KI erzeugt.**
   Ein fest hinterlegter Opener hätte ein Studio-MP3 gehabt und wäre der einzige
   Satz mit anderer Stimme gewesen (der Rest entsteht ja zur Laufzeit). Jetzt
   kommt jede Zeile eines Gesprächs aus derselben Quelle – und die Begrüßung
   fällt außerdem jedes Mal etwas anders aus.

3. **Freie Gespräche sind KEINE Pfad-Stationen (Phase 7).** Der Reise-Pfad ist
   streng sequenziell: eine Station, die einen API-Key voraussetzt, hätte ohne
   Key die ganze Reise blockiert. Der Einstieg liegt stattdessen im
   Gesprächspfad (Üben → Rollenspiel, direkt unter der jeweiligen Szene) und
   zusätzlich auf dem Abschluss-Bildschirm einer gerade gemeisterten Szene –
   der beste Moment, solange die Situation noch frisch ist.

4. **Phase 6 (Laufzeit-TTS) wurde mitgebaut statt optional gelassen**, weil
   durch (1) und (2) alle Gesprächssätze dynamisch sind. Mit eigenem
   Google-Key klingt das Gespräch nach derselben Studio-Stimme wie der Rest der
   App, ohne Key nach der Geräte-Stimme – innerhalb eines Gesprächs aber immer
   einheitlich.

**Beim Testen gefunden und behoben:** Die async-Abläufe im Gesprächs-Screen
lasen den Verlauf aus dem `turns`-State ihrer Render-Schließung – der ist dort
veraltet. Folge: Die Nachbesprechung bekam ein unvollständiges Protokoll und
fiel bei kurzen Gesprächen ganz aus. Der Verlauf läuft jetzt zusätzlich in
`turnsRef` mit (siehe `ARCHITECTURE.md` §3, „Zustands-Falle").
