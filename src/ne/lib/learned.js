import { SCRIPT_DATA, SCRIPT_LESSONS } from '../data/script.js'
import { WORD_BLOCKS, learnedWords } from '../data/words.js'
import { isDue } from '../../useProgress.js'
import { nfc } from './deva.js'

// ─── Was im Yatra-Wiederholungs-Umlauf ist ───────────────────────────────────
// Gegenstück zu src/lib/learned.js + srsItemInfo. Eine Quelle für alle Stapel und
// Zähler (Üben, Fortschritt, Einplanen in NepaliApp) – sonst zeigt die App an zwei
// Stellen verschiedene „fällig“-Zahlen. Heute Schriftzeichen und Wörter; spätere Tasks
// hängen Grammatik und Kapitel-Wörter an learnedItems und itemInfo an.
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

// Wörter nach NFC-Schlüssel – nicht WORD_BY_DEV, damit auch ein anders eingetippter
// Eintrag gefunden wird (wie SCRIPT_BY_KEY).
const WORD_BY_KEY = Object.fromEntries(WORD_BLOCKS.flatMap(b => b.words).map(w => [nfc(w.dev), w]))

// Schlüssel, die ein Wort UND ein Schriftzeichen sind (gleiche Schreibung = eine Karte,
// denn der Schlüssel ist der Devanagari-Text). Je Eintrag: welche Quelle die Karte zeigt.
// learned.test.js lässt jede NICHT verzeichnete Doppelung scheitern.
//   छ – Konsonant „cha“ (Schrift) und Zahlwort „sechs“ (Wort). Die Schrift gewinnt: wer
//       nur die Zeichen gelernt hat, soll bei छ nicht plötzlich „sechs“ lesen. Folge: das
//       Zahlwort „sechs“ bekommt keine eigene Wiederholungskarte (offen, s. Bericht Task 6).
export const KEY_COLLISIONS = { छ: 'script' }

// Alle Karten-Schlüssel (NFC, ohne Doppel) laut Lernstand: erst Schriftzeichen in
// Lektionsreihenfolge, dann Wörter in Blockreihenfolge.
export function learnedItems(progress) {
  const done = progress?.completedLessons || []
  return [...new Set([
    ...SCRIPT_LESSONS.filter(l => done.includes(l.id)).flatMap(l => l.chars.map(nfc)),
    ...learnedWords(progress?.completedWordBlocks),
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
//   ex    – nur bei Wörtern: der Beispielsatz { dev, roman, de, tokens }
export function itemInfo(key) {
  const k = nfc(key)
  const d = SCRIPT_BY_KEY[k]
  const w = WORD_BY_KEY[k]
  if (w && (!d || KEY_COLLISIONS[k] === 'word')) {
    return { key: k, front: w.dev, roman: w.roman, de: w.de, kind: 'word', say: w.dev, kindLabel: 'Wort', ex: w.ex }
  }
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
