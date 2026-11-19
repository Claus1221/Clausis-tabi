import { SCRIPT_DATA, SCRIPT_LESSONS } from '../data/script.js'
import { WORD_BLOCKS, learnedWords } from '../data/words.js'
import { GRAMMAR_ORDER, grammarKey } from '../data/grammar.js'
import { isDue } from '../../useProgress.js'
import { nfc } from './deva.js'
import { isGrammarKey, topicForKey } from './grammarSrs.js'

// ─── Was im Yatra-Wiederholungs-Umlauf ist ───────────────────────────────────
// Gegenstück zu src/lib/learned.js + srsItemInfo. Eine Quelle für alle Stapel und
// Zähler (Üben, Fortschritt, Einplanen in NepaliApp) – sonst zeigt die App an zwei
// Stellen verschiedene „fällig“-Zahlen. Heute Schriftzeichen, Wörter und Grammatik;
// spätere Tasks hängen Kapitel-Wörter an learnedItems und itemInfo an.
//
// Jeder Schlüssel geht durch nfc: dieselbe Silbe kann zerlegt oder zusammengesetzt
// ankommen (Tastatur, Kopieren, Datenpflege) – ohne NFC wären das zwei Karten bzw. ein
// Review, der seinen srs-Eintrag nicht findet.

// Anzeige-Helfer für Lektion, Karten und Zeichentafel (einzige Fassung).
export const KIND_LABEL = {
  vowel: 'Vokal', consonant: 'Konsonant', matra: 'Vokalzeichen',
  conjunct: 'Verbindung', sign: 'Zusatzzeichen', digit: 'Ziffer',
}
// Kombinierende Zeichen (ा, ं …) allein zeigt man auf dem Platzhalterkreis ◌, sonst
// hängen sie in der Luft bzw. kleben am Zeichen davor.
export const alone = ch => (/^[ऀ-ःऺ-ॏ॑-ॗॢॣ]/.test(ch) ? '◌' + ch : ch)

// SCRIPT_DATA nach NFC-Schlüssel (die Daten sind schon NFC; so bleibt es auch dann
// richtig, wenn ein Eintrag einmal anders eingetippt wird).
const SCRIPT_BY_KEY = Object.fromEntries(Object.entries(SCRIPT_DATA).map(([k, d]) => [nfc(k), d]))

// Namensräume der Karten-Schlüssel: Zeichen = der Text selbst, Wörter = 'w:' + Text,
// Grammatik = 'g:' + id (grammarKey in data/grammar.js). Grund: ein Wort kann sich schreiben wie ein Zeichen
// (छ = Konsonant „cha“ UND Zahlwort „sechs“) – ohne Präfix teilten sich beide eine Karte.
export const WORD_PREFIX = 'w:'
export const wordKey = dev => WORD_PREFIX + nfc(dev)

// Wörter nach Karten-Schlüssel – über nfc, damit auch ein anders eingetippter Eintrag
// gefunden wird (wie SCRIPT_BY_KEY).
const WORD_BY_KEY = Object.fromEntries(WORD_BLOCKS.flatMap(b => b.words).map(w => [wordKey(w.dev), w]))

// Alle Karten-Schlüssel (NFC, ohne Doppel) laut Lernstand: erst Schriftzeichen in
// Lektionsreihenfolge, dann Wörter (w:-Schlüssel) in Blockreihenfolge.
export function learnedItems(progress) {
  const done = progress?.completedLessons || []
  const grammar = progress?.completedGrammar || []
  return [...new Set([
    ...SCRIPT_LESSONS.filter(l => done.includes(l.id)).flatMap(l => l.chars.map(nfc)),
    ...learnedWords(progress?.completedWordBlocks).map(wordKey),
    // Grammatik: eine Karte je abgeschlossenem Thema, in Pfad-Reihenfolge (GRAMMAR_ORDER).
    ...GRAMMAR_ORDER.filter(id => grammar.includes(id)).map(grammarKey),
  ])]
}

// Anzeige-Infos einer Karte. Alle Felder immer Strings (nie undefined), damit kein
// Screen „undefined“ auf eine Karte schreibt – auch nicht für einen Schlüssel aus
// einer neueren Version, den diese hier noch nicht kennt.
//   front – was groß auf der Karte steht (Vokalzeichen am क: का)
//   roman – Umschrift = die Lösung beim Aufdecken
//   de    – deutsche Erklärung (bei Zeichen die Merkhilfe)
//   say   – Text für die Sprachausgabe
//   kindLabel – Zeichenart auf Deutsch („Konsonant“, „Wort“); leer, wenn unbekannt
//   ex    – nur bei Wörtern: der Beispielsatz { dev, roman, de, tokens } (null, wenn unbekannt)
//   (Grammatik: front = Zeichen des Themas, de = Titel, summary = Kurzbeschreibung;
//   geübt wird sie nicht über diese Felder, sondern als Lückensatz – s. lib/grammarSrs.js)
export function itemInfo(key) {
  const k = nfc(key)
  if (isGrammarKey(k)) {
    const g = topicForKey(k)
    const id = k.slice(grammarKey('').length)
    if (!g) return { key: k, front: id, roman: '', de: 'Grammatik', kind: 'grammar', say: '', kindLabel: 'Grammatik', ex: null, summary: '' }
    return { key: k, front: g.glyph, roman: '', de: g.title, kind: 'grammar', say: '', kindLabel: 'Grammatik', ex: null, summary: g.summary }
  }
  if (k.startsWith(WORD_PREFIX)) {
    const w = WORD_BY_KEY[k]
    // Unbekanntes Wort (neuere Version): das Präfix nie anzeigen oder sprechen.
    const text = k.slice(WORD_PREFIX.length)
    if (!w) return { key: k, front: text, roman: '', de: '', kind: 'word', say: text, kindLabel: 'Wort', ex: null }
    return { key: k, front: w.dev, roman: w.roman, de: w.de, kind: 'word', say: w.dev, kindLabel: 'Wort', ex: w.ex }
  }
  const d = SCRIPT_BY_KEY[k]
  if (!d) return { key: k, front: k, roman: '', de: '', kind: 'script', say: k, kindLabel: '' }
  return { key: k, front: d.shown, roman: d.roman, de: d.tip, kind: 'script', say: d.say, kindLabel: KIND_LABEL[d.kind] || '' }
}

// srs-Eintrag einer Karte. Gespeichert wird unter dem NFC-Schlüssel (reise.jsx und
// ueben.jsx normalisieren vor dem Schreiben); ein Altbestand unter anderer Form wird
// trotzdem gefunden, statt die Karte als nie geplant zu behandeln.
export function srsEntry(progress, key) {
  const srs = progress?.srs || {}
  const k = nfc(key)
  if (srs[k]) return srs[k]
  const hit = Object.keys(srs).find(s => nfc(s) === k)
  return hit === undefined ? undefined : srs[hit]
}

// Gelernte Karten, die jetzt dran sind (oder noch nie geplant – wie dueKana).
export function dueItems(progress) {
  return learnedItems(progress).filter(k => isDue(srsEntry(progress, k)))
}
