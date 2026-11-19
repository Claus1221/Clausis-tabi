// ─── Yatra: der durchgehende Lernpfad ─────────────────────────────────────────
// EIN geordneter Pfad, gegliedert in Welten (Überschriften { world, sub }). Jede Station
// { type, id } startet die passende Lektion. Gegenstück zu src/data/path.js, aber mit
// eigenen Typen: 'script' (Schrift-Lektion s1…), später 'word' (nw1…), 'grammar' (ng1…),
// 'chapter' (nc1…), 'dialog' (nd1…), 'goal'. Spätere Tasks fügen ihre Stationen hier ein;
// eine Station, deren Daten es (noch) nicht gibt, überspringt die Karte still (nodeMeta null).
//
// Didaktik der ersten drei Welten: alle Vokale und die ersten drei Konsonanten-Reihen in
// Kathmandu, dann die übrigen Konsonanten, dann alles, was Zeichen verbindet
// (Vokalzeichen, Zusatzzeichen mit Halant, Verbindungen) samt Ziffern.
export const NE_PATH = [
  { world: 'काठमाडौं', sub: 'Ankommen' },
  { type: 'script', id: 's1' },
  { type: 'script', id: 's2' },
  { type: 'script', id: 's3' },
  { type: 'script', id: 's4' },
  { type: 'script', id: 's5' },
  { world: 'Die Konsonanten', sub: 'त bis ह' },
  { type: 'script', id: 's6' },
  { type: 'script', id: 's7' },
  { type: 'script', id: 's8' },
  { type: 'script', id: 's9' },
  { world: 'Zeichen verbinden', sub: 'Vokalzeichen & Ziffern' },
  { type: 'script', id: 's10' },
  { type: 'script', id: 's11' },
  { type: 'script', id: 's12' },
  { type: 'script', id: 's13' },
  { type: 'script', id: 's14' },
]
