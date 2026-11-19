import { SCRIPT_LESSONS, SCRIPT_DATA } from '../data/script.js'

// Reine Pfad-Logik der Yatra-Karte (kein React). Gegenstück zu src/lib/path.js.

// Welches Fortschritts-Feld eine Station abhakt. Felder werden aus dem japanischen
// Kurs wiederverwendet (completedLessons = Schrift-Lektionen usw.).
const DONE_FIELD = {
  script: 'completedLessons',
  word: 'completedWordBlocks',
  grammar: 'completedGrammar',
  chapter: 'completedChapters',
  dialog: 'completedDialogs',
}

// Unbekannter Typ (oder Ziel) → nie erledigt, aber auch kein Wurf: ein Pfad aus einer
// neueren Version darf eine ältere App nicht abstürzen lassen.
export function isNodeDone(node, progress) {
  const field = node && DONE_FIELD[node.type]
  return !!field && (progress?.[field] || []).includes(node.id)
}

// Titel + Stationszeichen. null für Überschriften und für Stationen, deren Daten es
// heute nicht gibt (Wörter, Grammatik … kommen in späteren Tasks) – die Karte lässt
// solche Stationen still aus, statt zu stürzen. Spätere Tasks ergänzen hier ihren Typ.
export function nodeMeta(node) {
  if (node?.type === 'script') {
    const l = SCRIPT_LESSONS.find(x => x.id === node.id)
    if (!l) return null
    // shown statt Zeichen: ein Vokalzeichen allein hängt in der Luft (ा → का).
    return { title: l.title, glyph: SCRIPT_DATA[l.chars[0]]?.shown || l.chars[0] }
  }
  return null
}

// Station = kein Überschrift-Eintrag und mit Daten.
const isStation = n => !n.world && nodeMeta(n) !== null

// Index der nächsten offenen Station: die erste nicht erledigte (Überschriften und
// Stationen ohne Daten zählen nicht). Alles erledigt → path.length.
export function nextOpenIndex(path, progress) {
  const i = path.findIndex(n => isStation(n) && !isNodeDone(n, progress))
  return i === -1 ? path.length : i
}

// Zustand je Pfad-Eintrag, Regel wie auf der japanischen Karte: erledigt bleibt immer
// 'done' (auch hinter der offenen Station, z. B. nach einer Umsortierung), die erste
// nicht erledigte Station ist 'current', alle übrigen 'locked'. Überschriften und
// Stationen ohne Daten → null.
export function stationStates(path, progress) {
  const open = nextOpenIndex(path, progress)
  return path.map((n, i) => {
    if (!isStation(n)) return null
    if (isNodeDone(n, progress)) return 'done'
    return i === open ? 'current' : 'locked'
  })
}
