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
       └─ TabiApp.jsx        (Orchestrator: Header, TabBar, ProgressCtx-Provider,
                              lazy-geladene Screens)
            └─ screens/      (ein Vollbild je Tab; default-Export, lazy)
                 └─ components/   (geteilte UI-Bausteine)
                      └─ lib/     (reine Logik: SRS, Dialog-Gating, Szene-SVG …)
                           └─ data/    (reine Inhaltsdaten, kein React)
                                └─ theme.js · state/ · useProgress.js · kanaStrokes.js
```

Faustregel beim Importieren aus `src/<schicht>/datei`:
`screens → components → lib → data`, dazu quer erlaubt: `theme`, `state/ProgressContext`,
`useProgress`, `kanaStrokes`. Eine Datei darf **nie** aus ihrer eigenen oder einer
höheren Schicht importieren (außer Geschwister in `lib/` mit klarer Richtung, s. u.).

---

## 2. Verzeichnis-Karte (was liegt wo)

### Wurzel `src/`
| Datei | Rolle |
|---|---|
| `main.jsx` | Mount-Punkt: `<AuthGate><TabiApp/></AuthGate>`. |
| `AuthGate.jsx` | Google-Login, erlaubte Konten, `useAuth()`-Context. |
| `firebase.js` | Firebase-Init; exportiert `auth`, `db`, `ALLOWED_EMAILS`, `isConfigured`. |
| `useProgress.js` | **Firestore-Hook + Fortschritts-Domäne**: `useProgress(uid)` (live-Daten + Schreib-Funktionen), `computeStats`, `dueKana`, `sm2`, `getSettings`, `localDate`, `addDays`, `SETTINGS_DEFAULTS`, `SRS_STAGE_BOUNDS`. |
| `kanaStrokes.js` | Generierte KanjiVG-Strichpfade: `HIRAGANA`, `KATAKANA`, `KANA_STROKES`, `STROKE_VIEWBOX`. (Generator: `scripts/gen-kana-strokes.mjs`.) |
| `theme.js` | `C` (Farb-Token) · `JP` (japanische Font-Stack). |
| `TabiApp.jsx` | Root-Orchestrator (≈120 Z.). Hält Tab-State, lädt Screens via `React.lazy`, stellt `ProgressCtx` bereit. |

### `state/`
| Datei | Exporte | Zweck |
|---|---|---|
| `ProgressContext.js` | `ProgressCtx` | React-Context, über den **alle** Screens Fortschritt + Schreib-Funktionen lesen (`useContext(ProgressCtx)`). Befüllt in `TabiApp`. |

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
| `chapters.js` | `STORY_TOKENS`, `CHAPTERS`, `CHAPTER_BY_ID`, `CHAPTER_WORD` |
| `path.js` | `PATH` (Reihenfolge der Reise-Stationen) |

### `lib/` — reine Logik
| Datei | Exporte (Auswahl) | Abhängig von |
|---|---|---|
| `xp.js` | `XP_PER_KANA/CARD/WORD/GRAMMAR/CHAPTER/DIALOG` | – |
| `kanaStats.js` | `totalKanaCount`, `completedKanaList`, `completedKanaCount` | data/kana |
| `speech.js` | `speak`, `speakItem`, `copyText` | data/words, data/chapters |
| `srs.js` | `srsItemInfo`, `SRS_RATINGS`, `shuffled`, `buildRounds`, `OPTIONS_PER_ROUND`, `SRS_STAGES`, `srsStageIndex` | theme, data/kana, data/words, data/chapters, useProgress |
| `dialog.js` | `lexTokens`, `dialogGate`, `reiseVocab`, `curriculumVocab`, `tokenGrammarId`, `ROLE_GRAMMATICAL`, … | data/dialogs, data/words, data/chapters |
| `chapters.js` | `chapterSrsKeys`, `chapterStarsLive`, `chapterStarsShown`, `computeAllChapterStars` | data/chapters, **lib/srs** |
| `furigana.jsx` | `renderFuri`, `furiPlain`, `HAS_JP` | – (enthält JSX → `.jsx`) |
| `scene.jsx` | `sceneTree`, `sceneTorii`, `verticalRidge`, `buildBackdrop`, `roadPath`, `STATE_PALETTE` | – (SVG-JSX → `.jsx`) |
| `path.js` | `isNodeDone`, `pathNodeMeta` | data/kana, data/words, data/grammar, data/chapters |
| `mix.js` | `MIX_LABEL`, `buildMixTasks` | **lib/srs** |
| `progress.js` | `periodBuckets` (XP-Aggregation für Diagramme) | – |

> Erlaubte `lib`-interne Kanten (einzige Querverweise innerhalb der Schicht):
> `chapters.js → srs.js`, `mix.js → srs.js`. Sonst keine.

### `components/` — geteilte UI
| Datei | Exporte | Notiz |
|---|---|---|
| `ui.jsx` | `Card`, `Btn`, `Emoji`, `TabBar`, `Stars`, `LibSheet` | Generische Atome/Chrome; hängt nur an `theme`. |
| `kana.jsx` | `StrokeDisplay`, `DrawCanvas` | Strichanimation + Mal-Canvas. |
| `japanese.jsx` | `CardNote`, `KanjiOrigin`, `WordDetail`, `TappableSentence`, `TappableJp`, `StoryLine` | Antippbare JP-Texte + Wort-Detail. |
| `ueben.jsx` | `UebenHead`, `UebenEmpty`, `UebenDone` | Übungs-Rahmen (Kopf/Leer/Fertig). |
| `BuildStep.jsx` | `BuildStep` | Satz-aus-Kacheln-Aufgabe. **Von Üben UND Reise geteilt.** |

### `screens/` — ein Vollbild je Tab (default-Export, lazy geladen)
| Datei | default | Lokale (nicht exportierte) Unterkomponenten |
|---|---|---|
| `reise.jsx` | `ReiseScreen` | `DailyStrip`, `ChoiceStep`, `IntroStep`, `TraceStep`, `ChapterPlayer`, `ChapterPractice`, `ChapterSheet`, `StoryJournal` |
| `lernen.jsx` | `LernenScreen` | `PhraseList`, `KanaLibrary`, `WordLibrary`, `GrammarLibrary` (reine Nachschlage-Bibliothek) |
| `ueben.jsx` | `UebenScreen` | `SRSQuiz`, `PracticeQuiz`, `TypeQuiz`, `SentenceQuiz`, `MixQuiz`, `MixStep`, `DialogHub`, `DialogPlay` |
| `fortschritt.jsx` | `FortschrittScreen` | – |
| `settings.jsx` | `SettingsScreen` | `NumberSetting` |
| `players.jsx` | *(keine)* — exportiert `LessonPlayer`, `BlockCourse`, `GrammarLesson` | lokal: `QuizStep`, `BlockQuiz`, `GrammarExercise`. Werden **nur von `reise.jsx`** als Lektions-Overlays der Pfad-Stationen genutzt. |

---

## 3. Datenfluss & zentrale Mechaniken

- **Fortschritt:** `useProgress(uid)` in `TabiApp` lädt live aus Firestore und
  liefert Schreib-Funktionen. Beides geht via `ProgressCtx` an alle Screens.
  Geschrieben wird immer per `setDoc(..., {merge:true})` (geräteübergreifend).
- **SRS (Spaced Repetition):** Algorithmus `sm2` in `useProgress.js`; Anzeige-Stufen
  (`SRS_STAGES`) und Kartendaten (`srsItemInfo`) in `lib/srs.js`. Karten-Schlüssel =
  das japanische Zeichen/Wort.
- **Reise = roter Faden:** `data/path.js` (`PATH`) ordnet Kana-, Wort-, Grammatik-
  und Kapitel-Stationen. `ReiseScreen` rendert die Karte und öffnet je Station das
  passende Overlay aus `screens/players.jsx` bzw. den Kapitel-`ChapterPlayer`.
- **Rollenspiel-Freischaltung:** `lib/dialog.js` (`dialogGate`) leitet Vokabel-/
  Grammatik-Bedarf aus den Antwortsätzen ab und prüft gegen das, was die Reise lehrt.
- **Kapitel-Sterne:** `lib/chapters.js` berechnet Sterne aus dem SRS-Stand der
  Kapitel-Vokabeln; Höchststand wird via `bumpChapterStars` (useProgress) gehalten.

---

## 4. Inhalte ergänzen (Schemata)

Jeder Datentyp lebt in genau einer `data/`-Datei. Neue Inhalte = dort eintragen.
`scripts/audit-examples.mjs` prüft Beispielsätze auf Vorwärts-Referenzen.

- **Kana-Lektion:** automatisch aus `HIRA_ROWS`/`KATA_ROWS` (Gojūon-Zeilen) gebaut.
- **Wort-Block** (`data/words.js` → `WORD_BLOCKS`): `{ id, theme(Emoji), title, words:[{ kanji, kana, romaji, de, ex:{ jp, kana, de, tokens:[{t,r,de,b}] } }] }`. Token ohne `de` (z. B. `。`) ist nicht antippbar.
- **Grammatik** (`data/grammar.js` → `GRAMMAR`): `{ id, glyph, title, summary, body:[{h?,text}], examples:[{jp,kana,de,tokens}], exercises:[{q,a,options,hint}] }`. Reihenfolge der Freischaltung: `GRAMMAR_ORDER`.
- **Kapitel** (`data/chapters.js` → `CHAPTERS`): `{ id, title, steps:[…] }`. Step-`kind`: `story`, `intro` (neues Wort: `jp/reading/de`), `pic`/`pic_choice`/`audio`, `sign`, `trace`, `dialog`, `gap`, `tf`, `build`.
- **Kanji-Herkunft** (`data/kanjiOrigin.js`): je neuem Kanji `{ type, radical?, parts?:[{c,de}], note }`.
- **Dialog/Rollenspiel** (`data/dialogs.js` → `DIALOGS` + Lexikon `DIALOG_LEX`).
- **Pfad-Station** (`data/path.js` → `PATH`): `{ world, sub }` (Überschrift) oder `{ type:'kana'|'word'|'grammar'|'chapter'|'goal', id }`.

Beim Einführen neuer Wörter/Kanji ggf. `KANJI_ORIGIN` und – falls in Story-Sätzen
verwendet – `STORY_TOKENS`/`DIALOG_LEX` ergänzen, damit Wörter antippbar bleiben.

---

## 5. Performance & Build

- **Code-Splitting:** Die fünf Screens werden in `TabiApp.jsx` per `React.lazy`
  geladen → jeder Tab ist ein eigener Chunk (kleiner Erst-Download). `players.jsx`
  hängt an `reise`.
- **Vendor-Chunks** (`vite.config.js` → `build.rollupOptions.output.manualChunks`):
  `firebase` und `react` jeweils in eigenen, langlebig cachebaren Chunks.
- **PWA:** `vite-plugin-pwa` (autoUpdate). `base` = `/Clausis-tabi/` für GitHub Pages.
- **Deployment:** Push auf `main` → GitHub Actions (`.github/workflows/deploy.yml`)
  baut (`npm ci && npm run build`) und veröffentlicht `dist/` nach GitHub Pages.

---

## 6. Konventionen

- **JSX nur in `.jsx`.** Dateien mit JSX (auch in `lib/`: `furigana.jsx`, `scene.jsx`)
  enden auf `.jsx`; reine Logik/Daten auf `.js`. (`<` als Vergleich ist in `.js` ok.)
- **Kein `import React`** nötig (automatische JSX-Runtime). Hooks einzeln importieren.
- **Farben/Font** immer über `theme.js` (`C`, `JP`), nicht inline wiederholen.
- **Kommentare deutsch**, dicht und erklärend (warum, nicht nur was) – wie im Bestand.

### Lokales Verifizieren ohne Node
In dieser Umgebung gibt es **kein Node/npm** → kein lokaler Build. Stattdessen prüfen
(Python ist vorhanden):
1. Import/Export-Konsistenz: jedes relative `import {X}` zeigt auf eine Datei, die `X`
   exportiert (default-/lazy-Importe → default-Export vorhanden).
2. Kein Symbol „benutzt aber nicht importiert"; keine doppelten Top-Level-Deklarationen.
3. Jeder React-Hook importiert; kein JSX-Tag in `.js`; jeder `<Komponente>`-Tag
   importiert oder lokal definiert.
Endgültige Bestätigung liefert der CI-Build beim Push.
```
