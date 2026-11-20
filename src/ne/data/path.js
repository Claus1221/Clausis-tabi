// ─── Yatra: der durchgehende Lernpfad ─────────────────────────────────────────
// EIN geordneter Pfad, gegliedert in Welten (Überschriften { world, sub, theme }). Jede
// Station { type, id } startet die passende Lektion. Gegenstück zu src/data/path.js, aber
// mit eigenen Typen: 'script' (Schrift-Lektion s1…), 'word' (Wortblock nw1…), 'grammar'
// (Thema ng1…), 'chapter' (Kapitel nc1…), 'dialog' (Szene nd1…), 'goal' (Ziel).
//
// Reihenfolge VERBINDLICH (Controller-Entscheidung, path-order.md): jede Station darf nur
// benutzen, was VOR ihr im Pfad liegt (plus Funktionswörter des Audits) – das prüft
// `npm run audit:ne`. Eine Station ohne Daten (etwa aus einer neueren Version) überspringt
// die Karte still (nodeMeta null), und sie hält die Stationen dahinter nicht auf (lib/path.js).
//
// Didaktik: Welt 1–3 die Schrift (Vokale und erste Konsonanten-Reihen, übrige Konsonanten,
// alles was Zeichen verbindet samt Ziffern) – erst wer alle Zeichen lesen kann, liest
// Wörter. Ab Welt 4 wechseln Wortblock, Grammatik, Kapitel und Szene entlang der Reise:
// Ankunft in Kathmandu → Thamel → Essen → unterwegs im Tal → Pokhara → Berge.
//
// theme = Kulisse der Welt (lib/scene.jsx): tal | huegel | see | berge.
// Devanagari in Überschriften nur dort, wo die App den Namen schon führt (काठमाडौं).

// ID der Ziel-Station. Steht hier (nicht in lib/chapters.js), damit lib/path.js sie ohne die
// Kapitel-Logik (learned.js, useProgress, alle Daten) kennt; lib/chapters.js reicht sie weiter.
export const GOAL_ID = 'goal'

export const NE_PATH = [
  { world: 'काठमाडौं', sub: 'Ankommen', theme: 'tal' },
  { type: 'script', id: 's1' },
  { type: 'script', id: 's2' },
  { type: 'script', id: 's3' },
  { type: 'script', id: 's4' },
  { type: 'script', id: 's5' },
  { world: 'Die Konsonanten', sub: 'त bis ह', theme: 'tal' },
  { type: 'script', id: 's6' },
  { type: 'script', id: 's7' },
  { type: 'script', id: 's8' },
  { type: 'script', id: 's9' },
  { world: 'Zeichen verbinden', sub: 'Vokalzeichen & Ziffern', theme: 'tal' },
  { type: 'script', id: 's10' },
  { type: 'script', id: 's11' },
  { type: 'script', id: 's12' },
  { type: 'script', id: 's13' },
  { type: 'script', id: 's14' },

  { world: 'Erste Worte', sub: 'Kathmandu, Ankunft', theme: 'tal' },
  { type: 'word', id: 'nw1' },     // Begrüßen und Höflichkeit
  { type: 'grammar', id: 'ng1' },  // Satzbau: das Verb steht am Ende
  { type: 'grammar', id: 'ng2' },  // हो – „ist“
  { type: 'word', id: 'nw2' },     // Zahlen 1–10
  { type: 'grammar', id: 'ng3' },  // छ – „es gibt / ist da“
  { type: 'chapter', id: 'nc1' },  // Ankunft am Flughafen

  { world: 'Geld und Fragen', sub: 'Thamel', theme: 'tal' },
  { type: 'word', id: 'nw3' },     // Geld und Preise
  { type: 'grammar', id: 'ng4' },  // Verneinung
  { type: 'grammar', id: 'ng5' },  // Fragen
  { type: 'chapter', id: 'nc2' },  // Taxi nach Thamel
  { type: 'dialog', id: 'nd1' },   // Szene: Taxi

  { world: 'Essen', sub: 'Kathmandu', theme: 'tal' },
  { type: 'word', id: 'nw4' },     // Essen und Trinken
  { type: 'grammar', id: 'ng8' },  // ‑लाई und चाहिन्छ
  { type: 'grammar', id: 'ng9' },  // मन पर्छ
  { type: 'grammar', id: 'ng10' }, // Zahlen mit वटा / जना
  { type: 'chapter', id: 'nc3' },  // Erstes Dal Bhat
  { type: 'dialog', id: 'nd3' },   // Szene: Essen bestellen
  { type: 'dialog', id: 'nd4' },   // Szene: Einkaufen und Handeln

  { world: 'Unterwegs', sub: 'Kathmandu-Tal', theme: 'huegel' },
  { type: 'word', id: 'nw5' },     // Unterwegs
  { type: 'grammar', id: 'ng6' },  // ‑मा und ‑बाट
  { type: 'grammar', id: 'ng7' },  // ‑को
  { type: 'grammar', id: 'ng11' }, // Höfliche Bitte
  { type: 'chapter', id: 'nc4' },  // Zur Stupa von Boudhanath
  { type: 'dialog', id: 'nd5' },   // Szene: Nach dem Weg fragen

  { world: 'Nach Pokhara', sub: 'Hügelland und See', theme: 'see' },
  { type: 'word', id: 'nw6' },     // Unterkunft und Zeit
  { type: 'grammar', id: 'ng12' }, // Vergangenheit
  { type: 'chapter', id: 'nc5' },  // Busfahrt nach Pokhara
  { type: 'chapter', id: 'nc6' },  // Am Phewa-See
  { type: 'dialog', id: 'nd2' },   // Szene: Unterkunft

  { world: 'In die Berge', sub: 'Himalaya', theme: 'berge' },
  { type: 'word', id: 'nw7' },     // Berge und Wetter
  { type: 'chapter', id: 'nc7' },  // Aufbruch zum Trek
  { type: 'chapter', id: 'nc8' },  // Im Teehaus
  { type: 'dialog', id: 'nd6' },   // Szene: Im Teehaus
  { type: 'chapter', id: 'nc9' },  // Schlechtes Wetter, Hilfe holen
  { type: 'chapter', id: 'nc10' }, // Sonnenaufgang am Aussichtspunkt
  { type: 'goal', id: GOAL_ID },   // Ziel-Station
]
