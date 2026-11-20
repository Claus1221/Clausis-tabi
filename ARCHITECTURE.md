# Tabi – Architektur & Struktur

> **Lebende Doku.** Diese Datei ist die Karte der App. **Bei jeder strukturellen
> Änderung mitpflegen** (neues Modul, verschobene Funktion, neues Datenschema).
> Sie ist bewusst so geschrieben, dass eine KI (oder ein neuer Mensch) die App
> versteht, ohne alle Dateien zu lesen.

Tabi (旅 „Reise") ist eine PWA zum Japanisch-Lernen für Reisende: Hiragana/Katakana,
Wörter, Grammatik, eine durchgehende „Reise" (Lernpfad mit Geschichts-Kapiteln),
Übungen (SRS + gemischt + Rollenspiel) und Fortschritt (XP, Level, Streak).
React + Vite, Daten in Firebase/Firestore, Deployment via GitHub Pages.

---

## 1. Schichten & Abhängigkeitsrichtung

Importe zeigen **immer nach unten**, nie nach oben oder seitwärts über Schichten
hinweg. So bleibt der Graph zyklenfrei und jede Datei ist isoliert verständlich.

```
main.jsx
  └─ AuthGate.jsx            (Login-Wand, Auth-Context)
       └─ LangGate.jsx       (Sprachwahl nach dem Login, Sprach-Context; lädt lazy;
            │                 zeigt Schreibfehler der Sprachwahl als Banner)
            ├─ TabiApp.jsx   (Japanisch. Orchestrator: Header, TabBar, ProgressCtx-Provider,
            │   │             lazy-geladene Screens)
            │   └─ screens/      (ein Vollbild je Tab; default-Export, lazy)
            │        └─ components/   (geteilte UI-Bausteine)
            │             └─ lib/     (reine Logik: SRS, Dialog-Gating, Szene-SVG …)
            │                  └─ data/    (reine Inhaltsdaten, kein React)
            │                       └─ theme.js · state/ · useProgress.js · kanaStrokes.js
            └─ ne/NepaliApp.jsx  (Nepali, Geschwister von TabiApp; eigene Schichten
                                  unter src/ne/, Importregel s. „Zweig ne/" in §2)
```

Faustregel beim Importieren aus `src/<schicht>/datei`:
`screens → components → lib → data`, dazu quer erlaubt: `theme`, `state/ProgressContext`,
`useProgress`, `kanaStrokes`, außerdem `useAuth` (aus `AuthGate.jsx`) und `useLang`
(aus `LangGate.jsx`) für Screens und Apps. Die Wurzel-Stores `accessStore.js` und
`useProfile.js` hängen an `firebase`, `lib/` und `useProgress.js` (`localDate`, `isDeniedError`). Eine Datei darf **nie** aus ihrer eigenen oder einer
höheren Schicht importieren (außer Geschwister in `lib/` mit klarer Richtung, s. u.).

---

## 2. Verzeichnis-Karte (was liegt wo)

### Wurzel `src/`
| Datei | Rolle |
|---|---|
| `main.jsx` | Mount-Punkt: `<AuthGate><LangGate/></AuthGate>`. |
| `AuthGate.jsx` | Google-Login, Freigabe-Prüfung (Admin aus `ADMIN_EMAILS`, sonst Dokument `allowed/<e-mail>` in Firestore; Zustände prüfen/Kein Zugang/Offline), `useAuth()`-Context mit `user`, `logout`, `isAdmin`, `recheckAccess`. |
| `firebase.js` | Firebase-Init; exportiert `auth`, `db`, `ADMIN_EMAILS`, `isConfigured`. `db` läuft mit persistentem Offline-Cache (IndexedDB, mehrere Tabs geteilt) – lesen/schreiben funktioniert auch offline, Sync folgt automatisch. |
| `useProgress.js` | **Firestore-Hook + Fortschritts-Domäne**: `useProgress(uid, lang = 'ja', opts)` (live-Daten der gewählten Sprache + Schreib-Funktionen + `saveError`; Dokumentpfad über `progressPath` aus `lib/lang.js`), `DEFAULT_PROGRESS`, `emptyProgress` (was `reset()` schreibt), `progressView` (zeigt beim Sprachwechsel nie den Stand der anderen Sprache), `afterListenerError`, `isDeniedError`, `localDateTime`, `addHours`, `isDue`, `LAPSE_RETRY_HOURS`, `computeStats`, `dueKana`, `sm2`, `getSettings`, `localDate`, `addDays`, `SETTINGS_DEFAULTS`, `SRS_STAGE_BOUNDS`. Fortschritts-Felder u. a. `completedTalks` (gemeisterte freie Gespräche) und `extraPhrases` (aus Gesprächen übernommene Wendungen; `addPhrase` legt sie an UND plant sie als SRS-Karte ein). Schreibvorgänge laufen über das interne `safeWrite` (try/catch → `saveError`), damit ein echter Schreibfehler (Firestore-Regel, Quota) sichtbar wird statt den Fortschritt still zu verlieren. Unit-Tests: `useProgress.test.js`. |
| `LangGate.jsx` | Nach dem Login: entscheidet per `useProfile`, welche App läuft. Neue Person ohne Lernstand → Auswahlbildschirm („Was möchtest du lernen?“), aber nur, wenn `selectableLangs(isAdmin)` mehr als eine Sprache enthält (derzeit nur der Admin); sonst wird die einzige wählbare Sprache still verwendet; sonst `TabiApp` bzw. `ne/NepaliApp` (beide `React.lazy`, `key={lang}`). Stellt `useLang()` = `{ lang, setLang, langs, error }` bereit. |
| `useProfile.js` | `useProfile(uid, isAdmin, onDenied)` → `{ lang, loading, setLang, error }`. Liest `users/{uid}/meta/profile` per `onSnapshot`, prüft einmalig per `getDoc`, ob `users/{uid}` existiert, und wendet `lib/lang.js: initialLang` an. Zeigt nie wegen eines langsamen oder fehlgeschlagenen Lesens die Auswahl. Nur `setLang` (ausdrückliche Wahl) schreibt `{ lang }`; der stille Standard nicht. Die Entscheidungstabelle steckt als reine Funktion in `lib/lang.js: resolveLang` (getestet); der Hook sammelt nur die Eingaben. Geräte-Hinweis: die aufgelöste Sprache steht in `localStorage` unter `tabi_lang_<uid>` und trägt nur, solange die Lesevorgänge noch laufen (Kaltstart ohne Netz); `setLang` lehnt nicht wählbare Sprachen ab. Dev-Bypass (kein `uid` oder keine `db`): Sprache aus `?lang=`, nur im Speicher. |
| `accessStore.js` | Freigabeliste in Firestore (`allowed/<e-mail>`): `watchAllowed` (Live-Liste, nach E-Mail sortiert), `addAllowed`, `removeAllowed`. Nur der Admin darf schreiben (Firestore-Regeln). |
| `kanaStrokes.js` | Generierte KanjiVG-Strichpfade: `HIRAGANA`, `KATAKANA`, `KANA_STROKES`, `STROKE_VIEWBOX`. (Generator: `scripts/gen-kana-strokes.mjs`.) |
| `theme.js` | `C` (Farb-Token) · `JP` (japanischer Font-Stack) · `NE` (Devanagari-Font-Stack). |
| `TabiApp.jsx` | Root-Orchestrator (≈120 Z.). Hält Tab-State, lädt Screens via `React.lazy`, stellt `ProgressCtx` bereit. |

### `ne/` — Zweig für Nepali (Yatra)
Alles Nepalische liegt unter `src/ne/` mit denselben Schichten wie oben.

| Datei | Rolle |
|---|---|
| `ne/NepaliApp.jsx` | Root der Nepali-App: Kopfzeile (Level, ⚙ mit 44 px; Sprachwechsel und Abmelden sind in die Einstellungen gewandert, weil die Kopfzeile bei 360 px dreizeilig umbrach), Speicherfehler-Banner, `ProgressCtx` für Sprache `ne` mit `settings: neSettings(progress)`, Tabs wie `TabiApp` (Reise, Lernen, Üben, Fortschritt + Einstellungen über ⚙; `TabBar` mit `NE_TABS` und Schrift `NE`). Alle fünf Screens lazy. Einplan-Effekt wie `TabiApp`: bei Änderung von `completedLessons`/`completedWordBlocks`/`completedGrammar`/`completedChapters`/`srs` → `scheduleNew(learnedItems(progress))` (idempotent; `completedDialogs` gehört bewusst nicht dazu – Szenen bringen keine Karten). `goToReview` springt mit `initialMode: 'srs'` in den Üben-Tab (Fortschritt → „jetzt wiederholen“). **Lade-Tor:** solange `loading` (aus `useProgress`, auch im Context) wahr ist, zeigt die Hülle statt JEDES Screens `ScreenFallback` (Kopfzeile bleibt) – kein Screen initialisiert Stapel/Runden aus dem leeren Standard, keine erledigte Lektion wirkt offen. `ScreenFallback` (auch Suspense-Platzhalter) bietet nach 4 s „Zu Japanisch wechseln“ und „Abmelden“ (44 px), damit beides nicht an einem hängenden lazy Chunk hängt. |
| `ne/lib/reviewQueue.js` | Reine Regeln einer Wiederholungsrunde (unveränderlicher Zustand): `startSession(deck, dueKeys)`, `rateCard(state, quality)` → `{ state, review }` (`review` = `{ key, quality }` für `reviewCard` oder `null`), `currentCard`, `isFinished`. „Nochmal“ (< 3) ans Ende; jede Karte höchstens einmal je Runde in den Plan, mit ihrer ersten Bewertung; nur beim Start fällige Karten; Runde endet bei leerer Warteschlange. Tests: `reviewQueue.test.js`. |
| `ne/lib/learned.js` | Eine Quelle für alle Stapel und Zähler (Gegenstück zu `lib/learned.js` + `srsItemInfo`): `learnedItems(progress)` → Karten-Schlüssel (NFC, ohne Doppel; erst die Zeichen abgeschlossener Schrift-Lektionen in Lektionsreihenfolge, dann die Wörter abgeschlossener Wortblöcke über `learnedWords` als `wordKey(dev)`, dann die intro-Wörter abgeschlossener Kapitel (`chapterWords`, Kapitel-Reihenfolge = Pfad-Reihenfolge) ebenfalls als `wordKey(dev)` – das Ziel `'goal'` in `completedChapters` fällt dabei weg –, dann je abgeschlossenem Grammatik-Thema `grammarKey(id)` in `GRAMMAR_ORDER`), `itemInfo(key)` → Zeichen `{ key, front, roman, de, kind: 'script', say, kindLabel }` (`front` = `shown`, `de` = Merkhilfe) bzw. für `w:`-Schlüssel Wort `{ key (mit Präfix), front: dev, roman, de, kind: 'word', say: dev, kindLabel: 'Wort', ex }` (`ex` = Beispielsatz; ein Kapitelwort holt Umschrift und Bedeutung aus `CHAPTER_WORD`, `ex: null`; ein unbekannter `w:`-Schlüssel zeigt den Text ohne Präfix, `ex: null`) bzw. für `g:`-Schlüssel `{ key, front: glyph, roman: '', de: title, kind: 'grammar', say: '', kindLabel: 'Grammatik', ex: null, summary }` (unbekanntes Thema: `front` = id ohne Präfix); alle Text-Felder Strings, nie `undefined`, auch für unbekannte Schlüssel. **Schlüssel-Regel:** Zeichen = der Text, Wörter = `w:` + Text (`wordKey(dev)`, exportiert; `WORD_PREFIX`), Grammatik = `g:` + id – so sind `छ` (Konsonant) und `w:छ` („sechs“) zwei Karten; `learned.test.js` prüft ohne Ausnahmeliste, dass kein Schlüssel aus zwei Quellen kommt. `srsEntry(progress, key)` (Lookup über `nfc`; findet auch einen Altbestand unter anderer Unicode-Form), `dueItems(progress)` (gelernt und `isDue`, ungeplant zählt als fällig – wie `dueKana`), dazu `KIND_LABEL` und `alone` (kombinierende Zeichen auf ◌) für die Anzeige. Tests: `learned.test.js` (inkl. zerlegte/zusammengesetzte Form → derselbe `srs`-Eintrag). |
| `ne/lib/settings.js` | `NE_SETTINGS_DEFAULTS` (`showRoman: true`) und `neSettings(progress)` = japanische `SETTINGS_DEFAULTS` + Nepali-Standards + Gespeichertes. Einzige Lesestelle für Einstellungen im Nepali-Zweig; `SETTINGS_DEFAULTS` selbst bleibt unverändert (Japanisch erbt keinen Schalter). Tests in `learned.test.js`. |
| `ne/lib/srs.js` | `SRS_RATINGS` (Nochmal 1 · Schwer 3 · Gut 4 · Leicht 5), `SRS_STAGES` (Grenzen aus `SRS_STAGE_BOUNDS`), `feedbackColor` – bewusst dieselben Werte wie `lib/srs.js`, das hier nicht importiert werden darf; bei Änderungen dort nachziehen. |
| `ne/components/sound.jsx` | Die einzige Fassung der Ton-Bausteine (Lektion, Lernen, Üben): `useSound()` (`null` = prüfen, dann `true`/`false` aus `soundAvailable`), `usePlayback()` (Token je Klick: nur die jüngste Wiedergabe setzt die „spricht…“-Anzeige zurück, Unmount bricht laufende Folgen über `playSequence` ab, kein State nach Unmount), `ListenButton({ text, sound, label, quiet, ariaLabel })` (`ariaLabel` für Knöpfe ohne sichtbaren Text, z. B. „Anhören: पानी“; prüfen → gesperrt; kein Ton → `NoSoundMark` bzw. mit `quiet` gar nichts; Ton → 44-px-Knopf über `usePlayback`), `NoSoundMark` (stummes 🔇, `aria-label` „kein Ton“), `NO_SOUND_HINT` (je Screen einmal ausgeschrieben). |
| `ne/screens/ueben.jsx` | Üben-Tab (default, `initialMode`/`onConsumeInitial` wie Japanisch): Fällig-Banner, **Wiederholen** (`SRSQuiz`: Front groß in `NE` → Aufdecken → bei Zeichen Umschrift, Zeichenart, Merkhilfe; bei Wörtern vorn die Umschrift nur mit `showRoman` und die Frage „Was bedeutet das?“, aufgedeckt Umschrift, Bedeutung und der Beispielsatz als `TappableSentence`; Anhören nur mit Ton → vier Bewertungen. **Grammatik-Karten** (`g:`) dagegen als EIN Lückensatz (`GrammarReview` → `GapDrill`, Übung über `pickDrill(topic, srsEntry, Math.random, avoid)` einmal beim Erscheinen gewählt; `avoid` = zuletzt gezeigte Frage dieser Karte, damit ein „Nochmal“ in derselben Runde eine andere Übung bringt); keine vier Knöpfe – richtig beim ersten Versuch = 4, falsch = 1 (`GRAMMAR_QUALITY`); Rundenregeln aus `lib/reviewQueue.js`, gerechnet auf einer Ref, damit ein Doppeltipp nicht doppelt schreibt), **Fleiß** (alle gelernten Karten, `freeSize`), **Erkennen** (nur Zeichen) aus einer Fragenquelle (`buildScriptQuiz` mit `settings.options`, `roundSize` Fragen): „Lesen“ (Zeichen → Lesung), „Finden“ (Lesung → Zeichen) und nur mit Ton „Hören“ (Ton → Zeichen, mit „Umschrift zeigen“ als Ausweg); ohne Ton ist „Hören“ sichtbar gesperrt mit Hinweis. **Gespräche:** Kachel „Szenen“ (geschafft / alle) → `DialogHub` aus `screens/dialog.jsx`. Kopfzeile `UebenHead` mit `closeSize={44}`; `UebenEmpty`/`UebenDone` geteilt. |
| `ne/screens/fortschritt.jsx` | Fortschritt-Tab (default, `onReview`): XP/Level/Streak, „Diese Woche“ (`weekSummary`; `kana` = Schriftzeichen), Level-Balken, XP-Verlauf (`periodBuckets`, Woche/Monat/Jahr), Karten nach Kenntnisstand (über `learnedItems` mit geplantem `srsEntry`) mit Fällig-Knopf, Stand von Schrift, Wörtern und Grammatik (gezählt je Art über `itemInfo(key).kind`: `script`, `word`, `grammar`; Stationen, Wortblöcke bzw. Themen; Wörter-Gesamtzahl = Wortblock-Wörter + `CHAPTER_WORD`, weil Kapitelwörter ebenfalls `word`-Karten sind). Noch keine Kapitel-Sterne/Abzeichen. |
| `ne/screens/settings.jsx` | Einstellungen (default, `onClose`): Sprache wechseln (nur bei mehreren wählbaren Sprachen), „Umschrift bei Wörtern und Sätzen“ an/aus (`showRoman`; wirkt erst mit Wörtern/Sätzen – bei Schriftzeichen steht die Umschrift überall immer), Tagesziel, Rundengröße, Antwortmöglichkeiten (− / + mit 44 px), Konto (Abmelden), Nepali-Lernstand zurücksetzen (`window.confirm`, nennt ausdrücklich: nur Nepali, Japanisch bleibt), `AdminUsers` nur für den Admin. Keine API-Keys (noch keine KI im Zweig). |
| `ne/screens/lernen.jsx` | Lernen-Tab als Bibliothek (default), Umschalter „Zeichen“ / „Wörter“ / „Grammatik“ (44 px). **Grammatik:** alle Themen in `GRAMMAR_ORDER` (Zeichen, Titel, Kurzbeschreibung; erledigte mit ✓, nicht erledigte mit grauer Zeichen-Kachel bei voll lesbarem Titel, „Kommt noch auf der Reise“ nur bei Themen, die weder erledigt noch die offene Station sind (`stationStates`); alles aufschlagbar – die Bibliothek hat keine Sperren); Antippen → `GrammarSheet` (`GrammarHead`, `GrammarExplain`, `GrammarExamples` aus `components/grammar.jsx`; keine Übungen, kein XP). **Wörter:** alle Blöcke frei einsehbar wie die japanische `WordLibrary` (✓ bei erledigtem Block), je Wort Devanagari, Umschrift nach `showRoman`, Bedeutung; Antippen → `WordSheet` (Umschrift immer, Bedeutung, Anhören nur mit Ton, Beispielsatz als `TappableSentence` mit Übersetzung). **Zeichen:** Zeichentafel nach Lektion (Umschrift immer unter dem Zeichen, unabhängig von `showRoman`; ✓ bei erledigter Lektion; ohne Ton einmal der ausgeschriebene Hinweis), Antippen → `LibSheet` als Overlay über der weiter gerenderten Tafel (Scroll-Position bleibt) mit großer Form, ◌-Form, Zeichenart, Umschrift (immer), Anhören/Hinweis, Merkhilfe und den Laut-Hinweisen, in denen das Zeichen vorkommt; eigener Eintrag „Laut-Hinweise“ mit allen `SCRIPT_NOTES` und Paaren. |
| `ne/data/path.js` | `NE_PATH`: der vollständige Lernpfad in verbindlicher Reihenfolge (Schema und Reihenfolge unten) – neun Welten mit Kapiteln, Szenen und dem Ziel als letzter Station; dazu `GOAL_ID` (`'goal'`, hier definiert, damit `lib/path.js` die Kapitel-Logik nicht laden muss). |
| `ne/data/chapters.js` | `CHAPTERS` (zehn Kapitel `nc1…nc10`, Schema unten), `CHAPTER_BY_ID`, `chapterWords(chapter)` (intro-Wörter, NFC), `CHAPTER_WORD` (`{ [dev]: { roman, de, chapter } }` aller intro-Wörter). Reine Daten, Nepali-Inhalt gegengelesen. Tests: `chapters.test.js` (Pflichtfelder je Art, Antwort unter den Optionen, Satzbau legbar, `alsoAccept` = Umstellungen, `romanFits`, Wortschatz Schritt für Schritt, keine Grammatik vorweg). |
| `ne/lib/chapters.js` | Reine Kapitel-Logik: `GOAL_ID` (aus `data/path.js` weitergereicht), `TASK_KINDS`/`isTask` (audio, dialog, gap, tf, build), `chapterSrsKeys(chapter)` (intro-Wörter als `wordKey`, ohne Doppel), `chapterStars(chapter, results)` – **Regel:** `results = { [Schritt-Index]: richtig? }` eines Durchgangs; kein Fehler → 3, höchstens zwei → 2, sonst 1; eine Aufgabe ohne Ergebnis zählt als Fehler –, `isBuildCorrect(step, tiles)` (gelegter Text in NFC = `answer` oder eine `alsoAccept`-Reihenfolge), `canCheckBuild(step, n)` (Prüfen erst, wenn genau `answer.length` Stücke liegen), `chapterReading(text)` (Umschrift eines Satzbau-Stücks/einer Lücken-Option: intro-Wörter und Tokens der Erzähl-Zeilen, sonst `readingOf`, Stamm + Anhängsel, mehrere Wörter Teil für Teil, unbekannt → `''`), `journeySummary(progress)` → `{ chars, words, grammar, chapters }` (über `learnedItems`/`itemInfo`, Kapitel über `CHAPTERS`). Tests: `chapters.test.js` (inkl. jede echte Satzbau-/Lücken-Option hat eine `romanFits`-Umschrift). |
| `ne/components/BuildStep.jsx` | `BuildStep({ step, sound, onDone, nextLabel })`: Satzbau. Deutsche Bedeutung oben, Stücke (einmal gemischt, über den Index geführt – gleiche Stücke stören nicht) antippen = anhängen, gelegtes Stück antippen = zurücknehmen, „↶ Zurück“ nimmt das letzte; „Prüfen“ einmal über `isBuildCorrect`, erst freigegeben, wenn so viele Stücke liegen wie die Antwort hat (`canCheckBuild` – mit Ablenkern sähe man sonst nicht, wann der Satz vollständig ist); danach der Satz mit Umschrift (nach Schalter), „Auch richtig: …“ für `alsoAccept`, Anhören nur mit Ton; „Weiter“ ruft `onDone(richtig?)` genau einmal. Stücke mit Umschrift (`chapterReading`, nach Schalter), alle Knöpfe ≥ 44 px. |
| `ne/screens/chapter.jsx` | Eigene Datei (players.jsx wäre sonst > 1000 Zeilen); `LessonFrame`/`useFinishOnce` aus players.jsx. `ChapterPlayer({ chapter, alreadyDone, onComplete(sterne), onClose })`: Einleitung (Titel, Ort, Zusammenfassung, ohne Ton einmal `NO_SOUND_HINT`) → Schritte → Abschluss (Sterne von 3, XP oder „schon abgeschlossen“, neue Wörter). **story:** deutscher Text, Nepali-Zeile als `TappableSentence` (Tipp-Hinweis an der ersten). **intro:** `NeText` groß, Bedeutung, Notiz, Anhören nur mit Ton. **audio:** Ton beim Zeigen geprüft (`soundAvailable`) – mit Ton einmal vorgelesen plus „Nichts gehört? Satz zeigen“, ohne Ton steht `say` sofort geschrieben da und die Frage heißt „Was steht da?“ (Leseaufgabe); deutsche Optionen. **dialog:** Zeile mit Umschrift (nach Schalter), Nepali-Optionen mit `optionsMeta.roman`; Übersetzung der Zeile und Bedeutung JEDER Option erst nach dem Antippen. **gap:** `GapDrill` mit `readOption = chapterReading`. **tf:** Satz (Übersetzung erst NACH der Antwort – sie verriete die Lösung), Aussage, „Stimmt“/„Stimmt nicht“. **build:** `BuildStep`. Jede Aufgabe einmal beantwortet, eigener Weiter-Knopf (Fußleiste dann aus), Ergebnis je Schritt-Index → `chapterStars`. `ChapterDiary({ onClose })`: Erzählung aller abgeschlossenen Kapitel am Stück, Nepali-Zeilen antippbar. `GoalScreen({ alreadyDone, onComplete, onClose })`: Schluss-Bildschirm „Annapurna-Blick erreicht“ mit `journeySummary` (Zeichen, Wörter, Grammatik-Themen, Kapitel), Abschluss über `useFinishOnce`. |
| `ne/data/dialogs.js` | `DIALOGS` (sechs Szenen, Array-Reihenfolge = Pfad-Reihenfolge nd1, nd3, nd4, nd5, nd2, nd6; Schema unten), `DIALOG_BY_ID`, `dialogVocab(dialog)` (antippbare Wörter aus NPC-Zeilen und Antworten, NFC). Tokens entstehen beim Laden aus einem Lexikon in der Datei – ein fehlendes Wort bricht sofort ab. Nepali-Inhalt gegengelesen. Tests: `dialogs.test.js` (6 Szenen, 5–8 Züge, drei Optionen mit genau einer Antwort, `optionsMeta` vollständig, `romanFits`, Tokens ergeben Satz und Umschrift, Wortschatz nur aus Blöcken/Themen vor der Szene + Funktionswörter + `newPhrases`, auch in falschen Optionen). |
| `ne/lib/dialog.js` | Reine Szenen-Logik (Gegenstück zu `lib/dialog.js`): `knownWords(progress)` (bekannt laut Lernstand – dieselbe Regel wie das Wort-Audit: Funktionswörter, Wörter erledigter Blöcke samt Teilen, Formen/neue Wörter erledigter Themen, intro-Wörter erledigter Kapitel), `answerWords(dialog)` (antippbare Wörter der Antwortsätze), `dialogGate(dialog, progress)` → `{ open, missing }` – **Regel:** offen, wenn jedes Antwort-Wort bekannt ist (`isKnownWord`; die eigenen `newPhrases` zählen, das Aufwärmen lehrt sie) oder die Szene schon gespielt ist; nur für die Übersicht im Üben, auf der Reise öffnet der Pfad –, `phrasesFromTurns(turns)` → `{ dev, roman, de, tokens }[]` (Antwortsätze, NFC, ohne Doppel, Spielreihenfolge), `warmupPhrases(dialog)` (erst `newPhrases` ohne Tokens, dann die Antwortsätze), `warmupOptions(list, i, rand, count = 3)` (richtige + andere Wendungen der Szene, nie gleicher Text oder gleiche Bedeutung), Aufwärm-Runde `startWarmup(n)`/`answerWarmup(state, ok)`/`warmupDone` (falsch → ans Ende, nie Sperre), `firstTryScore(results, n)`. Tests: `dialog.test.js`. |
| `ne/screens/dialog.jsx` | `DialogPlay({ dialog, alreadyDone, onComplete, onClose })` im `LessonFrame`: Einleitung (Emoji, Titel, Ort, `sceneDe`, Rolle; ohne Ton einmal `NO_SOUND_HINT`; bei `alreadyDone` „Direkt in die Szene“) → Aufwärmen: alle Sätze auf einen Blick (neue Wendungen zuerst, „NEU“; Antwortsätze als `TappableSentence`, Bedeutung, Anhören nur mit Ton) → je Wendung eine Abfrage „Wie sagst du das?“ (deutsche Bedeutung → drei Nepali-Wendungen, `warmupOptions`; falsch → kommt am Ende nochmal, „🔁 nochmal“) → Szene Zug für Zug (`TurnStep`: NPC-Zeile IMMER geschrieben als `TappableSentence`, Satz-Anhören nur mit Ton; leere NPC-Zeile = Regieanweisung `de` sofort sichtbar; Optionen gemischt, Umschrift nur mit Schalter; falsch → die Option rot mit IHRER Bedeutung und „passt hier nicht“, gesperrt, nochmal versuchen; richtig → Übersetzung der NPC-Zeile und Bedeutung aller Optionen, Antwort anhören nur mit Ton, Weiter) → Abschluss (Anzahl beim ersten Versuch richtig, `XP_PER_DIALOG` oder „schon abgeschlossen“, die Antwortsätze). Abschluss über `useFinishOnce`; vergibt selbst nichts. `DialogHub({ onClose })`: Szenen-Übersicht im Üben in Pfad-Reihenfolge – offen, wenn gespielt oder `dialogGate` offen (auch außer der Reihe), sonst gesperrt mit bis zu fünf fehlenden Wörtern; Abschluss bucht `completeDialog(id, XP_PER_DIALOG, { scenes: 1 })` nur beim ersten Mal (`wasDone` beim Öffnen gemerkt). Ohne Ton ist alles spielbar – es gibt keine Hör-Aufgabe. |
| `ne/lib/path.js` | Reine Pfad-Logik: `isNodeDone(node, progress)` (Typ → Fortschritts-Feld, unbekannter Typ → `false`; das Ziel zählt über `'goal'` in `completedChapters`), `nodeMeta(node)` → `{ title, glyph }` oder `null` (Überschrift oder Station ohne heutige Daten; Wort-Station: Blocktitel und Thema-Emoji, `null` für einen Block, den `words.js` nicht kennt; Grammatik-Station: Titel und Zeichen des Themas; Kapitel: Kapiteltitel und 📖; Szene: Szenentitel und ihr Emoji (🚕, 🍛 …); Ziel (nur id `goal`): „Ziel: Annapurna-Blick“ und 🏔️ mit Emoji-Variante U+FE0F – ohne sie zeichnen manche Schriften den Berg schwarz), `nextOpenIndex(path, progress)` (erste nicht erledigte Station mit Daten, sonst `path.length` – eine Station ohne Daten ist weder erledigt noch offen und hält die dahinter nicht auf), `stationStates(path, progress)` → je Eintrag `'done' \| 'current' \| 'locked' \| null`, `wordsBefore(path, blocks, id)` (Wörter der Wort-Stationen vor dem Block, Pfad-Reihenfolge; Ablenker-Vorrat des Wort-Quiz). Tests: `path.test.js`. |
| `ne/lib/scriptQuiz.js` | Reine Logik der Schrift-Lektion und der Erkennen-Übungen: `buildScriptQuiz(chars, rand, optionCount = 3)` (je lesbares Zeichen eine Frage mit `optionCount` Optionen, dazu `optionChars[i]` = Zeichen zur Option `i` – so dient dieselbe Frage auch umgekehrt „Lesung → Zeichen“, eindeutig, weil die Lesungen verschieden sind; entdoppelt über `roman`, nie zwei gleich lautende Optionen; Halant/Danda mit Klammer-`roman` fehlen im Lese-Quiz; Ablenker zuerst aus der Lektion, dann gleiche Zeichenart, dann alle; Frage je Art: Lesung / Laut am क / Zahl), `notesForLesson(id)` (Laut-Hinweise, deren Paar ein Zeichen dieser Lektion enthält und deren anderes Zeichen hier oder früher gelernt wurde → dental/retroflex erst bei der त-Reihe), `isReadable`, `shuffle(arr, rand)` (Fisher-Yates). Liest alles aus `SCRIPT_DATA`, nichts fest verdrahtet. Tests: `scriptQuiz.test.js`. |
| `ne/lib/scene.jsx` | Kulissen der Karte als flache SVG-Formen, Bauweise wie `lib/scene.jsx` (ein Himmel-Verlauf, ferner/naher Rücken je Band mit weichen Nähten, Requisiten am Talrand): `buildBackdrop(bands)` mit Themen `tal` (Stupa, Gebetsfahnen, Ziegelhäuser), `huegel` (Terrassenfelder, Bauernhäuser, ferne Gipfel), `see` (See mit Booten, Schilf), `berge` (Himalaya-Gipfel, Chörten, Gebetsfahnen); dazu `startFlags`, `roadPath`, `STATE_PALETTE`. |
| `ne/components/TraceCanvas.jsx` | `TraceCanvas({ char })` (default): 220-px-Mal-Fläche, Zeichen blass dahinter (Schrift `NE`), Pointer-Events (Maus, Finger, Stift; nur der Zeiger, der den Strich begann, zählt – ein zweiter Finger setzt ihn weder fort noch beendet ihn; `setPointerCapture`, Zwischenpunkte über `getCoalescedEvents`), `devicePixelRatio`-scharf, `touch-action: none` plus nicht-passiver Touch-Listener gegen Seiten-Scrollen; Knopf „Löschen“ (44 px). |
| `ne/screens/players.jsx` | `ScriptLesson({ lesson, alreadyDone, onComplete, onClose })`: Einleitung → je Zeichen „zeigen“ (Art, groß `shown`, kombinierende Zeichen zusätzlich allein auf ◌, Umschrift, Anhören, Merkhilfe) und „nachmalen“ → passende Laut-Hinweise mit Hörvergleich der Paare → Quiz (drei Optionen, bei Fehler die Merkhilfe) → Abschluss mit `XP_PER_KANA` je Zeichen. Ton: `soundAvailable()` einmal je Lektion; ohne Ton kein Anhören-Knopf – der Hinweis steht einmal ausgeschrieben in der Einleitung, in den Schritten nur ein stummes 🔇 („kein Ton“); die Lektion ist still voll benutzbar. Ton-Bausteine (`useSound`, `usePlayback`, `ListenButton`, `NoSoundMark`, `NO_SOUND_HINT`) aus `components/sound.jsx`, `KIND_LABEL`/`alone` aus `lib/learned.js` – keine eigenen Kopien. Die Umschrift steht in Schrift-Lektionen **immer** (unabhängig von `settings.showRoman`, der erst für Wörter und Sätze gilt) – die Lesung ist das Lernziel. „Lektion abschließen“: der erste Tipp sperrt (Ref) und ruft **sofort** `onComplete` (bucht); nur das Schließen (`onClose`) kommt nach ~350 ms, damit ein Doppeltipp nicht auf der TabBar landet. Unmount in der Spanne verliert nichts und bucht nichts doppelt. Vergibt selbst nichts. **Abschluss-Muster** und Rahmen sind geteilt: `useFinishOnce(onComplete, onClose)` → `[finishing, finish]` (Ref-Sperre, sofort buchen, nach 350 ms schließen) und `LessonFrame({ title, step, total, onClose, footer })` (✕ 44 px, Balken, Zähler; `footer = null` beim Quiz) – jede weitere Lektionsart nutzt beide. `WordBlock({ block, alreadyDone, onComplete, onClose })`: Einleitung (Thema, Wörter, ohne Ton einmal `NO_SOUND_HINT`) → je Wort `WordStep` (Devanagari groß über `NeText`, Umschrift nach `showRoman`, Bedeutung, Anhören nur mit Ton, Beispielsatz als `TappableSentence` mit Übersetzung) → Quiz `WordQuizStep` (Fragen aus `lib/wordQuiz.js`, beim Betreten einmal gebaut; Hörfragen nur bei `sound === true`; je Hörfrage wird `soundAvailable()` beim Zeigen neu geprüft – ohne Ton steht sofort die Bedeutung da und die Frage wird zu „Bedeutung → Nepali“, mit Ton gemeinsamer `ListenButton` plus „Nichts gehört? Bedeutung zeigen“ – nie die Umschrift, nie ein toter Knopf; Nepali-Optionen zweispaltig in Devanagari, Umschrift nur nach Schalter; Bedeutungs-Optionen einspaltig; nach der Antwort das ganze Wort) → Abschluss mit `XP_PER_WORD` je Wort. `GrammarLesson({ topic, alreadyDone, onComplete, onClose })`: Erklärung (`GrammarHead` + `GrammarExplain`: Abschnitte des `body`, die neuen Wörter des Themas als Liste; ohne Ton einmal `NO_SOUND_HINT`) → Beispiele (`GrammarExamples`: je Satz `TappableSentence` mit Übersetzung, Anhören nur mit Ton) → alle Übungen als `GapDrill` (`GrammarDrillStep` über `lib/drillQueue.js`: falsch beim ersten Versuch → die Übung kommt EINMAL am Lektionsende wieder; gezählt wird „beim ersten Versuch richtig“) → Abschluss mit `XP_PER_GRAMMAR` (einmal je Thema, nicht je Übung). `LessonFrame` springt bei jedem Schritt an den Anfang des Inhalts. |
| `ne/components/GapDrill.jsx` | `GapDrill({ ex, onDone, sound, head, nextLabel })`: EIN Lückensatz – dieselbe Form in der Lektion und im Wiederholen. `q` mit sichtbarer Lücke (die `＿＿` der Daten werden als markierte Leerstelle gezeigt), Optionen gemischt (einmal je Erscheinen, `useState`; ein neuer `key` mischt neu), Devanagari groß, Umschrift darunter nur mit `showRoman` (`readingOf` aus `lib/readings.js`). `nextLabel` darf eine Funktion `(richtig?) → Text` sein; `readOption` (Standard `readingOf`) liefert die Umschrift einer Option – Kapitel geben `chapterReading`. Exportiert auch `GAP` (`＿＿`). Nach dem Antippen: richtige Option grün, gewählte falsche rot, der gelöste Satz (Füllung grün) mit `roman` (nach Schalter) und `de`, der `hint`, Anhören des gelösten Satzes nur mit Ton; „Weiter“ ruft `onDone(richtig?)` genau einmal (Ref-Sperre). Ohne Ton voll lösbar. |
| `ne/components/grammar.jsx` | Geteilte Grammatik-Bausteine für Lektion und Bibliothek: `GrammarHead({ topic })` (Zeichen, Titel, Kurzbeschreibung), `GrammarExplain({ topic, sound })` (JEDER body-Abschnitt, wie geschrieben – nie wird Erklärtext ausgeblendet; die Liste „Neue Wörter“ aus `GRAMMAR_NEW_WORDS` mit Devanagari, Umschrift nach Schalter, Bedeutung, Anhören nur mit Ton kommt nur dazu, wenn der body keinen eigenen Abschnitt „Neue Wörter“/„Neues Wort“ hat – Regel `explainParts` in `lib/grammarText.js`), `GrammarExamples({ topic, sound, hint })`. |
| `ne/lib/grammarText.js` | `hasNewWordsSection(body)`, `explainParts(body, newWords)` → `{ sections: body (unverändert), list }` – die Regel oben als reine Funktion. Tests: `grammarText.test.js`. |
| `ne/lib/drillQueue.js` | Übungsfolge der Grammatik-Lektion, rein: `startDrill(n)`, `answerDrill(state, richtig?)`, `currentDrill`, `drillDone`; Zustand `{ list: { i, retry }[], pos, right, total }`. Falsch beim ersten Versuch → einmal hinten angehängt (nach allen ersten Durchgängen), kein dritter Versuch; `right` zählt nur erste Versuche. Tests: `drillQueue.test.js`. |
| `ne/lib/readings.js` | `readingOf(option)` → Umschrift einer Antwort-Option aus dem Kurs (Wörter und ihre Satz-Tokens, `GRAMMAR_NEW_WORDS`, Tokens der Grammatik-Beispiele, dazu `OPTION_READINGS` aus `data/grammar.js`; Stamm + Anhängsel zusammengesetzt, mehrere Wörter Teil für Teil; unbekannt → `''`), Tafel beim ersten Aufruf gebaut. Test: jede Option jeder Übung hat eine Umschrift, die `romanFits` besteht. |
| `ne/lib/grammarSrs.js` | Grammatik im Wiederholungsplan (Gegenstück zu `lib/grammarSrs.js`): `isGrammarKey(key)`, `topicForKey(key)` (→ Thema oder `null`), `GRAMMAR_QUALITY` (`right: 4`, `wrong: 1`), `pickDrill(topic, srsEntry, random, avoid)` – **Regel:** Index = `reps` des srs-Eintrags modulo Anzahl Übungen (aufeinanderfolgende Wiederholungen gehen reihum durchs Thema); nur ohne brauchbares `reps` entscheidet `random`; ist die gewählte Frage `avoid` (eben schon dran), die nächste reihum; Thema ohne Übungen → `null`. Tests: `grammarSrs.test.js`. |
| `ne/lib/functionWords.js` | **Eine Quelle** der Funktionswörter (rein, ohne Dateizugriff – Tests unter `src/ne/` dürfen nicht aus `scripts/` importieren): `FUNCTION_WORDS` (nach Gruppen), `FUNCTION_WORD_LIMIT` (30), `functionWordSet()` (frische NFC-Menge je Aufruf), `ATTACHED_SUFFIXES` (ans Wort geschriebene Nachstellungen: लाई बाट वटा सँग मा को ले), `isKnownWord(word, known)` (bekannt direkt oder als bekannter Stamm + bekanntes Anhängsel). Benutzt von `scripts/audit-ne.mjs`, `lib/readings.js` und `data/grammar.test.js`. Tests: `functionWords.test.js`. |
| `ne/lib/sequence.js` | `playSequence(texts, speakFn, isCancelled)`: Texte nacheinander sprechen, vor jedem `isCancelled()` prüfen, lehnt nie ab. Nötig, weil `stopSpeaking()` das laufende `speak` normal auflösen lässt – eine nackte `.then`-Kette spräche den nächsten Text trotzdem. Tests: `sequence.test.js`. |
| `ne/screens/reise.jsx` | Reise-Tab (default): Karte nach dem Muster von `screens/reise.jsx` – Stationen auf gewundenem Weg, Welt-Überschriften, Kulisse je Welt aus `theme` der Überschrift in `NE_PATH` (Tafel-Bereich am Ende: `berge`), „Weiter: …“-Knopf, Fortschrittsbalken, am Pfadende das Ziel 🏔 vor Himalaya-Kulisse. Stationen mit `nodeMeta` `null` fallen still weg. Beim Öffnen einer Station wird `wasDone` gemerkt (der Abschluss-Bildschirm kippt nicht, wenn `onComplete` schon gebucht hat). `onComplete` bucht nur, `onClose` schließt. Abschluss einer Schrift-Lektion: `scheduleNew(chars.map(nfc))` (idempotent, auch bei Wiederholung), beim ersten Mal `completeLesson(id, n × XP_PER_KANA, { kana: n })` – der Verlaufszähler heißt bewusst `kana`, damit Wochenrückblick & Co. Schriftzeichen mitzählen. Abschluss eines Wortblocks (`WordBlock`): `scheduleNew(words.map(w => wordKey(w.dev)))` (immer), beim ersten Mal `completeWordBlock(id, n × XP_PER_WORD, { words: n })`. Abschluss eines Grammatik-Themas (`GrammarLesson`): `scheduleNew([grammarKey(id)])` (immer), beim ersten Mal `completeGrammar(id, XP_PER_GRAMMAR, { grammar: 1 })`. Abschluss eines Kapitels (`ChapterPlayer`, `onComplete(sterne)`): `scheduleNew(chapterSrsKeys(chapter))` und `bumpChapterStars({ [id]: sterne })` immer (der beste Stand bleibt, eine Wiederholung kann ihn nur heben), beim ersten Mal `completeChapter(id, XP_PER_CHAPTER, { chapters: 1, words: n })`. Szene (`DialogPlay`): beim ersten Mal `completeDialog(id, XP_PER_DIALOG, { scenes: 1 })`; eingeplant wird nichts – Antwortsätze haben keinen Karten-Schlüssel (`learned.js` kennt Zeichen, `w:`-Wörter, `g:`-Themen), ihre Wörter sind über Wortblöcke und Themen schon im Plan. Ziel (`GoalScreen`): beim ersten Mal `completeChapter('goal', 0, {})` – kein XP, kein Zähler. Erledigte Kapitel zeigen ihre Sterne (`progress.chapterStars`, 3er-Skala) unter dem Namen; Antippen spielt sie erneut. Ab dem ersten Kapitel öffnet „📖 Deine Geschichte nachlesen“ das `ChapterDiary`. Unter dem Ziel läuft die Berg-Kulisse noch 60 px weiter (die frühere Tafel „Hier geht es bald weiter“ ist weg – der Pfad endet am Ziel). |
| `ne/lib/deva.js` | Reine Devanagari-Werkzeuge: `nfc` (jeder SRS-Karten-Schlüssel geht hier durch; Wörter tragen davor das Präfix `w:`), `aksharas` (Schreibsilben: Verbund über Halant + Matra + Zusatzzeichen; Leer-/Satzzeichen und Ziffern fallen weg), `romanSyllables` (Vokalkerne; nur `ai`/`au` ohne Längenstrich zählen einfach, `āu`/`jāū` sind zwei; ॐ und ऽ fallen in `aksharas` bewusst weg), `romanFits` (Umschrift plausibel: `aksharas − stumme ≤ Kerne ≤ aksharas`; stumm = Silbe ohne Matra und ohne eigenständigen Vokal). Tests: `deva.test.js`. |
| `ne/data/script.js` | `SCRIPT_DATA`, `SCRIPT_LESSONS` (14 Schrift-Lektionen `s1…s14`), `SCRIPT_NOTES` (Laut-Hinweise). Tests: `script.test.js`. |
| `ne/data/words.js` | `WORD_BLOCKS` (Wortblöcke `nw1…`, Schema unten), `WORD_BY_DEV`, `learnedWords(completedWordBlocks)` (NFC-Text – noch ohne `w:` – der Wörter erledigter Blöcke, Blockreihenfolge; `learned.js` macht daraus die Schlüssel). Tests: `words.test.js`. |
| `ne/data/grammar.js` | `GRAMMAR` (zwölf Themen `ng1…ng12`, Schema unten), `GRAMMAR_ORDER` (Freischalt- = Pfad-Reihenfolge), `GRAMMAR_BY_ID`, `grammarKey(id)` (`'g:' + id`), `solved(ex)` (Lückensatz mit eingesetzter Lösung), `GRAMMAR_NEW_WORDS` (je Thema ≤ 3 neue Wörter `{ dev, roman, de }`), `GRAMMAR_FORMS` (je Thema die Formen, die es lehrt), `OPTION_READINGS` (Umschrift der wenigen Antwort-Optionen, die sonst nirgends im Kurs stehen). Tests: `grammar.test.js` (Funktionswörter und Anhängsel aus `lib/functionWords.js`). |
| `ne/components/text.jsx` | Nepali-Text für Wörter und Sätze (Gegenstück zu `TappableSentence`/`WordDetail` in `components/japanese.jsx`): `useShowRoman()` (Schalter aus `ProgressCtx`, Standard an), `NeText({ dev, roman, size, color, align })` (Devanagari, darunter die Umschrift nur mit `showRoman`), `TappableSentence({ dev, roman, tokens, size, sound, hint })` (Schreibgruppen aus `lib/sentence.js`, eine Gruppe bricht nie um; jedes Token mit `de` ist ein Knopf, 44 px hoch; **Tippflächen ≥ 44 × 44 px** ohne Verschieben des Texts: nach dem Rendern werden die Knöpfe gemessen (`useLayoutEffect`, `ResizeObserver`) und je Zeile mit `hitSegments` lückenlose, nicht überlappende Abschnitte ≥ 44 px verteilt – je Knopf eine unsichtbare, absolut gelegte Fläche (`data-hit`, z-index 1), an der Naht angeklebter Stücke geteilt. Gemessen wird nach dem Rendern, nach `document.fonts.ready` (Webfont kommt spät) und bei jeder Größenänderung der Zeile ODER eines Knopfs (`ResizeObserver` auf beide). Antippen öffnet einen Nachschlage-Kasten (`role="status"`, `aria-live="polite"`), der ÜBER dem Folgenden liegt (kein Springen) – unter dem Satz oder, wenn bis zum Rand des nächsten scrollenden/abschneidenden Vorfahren (Bibliotheks-Blatt, Lektionsinhalt) bzw. des Fensters kein Platz ist, darüber; passt er nirgends, wird er ins Bild gescrollt – und `t`, `r` – **immer**, der Schalter gilt nur für die stehende Zeile – und das `de` DES TOKENS zeigt, nie ein Nachschlagen in `WORD_BY_DEV` (`छ` ist im Satz meist „ist“); schließt bei Tipp außerhalb des Satzes (`pointerdown` im Capture, der Tipp wirkt trotzdem auf sein Ziel), bei Escape und beim Antippen eines anderen Stücks. `hint` zeigt „💡 Tippe …“ – nur `WordStep` beim ersten Wort setzt es. Satz- und Token-Anhören nur mit Ton). |
| `ne/lib/sentence.js` | `sentenceGroups(dev, tokens)` → Gruppen (Arrays der Original-Tokens), zwischen Gruppen ein Leerzeichen: die Tokens tragen keine Leerzeichen, also wird aus dem Satz `dev` zurückgewonnen, wo Nepali zusammenschreibt (तपाईं+लाई, छ+?). Verglichen wird in NFC. Passt der Satz nicht, wird jedes Wort-Token eine Gruppe, Satzzeichen bleiben am Token davor (kein Absturz). `hitSegments(spans, min = 44, lo, hi)`: Tippflächen einer Zeile – ausgehend von den natürlichen Grenzen (Lückenmitte bzw. Naht) per isotoner Regression (Pool Adjacent Violators) so wenig wie möglich verschoben, bis jede ≥ `min` ist; lückenlos, nie überlappend, in `[lo, hi]` zurückgeschoben, soweit Platz ist. Tests: `sentence.test.js` (inkl. aller echten Beispielsätze). |
| `ne/lib/wordQuiz.js` | `buildWordQuiz(block, { earlier, rand, sound, optionCount = 4 })` → je Wort (gemischt) `{ kind, word, options, correct }`; `kind` reihum `meaning` (Nepali → Bedeutung), `word` (Bedeutung → Nepali), mit Ton zusätzlich `listen` (nie die erste Frage, nie nur Hörfragen). Optionen sind ganze Wörter `{ dev, roman, de }` (jede trägt Devanagari); nie zwei mit gleichem `dev` oder gleicher Bedeutung (ein bedeutungsgleiches Wort ist also nie Ablenker); Ablenker zuerst aus dem Block, aufgefüllt aus `earlier` (in `WordBlock` = `wordsBefore(NE_PATH, WORD_BLOCKS, id)`, also Pfad-Reihenfolge). `QUIZ_KINDS`. Tests: `wordQuiz.test.js`. |
| `ne/lib/speechPick.js` | Reine Auswahl der Sprachausgabe (kein `window`/`fetch`): `pickSource({ text, manifest, hasDeviceVoice })` → `mp3` \| `device` \| `none` (Text vorher NFC), `deviceMode(voices)` (`voice` \| `lang-only` bei leerer Liste \| `none`), `pickVoice(voices)` (`ne-NP` vor anderem `ne*`, lokal vor Netz, nie Hindi/andere Sprache), `isNepaliLang`, `watchdogMs`. Tests: `speechPick.test.js`. |
| `ne/lib/speechCore.js` | `createSpeech(deps)`: die Zustandsmaschine der Sprachausgabe, alle Browser-Objekte (Manifest-Abruf, Stimmenliste, Audio, Utterance, `speechSynthesis`) kommen als Parameter – daher in Node mit Attrappen testbar (`speech.test.js`: MP3, Ersatz bei Audio-Fehler, Autoplay blockiert, Gerätestimme/`lang-only`/keine, Watchdog, Überlappung, Abbruch, Manifest-Fehler). Auf Stimmen wird höchstens einmal pro Seite gewartet (nur bei leerer Liste). `speak`/`soundAvailable` lehnen nie ab. |
| `ne/lib/speech.js` | Verdrahtet den Kern mit den echten Browser-Objekten (Manifest `audio-ne/manifest.json` mit 5-s-Timeout, `speechSynthesis`, `Audio`); Importe ohne Nebenwirkung. Drei Stufen: **Studio-MP3** → **Nepali-Gerätestimme** (`ne-NP`, Rate 0,85; Liste leer → trotzdem nur mit `lang='ne-NP'`, Android-Chrome, `deviceMode`; Liste ohne Nepali-Stimme → nie eine fremde) → **still**. Watchdog `max(4 s, 400 ms × Zeichen)`. Export: `speak`, `stopSpeaking`, `onSpeechState`, `canSpeak`, `soundAvailable()` (konservativ: Manifest mit Einträgen oder echte Nepali-Stimme, leere Liste = false; Hör-Aufgaben zeigen ohne Ton das Geschriebene). |
| `ne/importRules.js` | Regeln der Importregel unten als reine Funktion: `violations(files: { path, source }[])` → `{ path, specifier, reason }[]`, dazu `importsOf(source)` (kleiner Tokenizer: Kommentare fallen weg, Importtext in Zeichenketten zählt nicht) und `resolve`. Relative Pfade werden aufgelöst (auch das Verzeichnis `ne` selbst); aus `lib/claude.js` nur die erlaubten Namen; Pakete in `ne/` nur `react`, in Tests zusätzlich `vitest` und `node:*`; `import(…)` ohne festen String und `import.meta.glob` sind überall verboten. Bekannte Grenze: JSX-Text mit Apostroph liest sich bis Zeilenende wie ein String. |
| `ne/imports.test.js` | Prüft `violations` an kleinen Dateien im Speicher (jeder Umgehungsweg muss auffallen, erlaubte Fälle nicht) und wendet sie dann auf alle Dateien unter `src/` an. |

**Nepali-Audio (Azure Speech) – Stand: noch nicht erzeugt, wartet auf einen Azure-Key.**
Die Pipeline ist fertig und getestet, aber nie gelaufen; `public/audio-ne/` gibt es noch nicht.
Der Kurs muss ohne Ton voll benutzbar sein.

| Datei | Rolle |
|---|---|
| `scripts/lib/collect-ne.mjs` | `collectNeTexts(sources)` → `[Text, Rate][]`; reine Funktion auf Daten (`{ script, words, grammar, chapters, dialogs }`, fehlende Quellen erlaubt). Texte NFC, nur mit Devanagari (U+0900–U+097F), kein Text doppelt; Wort-Tempo `0.8` gewinnt über Satz-Tempo `1`. Bisher behandelt: `script` (gesprochen wird `say`), `words` (jedes Wort und jedes antippbare Token mit Wort-Tempo, jeder Beispielsatz mit Satz-Tempo; Satzzeichen-Tokens nie), `grammar` (`GRAMMAR`: jeder Beispielsatz und jeder GELÖSTE Lückensatz `solved(ex)` mit Satz-Tempo – die Lücke wird nie gesprochen –, jedes antippbare Token und jede Antwort-Option mit Wort-Tempo), `grammarNewWords` (`GRAMMAR_NEW_WORDS`, Wort-Tempo) und `chapters` (`CHAPTERS`, genau was der Kapitel-Spieler anhören lässt: intro-Wort und antippbare Erzähl-Tokens mit Wort-Tempo; Erzähl-Zeile, Hör-Satz, Gesprächs-Zeile und richtige Antwort, gelöste Lücke, Stimmt-das-Satz und fertiger Satzbau-Satz mit Satz-Tempo; Ablenker, Lücken-Optionen und Satzbau-Stücke nie) und `dialogs` (`DIALOGS`, was der Szenen-Spieler anhören lässt: NPC-Zeile und Antwortsatz mit Satz-Tempo, ihre antippbaren Tokens und die `newPhrases` mit Wort-Tempo; falsche Optionen nie). Tests: `collect-ne.test.mjs` (inkl. „Satz und Einzelwort zugleich → Wort-Tempo“). |
| `scripts/audit-ne.mjs` | Wort-Audit (`npm run audit:ne`, Gegenstück zu `audit-examples.mjs`): geht `NE_PATH` der Reihe nach durch und meldet jedes Wort, das dort noch nicht eingeführt ist, als `Station · Wort/Satz · Token`; Exit 1 bei Funden, sonst 0. **Regeln:** „Eingeführt“ = Wort-Eintrag dieses oder eines früheren Blocks in Pfad-Reihenfolge (ein Eintrag mit Leerzeichen führt jeden Teil ein; das Block-Ende zählt), `GRAMMAR_NEW_WORDS` und `GRAMMAR_FORMS` eines Themas ab dessen Station (auch für das Thema selbst), oder Funktionswort aus `src/ne/lib/functionWords.js` (EINE Quelle; hier nur weitergereicht – Postpositionen, Kopula, Pronomen samt Formen wie मैले, Fragewörter, र, einige Verbformen; kurz halten, Warnung über `FUNCTION_WORD_LIMIT` = 30; `-- --list-function-words` zeigt sie). Geprüft werden an Wort-Stationen die antippbaren Tokens der Beispielsätze, an Grammatik-Stationen die antippbaren Tokens der Beispiele und jedes Wort der gelösten Lückensätze (ohne Tokens; ein angehängtes Wort wie झोलामा zählt, wenn Stamm und Anhängsel eingeführt sind – `isKnownWord`). An Kapitel-Stationen Schritt für Schritt: ein intro-Wort gilt ab seinem Schritt (und danach im ganzen Pfad); geprüft werden die antippbaren Tokens der Erzähl-Zeilen und jedes Wort jedes anderen Nepali-Texts samt Ablenkern (Gesprächs-Optionen, jede Lücken-Option eingesetzt, jedes Satzbau-Stück). Eigennamen der Geschichte (`PROPER_NAMES`: आशा, माछापुच्छ्रे) gelten als bekannt. An Szenen-Stationen gelten erst die `newPhrases` der Szene (jeder Teil) als eingeführt; geprüft werden die antippbaren Tokens der NPC-Zeilen und Antwortsätze und jedes Wort jeder NPC-Zeile und jeder Option, auch der falschen. Stationen ohne Daten und das Ziel werden übersprungen. Kern `auditPath(path, blocks, known, grammar = { topics, newWords, forms }, chapters = [], dialogs = [])` rein; Tests: `scripts/audit-ne.test.mjs`. |
| `scripts/generate-audio-ne.mjs` | Gegenstück zu `generate-audio.mjs`; Stimme `ne-NP-HemkalaNeural`, Dateiname = SHA1(`Stimme\|Tempo\|Text`)[0..16] + `.mp3`, Ausgabe `public/audio-ne/`, Manifest `public/audio-ne/manifest.json` = `{ [Text]: Dateiname }`. Importiert die Datenmodule und reicht sie an `collectNeTexts`. |

Aufruf: `npm run audio:ne -- --dry-run` (zählen) · `--limit N` (Probelauf) · ohne Schalter
(alles Fehlende generieren; braucht `AZURE_SPEECH_KEY` und `AZURE_SPEECH_REGION` aus der
Umgebung oder `.env.local`, sonst Abbruch mit Exit 1 und Nennung der fehlenden Zeilen).
`--check` (Pre-Commit-Hook, läuft nach dem japanischen Check): **ohne Manifest** nur Hinweis
„Nepali-Audio noch nicht erzeugt (N Texte warten)“, Exit 0; **mit Manifest** streng – jeder
Text braucht einen Eintrag auf den aktuellen Hash und die Datei, sonst Exit 1 und der Hook
stößt `npm run audio:ne` an. Service Worker: eigene Routen für `/audio-ne/manifest.json`
(NetworkFirst, `yatra-audio-manifest`) und `/audio-ne/*.mp3` (CacheFirst, `yatra-audio`);
das Manifest ist aus dem Precache ausgenommen (siehe §7, self-contained `urlPattern`).

Schemata (`ne/data/script.js`):
```js
SCRIPT_DATA[char] = { roman, kind, tip, say, shown }
// kind: 'vowel' | 'consonant' | 'matra' | 'conjunct' | 'sign' | 'digit'
// roman: Kurs-Umschrift, spiegelt die Schreibung (ī/ū, sh); Konsonanten mit a ('ka'),
//        Matras/Zeichen mit ihrem Beitrag ('ā', 'ṃ'). NICHT eindeutig (श/ष 'sha', ं/ँ 'ṃ'):
//        ein Quiz darf nie zwei Optionen mit gleichem roman anbieten.
// tip:   eine Zeile Deutsch, Form ↔ Laut (was man hört, auch wo es von roman abweicht)
// shown: was die Karte zeigt – kombinierende Zeichen (Matras, ं ँ ः ्) an क ('का'), sonst das Zeichen
// say:   Text für die Sprachausgabe (derzeit = shown)
// Schlüssel sind NFC. 79 Einträge: 11 Vokale, 33 Konsonanten, 10 Matras, 10 Verbindungen
// (Halbformen, Reph र्म, Rakar प्र, रु/रू …), 5 Zusatzzeichen (inkl. Danda ।), 10 Ziffern.
SCRIPT_LESSONS[] = { id: 's1', title, sub, chars: [char, …] }
// s1–s2 Vokale · s3–s9 Konsonanten nach Lautgruppen · s10–s11 Matras (s10 mit रु रू) ·
// s12 Zusatzzeichen + Halant + erste Halbformen · s13 Verbindungen · s14 Ziffern ०–९;
// jedes Zeichen in genau einer Lektion, höchstens 7 (Ziffern 10); Halant vor allen Verbindungen
SCRIPT_NOTES[] = { id, title, text, pairs: [[char, char], …] }   // behaucht/unbehaucht, dental/retroflex
```

Schema `ne/data/words.js` (aus dem Kopfkommentar der Datei):
```js
//   Block  { id: 'nw1'…, theme: Emoji, title: Deutsch, words: Wort[] }
//   Wort   { dev, roman, de, ex: { dev, roman, de, tokens: { t, r, de }[] } }
//   dev   – Devanagari, NFC; zugleich SRS-Kartenschlüssel, daher über alle Blöcke eindeutig
//           (in learned.js mit Präfix: 'w:' + dev – Zeichen behalten den nackten Text)
//   roman – Umschrift nach dem Kurs-Schema (s. script.js): folgt der Schreibung, ā ī ū,
//           ṭ ḍ ṇ, ṃ für ं/ँ, c/ch, sh; व wie gesprochen; stummes End-a fällt weg, ein
//           gesprochenes bleibt (होइन „hoina“, छैन „chaina“, चाहिन्छ „cāhincha“)
//   tokens – der Satz in antippbaren Stücken: t = Stück genau wie im Satz (alle t zusammen
//           = Satz ohne Leerzeichen), r = dessen Umschrift, de = kurze Bedeutung. Ohne de
//           (Satzzeichen) nicht antippbar. Nachgestellte Wörter, die im Nepali mit dem Nomen
//           zusammengeschrieben werden (-मा, -को, -लाई, -बाट), sind eigene Tokens – so kann
//           man „in“/„von“ einzeln antippen.
// Ein Wort-Eintrag darf ein Leerzeichen enthalten (दाल भात); im Satz stehen seine Teile als
// eigene Tokens. Ein Token zeigt beim Antippen SEIN de – छ ist Wort („sechs“) und Kopula („ist“).
```

Schema `ne/data/grammar.js` (aus dem Kopfkommentar der Datei):
```js
//   Thema    { id: 'ng1'…, glyph, title, summary, body: { h?, text }[], examples: Beispiel[], exercises: Übung[] }
//   Beispiel { dev, roman, de, tokens: { t, r, de }[] }   // Token-Regeln wie in words.js
//   Übung    { q, a, options, hint, de, roman }
//            q – Nepali-Satz mit genau einer Lücke ＿＿ (steht sie am Wort, wird angehängt: म＿＿ → मलाई)
//            a – richtige Füllung; options ≥ 3, nur EINE ergibt einen richtigen Satz
//            hint – kurze deutsche Begründung; de/roman – Übersetzung/Umschrift des GELÖSTEN Satzes
// GRAMMAR_NEW_WORDS[id] = { dev, roman, de }[]  // ≤ 3, im body vorgestellt; ab diesem Thema eingeführt
// GRAMMAR_FORMS[id]     = string[]              // Formen, die das Thema lehrt; ab hier eingeführt
// Karten-Schlüssel je Thema: grammarKey(id) = 'g:' + id; geübt als EIN Lückensatz (lib/grammarSrs.js).
```

Schema `ne/data/chapters.js` (aus dem Kopfkommentar der Datei):
```js
//   Kapitel { id: 'nc1'…, title, place, summary (Deutsch), steps: Schritt[] }
//   story   { kind, de, dev?, roman?, tokens? }   // Nepali-Zeile nur komplett; Tokens wie words.js
//   intro   { kind, dev, roman, de, note? }       // neues Wort → CHAPTER_WORD, SRS (w: + dev)
//   audio   { kind, say, sayRoman, options, answer, de }   // options/answer Deutsch; ohne Ton Leseaufgabe
//   dialog  { kind, line, lineRoman, lineDe, options, answer, answerRoman, answerDe, optionsMeta }
//           // optionsMeta[option] = { roman, de } für jede Nepali-Option
//   gap     { kind, before, after, options, answer, de, roman }   // Satz = before + answer + after
//   tf      { kind, dev, roman, de, claimDe, answer }             // stimmt die deutsche Aussage?
//   build   { kind, tiles, answer, alsoAccept?, dev, de, roman }
//           // answer = Stücke in Reihenfolge (mit Leerzeichen = dev ohne Satzzeichen);
//           // tiles = answer + 1–2 Ablenker; alsoAccept = weitere richtige Reihenfolgen
//           // DERSELBEN Stücke (string[][]) – isBuildCorrect nimmt jede an
// Aufgaben = audio, dialog, gap, tf, build (lib/chapters.js isTask); Sterne je Durchgang
// über chapterStars, gespeichert der beste Stand in progress.chapterStars (1–3).
```

Schema `ne/data/dialogs.js` (aus dem Kopfkommentar der Datei):
```js
//   Szene { id: 'nd1'…, title, emoji, place, sceneDe, role, turns: Zug[], newPhrases?: { dev, roman, de }[] }
//         // title/place/sceneDe/role Deutsch; sceneDe = zwei Sätze; newPhrases ≤ 3 (vom Kurs bis dahin nicht gelehrt)
//   Zug   { npc, npcRoman, de, npcTokens, options, answer, answerRoman, answerDe, answerTokens, optionsMeta }
//         // npc === '' → du fängst an, de ist dann die Regieanweisung
//         // options: drei Nepali-Antworten, genau EINE (answer) passt höflich; optionsMeta[option] = { roman, de }
//         // npcTokens/answerTokens: antippbare Stücke wie words.js ({ t, r, de }, Satzzeichen nur { t })
// Fortschritt: completedDialogs (XP_PER_DIALOG beim ersten Mal); keine SRS-Karten.
```

Schema `ne/data/path.js`:
```js
NE_PATH = ({ world, sub, theme } | { type, id })[]
// world/sub: Welt-Überschrift (world Deutsch; Devanagari nur, wo die App den Namen schon
//            führt: काठमाडौं), theme: Kulisse 'tal' | 'huegel' | 'see' | 'berge'
// type: 'script' (s1…, abgehakt über completedLessons) · 'word' (nw1…, completedWordBlocks) ·
//       'grammar' (ng1…, completedGrammar) · 'chapter' (nc1…, completedChapters) ·
//       'dialog' (nd1…, completedDialogs) · 'goal' (genau eine, die letzte, id GOAL_ID; bucht sich einmal
//       als 'goal' in completedChapters – kein Kapitel, Zähler gehen über CHAPTERS)
// Neue Typen: in lib/path.js DONE_FIELD und nodeMeta ergänzen – bis dahin liefert nodeMeta null
// und die Karte lässt die Station still aus (kein Absturz, nextOpenIndex springt darüber,
// sie blockiert die Stationen dahinter nicht).
```
**Verbindliche Reihenfolge** (Controller-Entscheidung; jede Station darf nur benutzen, was vor
ihr liegt – plus Funktionswörter; `npm run audit:ne` prüft es):

| Welt (Kulisse) | Stationen |
|---|---|
| 1 काठमाडौं · Ankommen (`tal`) | s1–s5 |
| 2 Die Konsonanten (`tal`) | s6–s9 |
| 3 Zeichen verbinden (`tal`) | s10–s14 |
| 4 Erste Worte · Kathmandu, Ankunft (`tal`) | nw1 Begrüßen · ng1 Satzbau · ng2 हो · nw2 Zahlen 1–10 · ng3 छ · nc1 Ankunft am Flughafen |
| 5 Geld und Fragen · Thamel (`tal`) | nw3 Geld und Preise · ng4 Verneinung · ng5 Fragen · nc2 Taxi nach Thamel · nd1 Szene Taxi |
| 6 Essen · Kathmandu (`tal`) | nw4 Essen und Trinken · ng8 ‑लाई/चाहिन्छ · ng9 मन पर्छ · ng10 वटा/जना · nc3 Erstes Dal Bhat · nd3 Essen bestellen · nd4 Einkaufen und Handeln |
| 7 Unterwegs · Kathmandu-Tal (`huegel`) | nw5 Unterwegs · ng6 ‑मा/‑बाट · ng7 ‑को · ng11 Höfliche Bitte · nc4 Zur Stupa von Boudhanath · nd5 Nach dem Weg fragen |
| 8 Nach Pokhara · Hügelland und See (`see`) | nw6 Unterkunft und Zeit · ng12 Vergangenheit · nc5 Busfahrt nach Pokhara · nc6 Am Phewa-See · nd2 Unterkunft |
| 9 In die Berge · Himalaya (`berge`) | nw7 Berge und Wetter · nc7 Aufbruch zum Trek · nc8 Im Teehaus · nd6 Im Teehaus · nc9 Schlechtes Wetter, Hilfe holen · nc10 Sonnenaufgang am Aussichtspunkt · goal |

`GRAMMAR_ORDER` = ng1, ng2, ng3, ng4, ng5, ng8, ng9, ng10, ng6, ng7, ng11, ng12 (= Reihenfolge der
Grammatik-Stationen; `path.test.js` prüft es).
**Freischalt-Regel (wie die japanische Karte):** erledigt bleibt immer `done` (antippbar zum
Wiederholen, auch hinter der offenen Station); die erste nicht erledigte Station mit Daten ist
`current` (START); alle übrigen sind `locked`. Eine Station ist also offen, sobald alle Stationen
davor erledigt sind.
**Wenn ein übersprungener Stationstyp bekannt wird** (eine spätere Version bringt z. B. die
Kapitel-Daten): Ab dann zählen diese Stationen. Die erste noch nicht erledigte neue Station
wird `current`, auch wenn der Lernende schon weiter hinten war; nicht erledigte Stationen
dahinter sind `locked`, bis sie erledigt ist. Erledigte Stationen bleiben `done` und wiederholbar.
Ein einmaliger Rückschritt auf der Karte, nie eine Sackgasse – es gibt immer genau eine offene
Station, solange etwas fehlt (Kommentar in `ne/lib/path.js`). So kamen die Szenen dazu: wer schon hinter einer Szene stand, findet die erste nicht gespielte Szene als offene Station.
Noch ungeprüfte Nepali-Aussagen (Aussprache, Formbeschreibungen) stehen in
`docs/nepali-offene-pruefpunkte.md` – für die spätere Durchsicht durch eine Person, die Nepali kann.

**Karten-Schlüssel (SRS) im Nepali-Zweig:** Zeichen: der Text; Wörter: `w:` + Text;
Grammatik: `g:` + id – alles nach `nfc`. Einzige Stelle, die Wort-Schlüssel bildet bzw. liest:
`wordKey`/`itemInfo` in `ne/lib/learned.js`; Grammatik-Schlüssel bildet `grammarKey`
(`ne/data/grammar.js`), erkennt `isGrammarKey`/`topicForKey` (`ne/lib/grammarSrs.js`).

**Importregel:** `src/ne/**` darf nur den sprachneutralen Kern importieren: `theme.js`,
`useProgress.js`, `state/ProgressContext.js`, `AuthGate.jsx`, `LangGate.jsx`,
`components/ui.jsx`, `components/ueben.jsx`, `screens/adminUsers.jsx`, `lib/xp.js`,
`lib/progress.js`, `lib/apiKey.js`, `lib/lang.js` und aus `lib/claude.js` nur `chatTurn`,
`parseJson`, `hasApiKey`, `pingApiKey`. Japanische Dateien importieren nie aus `src/ne/`; nur
`LangGate.jsx` lädt `ne/NepaliApp.jsx` – lazy.

### `state/`
| Datei | Exporte | Zweck |
|---|---|---|
| `ProgressContext.js` | `ProgressCtx` | React-Context, über den **alle** Screens Fortschritt + Schreib-Funktionen lesen (`useContext(ProgressCtx)`). Befüllt in `TabiApp` und `ne/NepaliApp`. |

### `data/` — reine Inhaltsdaten (kein React, keine Logik)
> Hier wird **Inhalt** ergänzt (neues Kapitel, Wort, Grammatik …). Schemata s. §4.

| Datei | Exporte |
|---|---|
| `kana.js` | `KANA_DATA`, `HIRA_ROWS`, `KATA_ROWS`, `LESSONS` |
| `phrases.js` | `PHRASES` (Reise-Floskeln-Liste) |
| `words.js` | `WORD_BLOCKS`, `ALL_WORDS`, `WORD_BY_KANJI`, `learnedWordKanji()` |
| `kanjiOrigin.js` | `KANJI_ORIGIN` (Herkunft je Kanji) |
| `grammar.js` | `GRAMMAR`, `GRAMMAR_ORDER`, `GRAMMAR_SEQ`, `GRAMMAR_GLYPH` |
| `dialogs.js` | `DIALOGS`, `DIALOG_LEX`, `LEX_MAXLEN` (Rollenspiel + antippbares Lexikon) |
| `talks.js` | `TALKS`, `TALK_BY_ID`, `TALK_BY_SCENE` (freie KI-Gespräche, je eines pro Szene) |
| `chapters.js` | `STORY_TOKENS`, `CHAPTERS`, `CHAPTER_BY_ID`, `CHAPTER_WORD` |
| `path.js` | `PATH` (Reihenfolge der Reise-Stationen) |

### `lib/` — reine Logik
| Datei | Exporte (Auswahl) | Abhängig von |
|---|---|---|
| `access.js` | `normalizeEmail`, `isValidEmail`, `isAdminEmail`, `accessState` (Admin/freigegeben/gesperrt/offline), `effectiveAccess`, `mayRecheck` (Pause zwischen automatischen Neuprüfungen) | – |
| `lang.js` | `LANGS`, `NE_PUBLIC`, `selectableLangs`, `progressPath`, `profilePath`, `initialLang`, `resolveLang` (Entscheidungstabelle von `useProfile`: Wahl > gelesener Stand > Geräte-Hinweis > laden) | – |
| `xp.js` | `XP_PER_KANA/CARD/WORD/GRAMMAR/CHAPTER/DIALOG` | – |
| `kanaStats.js` | `totalKanaCount`, `completedKanaList`, `completedKanaCount` | data/kana |
| `speech.js` | `speak` (gibt ein Versprechen zurück: löst auf, wenn zu Ende gesprochen), `stopSpeaking`, `onSpeechState`, `speakItem`, `speakTokens`, `itemReading`, `copyText` | data/words, data/chapters, **lib/apiKey**, **lib/ttsCloud** |
| `listen.js` | `SPEECH_INPUT_SUPPORTED`, `startListening`, `stopListening`, `normalizeJa`, `matchSpoken` | – (Web Speech API, ja-JP) |
| `apiKey.js` | `getApiKey`/`setApiKey` (Anthropic), `getTtsKey`/`setTtsKey`/`hasTtsKey` (Google TTS) | – (beide Keys nur in localStorage) |
| `claude.js` | `chatTurn`, `judgeAnswer`, `parseJson`, `pingApiKey`, `hasApiKey` | **lib/apiKey** |
| `ttsCloud.js` | `cloudAudioUrl`, `pingTtsKey` | **lib/apiKey** (Google Cloud TTS zur Laufzeit) |
| `talk.js` | `talkGate`, `talkForScene`, `grammarTalk`, `learnedVocabList`, `buildTalkSystem`, `buildHintSystem`, `buildDebriefSystem`, `buildDebriefPrompt`, `transcriptText`, `OPENER_CUE`, `FALLBACK_CLOSING` | data/talks, data/dialogs, data/grammar, **lib/dialog** |
| `learned.js` | `learnedItems` (alle SRS-Karten zu einem Fortschritt) | data/words, **lib/kanaStats**, **lib/chapters**, **lib/grammarSrs** |
| `grammarSrs.js` | `grammarKey`, `isGrammarKey`, `topicForKey`, `grammarKeys`, `pickDrill` | data/grammar (Grammatik als SRS-Karte) |
| `srs.js` | `srsItemInfo`, `SRS_RATINGS`, `shuffled`, `feedbackColor`, `buildRounds`, `OPTIONS_PER_ROUND`, `SRS_STAGES`, `srsStageIndex` | theme, data/kana, data/words, data/chapters, useProgress |
| `dialog.js` | `lexTokens`, `dialogGate`, `reiseVocab`, `curriculumVocab`, `tokenGrammarId`, `ROLE_GRAMMATICAL`, `phrasesFromTurns`, `dialogPhrases`, `dialogShakyWords`, … | data/dialogs, data/words, data/chapters, useProgress |
| `chapters.js` | `chapterSrsKeys`, `chapterStarsLive`, `chapterStarsShown`, `computeAllChapterStars` | data/chapters, **lib/srs** |
| `furigana.jsx` | `renderFuri`, `furiPlain`, `HAS_JP` | – (enthält JSX → `.jsx`) |
| `scene.jsx` | `sceneTree`, `sceneTorii`, `verticalRidge`, `buildBackdrop(bands)`, `roadPath`, `STATE_PALETTE` | – (SVG-JSX → `.jsx`) |
| `path.js` | `isNodeDone`, `pathNodeMeta` | data/kana, data/words, data/grammar, data/chapters |
| `mix.js` | `MIX_LABEL`, `buildMixTasks` | **lib/srs** |
| `progress.js` | `periodBuckets` (XP-Aggregation für Diagramme) | – |

> Erlaubte `lib`-interne Kanten (einzige Querverweise innerhalb der Schicht):
> `chapters.js → srs.js`, `mix.js → srs.js`, `claude.js → apiKey.js`,
> `ttsCloud.js → apiKey.js`, `speech.js → {apiKey.js, ttsCloud.js}`,
> `talk.js → dialog.js`, `learned.js → {kanaStats.js, chapters.js, grammarSrs.js}`,
> `srs.js → grammarSrs.js`. Sonst keine.

### `components/` — geteilte UI
| Datei | Exporte | Notiz |
|---|---|---|
| `ui.jsx` | `Card`, `Btn`, `Emoji`, `TabBar`, `Stars`, `LibSheet` | Generische Atome/Chrome; hängt nur an `theme`. `TabBar({ active, setActive, tabs, font })`: ohne `tabs`/`font` die japanische Leiste (旅 辞書 練習 進歩, Schrift `JP`); Nepali reicht eigene Tabs und `NE` herein. |
| `avatar.jsx` | `Avatar` | Gezeichneter Gesprächspartner + Bühne fürs freie Gespräch (SVG, Stil von `lib/scene.jsx`). Stimmungen: `idle`/`speaking`/`listening`/`thinking`/`happy`. Dauer-Bewegung als CSS-Klassen in `index.css` (`tabi-mood-*`), Zufälliges (Blinzeln, Mundtakt) in React. |
| `kana.jsx` | `StrokeDisplay`, `DrawCanvas` | Strichanimation + Mal-Canvas. |
| `japanese.jsx` | `CardNote`, `KanjiOrigin`, `WordDetail`, `TappableSentence`, `TappableJp`, `StoryLine` | Antippbare JP-Texte + Wort-Detail. |
| `ueben.jsx` | `UebenHead`, `UebenEmpty`, `UebenDone` | Übungs-Rahmen (Kopf/Leer/Fertig). `UebenHead` nimmt optional `closeSize` (px, Tippfläche des ✕ + `aria-label`); ohne Angabe Ausgabe wie bisher. |
| `BuildStep.jsx` | `BuildStep` | Satz-aus-Kacheln-Aufgabe. **Von Üben UND Reise geteilt.** |
| `grammarDrill.jsx` | `GrammarDrill` | Lückensatz mit Auswahl – die Form, in der Grammatik im Wiederholungsplan auftaucht (bewusst keine Karteikarte: bei Grammatik zählt das Anwenden). |

### `screens/` — ein Vollbild je Tab (default-Export, lazy geladen)
| Datei | default | Lokale (nicht exportierte) Unterkomponenten |
|---|---|---|
| `reise.jsx` | `ReiseScreen` | `DailyStrip`, `ChoiceStep`, `IntroStep`, `TraceStep`, `ChapterPlayer`, `ChapterPractice`, `ChapterSheet`, `StoryJournal` |
| `lernen.jsx` | `LernenScreen` | `PhraseList`, `KanaLibrary`, `WordLibrary`, `GrammarLibrary` (reine Nachschlage-Bibliothek) |
| `ueben.jsx` | `UebenScreen` | `SRSQuiz`, `PracticeQuiz`, `TypeQuiz`, `SentenceQuiz`, `MixQuiz`, `MixStep`, `DialogHub` |
| `fortschritt.jsx` | `FortschrittScreen` | – |
| `settings.jsx` | `SettingsScreen` | `NumberSetting` |
| `adminUsers.jsx` | `AdminUsers` (Abschnitt „Nutzer verwalten“, nur für Admins in den Einstellungen) | – |
| `players.jsx` | *(keine)* — exportiert `LessonPlayer`, `BlockCourse`, `GrammarLesson`, `DialogPlay` | lokal: `QuizStep`, `BlockQuiz`, `GrammarExercise`. Lektions-Overlays der Pfad-Stationen (`reise.jsx`); `DialogPlay` nutzt zusätzlich der `DialogHub` in `ueben.jsx`. |
| `talk.jsx` | `TalkPlay` | Freies KI-Gespräch (Zustandsmaschine + Avatar-Bühne + Nachbesprechung). Wird wie `players.jsx` vom `DialogHub` in `ueben.jsx` eingebunden — dieselbe dokumentierte Ausnahme (Overlay-Screen, kein Tab). |

---

## 3. Datenfluss & zentrale Mechaniken

- **Fortschritt:** `useProgress(uid, lang)` in `TabiApp` lädt live aus Firestore und
  liefert Schreib-Funktionen. Beides geht via `ProgressCtx` an alle Screens.
  Datenmodell: `users/{uid}` = japanischer Lernstand (unverändert, nie migriert),
  `users/{uid}/langs/ne` = Nepali-Lernstand, `users/{uid}/meta/profile` = `{ lang }`
  (zuletzt gewählte Sprache; gelesen/geschrieben von `useProfile`).
  Beim Wechsel von Nutzer oder Sprache liefert der Hook sofort `DEFAULT_PROGRESS` mit
  `loading: true`; Schreib-Funktionen, die aus `progress` rechnen, schreiben nicht,
  solange kein echter Snapshot für die aktuelle Sprache vorliegt.
  Geschrieben wird immer per `setDoc(..., {merge:true})` (geräteübergreifend).
  Echte Schreibfehler landen in `saveError` und zeigen ein Banner in `TabiApp`.
- **SRS (Spaced Repetition):** Algorithmus `sm2` in `useProgress.js`; Anzeige-Stufen
  (`SRS_STAGES`) und Kartendaten (`srsItemInfo`) in `lib/srs.js`. Karten-Schlüssel =
  das japanische Zeichen/Wort.
- **Reise = roter Faden:** `data/path.js` (`PATH`) ordnet Kana-, Wort-, Grammatik-
  und Kapitel-Stationen. `ReiseScreen` rendert die Karte und öffnet je Station das
  passende Overlay aus `screens/players.jsx` bzw. den Kapitel-`ChapterPlayer`.
- **Themen-Hintergrund:** `ReiseScreen` ordnet jedem PATH-Welt-Band (per Index) ein
  Thema zu (`BAND_THEMES`: Land → Berge → Stadt → Tempelgarten, passend zur erzählten
  Welt) und übergibt das an `lib/scene.jsx` (`buildBackdrop(bands)`), das je Band
  eigenen Himmel/Rücken/Dekor zeichnet. Neue Welt in `PATH` → `BAND_THEMES` ergänzen.
- **Rollenspiel-Freischaltung:** `lib/dialog.js` (`dialogGate`) leitet Vokabel-/
  Grammatik-Bedarf aus den Antwortsätzen ab und prüft gegen das, was die Reise lehrt.
- **Freies Gespräch** (`screens/talk.jsx`, Didaktik: `DIDAKTIK.md` „Gesprächs-Treppe"):
  Zu jeder Szene gibt es ein KI-gespieltes Gegenstück (`data/talks.js`). Es öffnet
  erst, wenn die Szene gemeistert ist (`lib/talk.js: talkGate`) und ein eigener
  Anthropic-Key hinterlegt ist. Ablauf als Zustandsmaschine
  `intro → speaking → listening → thinking → … → ending → debrief`; das Mikrofon
  öffnet von selbst, weil `speak()` erst auflöst, wenn der Satz zu Ende ist.
  Der System-Prompt begrenzt den Gesprächspartner auf den gelernten Wortschatz
  (`learnedVocabList`) und wird pro Gespräch **einmal** gebaut – sonst greift das
  Prompt-Caching nicht. Harte Grenzen: `talk.maxTurns` (Zug-Deckel, danach höfliche
  Verabschiedung) und `max_tokens` je Zug. Ohne Key/Netz bleibt alles beim Alten.
  **Achtung Zustands-Falle:** Die async-Abläufe lesen den Verlauf über `turnsRef`,
  nicht über den `turns`-State – dessen Wert ist in der Render-Schließung veraltet,
  und die Nachbesprechung bekäme ein unvollständiges Protokoll.
- **Aufwärmen vor der Szene** (`SceneWarmup` in `screens/players.jsx`): Zwischen
  Intro und Szene liegt eine Phase, die die Antwortsätze zeigt (hören, Wörter
  antippen) und danach einmal abfragt. Sie ist zugleich die Festigungs-Bremse –
  in die Szene kommt nur, wer jeden Satz erkannt hat; Falsches wandert ans Ende
  der Warteschlange statt zu blockieren. Die Sätze kommen aus
  `lib/dialog.js: phrasesFromTurns(turns)` – bewusst aus den WIRKLICH gespielten
  Zügen, weil Wiederholungs-Knoten ihre Züge beim Start zusammenwürfeln.
- **Sanfter erster Durchgang eines freien Gesprächs:** `buildTalkSystem` kennt
  zwei Schalter. Beim ersten Mal (`!alreadyDone`) läuft das Gespräch geradlinig
  (`withComplication: false`) und der Partner legt jedem Zug Antwort-Vorschläge
  bei (`guided`, steuerbar über `settings.talkGuide`). Die Vorschläge stecken in
  DERSELBEN Antwort statt in einem zweiten Aufruf – sonst würde jeder Zug doppelt
  kosten und länger dauern.
- **Grammatik im Gespräch** (zwei Richtungen): `grammarTalk(topic)` baut aus einem
  Grammatik-Thema ein Small-Talk-Gespräch, dessen System-Prompt die Struktur
  immer wieder provoziert (Üben-Tab → „Grammatik sprechen"). Umgekehrt bekommt
  die Nachbesprechung die gelernten Themen mit und darf jede Korrektur einem
  davon zuordnen (`grammatik`-Feld) – die App zeigt dann die Regel dahinter.
  Erfundene IDs werden verworfen, statt eine falsche Regel anzuzeigen.
- **Gesprächs-Wendungen im SRS:** Die Nachbesprechung bietet 1–2 Wendungen zum
  Übernehmen an (`useProgress: addPhrase` → `progress.extraPhrases` + sofort
  eingeplante SRS-Karte). Alle Stapel/Zähler ziehen ihre Item-Liste aus
  `lib/learned.js: learnedItems` – eine Quelle, damit „fällig" überall gleich zählt.
- **Kapitel-Sterne:** `lib/chapters.js` berechnet Sterne aus dem SRS-Stand der
  Kapitel-Vokabeln; Höchststand wird via `bumpChapterStars` (useProgress) gehalten.

---

## 4. Audio & Sprache

### Sprachausgabe: Studio-MP3s zuerst, System-TTS als Fallback
`speak(text)` in `lib/speech.js` schaut zuerst in `public/audio/manifest.json`
(Text → MP3-Dateiname) und spielt das vorgenerierte Studio-Audio (Google Cloud
TTS, Stimme `ja-JP-Neural2-B`). Nur wenn kein Eintrag/keine Datei existiert,
springt die System-TTS ein (ja-JP-Stimme; Desktop ohne ja-Stimme spricht bewusst
nicht und zeigt einen Installations-Hinweis).

**Service-Worker-Strategie (Juli 2026 gehärtet):** `audio/manifest.json` ist
bewusst **NICHT im Precache** (`globIgnores`), sondern `NetworkFirst` – ein
precachtes Manifest wäre an den SW-Stand des Geräts gepinnt und zeigte nach
einer Audio-Regenerierung auf gelöschte Dateinamen → 404 → System-TTS für jedes
Wort (so passiert bei der Raten-Umstellung). Die MP3s selbst sind `CacheFirst`
(einmal gehört = offline verfügbar). Details/Fallstricke: `vite.config.js`.

Transformations-Helfer, damit TTS nie raten muss:
- `itemReading(item)` löst Wort-/Kapitel-Kanji zur geprüften Kana-Lesung auf
  (verhindert Fehllesungen mehrdeutiger Kanji wie 上/月).
- `speakTokens(tokens)` baut Sätze aus Token-Lesungen (nur reine Kana-Lesungen;
  Romaji-Anzeigelesungen wie は→„wa" bleiben außen vor).
- `BuildStep.sayTile` spricht Partikel-Sonderlesungen (は→わ, へ→え).

### Generierung: `npm run audio` (`scripts/generate-audio.mjs`)
Sammelt in `collectTexts()` **jeden** Text, den die App über `speak()` ausgeben
kann – mit exakt denselben Transformationen wie die Sprechstellen. Neue
Sprechstellen mit neuen Text-Transformationen ⇒ im Collector nachziehen!
Dateiname = SHA1-Hash aus `Stimme|Rate|Text` ⇒ inkrementell (vorhandene Dateien
werden übersprungen), Stimm-/Raten-Wechsel invalidiert automatisch.
`--check` (offline, im Pre-Commit-Hook `.githooks/pre-commit`) erzwingt, dass
Texte und Audio nie auseinanderlaufen. Key: `GOOGLE_TTS_API_KEY` in `.env.local`.

**Zwei Sprechraten (wichtig):** Zitierformen (einzelne Wörter, Kana,
Satzbau-Kacheln, Kapitel-Vokabeln) werden mit Rate **0.8** generiert, Sätze mit
**1**. Grund: Bei Normaltempo entstimmlicht die (korrekte, natürliche)
Tokyo-Aussprache i/u zwischen stimmlosen Konsonanten – ひと klang wie „Sto",
した wie „schta". Bei 0.8 spricht Neural2 den Vokal wieder hörbar; in Sätzen
bleibt die natürliche Entstimmlichung absichtlich erhalten. (Empirisch geprüft
per Autokorrelations-Messung der ersten Mora; Details im Kopfkommentar des
Skripts. Einzelfälle wie ひとつ entstimmlichen selbst bei 0.7 – das ist dann
schlicht die richtige Aussprache.)

### Drei Wege zur Stimme – und warum freie Sätze anders laufen
`speak(text)` probiert der Reihe nach:
1. **Studio-MP3** aus dem Manifest (feste Texte, s. o.),
2. **Google Cloud TTS zur Laufzeit** (`lib/ttsCloud.js`) – nur wenn ein eigener
   Google-Key hinterlegt ist; gleiche Stimme und Rate wie die MP3s, Ergebnis
   landet im Cache `tabi-audio-dyn` (zweites Hören ist gratis und offline),
3. **System-TTS** als Auffangnetz.

**Freie Gespräche sind bewusst NICHT im Audio-Collector.** Ihre Sätze entstehen
erst zur Laufzeit; ein einzelner fester Text darin (`FALLBACK_CLOSING` in
`lib/talk.js`) bliebe sonst der einzige mit Studio-MP3 und würde mitten im
Gespräch die Stimme wechseln. Innerhalb eines Gesprächs kommt darum **immer**
dieselbe Quelle zum Zug (Cloud-Stimme mit Key, sonst System-TTS). Deshalb
schlägt `npm run audio --check` hier auch nicht an – das ist Absicht, kein Loch.

`speak()` gibt ein **Versprechen** zurück, das auflöst, wenn der Satz zu Ende
gesprochen ist *oder* feststeht, dass er nicht gesprochen werden kann (keine
Stimme, Autoplay blockiert, Datei kaputt). Darauf baut der Mikro-Autostart im
freien Gespräch. Es darf nie eines hängen bleiben, sonst wartet das Gespräch
ewig – jeder Fehlerpfad ruft `finish(seq)`. `onSpeechState` meldet zusätzlich
'start'/'end' für die Mundbewegung des Avatars.

### Spracheingabe & KI (Rollenspiel + freies Gespräch)
- `lib/listen.js`: Web Speech API (`ja-JP`). `matchSpoken` normalisiert
  (Kanji→Kana-Map, Katakana→Hiragana) und vergleicht per Bigramm-Ähnlichkeit;
  Treffer nur bei klarem Abstand zur zweitbesten Option – sonst `null`.
  Im freien Gespräch gibt es keine Optionen: dort zählt der erkannte Text roh.
- `lib/claude.js` + `lib/apiKey.js`: BYOK, Anthropic `claude-haiku-4-5` (schnell –
  im Gespräch zählt die Antwortzeit), Key nur in `localStorage`, nie in Firestore.
  `chatTurn` führt Mehrzug-Gespräche (komplette Historie, System-Prompt mit
  `cache_control` → ab dem zweiten Zug kostet er ein Zehntel). `judgeAnswer`
  bewertet frei gesprochene Antworten in den Szenen sinngemäß und liefert dabei
  eine natürlichere Formulierung (`better`) – der eigentliche Lernwert.
  `parseJson` ist die Sollbruchstelle: Modell-JSON kommt oft in Code-Zäunen oder
  mit Vorrede; was nicht sicher lesbar ist, ergibt `null` und der Aufrufer weicht
  auf sein Standardverhalten aus. Ohne Key/Netz bleibt überall alles wie bisher.

---

## 5. Inhalte ergänzen (Schemata)

Jeder Datentyp lebt in genau einer `data/`-Datei. Neue Inhalte = dort eintragen.
`scripts/audit-examples.mjs` prüft Beispielsätze auf Vorwärts-Referenzen.

- **Kana-Lektion:** automatisch aus `HIRA_ROWS`/`KATA_ROWS` (Gojūon-Zeilen) gebaut.
- **Wort-Block** (`data/words.js` → `WORD_BLOCKS`): `{ id, theme(Emoji), title, words:[{ kanji, kana, romaji, de, ex:{ jp, kana, de, tokens:[{t,r,de,b}] } }] }`. Token ohne `de` (z. B. `。`) ist nicht antippbar.
- **Grammatik** (`data/grammar.js` → `GRAMMAR`): Ein neues Thema braucht DREI Stellen – den Eintrag selbst, `GRAMMAR_ORDER` und eine Station in `data/path.js`; ohne die letzte wird es nie gelehrt. Mindestens vier `exercises` (per Test erzwungen), sonst wiederholt die SRS-Karte immer dasselbe. Beispiele brauchen `tokens` mit Kana-Lesung – daraus baut `npm run audio` die Sprachausgabe. `{ id, glyph, title, summary, body:[{h?,text}], examples:[{jp,kana,de,tokens}], exercises:[{q,a,options,hint}] }`. Reihenfolge der Freischaltung: `GRAMMAR_ORDER`.
- **Kapitel** (`data/chapters.js` → `CHAPTERS`): `{ id, title, steps:[…] }`. Step-`kind`: `story`, `intro` (neues Wort: `jp/reading/de`), `pic`/`pic_choice`/`audio`, `sign`, `trace`, `dialog`, `gap`, `tf`, `build`.
- **Kanji-Herkunft** (`data/kanjiOrigin.js`): je neuem Kanji `{ type, radical?, parts?:[{c,de}], note }`.
- **Dialog/Rollenspiel** (`data/dialogs.js` → `DIALOGS` + Lexikon `DIALOG_LEX`): Jeder Zug ist `{ npc, de, options, answer, answerDe }`. `answerDe` ist die deutsche Bedeutung der ANTWORT (nicht der NPC-Zeile) – ohne sie kann das Aufwärmen nicht abfragen; ein Test erzwingt, dass sie überall steht. Deutsche Felder werden nie gesprochen, brauchen also kein Audio.
- **Freies Gespräch** (`data/talks.js` → `TALKS`): `{ id, sceneId, title, emoji, goalDe, persona, place, role, complication, goalCheck, maxTurns }`. `place`/`role` müssen in `components/avatar.jsx` (`PLACES`/`ROLES`) existieren; `sceneId` muss eine Szene aus `DIALOGS` sein (per Test geprüft). `complication` ist die geheime Wendung – sie wird der lernenden Person nie vorab gezeigt. Kein Audio nötig (alles zur Laufzeit erzeugt, s. §4).
- **Pfad-Station** (`data/path.js` → `PATH`): `{ world, sub }` (Überschrift) oder `{ type:'kana'|'word'|'grammar'|'chapter'|'goal', id }`.

Beim Einführen neuer Wörter/Kanji ggf. `KANJI_ORIGIN` und – falls in Story-Sätzen
verwendet – `STORY_TOKENS`/`DIALOG_LEX` ergänzen, damit Wörter antippbar bleiben.
**Nach jeder Inhalts-Änderung mit Sprechstellen: `npm run audio`** (s. §4) und
`public/audio` mit committen – der Pre-Commit-Hook prüft das.

---

## 6. Performance & Build

- **Code-Splitting:** Die fünf Screens werden in `TabiApp.jsx` per `React.lazy`
  geladen → jeder Tab ist ein eigener Chunk (kleiner Erst-Download). `players.jsx`
  hängt an `reise`.
- **Vendor-Chunks** (`vite.config.js` → `build.rollupOptions.output.manualChunks`):
  `firebase` und `react` jeweils in eigenen, langlebig cachebaren Chunks.
- **PWA:** `vite-plugin-pwa` (autoUpdate). `base` = `/Clausis-tabi/` für GitHub Pages.
- **Deployment:** Push auf `main` → GitHub Actions (`.github/workflows/deploy.yml`)
  läuft `npm install` (bewusst statt `npm ci` – package-lock.json kann hier
  mangels Node/npm nicht lokal neu generiert werden und gerät nach
  Dependency-Änderungen leicht außer Sync), `npm test` (blockierend), `npm run
  audit` (informativ, blockiert nicht), `npm run build` und veröffentlicht
  `dist/` nach GitHub Pages.
- **Tests:** Vitest (`vitest.config.js`, eigene schlanke Konfiguration getrennt von
  `vite.config.js`). Reine Logik-Tests neben der getesteten Datei (`*.test.js`),
  z. B. `useProgress.test.js` (SM-2-Algorithmus), `lib/srs.test.js`,
  `lib/talk.test.js` (Gesprächs-Gating + Prompt-Bau), `lib/claude.test.js`
  (JSON-Parser), `lib/learned.test.js`. Lokal mit `npm test`; läuft außerdem
  blockierend in der Deploy-Pipeline. Test-Umgebung ist `node` – Module, die beim
  Import `window`/`navigator` anfassen (z. B. `lib/speech.js`), dürfen darum nicht
  in Tests gezogen werden.

---

## 7. Konventionen

- **JSX nur in `.jsx`.** Dateien mit JSX (auch in `lib/`: `furigana.jsx`, `scene.jsx`)
  enden auf `.jsx`; reine Logik/Daten auf `.js`. (`<` als Vergleich ist in `.js` ok.)
- **Kein `import React`** nötig (automatische JSX-Runtime). Hooks einzeln importieren.
- **Farben/Font** immer über `theme.js` (`C`, `JP`), nicht inline wiederholen.
- **Kommentare deutsch**, dicht und erklärend (warum, nicht nur was) – wie im Bestand.
- **Workbox-`urlPattern`-Funktionen sind self-contained.** Sie werden als String
  in die generierte `sw.js` serialisiert – Variablen aus `vite.config.js` (z. B.
  `BASE`) existieren im Worker nicht und führen zu einem stillen `ReferenceError`
  (Route greift nie). Nur `url`/`request`-Parameter und `self.*` verwenden; nach
  Änderungen im `dist/sw.js` gegenprüfen.

### Lokales Verifizieren
Auf dem Windows-Rechner (`C:\clausis-tabi`) sind Node/npm vorhanden: vor dem Push
`npm test`, `npm run audit`, ggf. `npm run build` und bei Inhalts-Änderungen
`npm run audio` laufen lassen. **Nur in Umgebungen ohne Node/npm** (z. B. reine
Browser-Sessions) stattdessen statisch prüfen:
1. Import/Export-Konsistenz: jedes relative `import {X}` zeigt auf eine Datei, die `X`
   exportiert (default-/lazy-Importe → default-Export vorhanden).
2. Kein Symbol „benutzt aber nicht importiert"; keine doppelten Top-Level-Deklarationen.
3. Jeder React-Hook importiert; kein JSX-Tag in `.js`; jeder `<Komponente>`-Tag
   importiert oder lokal definiert.
Endgültige Bestätigung liefert dann CI beim Push (`npm test` + `npm run build`).
