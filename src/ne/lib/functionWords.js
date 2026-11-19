import { nfc } from './deva.js'

// ─── Funktionswörter des Nepali-Kurses (EINE Quelle) ─────────────────────────
// Kleine, sehr häufige Wörter, ohne die kein Beispielsatz auskommt. Sie gelten im
// ganzen Kurs als bekannt – die Sätze erklären sie beim Antippen. Benutzt vom Wort-Audit
// (scripts/audit-ne.mjs) und von den Daten-Tests unter src/ne/ (die dürfen nicht aus
// scripts/ importieren – darum liegt die Liste hier, rein, ohne Dateizugriff).
// Bewusst kurz halten: jedes Wort hier stellt der Kurs nie eigens vor. Inhaltswörter
// (Nomen, Adjektive) gehören NIE hierher; Formen, die eine Grammatik-Lektion lehrt,
// stehen in GRAMMAR_FORMS (data/grammar.js) und gelten erst ab dieser Lektion.
export const FUNCTION_WORDS = {
  // nachgestellte Wörter („in“, „von“, „für/an“, „ab“) – im Nepali ans Nomen geschrieben
  Postpositionen: ['मा', 'को', 'लाई', 'बाट'],
  // „ist / bin / ist nicht“
  Kopula: ['हो', 'छ', 'छैन', 'होइन', 'छु'],
  // ich, Sie, das, das dort, mein, ich (Ergativ, „मैले बुझिनँ“ in nw1 – lange vor ng12,
  // das die Ergativ-Regel erklärt)
  Pronomen: ['म', 'तपाईं', 'यो', 'त्यो', 'मेरो', 'मैले'],
  // was, wie viel, wo
  Fragewörter: ['के', 'कति', 'कहाँ'],
  // „und“ (in den Zahlensätzen von nw2: „eins und eins …“)
  Konjunktion: ['र'],
  // „wird gebraucht“, „geben Sie“, „gehen Sie“, „geht/fährt“, „wird/ergibt“ (… macht zwei)
  Verbformen: ['चाहिन्छ', 'दिनुहोस्', 'जानुहोस्', 'जान्छ', 'हुन्छ'],
}

// Ab hier wird die Liste zum Schlupfloch für Inhaltswörter – das Audit warnt dann.
export const FUNCTION_WORD_LIMIT = 30

// Frische Menge (NFC) bei jedem Aufruf: Aufrufer erweitern sie um Eingeführtes.
export const functionWordSet = () => new Set(Object.values(FUNCTION_WORDS).flat().map(nfc))

// Wörter, die im Nepali ans vorige Wort angehängt werden (झोला+मा = झोलामा, दुई+वटा,
// म+सँग). In Lückensätzen gibt es keine Tokens, die das trennen – geprüft wird dann Stamm
// UND Anhängsel. Nur echte Anhängsel, sonst ginge jede Verkettung zweier Wörter durch.
export const ATTACHED_SUFFIXES = ['लाई', 'बाट', 'वटा', 'सँग', 'मा', 'को', 'ले']

// Ist `word` bekannt – direkt oder als bekannter Stamm + bekanntes Anhängsel?
// known = Set (NFC) des bis hierher Eingeführten.
export function isKnownWord(word, known) {
  const w = nfc(word)
  if (known.has(w)) return true
  return ATTACHED_SUFFIXES.some(s => w.length > s.length && w.endsWith(s) && known.has(s) && known.has(w.slice(0, -s.length)))
}
