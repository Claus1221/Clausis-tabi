# Tabi – Didaktisches Konzept

> **Lebende Doku**, Schwesterdatei zu `ARCHITECTURE.md` (dort das *Wie* des Codes,
> hier das *Warum* des Lernens). Bei Änderungen an Lernmechaniken mitpflegen.
> Zielgruppe: ein erwachsener Selbstlerner (Deutsch), Ziel Japan-Reise —
> kein Prüfungs-/JLPT-Fokus, keine sozialen Features.

---

## 1. Leitidee: EIN roter Faden

Alle Inhaltstypen (Kana, Wörter, Grammatik, Story-Kapitel, Gespräche) hängen an
**einem** linearen Reisepfad (`data/path.js` → 18 „Welten" von ひらがな・一 bis
さよなら). Vorbilder aus der Recherche: Duolingos linearer Pfad (Wahlfreiheit
überfordert Anfänger), WaniKanis Mastery-Gating, SRS „in den Pfad eingebacken".
Bewusst **keine** Leaderboards und kein Streak-Druck — Solo-Lerner.

Reihenfolge: Schrift zuerst (Hiragana → Katakana), dann Satz-Grundgerüst,
danach Vokabeln/Grammatik/Kapitel/Dialoge eng verzahnt. Die alten Tabs
(Bibliothek, Üben) bleiben als freier Zweitzugang ohne Gating.

## 2. Mechaniken im Einzelnen

### Gating (Freischaltung)
- **Pfad:** strikt sequenziell — erste nicht-erledigte Station ist `current`,
  Rest gesperrt (`lib/path.js: isNodeDone`).
- **Kapitel-Bremse** (`lib/chapters.js`): liegen ≥2 erlebte Kapitel unter 2 ⭐,
  öffnet statt des nächsten Kapitels ein „erst festigen"-Sheet. Da Sterne nur
  über **fällige** Wiederholungen wachsen, verteilt das neue Kapitel automatisch
  über Tage (Spacing-Effekt statt Binge-Lernen).
- **Dialog-Gating** (`lib/dialog.js: dialogGate`): eine Gesprächs-Szene öffnet
  erst, wenn Vokabeln UND Grammatik ihrer Antwortsätze im Pfad gelernt wurden.
  Selbst-nachziehend: was der Pfad (noch) nicht lehrt, sperrt nicht.

### SRS (Spaced Repetition, SM-2 angepasst)
- SM-2 in `useProgress.js`; Bewertungen Nochmal/Schwer/Gut/Leicht → q 1/3/4/5.
- **Entspannter Rückfall:** „Nochmal" wirft nur eine Kenntnisstufe zurück und
  macht die Karte nach 4 h wieder fällig (Abend-Session) — kein Frust-Reset.
- **Sanfter Einstieg:** Neues wird gestaffelt eingeplant (~8 Items/Tag ab
  morgen, `scheduleNew`), damit „fällig" nie explodiert.
- 5 Kenntnisstufen (Neu/Lernphase/Vertraut/Gefestigt/Gemeistert) an den
  Intervallgrenzen [1, 7, 30, 120] Tagen.
- **Anti-Hochpump-Prinzip:** Nur *wirklich fällige* Karten verändern den Plan;
  freies Üben (Fleiß-Übung) gibt XP, verschiebt aber keine Intervalle.
- SRS-Items: Kana (Zeichen), Wörter (Schlüssel = Kanji), Kapitel-Vokabeln und
  Wendungen, die aus einem freien Gespräch übernommen wurden (`extraPhrases`).
  Grammatik und die festen Reise-Floskeln sind bewusst NICHT im SRS.
  Eine Quelle für alle Stapel und Zähler: `lib/learned.js: learnedItems`.

### Abruf statt Wiedererkennen, L1 verblasst
- Übungen fragen **ohne deutsche Krücke** ab: NPC spricht Japanisch,
  Antwortoptionen Japanisch, Deutsch erst im Feedback.
- **Verblassendes Scaffolding** in Dialogen (`scaffold: voll → mittel → frei`):
  Übersetzung sofort → erst nach Antwort → gar nicht; Optionen werden mehr und
  ähnlicher. Optional (Settings): Audio-only (Text erst nach Antwort) und
  Sprech-Modus (Antwort per Mikrofon, Web Speech + optional KI-Bewertung).
- **Hören zuerst:** NPC-Zeilen und neue Wörter werden automatisch vorgelesen.
- **Tipp-Modus:** Satzbau wechselt von Kacheln zu freier Tastatur-Eingabe,
  sobald die Vokabeln des Satzes „Gefestigt" sind (`shouldTypeSentence`).

### Die Gesprächs-Treppe (vom Skript zum freien Sprechen)
Jede Reise-Situation (Taxi, Check-in, Restaurant …) wird in vier Stufen gelernt.
Die Treppe steht und fällt mit ihrer Reihenfolge: Erst braucht man das Skript
der Situation, dann muss es einem weggenommen werden.

| Stufe | Was passiert | Wo im Code |
|---|---|---|
| 1 Kennenlernen | geskriptete Szene, Antwort antippen, Hilfen sichtbar | `DialogPlay` (`scaffold: voll`) |
| 2 Sprechen | dieselbe Szene, Antwort sprechen statt antippen | `settings.speakDialogs` |
| 3 Ohne Vorlage | Optionen zunächst verdeckt; wer die Szene schon gemeistert hat, spielt sie automatisch eine Stufe schwerer | `hideOptions`, `HARDER_SCAFFOLD` |
| 4 Frei | KI-Gesprächspartner, echtes Ziel **plus unbekannte Wendung** | `TalkPlay` (`screens/talk.jsx`) |

**Warum Stufe 4 den Unterschied macht:** Wer eine Szene dreimal gespielt hat,
erkennt „どちらまで？" am Klangbild statt am Inhalt. Darum hat jedes freie
Gespräch eine `complication` (`data/talks.js`), die die lernende Person NICHT
kennt — die Straße ist gesperrt, das Gericht ist aus, die Karte geht nicht.
Das auswendig gelernte Skript wird damit wertlos; wer das Ziel erreicht, hat
wirklich verstanden und reagiert.

**Verständlicher Input auf Lernniveau (i+1):** Der KI-Partner darf nur mit dem
sprechen, was schon gelernt wurde. Die Wortschatz-Grenze kommt aus demselben
`reiseVocab`, das die Szenen-Freischaltung steuert (`lib/talk.js:
learnedVocabList` → System-Prompt-Whitelist mit Bedeutungen). Genau das kann
eine allgemeine Chat-App nicht — und darin liegt der didaktische Wert.

**Flüssigkeit vor Genauigkeit — Korrektur erst danach:** Im Gespräch korrigiert
der Partner nie ausdrücklich, sondern wiederholt das Gemeinte beiläufig richtig
(Recast: „ああ、ホテルまで ですね。") und spricht weiter. Ein einzelnes Wort oder
fehlende Partikeln versteht er wohlwollend; erst wenn wirklich nichts ankommt,
fragt er natürlich nach — auch das ist Lernstoff (Reparatur-Strategien).
Explizite Korrekturen kommen in der **Nachbesprechung**, zusammen mit 1–2
Wendungen, die gefehlt haben. Die lassen sich per Knopf als SRS-Karte
übernehmen (`addPhrase`) — so füttert jedes Gespräch das Wiederholungssystem.

**Hilfe darf nichts kosten:** Der Knopf „Was sag ich?" nennt 1–2 mögliche
Antworten. Wer Hilfe holt, wird nicht bestraft — nur die Nachbesprechung weiß
davon. Hilfe, die sich nach Scheitern anfühlt, wird vermieden, und dann
schweigt man lieber.

**Verblassende Hilfen auch hier** (`settings.talkScaffold`): `gestuetzt`
(Zeile sofort lesbar) → `hoerend` (Standard: erst zuhören, Text auf Wunsch) →
`immersiv` (zusätzlich ohne Übersetzung). Nachhören geht immer.

### Story als Träger (Kapitel)
28 Kapitel erzählen eine durchgehende Reise (Ankunft → Fuji → Tokyo →
Freundin Yuki → Abschied). Jedes Kapitel: Erzählbeats (`story`, antippbare
Sätze) + Wort-Einführungen (`intro`: Bild, Schrift, Lesung, Audio,
Kanji-Herkunft) + Abruf-Übungen (nur mit bereits eingeführtem Stoff —
geprüft durch `scripts/audit-examples.mjs`). Kapitel-Vokabeln werden
SRS-Karten; die Kapitel-Sterne (1–5 ⭐) spiegeln deren SRS-Kenntnisstand.

### Verstehen statt Auswendiglernen
- **Kanji-Herkunft** (`data/kanjiOrigin.js`, 178 Einträge): Piktogramm/
  Ideogramm/Zusammensetzung mit Radikal-Zerlegung bei jeder Einführung.
- **Antippbare Sätze überall** (Tokens `{t, r, de, b}`): Wort antippen →
  Lesung, Bedeutung, grammatische Rolle.
- **Merkhilfen** (Form↔Laut-Eselsbrücken) für alle 92 Kana, inkl. gezielter
  Verwechslungspaare (シ/ツ, ソ/ン).

### Motivation (bewusst schlank)
XP je Aktion (Kana 10, Karte 5, Wort-Block 15, Grammatik 20, Dialog 25,
Kapitel 30, freies Gespräch 60 + 8 je eigenem Zug), 1000 XP/Level, einstellbares
Tagesziel (Standard 200), Streak, 18 Abzeichen mit messbarem Stand. Keine
Wettbewerbs-Mechaniken. Die eigenen Züge zählen auch bei abgebrochenem Gespräch —
gesprochen ist gesprochen, sonst lohnt sich das Wagnis nicht.

## 3. Sprach-Didaktik der Audio-Ausgabe

- Studio-Audio (Google Neural2) statt System-TTS, damit Aussprache verlässlich
  und geräteunabhängig ist (Details: `ARCHITECTURE.md` §4).
- **Zitierformen langsamer (Rate 0.8), Sätze natürlich (Rate 1):** Einzelwörter
  sollen lautlich durchhörbar sein (ひと mit hörbarem i statt entstimmlichtem
  „Sto"); Sätze behalten die natürliche Entstimmlichung und Prosodie — so hört
  der Lerner beides: die klare Form und den echten Klang.
- Mehrdeutige Kanji werden nie der TTS überlassen: gesprochen wird immer die
  geprüfte Kana-Lesung (`itemReading`/`speakTokens`).

## 4. Übungstypen-Inventar

| Kontext | Typen |
|---|---|
| Üben-Tab | Gemischt (Interleaving), SRS-Wiederholung, Fleiß-Übung, Erkennen (Zeichen→Lesung), Hören (Audio→Zeichen), Tippen (Romaji), Satzbau, Rollenspiel |
| Kapitel (Reise) | story, intro, pic, pic_choice, audio, sign, dialog, gap, tf, build, trace |
| Kana-Lektion | Merkhilfe → Strichfolge-Animation → Nachzeichnen → Quiz |
| Wort-Block | Intro → 5× Wort-Detail → Kanji→Bedeutung-Quiz |
| Grammatik | Erklärung + Beispiele → Lücken-Übungen |

## 5. Offene didaktische Beobachtungen

- `GRAMMAR_ORDER` (Bibliothek-Sortierung) und die reale Pfad-Reihenfolge
  divergieren bei g23 (Zähleinheiten) — s. TODO.md.
- Phrasen (50 Überlebensphrasen) sind reine Bibliothek: bewusst ohne SRS/Pfad,
  inhaltlich aber teils redundant zu Dialog-Lexikon und Kapiteln.
