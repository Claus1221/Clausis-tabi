# Plan B: Der Nepali-Zweig „Yatra“ – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein vollständiger Nepali-Kurs für Reisende unter `src/ne/`: Devanagari, Wörter, Grammatik, Geschichte, Szenen – von null an, mit eigenem Lernstand.

**Architecture:** Eigener Zweig `src/ne/` mit den Schichten `data → lib → components → screens`, der nur den sprachneutralen Kern mitbenutzt (`useProgress`, `sm2`, `ui.jsx`, `theme.js`, `xp.js`). Sprachausgabe über vorab erzeugte Azure-MP3s in `public/audio-ne/`. Inhalte entstehen blockweise und gehen jeweils durch Tests und ein unabhängiges Gegenlesen.

**Tech Stack:** React 18, Vite 5, Firebase 12, Vitest (`node`), Azure Speech REST (`ne-NP`), Web Speech API (`ne-NP`, Chrome/Android).

**Spec:** `docs/superpowers/specs/2026-11-19-mehrnutzer-und-nepali-design.md` (§7, §8, §10). **Voraussetzung:** Plan A ist umgesetzt (`LangGate`, `useProgress(uid, 'ne')`, `ne/NepaliApp.jsx` als Hülle, `NE` in `theme.js`, `NE_PUBLIC`).

## Global Constraints

- `src/ne/**` importiert nur aus: `src/ne/**`, `theme.js`, `useProgress.js`, `state/ProgressContext.js`, `AuthGate.jsx`, `LangGate.jsx`, `components/ui.jsx`, `components/ueben.jsx`, `screens/adminUsers.jsx`, `lib/xp.js`, `lib/progress.js`, `lib/apiKey.js`, `lib/lang.js`, `lib/claude.js` (nur `chatTurn`, `parseJson`, `hasApiKey`). Japanische Dateien importieren nie aus `ne/`. Ein Test erzwingt das (Task 1).
- Bestehende japanische Dateien werden nur ergänzt (neuer Export, neuer Parameter mit altem Standardwert), nie im Verhalten geändert. `npm test`, `npm run build`, `npm run audio -- --check` nach jedem Task grün.
- Höflichkeitsstufe durchgehend तपाईं-Formen. Nur gut belegtes Reise-Nepali.
- Umschrift: lange Vokale `ā ī ū`, Behauchung mit `h` (`kh gh ch jh th dh ph bh`), Retroflexe `ṭ ṭh ḍ ḍh ṇ`, Nasalierung `ṃ`, च = `c`, छ = `ch`, श/ष = `sh`. Der am Wortende stumme Vokal wird nicht geschrieben (`himāl`, nicht `himāla`).
- Karten-Schlüssel im Wiederholungsplan = der Devanagari-Text.
- Lernstand-Felder werden wiederverwendet: `completedLessons` (Schrift), `completedWordBlocks`, `completedGrammar`, `completedChapters`, `completedDialogs`, `completedTalks`, `chapterStars`, `srs`, `xpByDate`, `history`, `settings`.
- IDs: Schrift `s1…`, Wortblöcke `nw1…`, Grammatik `ng1…`, Kapitel `nc1…`, Szenen `nd1…`, Gespräche `nt-nd1…`.
- **Gegenlesen (gilt für jeden Inhalts-Task):** Vor dem Commit prüft ein frischer Subagent ohne Kenntnis der Entstehung die neuen Daten gegen diese Liste: Devanagari-Rechtschreibung · Umschrift passt zum Devanagari und zum Schema · Übersetzung stimmt · Höflichkeitsstufe einheitlich · Form ist gebräuchlich, nicht nur grammatisch möglich · kein Wort wird benutzt, bevor es eingeführt ist. Befunde werden behoben; was strittig bleibt, kommt in `docs/nepali-offene-pruefpunkte.md` für eine spätere Durchsicht durch eine Person mit Nepali-Kenntnissen.
- Nach jeder Änderung an sprechbaren Inhalten: `npm run audio:ne`, `public/audio-ne` mit committen.
- Kommentare deutsch, erklären das Warum. `ARCHITECTURE.md` (neuer Abschnitt „Nepali-Zweig“) wird im selben Task mitgepflegt.

## Review Focus

1. Zeichen mit Halant, Matra oder Nasalzeichen als Karten-Schlüssel und Firestore-Feldname (`srs['क्ष']`) → Schreiben und Lesen müssen denselben Schlüssel treffen, auch wenn derselbe Text unterschiedlich normalisiert ankommt (NFC-Test in Task 5).
2. Sprechstelle ohne MP3 und Gerät ohne Nepali-Stimme → `speak()` löst trotzdem auf, die Übung hängt nicht (Test in Task 3).
3. Umschrift ausgeschaltet → jede Aufgabe bleibt lösbar; keine Aufgabe zeigt die Lösung nur in Umschrift (Test in Task 6).
4. Spracherkennung liefert nichts oder lateinische Schrift → Antippen bleibt immer möglich (Task 10).
5. Halb fertiger Kurs: Pfad endet, bevor alle Phasen da sind → letzte Station zeigt „Hier geht es bald weiter“, kein Absturz bei unbekannter Station (Test in Task 4).

## Dateiübersicht

```
scripts/generate-audio-ne.mjs      Azure-MP3s erzeugen / prüfen
scripts/audit-ne.mjs               Vorwärts-Referenzen in Inhalten finden
public/audio-ne/                   MP3s + manifest.json
src/ne/NepaliApp.jsx               Tabs, Kopfzeile, ProgressCtx (aus Plan A, wird ausgebaut)
src/ne/data/  script.js words.js grammar.js chapters.js dialogs.js talks.js path.js
src/ne/lib/   deva.js speech.js listen.js learned.js srs.js path.js chapters.js dialog.js scene.jsx talk.js
src/ne/components/  text.jsx TraceCanvas.jsx BuildStep.jsx
src/ne/screens/     reise.jsx players.jsx lernen.jsx ueben.jsx fortschritt.jsx settings.jsx talk.jsx
```

---

### Task 0: Probeläufe (Wegwerf-Code, kein Produktcode)

**Files:**
- Create: `docs/superpowers/specs/2026-11-19-nepali-probelaeufe.md` (Ergebnisse)
- Wegwerf: `scratch/ne-spike/` (nicht committen; in `.gitignore`)

Braucht Claus: Azure-Speech-Ressource anlegen (Stufe F0), `AZURE_SPEECH_KEY` und `AZURE_SPEECH_REGION` in `.env.local`; ein Android-Handy mit Chrome.

- [ ] **Step 1: Stimme.** Zehn Texte (`नमस्ते`, `धन्यवाद`, `क`, `ख`, `ट`, `त`, `मलाई पानी चाहिन्छ।`, `यो कति हो?`, `तपाईंको नाम के हो?`, `म जर्मनीबाट आएको हुँ।`) mit `ne-NP-HemkalaNeural` und `ne-NP-SagarNeural`, jeweils Tempo 1,0 und 0,8, als MP3 erzeugen. Claus hört sie an und wählt Stimme und Tempo für Einzelwörter.
- [ ] **Step 2: Einzelzeichen.** Prüfen, ob die Stimme einzelne Konsonanten (`क`) als „ka“ spricht. Wenn nicht: festhalten, welcher Ersatztext funktioniert.
- [ ] **Step 3: Google gegenprüfen.** Aktuelle Stimmenlisten von Google Cloud TTS und Gemini-TTS auf `ne-NP` prüfen. Falls vorhanden: gleiche zehn Texte erzeugen und vergleichen.
- [ ] **Step 4: Erkennung.** Eine HTML-Seite mit `SpeechRecognition`, `lang = 'ne-NP'`, die erkannte Texte anzeigt. Auf Android/Chrome fünf der Sätze sprechen. Festhalten: kommt Devanagari zurück, wie oft stimmt es, welcher Fehlercode sonst.
- [ ] **Step 5: Gerätestimme.** Auf demselben Handy `speechSynthesis.getVoices()` nach `ne` filtern und einen Satz sprechen lassen.
- [ ] **Step 6: Ergebnis festhalten.** In der Ergebnisdatei vier Zeilen ausfüllen: `STIMME=`, `TEMPO_WORT=`, `ERKENNUNG=ja|nein`, `GERAETESTIMME=ja|nein`. Commit: `Nepali-Probeläufe: Stimme und Spracherkennung entschieden`

**Entscheidungstor:** `ERKENNUNG=nein` → Task 10 Step 4 entfällt. Liefert Azure keine brauchbare Stimme → stoppen und mit Claus sprechen.

---

### Task 1: Schriftdaten und Devanagari-Werkzeuge

**Files:**
- Create: `src/ne/lib/deva.js`, `src/ne/lib/deva.test.js`, `src/ne/data/script.js`, `src/ne/data/script.test.js`, `src/ne/imports.test.js`

**Interfaces:**
- Produces:
  - `aksharas(text: string): string[]` – zerlegt Devanagari in Schreibsilben (Konsonantenverbund mit Halant + Matra + Zusatzzeichen); Leerzeichen und Satzzeichen fallen weg.
  - `romanSyllables(roman: string): number` – Zahl der Vokalkerne; `ai`, `au` zählen einfach.
  - `romanFits(deva: string, roman: string): boolean` – wahr, wenn `aksharas − blank ≤ romanSyllables ≤ aksharas`, wobei `blank` = Schreibsilben ohne Matra und ohne eigenständigen Vokal (dort kann der mitgesprochene Vokal entfallen).
  - `nfc(text: string): string` – `text.normalize('NFC')`; jede Stelle, die einen Karten-Schlüssel bildet, geht hier durch.
  - `SCRIPT_DATA: { [char]: { roman, kind: 'vowel'|'consonant'|'matra'|'conjunct'|'sign'|'digit', tip, say } }` – `say` = Text für die Sprachausgabe (laut Task 0 Step 2).
  - `SCRIPT_LESSONS: { id, title, sub, chars: string[] }[]` – 14 Lektionen `s1…s14`: s1–s2 Vokale, s3–s9 Konsonanten nach Lautgruppen (क‑, च‑, ट‑, त‑, प‑Reihe, य–व, श–ह), s10–s11 Matras, s12 Verbindungen (`क्ष`, `त्र`, `ज्ञ`, Halbformen), s13 Zusatzzeichen (Anusvara, Chandrabindu, Halant, Visarga), s14 Ziffern `०–९`.
  - `SCRIPT_NOTES: { id, title, text, pairs: [string, string][] }[]` – Hinweise „behaucht / unbehaucht“ und „dental / retroflex“.

- [ ] **Step 1: Failing Tests** (`deva.test.js`)

```js
import { describe, it, expect } from 'vitest'
import { aksharas, romanSyllables, romanFits, nfc } from './deva.js'
describe('aksharas', () => {
  it('Verbund mit Halant bleibt zusammen', () => expect(aksharas('नमस्ते')).toEqual(['न', 'म', 'स्ते']))
  it('Matra gehört zum Konsonanten', () => expect(aksharas('हिमाल')).toEqual(['हि', 'मा', 'ल']))
  it('zwei Verbünde', () => expect(aksharas('क्षेत्र')).toEqual(['क्षे', 'त्र']))
  it('Nasalzeichen hängt an', () => expect(aksharas('तपाईं')).toEqual(['त', 'पा', 'ईं']))
  it('Leer- und Satzzeichen fallen weg', () => expect(aksharas('यो के हो?')).toEqual(['यो', 'के', 'हो']))
})
describe('romanSyllables / romanFits', () => {
  it('zählt Vokalkerne', () => { expect(romanSyllables('namaste')).toBe(3); expect(romanSyllables('himāl')).toBe(2); expect(romanSyllables('paisā')).toBe(2) })
  it('passende Umschrift', () => { expect(romanFits('नमस्ते', 'namaste')).toBe(true); expect(romanFits('हिमाल', 'himāl')).toBe(true) })
  it('zu kurze oder zu lange Umschrift fällt auf', () => { expect(romanFits('हिमाल', 'hi')).toBe(false); expect(romanFits('हिमाल', 'himālayako')).toBe(false) })
})
it('nfc macht zerlegte und zusammengesetzte Form gleich', () => expect(nfc('क़')).toBe(nfc('क़')))
```

`script.test.js`: genau 14 Lektionen mit IDs `s1…s14` in Reihenfolge · jedes Zeichen einer Lektion steht in `SCRIPT_DATA` · kein Zeichen in zwei Lektionen · jedes Zeichen hat nicht-leeres `roman`, `tip`, `say` · alle 10 Ziffern `०–९` und die 33 Grundkonsonanten `क…ह` kommen vor · jeder Schlüssel ist NFC.

`imports.test.js`: liest alle Dateien unter `src/` als Text; keine Datei außerhalb `src/ne/` importiert einen Pfad mit `/ne/` – ausgenommen `LangGate.jsx`; keine Datei in `src/ne/` importiert außerhalb der Liste in Global Constraints.

- [ ] **Step 2:** `npx vitest run src/ne` → FAIL.
- [ ] **Step 3:** `deva.js` umsetzen (Unicode-Bereich U+0900–U+097F; Halant U+094D, Matras U+093E–U+094C, Zusatzzeichen U+0901–U+0903).
- [ ] **Step 4:** `script.js` schreiben: Zeichen, Umschrift nach Schema, je Zeichen eine Merkhilfe, die Form und Laut verbindet (Stil wie `TIPS` in `src/data/kana.js`); Verwechslungspaare (`भ/म`, `ध/घ`, `ब/व`) grenzen sich ab.
- [ ] **Step 5:** Tests → PASS. Gegenlesen laut Global Constraints.
- [ ] **Step 6:** Commit: `Nepali: Devanagari-Zeichen, Lektionen und Schrift-Werkzeuge`

---

### Task 2: Audio-Skript für Nepali

**Files:**
- Create: `scripts/generate-audio-ne.mjs`, `scripts/lib/collect-ne.mjs`, `scripts/lib/collect-ne.test.mjs`
- Modify: `package.json` (`"audio:ne": "node scripts/generate-audio-ne.mjs"`), `.githooks/pre-commit`, `vite.config.js`, `vitest.config.js` (falls nötig, damit `scripts/**/*.test.mjs` läuft)

**Interfaces:**
- Consumes: `SCRIPT_DATA` (Task 1); `STIMME`, `TEMPO_WORT` (Task 0).
- Produces:
  - `collectNeTexts(sources): [text: string, rate: number][]` – `sources` = `{ script, words, grammar, chapters, dialogs }`; fehlende Quellen sind erlaubt. Spätere Tasks ergänzen hier ihre Sprechstellen.
  - `public/audio-ne/manifest.json`: `{ [text]: dateiname }`.
  - Schalter wie beim japanischen Skript: `--check`, `--dry-run`, `--limit N`.

- [ ] **Step 1: Failing Test** (`collect-ne.test.mjs`): Einzelzeichen kommen mit `say` und Wort-Tempo · ein Text, der als Satz und als Einzelwort vorkommt, bekommt das Wort-Tempo · Texte ohne Devanagari werden übergangen · kein Text doppelt.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** `collect-ne.mjs` umsetzen. `generate-audio-ne.mjs` nach dem Aufbau von `scripts/generate-audio.mjs`: Dateiname = SHA1 aus `Stimme|Tempo|Text` (16 Zeichen) + `.mp3`; verwaiste Dateien löschen; Wiederholung bei 429/5xx. Azure-Aufruf: `POST https://{region}.tts.speech.microsoft.com/cognitiveservices/v1`, Header `Ocp-Apim-Subscription-Key`, `Content-Type: application/ssml+xml`, `X-Microsoft-OutputFormat: audio-24khz-48kbitrate-mono-mp3`; Rumpf SSML mit `<voice name="{STIMME}"><prosody rate="{tempo}">`. Text im SSML XML-maskieren.
- [ ] **Step 4:** `vite.config.js`: `globIgnores` um `audio-ne/manifest.json` ergänzen; zwei Laufzeit-Regeln für `/audio-ne/manifest.json` (NetworkFirst, Cache `yatra-audio-manifest`) und `/audio-ne/*.mp3` (CacheFirst, Cache `yatra-audio`). Die bestehende MP3-Regel prüft `includes('/audio/')` und greift für `/audio-ne/` nicht – deshalb eigene Regeln. Funktionen self-contained halten (`ARCHITECTURE.md` §7).
- [ ] **Step 5:** `.githooks/pre-commit`: zusätzlich `node scripts/generate-audio-ne.mjs --check`; bei Fehlschlag `npm run audio:ne` und `git add public/audio-ne`.
- [ ] **Step 6: Prüfen.** `npm run audio:ne -- --dry-run` nennt die Zahl der Schriftzeichen-Texte. `npm run audio:ne` erzeugt sie. `npm run audio:ne -- --check` → Exit 0. `npm run build`, dann in `dist/sw.js` nach `audio-ne` suchen → beide Regeln vorhanden, kein Verweis auf eine Variable aus `vite.config.js`.
- [ ] **Step 7:** Commit: `Nepali: Studio-Audio über Azure, Prüfung im Pre-Commit-Hook`

---

### Task 3: Sprachausgabe im Nepali-Zweig

**Files:**
- Create: `src/ne/lib/speech.js`, `src/ne/lib/speechPick.js`, `src/ne/lib/speechPick.test.js`

**Interfaces:**
- Produces:
  - `pickSource({ text, manifest, hasDeviceVoice }): { kind: 'mp3', file } | { kind: 'device' } | { kind: 'none' }` (rein, testbar).
  - `speak(text: string): Promise<void>` – löst auf, wenn fertig gesprochen **oder** feststeht, dass nicht gesprochen werden kann. Hängt nie.
  - `stopSpeaking(): void`, `onSpeechState(cb: (s: 'start'|'end') => void): () => void`, `canSpeak(text): boolean`.

- [ ] **Step 1: Failing Test:** Text im Manifest → `mp3` mit Dateiname · nicht im Manifest, Gerätestimme da → `device` · weder noch → `none` · Text wird vor dem Nachschlagen NFC-normalisiert.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** Umsetzen. `speech.js` lädt das Manifest einmal von `${import.meta.env.BASE_URL}audio-ne/manifest.json`; Gerätestimme = `speechSynthesis`-Stimme mit `lang` beginnend `ne`. Jeder Fehlerpfad (Datei fehlt, Autoplay blockiert, `none`) löst das Versprechen auf.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** Commit: `Nepali: Sprachausgabe mit Studio-MP3 und Gerätestimme als Ersatz`

---

### Task 4: Reise-Karte und Schrift-Lektionen

**Files:**
- Create: `src/ne/data/path.js`, `src/ne/lib/path.js`, `src/ne/lib/path.test.js`, `src/ne/lib/scene.jsx`, `src/ne/components/TraceCanvas.jsx`, `src/ne/screens/reise.jsx`, `src/ne/screens/players.jsx`
- Modify: `src/ne/NepaliApp.jsx` (Tabs wie `TabiApp`: Reise, Lernen, Üben, Fortschritt + Einstellungen; Screens lazy; noch fehlende Screens zeigen „Kommt bald“)

**Interfaces:**
- Consumes: `SCRIPT_LESSONS`, `SCRIPT_DATA`, `SCRIPT_NOTES`; `speak`; `ProgressCtx` (`completeLesson`, `scheduleNew`); `XP_PER_KANA` aus `lib/xp.js`; `TabBar`, `Card`, `Btn`.
- Produces:
  - `NE_PATH: ({ world, sub } | { type: 'script'|'word'|'grammar'|'chapter'|'dialog'|'goal', id })[]`
  - `isNodeDone(node, progress): boolean`, `nodeMeta(node): { title, glyph } | null` (`null` bei unbekannter Station), `nextOpenIndex(path, progress): number`.
  - `ScriptLesson({ lesson, onComplete, onClose })` in `players.jsx`.
  - `TraceCanvas({ char })` – Mal-Fläche mit dem Zeichen blass im Hintergrund (Schrift `NE`), Knopf „Löschen“.
  - `buildBackdrop(bands)` in `ne/lib/scene.jsx`, Themen `tal` (Stupa, Gebetsfahnen), `huegel` (Terrassenfelder), `see`, `berge` (Himalaya).

- [ ] **Step 1: Failing Test** (`path.test.js`): jede Station in `NE_PATH` hat `nodeMeta ≠ null` · Schrift-Station ist erledigt, wenn ihre ID in `completedLessons` steht · unbekannter Typ → `isNodeDone` falsch und `nodeMeta` `null`, kein Wurf · `nextOpenIndex` auf leerem Lernstand zeigt auf die erste Station nach der ersten Welt-Überschrift · bei vollständig erledigtem Pfad → `path.length`.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** `path.js` (Daten): Welt „काठमाडौं · Ankommen“ mit `s1…s5`, Welt „Die Konsonanten“ mit `s6…s9`, Welt „Zeichen verbinden“ mit `s10…s14`. Spätere Tasks fügen ihre Stationen ein.
- [ ] **Step 4:** `ScriptLesson`: Einleitung → je Zeichen (zeigen + anhören + Merkhilfe → nachmalen) → Quiz „Welche Lesung?“ mit drei Möglichkeiten → Abschluss mit XP (`XP_PER_KANA` je Zeichen). Passt ein `SCRIPT_NOTES`-Hinweis zu den Zeichen der Lektion, erscheint er vor dem Quiz mit Hörvergleich der Paare.
- [ ] **Step 5:** `reise.jsx`: Karte nach dem Muster von `src/screens/reise.jsx` (Stationen entlang eines Wegs, Zustände erledigt / offen / gesperrt). Am Pfadende eine Tafel „Hier geht es bald weiter“.
- [ ] **Step 6: Prüfen.** Tests grün. `npm run dev`, `?dev&lang=ne`: Lektion `s1` komplett durchspielen; Ton kommt; Nachmalen geht mit Maus und Finger; Abschluss zeigt XP.
- [ ] **Step 7:** Commit: `Nepali: Reise-Karte und Devanagari-Lektionen`

---

### Task 5: Wiederholen, Üben, Fortschritt, Einstellungen

**Files:**
- Create: `src/ne/lib/learned.js`, `src/ne/lib/learned.test.js`, `src/ne/lib/srs.js`, `src/ne/screens/ueben.jsx`, `src/ne/screens/fortschritt.jsx`, `src/ne/screens/settings.jsx`, `src/ne/screens/lernen.jsx`
- Modify: `src/ne/NepaliApp.jsx` (plant Gelerntes per `scheduleNew` ein, wie `TabiApp`)

**Interfaces:**
- Consumes: `isDue`, `getSettings`, `SRS_STAGE_BOUNDS`, `computeStats` aus `useProgress.js`; `periodBuckets` aus `lib/progress.js`; `UebenHead`, `UebenEmpty`, `UebenDone`.
- Produces:
  - `learnedItems(progress): string[]` – alle Karten-Schlüssel (NFC), die laut Lernstand gelernt sind. Spätere Tasks erweitern um Wörter, Grammatik, Kapitel-Wörter.
  - `itemInfo(key): { key, front, roman, de, kind: 'script'|'word'|'phrase'|'grammar', say }`
  - `dueItems(progress): string[]`
  - Einstellung `showRoman: boolean` (Standard `true`) in `progress.settings`.

- [ ] **Step 1: Failing Test:** nach `completedLessons: ['s1']` enthält `learnedItems` genau die Zeichen von `s1` · kein Schlüssel doppelt · alle Schlüssel NFC · `itemInfo` für jeden gelernten Schlüssel ohne `undefined`-Feld · ein Schlüssel in zerlegter Unicode-Form findet denselben `srs`-Eintrag wie in zusammengesetzter.
- [ ] **Step 2:** → FAIL. **Step 3:** umsetzen. **Step 4:** → PASS.
- [ ] **Step 5:** `ueben.jsx`: Wiederholen fälliger Karten (Zeichen zeigen → aufdecken → vier Bewertungen wie Japanisch, `reviewCard`), dazu „Erkennen“ (hören → Zeichen wählen). `fortschritt.jsx`: Level, Streak, XP-Diagramm, Kenntnisstufen. `settings.jsx`: Tagesziel, Rundengröße, Umschrift an/aus, Sprache wechseln, zurücksetzen; für den Admin `AdminUsers`. `lernen.jsx`: Zeichentafel zum Nachschlagen mit Ton.
- [ ] **Step 6:** Handprüfung `?dev&lang=ne`: alle fünf Tabs öffnen ohne Fehler in der Konsole.
- [ ] **Step 7:** Commit: `Nepali: Wiederholen, Üben, Fortschritt und Einstellungen`

---

### Task 6: Wörter und antippbare Texte

**Files:**
- Create: `src/ne/data/words.js`, `src/ne/data/words.test.js`, `src/ne/components/text.jsx`, `scripts/audit-ne.mjs`
- Modify: `src/ne/screens/players.jsx` (`WordBlock`), `src/ne/lib/learned.js`, `src/ne/data/path.js`, `scripts/lib/collect-ne.mjs`, `src/ne/screens/lernen.jsx`, `package.json` (`"audit:ne"`)

**Interfaces:**
- Produces:
  - `WORD_BLOCKS: { id, theme, title, words: { dev, roman, de, ex: { dev, roman, de, tokens: { t, r, de }[] } }[] }[]` – 6 Blöcke `nw1…nw6`, je 8–10 Wörter: Begrüßen und Höflichkeit · Zahlen und Geld · Essen und Trinken · Unterwegs (Taxi, Bus, Richtungen) · Unterkunft und Zeit · Berge und Wetter.
  - `WORD_BY_DEV: { [dev]: word }`, `learnedWords(completedWordBlocks): string[]`
  - `NeText({ dev, roman, size })` – Devanagari, darunter Umschrift nur wenn `settings.showRoman`.
  - `TappableSentence({ tokens })` – Wort antippen zeigt Bedeutung und spricht es.
  - `WordBlock({ block, onComplete, onClose })`.

- [ ] **Step 1: Failing Test** (`words.test.js`): 6 Blöcke mit den IDs · `dev` über alle Blöcke eindeutig und NFC · `romanFits(dev, roman)` für jedes Wort und jeden Beispielsatz (Ausnahmen nur über eine benannte Liste `ROMAN_EXCEPTIONS` in der Testdatei, je Eintrag mit Begründung) · jedes Token mit `de` hat `r` · `tokens.map(t => t.t).join('')` ergibt den Beispielsatz ohne Leerzeichen · in keiner Aufgabe des `WordBlock`-Quiz steht die richtige Antwort nur in Umschrift (jede Antwortmöglichkeit hat `dev`).
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** Wörter schreiben; `WordBlock` (vorstellen → hören → Bedeutung wählen → Wort zum Bild/Deutschen wählen). Wortblöcke in `NE_PATH` einsetzen: `nw1` nach `s5`, die übrigen in Task 7/8 an die passende Stelle.
- [ ] **Step 4:** `audit-ne.mjs`: geht `NE_PATH` der Reihe nach durch und meldet jedes Wort in einem Beispielsatz, das an dieser Stelle noch nicht eingeführt ist (Wortblöcke, Kapitel-`intro`, Grammatik-Partikeln). Exit 1 bei Funden.
- [ ] **Step 5:** Tests → PASS, `npm run audit:ne` → keine Funde, Gegenlesen, `npm run audio:ne`.
- [ ] **Step 6:** Commit: `Nepali: sechs Wortblöcke und antippbare Sätze`

---

### Task 7: Grammatik

**Files:**
- Create: `src/ne/data/grammar.js`, `src/ne/data/grammar.test.js`
- Modify: `src/ne/screens/players.jsx` (`GrammarLesson`), `src/ne/lib/learned.js`, `src/ne/lib/srs.js`, `src/ne/data/path.js`, `scripts/lib/collect-ne.mjs`, `src/ne/screens/ueben.jsx` (Lückensatz als Wiederholform), `src/ne/screens/lernen.jsx`

**Interfaces:**
- Produces:
  - `GRAMMAR: { id, glyph, title, summary, body: { h?, text }[], examples: { dev, roman, de, tokens }[], exercises: { q, a, options, hint }[] }[]`
  - Zwölf Themen: `ng1` Satzbau (Verb am Ende) · `ng2` हो – „ist“ (Gleichsetzung) · `ng3` छ – „es gibt / ist da“ · `ng4` Verneinung (होइन, छैन) · `ng5` Fragen (के, कहाँ, कति, कसरी) · `ng6` ‑मा und ‑बाट (Ort, Herkunft) · `ng7` ‑को (Besitz) · `ng8` ‑लाई und चाहिन्छ („ich brauche“) · `ng9` मन पर्छ („ich mag“) · `ng10` Zahlen mit वटा / जना · `ng11` höfliche Bitte (‑नुहोस्) · `ng12` Vergangenheit (einfache Formen).
  - `GRAMMAR_ORDER: string[]`, `grammarKey(id): string` (Karten-Schlüssel `g:ng1`).

- [ ] **Step 1: Failing Test:** 12 Themen mit den IDs · jedes hat ≥ 4 Übungen und ≥ 3 Beispiele · jede Übung: `a` ist in `options`, `options` eindeutig, ≥ 3 · `romanFits` für jedes Beispiel · jedes Thema hat eine Station in `NE_PATH` · `GRAMMAR_ORDER` enthält jede ID genau einmal.
- [ ] **Step 2:** → FAIL. **Step 3:** Inhalte und `GrammarLesson` (Erklärung → Beispiele zum Anhören → Übungen). **Step 4:** → PASS, `audit:ne`, Gegenlesen, `audio:ne`.
- [ ] **Step 5:** Commit: `Nepali: zwölf Grammatik-Themen`

---

### Task 8: Geschichte Teil 1 – Kathmandu

**Files:**
- Create: `src/ne/data/chapters.js`, `src/ne/data/chapters.test.js`, `src/ne/lib/chapters.js`, `src/ne/components/BuildStep.jsx`
- Modify: `src/ne/screens/reise.jsx` (`ChapterPlayer`, Kapitel-Tagebuch), `src/ne/lib/learned.js`, `src/ne/data/path.js`, `scripts/lib/collect-ne.mjs`, `scripts/audit-ne.mjs`

**Interfaces:**
- Produces:
  - `CHAPTERS: { id, title, place, steps: Step[] }[]`, Schritt-Arten: `story` (`de`, optional `dev`/`roman`/`tokens`), `intro` (`dev`, `roman`, `de`), `audio` (`say`, `options`, `answer`), `dialog` (`line`, `lineDe`, `options`, `answer`), `gap` (`before`, `after`, `options`, `answer`), `tf` (`dev`, `de`, `answer`), `build` (`tiles`, `answer`, `de`).
  - `CHAPTER_WORD: { [dev]: { roman, de } }`, `chapterSrsKeys(chapter): string[]`, `chapterStars(chapter, progress): number`.
  - Kapitel `nc1…nc4`: Ankunft am Flughafen · Taxi nach Thamel · Erstes Dal Bhat · Zur Stupa von Boudhanath.

- [ ] **Step 1: Failing Test:** IDs `nc1…nc4` · jeder Schritt hat eine bekannte Art und deren Pflichtfelder · bei `audio`/`dialog`/`gap` ist `answer` in `options` · bei `build` lässt sich `answer` aus `tiles` legen · `romanFits` für jedes `intro` · jedes Kapitel hat 12–20 Schritte, davon ≥ 3 `intro` und ≥ 4 Aufgaben · jedes Kapitel steht in `NE_PATH`.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** Geschichte schreiben (eine reisende Person, eine einheimische Begleitfigur; deutscher Erzähltext, Nepali wächst von Kapitel zu Kapitel) und `ChapterPlayer` für die sieben Schritt-Arten. Welten in `NE_PATH` so ordnen, dass jedes Kapitel nur Schrift, Wörter und Grammatik benutzt, die davor liegen.
- [ ] **Step 4:** Tests → PASS, `audit:ne` ohne Funde, Gegenlesen, `audio:ne`.
- [ ] **Step 5:** Handprüfung: `nc1` durchspielen, Umschrift aus- und einschalten.
- [ ] **Step 6:** Commit: `Nepali: die Geschichte beginnt in Kathmandu`

---

### Task 9: Geschichte Teil 2 und Ziel

**Files:**
- Modify: `src/ne/data/chapters.js`, `src/ne/data/chapters.test.js`, `src/ne/data/path.js`, `src/ne/screens/reise.jsx` (Ziel-Station, Kulissen je Welt)

- [ ] **Step 1:** Test erweitern: IDs `nc1…nc10`; genau eine `goal`-Station, sie ist die letzte in `NE_PATH`.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** Kapitel `nc5…nc10`: Busfahrt nach Pokhara · Am Phewa-See · Aufbruch zum Trek · Im Teehaus · Schlechtes Wetter, Hilfe holen · Sonnenaufgang am Aussichtspunkt. Kulissen: `tal` → `huegel` → `see` → `berge`.
- [ ] **Step 4:** Tests → PASS, `audit:ne`, Gegenlesen, `audio:ne`.
- [ ] **Step 5:** Commit: `Nepali: von Pokhara bis zum Aussichtspunkt`

---

### Task 10: Gesprächs-Szenen

**Files:**
- Create: `src/ne/data/dialogs.js`, `src/ne/data/dialogs.test.js`, `src/ne/lib/dialog.js`, `src/ne/lib/dialog.test.js`, `src/ne/lib/listen.js`, `src/ne/lib/listen.test.js`
- Modify: `src/ne/screens/players.jsx` (`DialogPlay` mit Aufwärmen), `src/ne/screens/ueben.jsx` (Szenen-Übersicht), `src/ne/data/path.js`, `scripts/lib/collect-ne.mjs`

**Interfaces:**
- Produces:
  - `DIALOGS: { id, title, emoji, sceneDe, turns: { npc, npcRoman, de, options: string[], answer, answerRoman, answerDe }[] }[]` – `nd1…nd6`: Taxi · Unterkunft · Essen bestellen · Einkaufen und Handeln · Nach dem Weg fragen · Im Teehaus.
  - `dialogGate(dialog, progress): { open: boolean, missing: string[] }` – offen, wenn alle Wörter der Antwortsätze gelernt sind.
  - `phrasesFromTurns(turns): { dev, roman, de }[]`
  - `matchSpoken(transcripts: string[], options: string[]): string | null` – Vergleich über NFC-Text ohne Satz- und Leerzeichen, Bigramm-Ähnlichkeit; Treffer nur bei klarem Abstand zur zweitbesten Möglichkeit.
  - `SPEECH_INPUT_SUPPORTED`, `startListening`, `stopListening` (nur wenn `ERKENNUNG=ja`).

- [ ] **Step 1: Failing Tests:** 6 Szenen, je 5–8 Züge · `answer` in `options` · `answerDe` und `de` überall gesetzt · `romanFits` für `npc` und `answer` · jede Szene in `NE_PATH` · `matchSpoken(['मलाई पानी चाहिन्छ'], [...])` trifft die gleichlautende Möglichkeit trotz fehlendem Satzzeichen · lateinischer oder leerer Erkennungstext → `null` · zwei fast gleiche Möglichkeiten → `null`.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** Szenen schreiben; `DialogPlay`: Einleitung → Aufwärmen (Antwortsätze hören und einmal abfragen) → Szene. Antworten werden angetippt.
- [ ] **Step 4 (nur bei `ERKENNUNG=ja`):** Einstellung „Antwort sprechen“ (Standard aus). Antippen bleibt daneben immer möglich; bei `null` erscheint „Nicht verstanden – tippe deine Antwort an.“
- [ ] **Step 5:** Tests → PASS, `audit:ne`, Gegenlesen, `audio:ne`.
- [ ] **Step 6:** Commit: `Nepali: sechs Gesprächs-Szenen`

---

### Task 11: Freischalten für alle

**Files:**
- Modify: `src/lib/lang.js` (`NE_PUBLIC = true`), `ARCHITECTURE.md`, `TODO.md`

- [ ] **Step 1:** Gesamtprüfung: `npm test`, `npm run audit`, `npm run audit:ne`, `npm run audio -- --check`, `npm run audio:ne -- --check`, `npm run build` → alles grün.
- [ ] **Step 2:** Durchspielen auf einem Android-Handy (Vorschau-Build): neue Person → Auswahl → Nepali → `s1`, ein Wortblock, `nc1`, `nd1`; danach zu Japanisch wechseln und zurück – beide Stände unverändert.
- [ ] **Step 3:** `docs/nepali-offene-pruefpunkte.md` mit Claus durchgehen; er entscheidet, ob vor dem Freischalten noch jemand mit Nepali-Kenntnissen gegenliest.
- [ ] **Step 4:** `NE_PUBLIC = true`; `lang.test.js` läuft weiter grün. `ARCHITECTURE.md`: Abschnitt „Nepali-Zweig“ vollständig (Karte der Dateien, Schemata, Audio-Weg, Importregel).
- [ ] **Step 5:** Commit: `Nepali ist für alle freigeschalteten Nutzer wählbar`

---

### Task 12 (optional): Freie KI-Gespräche

Nur umsetzen, wenn Claus es nach Task 11 wünscht – der Freund hat keinen eigenen Anthropic-Key (Spec §10).

**Files:**
- Create: `src/ne/data/talks.js`, `src/ne/lib/talk.js`, `src/ne/lib/talk.test.js`, `src/ne/lib/ttsAzure.js`, `src/ne/screens/talk.jsx`
- Modify: `src/lib/apiKey.js` (zusätzlich `getAzureKey`/`setAzureKey`/`getAzureRegion`/`setAzureRegion`, gerätelokal), `src/ne/screens/settings.jsx`, `src/ne/screens/ueben.jsx`

**Interfaces:**
- Produces: `TALKS` (`nt-nd1…nt-nd6`, je eines pro Szene), `talkGate(talk, progress)`, `buildTalkSystem({ talk, vocab, guided, withComplication }): string`, `cloudAudioUrl(text): Promise<string|null>`.

- [ ] **Step 1: Failing Test:** jedes Gespräch verweist auf eine vorhandene Szene · Gespräch öffnet erst, wenn die Szene in `completedDialogs` steht · der System-Prompt enthält die Wortliste, die Anweisung „nur Devanagari, तपाईं-Form“ und das Zug-Limit · bei `guided` verlangt er Antwort-Vorschläge im selben JSON.
- [ ] **Step 2:** → FAIL. **Step 3:** umsetzen nach dem Vorbild von `src/lib/talk.js` und `src/screens/talk.jsx`; ohne Azure-Key und ohne Gerätestimme läuft das Gespräch als Text. **Step 4:** → PASS.
- [ ] **Step 5:** Commit: `Nepali: freie Gespräche mit KI`
