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
| `ne/NepaliApp.jsx` | Hülle mit Kopfzeile und `ProgressCtx` für Sprache `ne` (Kursinhalte folgen). |
| `ne/lib/deva.js` | Reine Devanagari-Werkzeuge: `nfc` (jeder SRS-Karten-Schlüssel geht hier durch), `aksharas` (Schreibsilben: Verbund über Halant + Matra + Zusatzzeichen; Leer-/Satzzeichen und Ziffern fallen weg), `romanSyllables` (Vokalkerne, `ai`/`au` einfach), `romanFits` (Umschrift plausibel: `aksharas − stumme ≤ Kerne ≤ aksharas`; stumm = Silbe ohne Matra und ohne eigenständigen Vokal). Tests: `deva.test.js`. |
| `ne/data/script.js` | `SCRIPT_DATA`, `SCRIPT_LESSONS` (14 Schrift-Lektionen `s1…s14`), `SCRIPT_NOTES` (Laut-Hinweise). Tests: `script.test.js`. |
| `ne/lib/speechPick.js` | Reine Auswahl der Sprachausgabe (kein `window`/`fetch`): `pickSource({ text, manifest, hasDeviceVoice })` → `mp3` \| `device` \| `none` (Text vorher NFC), `pickVoice(voices)` (`ne-NP` vor anderem `ne*`, lokal vor Netz, nie Hindi/andere Sprache), `isNepaliLang`, `watchdogMs`. Tests: `speechPick.test.js`. |
| `ne/lib/speech.js` | Sprachausgabe im Browser, drei Stufen: **Studio-MP3** (Manifest `audio-ne/manifest.json`, einmal pro Sitzung geladen; 404/Fehler = leer, gemerkt) → **Nepali-Gerätestimme** (`ne-NP`, Rate 0,85; wartet bis 1,5 s auf `voiceschanged`) → **still**. `speak(text)` löst immer auf (Ende, Fehler, Watchdog `max(4 s, 400 ms × Zeichen)`; neuer Aufruf löst den laufenden auf), dazu `stopSpeaking`, `onSpeechState`, `canSpeak`, `soundAvailable()` (Manifest mit Einträgen oder Gerätestimme; Hör-Aufgaben zeigen ohne Ton das Geschriebene). |
| `ne/imports.test.js` | Wächter der Importregel unten: liest alle Dateien unter `src/` als Text und prüft die Import-Spezifizierer (relative Pfade aufgelöst; aus `lib/claude.js` nur die erlaubten Namen; Pakete in `ne/` nur `react`, in Tests zusätzlich `vitest` und `node:*`). |

**Nepali-Audio (Azure Speech) – Stand: noch nicht erzeugt, wartet auf einen Azure-Key.**
Die Pipeline ist fertig und getestet, aber nie gelaufen; `public/audio-ne/` gibt es noch nicht.
Der Kurs muss ohne Ton voll benutzbar sein.

| Datei | Rolle |
|---|---|
| `scripts/lib/collect-ne.mjs` | `collectNeTexts(sources)` → `[Text, Rate][]`; reine Funktion auf Daten (`{ script, words, grammar, chapters, dialogs }`, fehlende Quellen erlaubt). Texte NFC, nur mit Devanagari (U+0900–U+097F), kein Text doppelt; Wort-Tempo `0.8` gewinnt über Satz-Tempo `1`. Bisher behandelt: nur `script` (gesprochen wird `say`). Tests: `collect-ne.test.mjs`. |
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
// roman: Kurs-Umschrift; Konsonanten mit a ('ka'), Matras/Zeichen mit ihrem Beitrag ('ā', 'ṃ')
// tip:   eine Zeile Deutsch, Form ↔ Laut; Verwechslungspaare grenzen sich ab
// shown: was die Karte zeigt – Matras und Zusatzzeichen an क ('का'), sonst das Zeichen selbst
// say:   Text für die Sprachausgabe (derzeit = shown, noch kein Audio)
// Schlüssel sind NFC.
SCRIPT_LESSONS[] = { id: 's1', title, sub, chars: [char, …] }
// s1–s2 Vokale · s3–s9 Konsonanten nach Lautgruppen · s10–s11 Matras ·
// s12 Verbindungen · s13 Zusatzzeichen · s14 Ziffern ०–९; jedes Zeichen in genau einer Lektion
SCRIPT_NOTES[] = { id, title, text, pairs: [[char, char], …] }   // behaucht/unbehaucht, dental/retroflex
```

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
| `ui.jsx` | `Card`, `Btn`, `Emoji`, `TabBar`, `Stars`, `LibSheet` | Generische Atome/Chrome; hängt nur an `theme`. |
| `avatar.jsx` | `Avatar` | Gezeichneter Gesprächspartner + Bühne fürs freie Gespräch (SVG, Stil von `lib/scene.jsx`). Stimmungen: `idle`/`speaking`/`listening`/`thinking`/`happy`. Dauer-Bewegung als CSS-Klassen in `index.css` (`tabi-mood-*`), Zufälliges (Blinzeln, Mundtakt) in React. |
| `kana.jsx` | `StrokeDisplay`, `DrawCanvas` | Strichanimation + Mal-Canvas. |
| `japanese.jsx` | `CardNote`, `KanjiOrigin`, `WordDetail`, `TappableSentence`, `TappableJp`, `StoryLine` | Antippbare JP-Texte + Wort-Detail. |
| `ueben.jsx` | `UebenHead`, `UebenEmpty`, `UebenDone` | Übungs-Rahmen (Kopf/Leer/Fertig). |
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
