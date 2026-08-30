# Tabi – Offene Aufgaben

Backlog der noch zu programmierenden bzw. zu überarbeitenden Features.

## Erledigt (zuletzt)

- [x] **Sanfter Einstieg in die Gespräche** – „Ins kalte Wasser geworfen" hatte
      eine konkrete Ursache: Eine Szene begann mit dem Ziel auf Deutsch, dann
      sprach sofort der NPC – die nötigen Sätze hatte man als GANZEN Satz nie
      geübt. Neu ist Stufe 0 (`SceneWarmup`): die Sätze erst hören und antippen,
      dann einmal abfragen; wer sie nicht erkennt, bekommt sie nochmal (das ist
      zugleich die Festigungs-Bremse). Dafür haben alle 29 Antwortsätze jetzt
      eine deutsche Übersetzung (`answerDe`). Dazu die fehlende Sprosse zum
      freien Gespräch: Der ERSTE Durchgang einer Situation läuft geradlinig und
      blendet zu jedem Zug Antwort-Vorschläge ein; ab dem zweiten Mal fällt das
      Netz weg und die geheime Wendung kommt (`settings.talkGuide`).
- [x] **„Testen" meldete ungültige Keys, obwohl sie funktionierten** – Zwei
      Ursachen: (a) Getestet wurde der Inhalt des Eingabefelds, nicht der
      gespeicherte Key – ein Passwort-Manager füllt `type="password"`-Felder
      gern selbst. Jetzt wird immer der GESPEICHERTE Key geprüft (der, den die
      App auch benutzt), und die Felder sind gegen Autofill gesperrt.
      (b) Jeder Fehler wurde zu „Key ungültig oder keine Verbindung"
      eingedampft. Jetzt steht die Meldung des Dienstes da – bei Google z. B.
      „API not enabled" oder die Referrer-Sperre des Keys.

- [x] **Natürliche Gesprächsführung: freies KI-Gespräch mit Avatar** – Oberste
      Stufe der neuen „Gesprächs-Treppe" (`DIDAKTIK.md`): Zu jeder geskripteten
      Szene gibt es ein freies Gegenstück (`data/talks.js`), in dem eine KI den
      Gesprächspartner spielt – begrenzt auf den gelernten Wortschatz und mit
      einer geheimen Wendung, die das auswendig gelernte Skript unbrauchbar
      macht. Mikrofon öffnet von selbst, gezeichneter Avatar mit Stimmungen
      (spricht/hört zu/denkt/freut sich), Hilfe-Knopf, Zug-Deckel, danach eine
      Nachbesprechung, deren Wendungen per Knopf zu SRS-Karten werden.
      Geskriptete Szenen wurden mitgezogen: strukturiertes Feedback mit
      „Natürlicher: …", verdeckte Optionen auf der freien Stufe, und beim
      Wiederholen automatisch eine Hilfe-Stufe schwerer.
      Voraussetzung: eigener Anthropic-Key (Einstellungen); optional ein
      Google-TTS-Key, damit auch die frei erzeugten Sätze mit der Studio-Stimme
      klingen. Ohne Keys verhält sich die App wie vorher.
      Plan & Begründungen: `PLAN-FREIES-GESPRAECH.md`.

- [x] **Handy sprach nur mit Geräte-Stimme statt Studio-MP3s** – Zwei Ursachen:
      (a) `audio/manifest.json` war im SW-Precache und damit an den (veralteten)
      Service-Worker-Stand des Geräts gepinnt; nach der Raten-Umstellung zeigte
      das alte Manifest auf gelöschte Dateien → 404 → System-TTS für alle
      Wörter. Fix: Manifest aus dem Precache (`globIgnores`) + `NetworkFirst`.
      (b) Die `urlPattern`-Funktionen der runtimeCaching-Regeln referenzierten
      `BASE` aus der vite.config – im Worker undefiniert → `ReferenceError` →
      auch der MP3-Offline-Cache (`tabi-audio`) hat nie funktioniert. Fix:
      Matcher self-contained (`self.location.origin`). Beides im Preview-Build
      laufzeit-verifiziert (beide Caches werden jetzt angelegt und befüllt).
- [x] **„hito" klang wie „Sto"** – Ursache: Google Neural2 entstimmlicht bei
      Normaltempo (korrektes Tokyo-Japanisch) i/u zwischen stimmlosen
      Konsonanten (ひと → [çi̥to]). Fix: Zitierformen (Einzelwörter, Kana,
      Kacheln) werden mit Rate 0.8 generiert → Vokal wieder hörbar; Sätze
      bleiben natürlich bei Rate 1. Details `ARCHITECTURE.md` §4.
- [x] **Mehr Satzabfragen + Tipp-Modus** – Pro Kapitel c3–c12 je 2 neue Satzbau-
      Aufgaben (alle audit-geprüft, nur bereits eingeführter Stoff). `BuildStep` hat
      einen `typed`-Modus (Tastatur-Eingabe); der Kapitel-Player schaltet ihn pro
      Satz ein, sobald dessen Vokabeln ≥4 Sterne (Stufe „Gefestigt") haben
      (`shouldTypeSentence`). Audit-Skript auf die neue Modulstruktur portiert +
      prüft jetzt auch Satzbau-Kacheln.

## Thema Reise

- [ ] **Geschichte fortführen** – Die Geschichte soll nicht am Gipfel enden. Den
      weiteren Verlauf logisch aufbauen. *(In Arbeit: Tokyo-Bogen c7–c12 nach dem
      Gipfel ergänzt – Ankunft, Restaurant, Konbini, U-Bahn, Schilder/Toiletten,
      Tempel. Der Pfad geht über den Gipfel hinaus weiter. Weitere Kapitel jederzeit.)*
- [ ] **Tourismus-Orientierung** – Die Fortführung der Geschichte daran ausrichten,
      was man als Tourist in Japan am ehesten braucht. *(c7–c12 decken die
      häufigsten Touristen-Situationen ab: ankommen, essen, einkaufen, fahren,
      Schilder/Toiletten lesen, Sehenswürdigkeiten.)*
- [ ] **Neue Inhalte einführen** – Immer wieder neue Wörter und neue Grammatik
      einführen. *(c8–c12: 食/大/小/上/下/男/女/中/寺 + レストラン/コンビニ/トイレ/
      カメラ; Grammatik 〜たいです, 〜があります, 〜から〜まで, 〜の中, 〜ましょう.)*
- [x] **Kanji-Herkunft zeigen** – Wenn neue Wörter eingeführt werden, zeigen, woher
      das Kanji kommt: welche Radikale es benutzt, ob es ein eigenes Radikal ist
      oder ein Piktogramm. *(Erledigt: `KANJI_ORIGIN`-Datenbank + `KanjiOrigin`-
      Komponente in Reise-Einführung (IntroStep) und Vokabel-Detail; deckt alle 28
      aktuell eingeführten Kanji ab. Neue Kanji brauchen je einen Eintrag.)*
- [x] **Beispielsätze begrenzen** – In Beispielsätzen nur Grammatik und Wörter
      verwenden, die schon einmal dran kamen. *(Audit-Werkzeug `scripts/
      audit-examples.mjs` erstellt. Strategie „inline akzeptieren + Ausreißer
      fixen": die 3 klaren Fälle behoben (g6 ohne を, c5 山 statt 家, g9 猫の目 statt
      日本) → 35 → 24 Funde. Die verbleibenden sind bewusst akzeptiert: Grammatik-/
      Wortlektionen führen ihre Beispielwörter antippbar selbst ein, da Grammatik
      vor dem Vokabular gelehrt wird. Audit-Tool bleibt für neue Inhalte.)*
- [x] **Multiple-Choice randomisieren** – Bei Multiple-Choice-Antworten die richtige
      Antwort zufällig verteilen; nicht immer die erste Auswahlmöglichkeit darf
      richtig sein. *(Erledigt: Optionen werden in GrammarExercise, ChoiceStep und
      RolePlay-Dialog pro Frage stabil gemischt.)*

## Thema Üben – Rollenspiel

- [x] **Freischaltung an Lernfortschritt koppeln** – Rollenspiel-Lektionen erst
      freischalten, wenn die jeweiligen Vokabeln und die Grammatik dazu gelernt
      wurden, d. h. in der Reise schon einmal dran kamen. *(Erledigt: `dialogGate`
      leitet Vokabel-/Grammatik-Bedarf aus den Antworten ab und prüft gegen das,
      was die Reise lehrt. Strikt, aber selbst-nachziehend – Wörter, die die Reise
      noch nicht lehrt, sperren nicht, greifen aber automatisch, sobald sie in der
      Reise eingeführt werden. Pfad-Reihenfolge bleibt zusätzlich erhalten.)*

## Beobachtungen aus der Architektur-Durchsicht (2026-07-19)

Kleinere Inkonsistenzen, gefunden beim vollständigen Code-Review — kein akuter
Handlungsbedarf, aber beim nächsten Anfassen der jeweiligen Stelle mit beheben:

- [ ] **g23 doppelt einsortiert** – `GRAMMAR_ORDER` (grammar.js) platziert g23
      (Zähleinheiten) direkt nach g10, im realen `PATH` kommt es aber erst in
      Welt 東京・五. Bibliothek-Sortierung und Freischalt-Reihenfolge divergieren.
- [ ] **`tokenGrammarId` deckt へ nicht ab** (lib/dialog.js) – die Richtungs-
      partikel wird nicht auf ihr Grammatik-Thema gemappt, das Dialog-Gating
      prüft sie daher nicht. Das Regex-Mapping auf dem `b`-Feld ist generell
      fragil.
- [ ] **`speak(o)` spricht rohe Antwortoptionen** (players.jsx, Dialog) – ohne
      Lesungs-Auflösung wie bei `speakItem`/`speakTokens`. Solange Studio-MP3s
      existieren unkritisch (der Generator kennt dieselben Texte), aber der
      System-TTS-Fallback könnte Kanji fehllesen.
- [ ] **`dueKana` heißt irreführend** (useProgress.js) – filtert alle gelernten
      Items (Kana + Wort-Kanji + Kapitel-Vokabeln), nicht nur Kana. Bei
      Gelegenheit in z. B. `dueItems` umbenennen.
- [ ] **Kommentar-Leichen in players.jsx** – Kommentar über `BlockCourse` passt
      nicht zur Funktion; ein Kommentar dokumentiert entfernte
      `BlockPath`/`GrammarPath`.
